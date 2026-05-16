"""
텍스트 모드 채팅 서비스.

흐름 (1 turn):
    1. 클라가 POST /api/chat/text 로 {session_id, message} 보냄
    2. generate_content_stream → 캐릭터 응답 청크 SSE 로 흘림
    3. 끝나면 done 이벤트 송신, session.messages 업데이트

교정은 캐릭터가 시스템 프롬프트대로 답변 안에 자연스럽게 녹여서 함.
세션 단위 리뷰는 나중에 별도 엔드포인트로 추가 예정.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from google import genai
from google.genai import types

from app.config import TEXT_MODEL
from app.services import memory as memory_svc
from app.services.history import Session
from characters import CharacterProfile, build_system_instruction


def _build_contents(session: Session, new_user_message: str) -> list[types.Content]:
    """기존 history + 이번 user 메시지 → Content[]."""
    contents: list[types.Content] = [
        types.Content(role=("user" if m.role == "user" else "model"),
                      parts=[types.Part(text=m.text)])
        for m in session.messages
    ]
    contents.append(
        types.Content(role="user", parts=[types.Part(text=new_user_message)])
    )
    return contents


def _build_system_instruction(
    char: CharacterProfile, user_id: str, character_key: str
) -> str:
    # 메모리 주입 일시 비활성화 — 대화 유지에만 집중하는 단계.
    return build_system_instruction(char)


async def stream_reply(
    client: genai.Client,
    session: Session,
    char: CharacterProfile,
    user_message: str,
) -> AsyncIterator[dict]:
    """
    한 턴 진행. dict 이벤트들을 yield:
        {"type": "chunk", "text": "..."}            ← 캐릭터 응답 청크
        {"type": "done", "full_text": "..."}        ← 종료
        {"type": "error", "message": "..."}         ← 에러
    """
    user_message = (user_message or "").strip()
    if not user_message:
        yield {"type": "error", "message": "empty message"}
        return

    system_instruction = _build_system_instruction(
        char, session.user_id, session.character_key
    )
    contents = _build_contents(session, user_message)

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.9,
    )

    chunks: list[str] = []
    failed = False
    try:
        stream = await client.aio.models.generate_content_stream(
            model=TEXT_MODEL,
            contents=contents,
            config=config,
        )
        async for chunk in stream:
            text = getattr(chunk, "text", None) or ""
            if text:
                chunks.append(text)
                yield {"type": "chunk", "text": text}
    except Exception as e:
        failed = True
        yield {"type": "error", "message": f"generate failed: {e}"}

    full_text = "".join(chunks).strip()
    # 정상 응답 받았을 때만 history 에 커밋 (실패 턴은 흔적 안 남김)
    if not failed and full_text:
        session.append("user", user_message)
        session.append("model", full_text)

    yield {"type": "done", "full_text": full_text}
