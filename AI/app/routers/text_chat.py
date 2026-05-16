"""
POST /api/chat/text  → SSE (text/event-stream) 응답.

SSE 한 라인 = `data: {json}\n\n`.
이벤트 타입은 JSON 안의 "type" 필드로 구분.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from google import genai

from app.deps import get_genai_client
from app.schemas import TextChatRequest
from app.services import history as history_svc
from app.services import text_chat as text_chat_svc
from characters import CHARACTERS

router = APIRouter(prefix="/api/chat", tags=["text_chat"])


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@router.post("/text")
async def chat_text(
    req: TextChatRequest,
    client: genai.Client = Depends(get_genai_client),
) -> StreamingResponse:
    session = history_svc.get(req.session_id)
    if session is None:
        raise HTTPException(404, f"unknown session_id: {req.session_id}")
    if session.mode != "text":
        raise HTTPException(
            400, f"session {req.session_id} is mode={session.mode}, not text"
        )
    char = CHARACTERS.get(session.character_key)
    if char is None:
        raise HTTPException(500, f"character missing: {session.character_key}")

    async def gen() -> AsyncIterator[str]:
        async for event in text_chat_svc.stream_reply(
            client, session, char, req.message
        ):
            yield _sse(event)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # nginx 같은 프록시 버퍼링 방지
        },
    )
