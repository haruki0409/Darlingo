"""REST endpoints for playing story chapters.

`POST /chapters/{id}/start` runs the Tier-2 scene generation (see app/story.py)
and opens the chapter's conversation. Completion / wrap-up is added next.
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_session
from app.models import Chapter, Conversation, Message, Partner, Story, User
from app.routes.stories import _chapter_dict
from app.story import (
    generate_chapter_scene,
    generate_reply_suggestions,
    summarize_chapter,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chapters", tags=["chapters"])


async def _owned_chapter(
    db: AsyncSession, chapter_id: uuid.UUID, user: User
) -> tuple[Chapter, Story]:
    """Load a chapter and its story, ensuring it belongs to the user."""
    chapter = await db.get(Chapter, chapter_id)
    if chapter is None:
        raise HTTPException(status_code=404, detail="Chapter not found")
    story = await db.get(Story, chapter.story_id)
    if story is None or story.user_id != user.id:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter, story


@router.post("/{chapter_id}/start")
async def start_chapter(
    chapter_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> dict:
    """Begin (or resume) a chapter: generate its opening scene and open the
    chapter's conversation."""
    chapter, story = await _owned_chapter(db, chapter_id, user)
    if chapter.status == "locked":
        raise HTTPException(status_code=409, detail="This chapter is locked")

    partner = await db.get(Partner, story.partner_id)
    if partner is None:
        raise HTTPException(status_code=500, detail="Story partner missing")

    # Generate the opening scene once, then reuse it.
    if chapter.scene is None:
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

        try:
            scene = await generate_chapter_scene(
                partner_name=partner.name,
                persona=partner.persona_prompt,
                story_title=story.title,
                chapter_title=chapter.title,
                chapter_premise=chapter.premise,
                setting_tag=chapter.setting_tag,
                objective=chapter.objective,
                language=story.language,
                level=story.level,
                prior_summary=prior_summary,
            )
        except Exception:
            logger.exception("Chapter scene generation failed")
            raise HTTPException(
                status_code=502, detail="Scene generation failed, please try again"
            )
        chapter.scene = scene.model_dump()

    if chapter.status == "available":
        chapter.status = "in_progress"

    # One conversation per chapter — create it on first start.
    conversation = (
        await db.execute(
            select(Conversation).where(Conversation.chapter_id == chapter.id)
        )
    ).scalar_one_or_none()
    if conversation is None:
        conversation = Conversation(
            user_id=user.id,
            language=story.language,
            level=story.level,
            chapter_id=chapter.id,
        )
        db.add(conversation)

    await db.commit()
    await db.refresh(chapter)
    await db.refresh(conversation)

    return {
        "chapter": _chapter_dict(chapter),
        "scene": chapter.scene,
        "conversation_id": str(conversation.id),
        "partner_name": partner.name,
    }


@router.post("/{chapter_id}/complete")
async def complete_chapter(
    chapter_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> dict:
    """Finish a chapter: summarize it for continuity and unlock the next one."""
    chapter, story = await _owned_chapter(db, chapter_id, user)
    if chapter.status == "locked":
        raise HTTPException(status_code=409, detail="This chapter is locked")

    # Build a transcript from the chapter's conversation.
    conversation = (
        await db.execute(
            select(Conversation).where(Conversation.chapter_id == chapter.id)
        )
    ).scalar_one_or_none()

    lines: list[str] = []
    scene = chapter.scene or {}
    if scene.get("partner_opening_line"):
        lines.append(f"companion: {scene['partner_opening_line']}")
    if conversation is not None:
        messages = (
            await db.execute(
                select(Message)
                .where(Message.conversation_id == conversation.id)
                .order_by(Message.created_at)
            )
        ).scalars().all()
        lines.extend(f"{m.role}: {m.content}" for m in messages)
    transcript = "\n".join(lines) or "(no conversation recorded)"

    try:
        wrapup = await summarize_chapter(
            chapter_title=chapter.title,
            objective=chapter.objective,
            transcript=transcript,
            language=story.language,
        )
    except Exception:
        logger.exception("Chapter wrap-up failed")
        raise HTTPException(
            status_code=502, detail="Could not finish the chapter, please try again"
        )

    chapter.summary = wrapup.summary
    chapter.status = "completed"

    # Unlock the next chapter, if there is one.
    next_chapter = (
        await db.execute(
            select(Chapter).where(
                Chapter.story_id == story.id,
                Chapter.idx == chapter.idx + 1,
            )
        )
    ).scalar_one_or_none()
    if next_chapter is not None and next_chapter.status == "locked":
        next_chapter.status = "available"

    if chapter.idx > story.current_chapter_idx:
        story.current_chapter_idx = chapter.idx
    if next_chapter is None:
        story.status = "completed"

    await db.commit()

    return {
        "summary": wrapup.summary,
        "vocab_practiced": wrapup.vocab_practiced,
        "next_chapter_id": str(next_chapter.id) if next_chapter else None,
        "story_completed": next_chapter is None,
    }


@router.post("/{chapter_id}/suggestions")
async def chapter_suggestions(
    chapter_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> dict:
    """Suggest a few things the learner could say next (beginner aid)."""
    chapter, story = await _owned_chapter(db, chapter_id, user)

    lines: list[str] = []
    scene = chapter.scene or {}
    if scene.get("partner_opening_line"):
        lines.append(f"companion: {scene['partner_opening_line']}")

    conversation = (
        await db.execute(
            select(Conversation).where(Conversation.chapter_id == chapter.id)
        )
    ).scalar_one_or_none()
    if conversation is not None:
        messages = (
            await db.execute(
                select(Message)
                .where(Message.conversation_id == conversation.id)
                .order_by(Message.created_at)
            )
        ).scalars().all()
        lines.extend(f"{m.role}: {m.content}" for m in messages)

    # Only the recent turns matter for "what to say next".
    transcript = "\n".join(lines[-6:]) or "(the conversation is just starting)"

    try:
        result = await generate_reply_suggestions(
            transcript=transcript,
            language=story.language,
            level=story.level,
            objective=chapter.objective,
        )
    except Exception:
        logger.exception("Reply suggestion generation failed")
        raise HTTPException(
            status_code=502, detail="Could not generate suggestions"
        )

    return {"suggestions": [s.model_dump() for s in result.suggestions]}
