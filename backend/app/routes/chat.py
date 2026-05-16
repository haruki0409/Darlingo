"""WebSocket chat route: streams companion replies from Gemini.

Phase 1 keeps conversation history in memory, scoped to a single WebSocket
connection. When the socket closes, the history is gone. Persisting history to
Postgres is part of a later phase.
"""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

from app.config import settings
from app.persona import build_system_instruction

logger = logging.getLogger(__name__)

router = APIRouter()

_client: genai.Client | None = None


def get_client() -> genai.Client:
    """Lazily create a single shared Gemini client."""
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


@router.websocket("/ws/chat")
async def chat_socket(websocket: WebSocket) -> None:
    await websocket.accept()

    # One chat session per connection. Created on the first message so we know
    # the chosen language and level. They are locked for the connection.
    chat_session = None

    try:
        while True:
            data = await websocket.receive_json()
            message = (data.get("message") or "").strip()
            language = data.get("language", "ko")
            level = data.get("level", "beginner")

            if not message:
                continue

            if chat_session is None:
                chat_session = get_client().aio.chats.create(
                    model=settings.gemini_model,
                    config=types.GenerateContentConfig(
                        system_instruction=build_system_instruction(language, level),
                    ),
                )

            try:
                stream = await chat_session.send_message_stream(message)
                async for chunk in stream:
                    if chunk.text:
                        await websocket.send_json({"type": "chunk", "text": chunk.text})
                await websocket.send_json({"type": "done"})
            except Exception:  # noqa: BLE001 - surface any Gemini error to the client
                logger.exception("Gemini request failed")
                await websocket.send_json(
                    {
                        "type": "error",
                        "text": "Sorry, something went wrong. Please try again.",
                    }
                )
    except WebSocketDisconnect:
        logger.info("Client disconnected from chat socket")
