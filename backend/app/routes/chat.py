"""WebSocket chat route: authenticates, persists, and streams Gemini replies.

Auth: the client connects with the Supabase JWT as a query param
(`/ws/chat?token=...`), because browsers cannot set headers on WebSockets.
Optionally pass `&conversation_id=...` to resume an existing conversation.

Persistence: every user message and every completed companion reply is
written to the `messages` table, so history survives reconnects and restarts.
"""

import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
from sqlalchemy import select

from app.auth import get_or_create_user, verify_supabase_token
from app.config import settings
from app.db import SessionLocal
from app.models import Conversation, Message
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


def to_gemini_history(messages: list[Message]) -> list[types.Content]:
    """Convert stored messages into Gemini chat history."""
    history: list[types.Content] = []
    for m in messages:
        role = "user" if m.role == "user" else "model"
        history.append(types.Content(role=role, parts=[types.Part(text=m.content)]))
    return history


@router.websocket("/ws/chat")
async def chat_socket(websocket: WebSocket) -> None:
    await websocket.accept()

    # --- Authenticate -------------------------------------------------------
    token = websocket.query_params.get("token")
    if not token:
        await websocket.send_json({"type": "error", "text": "Missing auth token."})
        await websocket.close()
        return

    try:
        supabase_user = await verify_supabase_token(token)
    except Exception:
        logger.info("WebSocket auth failed")
        await websocket.send_json({"type": "error", "text": "Authentication failed."})
        await websocket.close()
        return

    # Ensure the app-side user row exists; keep its id for later writes.
    async with SessionLocal() as db:
        user = await get_or_create_user(db, supabase_user)
        user_id = user.id

    resume_id = websocket.query_params.get("conversation_id")

    # Set up lazily on the first message (we need language/level by then).
    chat_session = None
    conversation_id: uuid.UUID | None = None

    try:
        while True:
            data = await websocket.receive_json()
            message = (data.get("message") or "").strip()
            language = data.get("language", "ko")
            level = data.get("level", "beginner")
            if not message:
                continue

            # --- First message: create or resume the conversation ----------
            if chat_session is None:
                async with SessionLocal() as db:
                    conversation: Conversation | None = None
                    if resume_id:
                        conversation = await db.get(Conversation, uuid.UUID(resume_id))
                        if conversation and conversation.user_id != user_id:
                            conversation = None  # not this user's conversation

                    if conversation is None:
                        conversation = Conversation(
                            user_id=user_id, language=language, level=level
                        )
                        db.add(conversation)
                        await db.commit()
                        await db.refresh(conversation)
                        history: list[types.Content] = []
                    else:
                        result = await db.execute(
                            select(Message)
                            .where(Message.conversation_id == conversation.id)
                            .order_by(Message.created_at)
                        )
                        history = to_gemini_history(list(result.scalars().all()))

                    conversation_id = conversation.id
                    convo_language = conversation.language
                    convo_level = conversation.level

                chat_session = get_client().aio.chats.create(
                    model=settings.gemini_model,
                    config=types.GenerateContentConfig(
                        system_instruction=build_system_instruction(
                            convo_language, convo_level
                        ),
                    ),
                    history=history,
                )
                await websocket.send_json(
                    {"type": "conversation", "id": str(conversation_id)}
                )

            # --- Persist the user message ----------------------------------
            async with SessionLocal() as db:
                db.add(
                    Message(
                        conversation_id=conversation_id,
                        role="user",
                        content=message,
                    )
                )
                await db.commit()

            # --- Stream the companion reply --------------------------------
            try:
                reply_parts: list[str] = []
                stream = await chat_session.send_message_stream(message)
                async for chunk in stream:
                    if chunk.text:
                        reply_parts.append(chunk.text)
                        await websocket.send_json(
                            {"type": "chunk", "text": chunk.text}
                        )
                await websocket.send_json({"type": "done"})
            except Exception:
                logger.exception("Gemini request failed")
                await websocket.send_json(
                    {
                        "type": "error",
                        "text": "Sorry, something went wrong. Please try again.",
                    }
                )
                continue

            # --- Persist the completed companion reply ---------------------
            full_reply = "".join(reply_parts)
            if full_reply:
                async with SessionLocal() as db:
                    db.add(
                        Message(
                            conversation_id=conversation_id,
                            role="companion",
                            content=full_reply,
                        )
                    )
                    await db.commit()
    except WebSocketDisconnect:
        logger.info("Client disconnected from chat socket")
