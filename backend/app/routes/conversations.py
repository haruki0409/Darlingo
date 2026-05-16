"""REST endpoints for browsing past conversations and their messages.

All routes require a valid Supabase JWT (Authorization: Bearer <token>) and
only ever return data belonging to the authenticated user.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_session
from app.models import Conversation, Message, User

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("")
async def list_conversations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[dict]:
    """List the current user's conversations, newest first."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.started_at.desc())
    )
    return [
        {
            "id": str(c.id),
            "language": c.language,
            "level": c.level,
            "started_at": c.started_at.isoformat(),
        }
        for c in result.scalars().all()
    ]


@router.get("/{conversation_id}/messages")
async def list_messages(
    conversation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[dict]:
    """Return all messages in a conversation owned by the current user."""
    conversation = await db.get(Conversation, conversation_id)
    if conversation is None or conversation.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat(),
        }
        for m in result.scalars().all()
    ]
