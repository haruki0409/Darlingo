"""
유저별·캐릭터별 장기 메모리.

저장 구조:
    memory/{user_id}/{character_key}/
        summary.md        지금까지의 대화 요약 (성장형, 누적 갱신)
        facts.md          학습자에 대한 사실 메모 (직업, 취미, 자주 틀리는 패턴 등)
        sessions/
            2026-05-16_173045.md   세션별 전체 로그 백업 (재요약 시 참고)

흐름:
    - 세션 시작 시   → load_context() 로 summary + facts 읽어 system_instruction 에 첨부
    - 세션 진행 중   → in-memory history (services.history) 가 메시지 누적
    - 세션 종료 시   → consolidate() 호출: 세션 로그를 summary/facts 에 통합
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from pathlib import Path

from google import genai
from google.genai import types

from app.config import (
    MAX_FACTS_CHARS,
    MAX_SUMMARY_CHARS,
    MEMORY_ROOT,
    SUMMARY_MIN_TURNS,
    UTILITY_MODEL,
)

logger = logging.getLogger(__name__)


# ============================================================
#  경로 헬퍼
# ============================================================

_USER_ID_RE = re.compile(r"^[A-Za-z0-9_\-]{1,64}$")


def _safe_user_id(user_id: str) -> str:
    if not _USER_ID_RE.match(user_id):
        raise ValueError(f"invalid user_id: {user_id!r}")
    return user_id


def _char_dir(user_id: str, character_key: str) -> Path:
    return MEMORY_ROOT / _safe_user_id(user_id) / character_key


def _summary_path(user_id: str, character_key: str) -> Path:
    return _char_dir(user_id, character_key) / "summary.md"


def _facts_path(user_id: str, character_key: str) -> Path:
    return _char_dir(user_id, character_key) / "facts.md"


def _sessions_dir(user_id: str, character_key: str) -> Path:
    return _char_dir(user_id, character_key) / "sessions"


# ============================================================
#  Read API
# ============================================================

def read_summary(user_id: str, character_key: str) -> str:
    p = _summary_path(user_id, character_key)
    return p.read_text(encoding="utf-8") if p.exists() else ""


def read_facts(user_id: str, character_key: str) -> str:
    p = _facts_path(user_id, character_key)
    return p.read_text(encoding="utf-8") if p.exists() else ""


def load_context(user_id: str, character_key: str) -> str:
    """
    system_instruction 끝에 붙일 메모리 블록.

    빈 문자열이면 첨부 안 함. 캐릭터 처음 만나는 유저면 자연스럽게 비어 있음.
    """
    summary = read_summary(user_id, character_key).strip()
    facts = read_facts(user_id, character_key).strip()

    if not summary and not facts:
        return ""

    parts: list[str] = ["\n\n# 이전 대화 컨텍스트 (장기 기억)"]
    if summary:
        parts.append(f"\n## 그동안 우리가 나눈 대화 요약\n{summary}")
    if facts:
        parts.append(f"\n## 사용자에 대해 알고 있는 것\n{facts}")
    parts.append(
        "\n위 내용은 이전 세션들의 누적 기억이야. "
        "지금 대화에서 자연스럽게 활용하되, 일부러 'XX 했었지?' 처럼 "
        "확인질문으로 모두 되짚지는 마."
    )
    return "".join(parts)


# ============================================================
#  Write API — 세션 로그 백업
# ============================================================

def save_session_log(
    user_id: str,
    character_key: str,
    session_id: str,
    messages: list[dict],
    mode: str,
) -> Path:
    """세션 종료 시 raw 로그 백업 (재요약/디버깅용)."""
    _sessions_dir(user_id, character_key).mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    path = _sessions_dir(user_id, character_key) / f"{ts}_{session_id[:8]}.md"

    lines = [
        f"# Session {session_id}",
        f"- mode: {mode}",
        f"- ended_at: {datetime.now().isoformat(timespec='seconds')}",
        f"- turns: {len(messages)}",
        "",
        "---",
        "",
    ]
    for m in messages:
        role = m.get("role", "?")
        text = (m.get("text") or "").strip()
        if not text:
            continue
        lines.append(f"**{role}**: {text}")
        lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")
    return path


# ============================================================
#  Consolidation — LLM 으로 summary/facts 갱신
# ============================================================

CONSOLIDATION_PROMPT = """\
너는 한 유저의 장기 기억을 관리하는 사서야.

