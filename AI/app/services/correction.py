"""
학습자 발화 문법/표현 교정 서비스.

캐릭터 응답과 병렬로 호출 — 학습자 자막에 빨간 표시할 수 있게
구조화된 JSON 반환.

설계:
    - 짧은 입력 (5자 미만 등) 은 호출 자체 skip
    - JSON 강제 (response_mime_type) 로 파싱 안전성 확보
    - 호출 실패해도 채팅 흐름은 끊기지 않게 None 반환
"""

from __future__ import annotations

import json

from google import genai
from google.genai import types

from app.config import UTILITY_MODEL
from app.schemas import Correction, CorrectionSpan


CORRECTION_PROMPT_JA = """\
너는 일본어 학습자가 방금 말한 문장을 분석해 자연스럽게 교정하는 도구야.

입력:
"{user_text}"

이 문장을 일본어 원어민 기준으로 분석해. 출력은 반드시 아래 JSON 한 덩어리:

{{
  "has_errors": true | false,
  "corrected": "교정된 전체 문장 (오류 없으면 입력 그대로)",
  "errors": [
    {{
      "span": "입력 안에서 잘못된 정확한 토큰/구간 (입력 문자열에서 substring 으로 등장해야 함)",
      "fix": "권장 표현",
      "reason": "왜 이게 자연스러운지 1문장",
      "severity": "minor" 또는 "major"
    }}
  ]
}}

규칙:
- 문법/조사/시제/경어 오류는 잡되, 회화체 변형/생략 (「〜じゃん」「〜だよね」등) 은 정상으로 인정.
- 발음 실수로 보이는 짧은 끊김/머뭇거림은 무시.
- 오류 없으면 has_errors=false, errors=[], corrected=입력 그대로.
- span 은 반드시 입력 문자열 안에 substring 으로 그대로 등장해야 함. 만들지 마.
- 출력은 JSON 만. 설명 금지.
"""

CORRECTION_PROMPT_KO = """\
너는 한국어 학습자가 방금 말한 문장을 분석해 자연스럽게 교정하는 도구야.

입력:
"{user_text}"

이 문장을 한국어 원어민 기준으로 분석해. 출력은 반드시 아래 JSON 한 덩어리:

{{
  "has_errors": true | false,
  "corrected": "교정된 전체 문장 (오류 없으면 입력 그대로)",
  "errors": [
    {{
      "span": "입력 안에서 잘못된 정확한 토큰/구간 (입력 문자열에서 substring 으로 등장해야 함)",
      "fix": "권장 표현",
      "reason": "왜 이게 자연스러운지 1문장",
      "severity": "minor" 또는 "major"
    }}
  ]
}}

규칙:
- 문법/조사/시제/맞춤법/어순 오류는 잡되, 회화체 변형/생략 ("~잖아", "ㄹㅇ", "~거든" 등) 은 정상.
- 발음 실수로 보이는 짧은 끊김/머뭇거림 무시.
- 오류 없으면 has_errors=false, errors=[], corrected=입력 그대로.
- span 은 반드시 입력 문자열에 substring 으로 그대로 등장.
- 출력은 JSON 만.
"""


def _empty(user_text: str) -> Correction:
    return Correction(has_errors=False, corrected=user_text, errors=[])


async def correct(
    client: genai.Client,
    user_text: str,
    target_language: str,
) -> Correction | None:
    """
    실패 시 None. 정상 처리 시 Correction (오류 없어도 empty).
    """
    text = (user_text or "").strip()
    if len(text) < 5:
        return _empty(text)

    if target_language == "ja":
        prompt = CORRECTION_PROMPT_JA.format(user_text=text)
    elif target_language == "ko":
        prompt = CORRECTION_PROMPT_KO.format(user_text=text)
    else:
        return _empty(text)

    try:
        resp = await client.aio.models.generate_content(
            model=UTILITY_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        raw = (resp.text or "").strip()
        data = json.loads(raw)
    except (json.JSONDecodeError, Exception) as e:
        print(f"[correction] failed: {e}", flush=True)
        return None

    try:
        errors = [
            CorrectionSpan(**e)
            for e in (data.get("errors") or [])
            if isinstance(e, dict) and "span" in e and "fix" in e
        ]
        # span 이 실제 입력에 등장하는지 검증 (모델 환각 방지)
        errors = [e for e in errors if e.span in text]
        return Correction(
            has_errors=bool(data.get("has_errors")) and bool(errors),
            corrected=str(data.get("corrected") or text),
            errors=errors,
        )
    except Exception as e:
        print(f"[correction] parse failed: {e}", flush=True)
        return None
