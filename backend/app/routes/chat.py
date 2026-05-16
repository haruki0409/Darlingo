"""WebSocket chat route: authenticates, persists, and streams Gemini replies.

Two modes:
- Plain chat — a free conversation with the companion (Phase 1 behaviour).
- Chapter chat — when the conversation belongs to a story chapter, the system
  prompt carries the chapter scenario/objective, and the partner tags each
  reply with `[emotion:x]` and emits `[chapter_complete]` when the objective
  is met. Chapter replies are buffered (not token-streamed) so the tags can be
  parsed out before the text reaches the client.

Auth: the client passes the Supabase JWT as a query param (`/ws/chat?token=`),
optionally with `&conversation_id=` to resume or join a chapter conversation.
"""

import logging
import re
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
from sqlalchemy import select

from app.auth import get_or_create_user, verify_supabase_token
from app.config import settings
from app.db import SessionLocal
from app.models import Chapter, Conversation, Message, Partner, Story
from app.persona import build_chapter_instruction, build_system_instruction
from app.story import EMOTIONS

logger = logging.getLogger(__name__)

router = APIRouter()

_client: genai.Client | None = None

# Matches both `[emotion:happy]` and the shorthand `[happy]` the model often
# emits. `[en]` also matches the pattern but is ignored (not a known emotion).
_EMOTION_RE = re.compile(r"\[(?:emotion:\s*)?([a-zA-Z]+)\]", re.IGNORECASE)
_COMPLETE_RE = re.compile(r"\[chapter_complete\]", re.IGNORECASE)


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


def _parse_chapter_reply(text: str) -> tuple[str | None, bool, str]:
    """Pull the emotion tag and `[chapter_complete]` marker out of a chapter
    reply, returning (emotion, is_complete, clean_text).

    Accepts both `[emotion:happy]` and the shorthand `[happy]`. Leaves the
    `[en]` gloss marker untouched (it is not a known emotion)."""
    emotion_set = {e.lower() for e in EMOTIONS}

    emotion: str | None = None
    for match in _EMOTION_RE.finditer(text):
        word = match.group(1).lower()
        if word in emotion_set:
            emotion = word
            break

    is_complete = bool(_COMPLETE_RE.search(text))

    def _strip_emotion(match: "re.Match[str]") -> str:
        # Remove emotion tags only; keep anything else (e.g. `[en]`).
        return "" if match.group(1).lower() in emotion_set else match.group(0)

    clean = _COMPLETE_RE.sub("", text)
    clean = _EMOTION_RE.sub(_strip_emotion, clean)
    return emotion, is_complete, clean.strip()


async def _build_instruction(
    db, conversation: Conversation
) -> tuple[str, bool]:
    """Return (system_instruction, is_chapter_mode) for a conversation."""
    if conversation.chapter_id is None:
        return (
            build_system_instruction(conversation.language, conversation.level),
            False,
        )

    chapter = await db.get(Chapter, conversation.chapter_id)
    story = await db.get(Story, chapter.story_id)
    partner = await db.get(Partner, story.partner_id)

    prior_summary: str | None = None
    if chapter.idx > 1:
        prev = (
            await db.execute(
                select(Chapter).where(
                    Chapter.story_id == story.id,
                    Chapter.idx == chapter.idx - 1,
                )
            )
        ).scalar_one_or_none()
        prior_summary = prev.summary if prev else None

    scene = chapter.scene or {}
    instruction = build_chapter_instruction(
        partner_name=partner.name,
        persona=partner.persona_prompt,
        language=story.language,
        level=story.level,
        story_title=story.title,
        chapter_title=chapter.title,
        chapter_premise=chapter.premise,
        objective=chapter.objective,
        setting_tag=chapter.setting_tag,
        opening_line=scene.get("partner_opening_line", ""),
        prior_summary=prior_summary,
    )
    return instruction, True


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

    async with SessionLocal() as db:
        user = await get_or_create_user(db, supabase_user)
        user_id = user.id

    resume_id = websocket.query_params.get("conversation_id")

    chat_session = None
    conversation_id: uuid.UUID | None = None
    is_chapter_mode = False

    try:
        while True:
            data = await websocket.receive_json()
            message = (data.get("message") or "").strip()
            language = data.get("language", "ko")
            level = data.get("level", "beginner")
            if not message:
                continue

            # --- First message: create/resume the conversation ------------
            if chat_session is None:
                async with SessionLocal() as db:
                    conversation: Conversation | None = None
                    if resume_id:
                        conversation = await db.get(
                            Conversation, uuid.UUID(resume_id)
                        )
                        if conversation and conversation.user_id != user_id:
                            conversation = None

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
                    instruction, is_chapter_mode = await _build_instruction(
                        db, conversation
                    )

                chat_session = get_client().aio.chats.create(
                    model=settings.gemini_model,
                    config=types.GenerateContentConfig(
                        system_instruction=instruction,
                    ),
                    history=history,
                )
                await websocket.send_json(
                    {"type": "conversation", "id": str(conversation_id)}
                )

            # --- Persist the user message ---------------------------------
            async with SessionLocal() as db:
                db.add(
                    Message(
                        conversation_id=conversation_id,
                        role="user",
                        content=message,
                    )
                )
                await db.commit()

            # --- Generate the reply ---------------------------------------
            try:
                reply_parts: list[str] = []
                stream = await chat_session.send_message_stream(message)
                async for chunk in stream:
                    if chunk.text:
                        reply_parts.append(chunk.text)
                        # Plain chat streams live; chapter chat is buffered so
                        # the emotion / completion tags can be stripped first.
                        if not is_chapter_mode:
                            await websocket.send_json(
                                {"type": "chunk", "text": chunk.text}
                            )
                full_reply = "".join(reply_parts)

                if is_chapter_mode:
                    emotion, complete, clean = _parse_chapter_reply(full_reply)
                    await websocket.send_json({"type": "chunk", "text": clean})
                    await websocket.send_json(
                        {
                            "type": "done",
                            "emotion": emotion,
                            "chapter_complete": complete,
                        }
                    )
                    saved_text, saved_emotion = clean, emotion
                else:
                    await websocket.send_json({"type": "done"})
                    saved_text, saved_emotion = full_reply, None
            except Exception:
                logger.exception("Gemini request failed")
                await websocket.send_json(
                    {
                        "type": "error",
                        "text": "Sorry, something went wrong. Please try again.",
                    }
                )
                continue

            # --- Persist the companion reply ------------------------------
            if saved_text:
                async with SessionLocal() as db:
                    db.add(
                        Message(
                            conversation_id=conversation_id,
                            role="companion",
                            content=saved_text,
                            emotion=saved_emotion,
                        )
                    )
                    await db.commit()
    except WebSocketDisconnect:
        logger.info("Client disconnected from chat socket")