[이전 요약]
{prev_summary}

[이전 사실 메모]
{prev_facts}

[방금 끝난 세션 로그]
{session_log}

이 셋을 합쳐서 갱신된 메모리를 만들어. 출력은 반드시 아래 JSON 한 덩어리:

{{
  "summary": "...",
  "facts": "..."
}}

규칙:
- summary 는 캐릭터 '{character_name}' 와 이 유저가 나눈 대화의 누적 요약. {max_summary}자 이내.
  대화 톤, 친밀도 진행, 자주 다뤘던 화제, 감정적 사건을 짧은 단락들로.
  오래된 디테일은 압축, 최근 세션은 상대적으로 자세히.
- facts 는 유저에 대한 사실 bullet 리스트. {max_facts}자 이내.
  예: "- 직업: 일본어 학습 5년차", "- 자주 틀리는 패턴: 'は/が' 혼동",
  "- 좋아하는 음식: 라멘", "- 최근 고민: 발표 준비".
  사실이 바뀌면 갱신, 모순되면 최신 우선.
- 학습 진도 (자주 틀리는 표현, 잘 쓰는 표현) 도 facts 에 포함.
- 출력은 JSON 한 덩어리만. 다른 설명 절대 금지.
"""


async def consolidate(
    client: genai.Client,
    user_id: str,
    character_key: str,
    character_name: str,
    session_id: str,
    messages: list[dict],
    mode: str,
) -> bool:
    """
    세션 종료 시 호출. messages 가 너무 짧으면 skip.

    Returns True 면 갱신 성공, False 면 skip 또는 실패.
    """
    # 짧은 세션은 의미 없음
    meaningful = [m for m in messages if (m.get("text") or "").strip()]
    if len(meaningful) < SUMMARY_MIN_TURNS:
        return False

    # 로그 백업은 항상
    save_session_log(user_id, character_key, session_id, messages, mode)

    prev_summary = read_summary(user_id, character_key) or "(없음 — 첫 만남)"
    prev_facts = read_facts(user_id, character_key) or "(없음 — 첫 만남)"

    log_text = "\n".join(
        f"{m['role']}: {(m.get('text') or '').strip()}"
        for m in meaningful
    )

    prompt = CONSOLIDATION_PROMPT.format(
        prev_summary=prev_summary,
        prev_facts=prev_facts,
        session_log=log_text,
        character_name=character_name,
        max_summary=MAX_SUMMARY_CHARS,
        max_facts=MAX_FACTS_CHARS,
    )

    try:
        resp = await client.aio.models.generate_content(
            model=UTILITY_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )
        raw = (resp.text or "").strip()
        data = json.loads(raw)
    except (json.JSONDecodeError, Exception):
        logger.exception("consolidate failed for %s/%s", user_id, character_key)
        return False

    summary = (data.get("summary") or "").strip()[:MAX_SUMMARY_CHARS]
    facts = (data.get("facts") or "").strip()[:MAX_FACTS_CHARS]

    _char_dir(user_id, character_key).mkdir(parents=True, exist_ok=True)
    if summary:
        _summary_path(user_id, character_key).write_text(summary, encoding="utf-8")
    if facts:
        _facts_path(user_id, character_key).write_text(facts, encoding="utf-8")

    return True


def reset(user_id: str, character_key: str) -> None:
    """디버깅용 — 한 (유저, 캐릭터) 쌍의 메모리 전부 삭제."""
    import shutil
    d = _char_dir(user_id, character_key)
    if d.exists():
        shutil.rmtree(d)
