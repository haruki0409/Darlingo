"""REST endpoints for creating and browsing AI-generated stories.

Creating a story runs the Tier-1 outline generation (see app/story.py) and
persists the story plus its chapter outlines.
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_session
from app.models import Chapter, Partner, Story, User
from app.story import generate_story_outline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stories", tags=["stories"])


class CreateStoryRequest(BaseModel):
    partner_id: uuid.UUID
    genre: str
    tone: str
    setting: str
    premise: str
    language: str = "ko"
    level: str = "beginner"
    total_chapters: int = 5


def _story_dict(s: Story) -> dict:
    return {
        "id": str(s.id),
        "partner_id": str(s.partner_id),
        "title": s.title,
        "premise": s.premise,
        "setting_overview": s.setting_overview,
        "genre": s.genre,
        "tone": s.tone,
        "language": s.language,
        "level": s.level,
        "total_chapters": s.total_chapters,
        "current_chapter_idx": s.current_chapter_idx,
        "status": s.status,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _chapter_dict(c: Chapter) -> dict:
    return {
        "id": str(c.id),
        "idx": c.idx,
        "title": c.title,
        "premise": c.premise,
        "setting_tag": c.setting_tag,
        "objective": c.objective,
        "target_vocab": c.target_vocab,
        "target_grammar": c.target_grammar,
        "status": c.status,
    }


async def _load_chapters(db: AsyncSession, story_id: uuid.UUID) -> list[Chapter]:
    result = await db.execute(
        select(Chapter).where(Chapter.story_id == story_id).order_by(Chapter.idx)
    )
    return list(result.scalars().all())


async def _owned_story(
    db: AsyncSession, story_id: uuid.UUID, user: User
) -> Story:
    story = await db.get(Story, story_id)
    if story is None or story.user_id != user.id:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


@router.post("")
async def create_story(
    req: CreateStoryRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> dict:
    """Create a story: generate the outline, then persist story + chapters."""
    if not 2 <= req.total_chapters <= 12:
        raise HTTPException(
            status_code=400, detail="total_chapters must be between 2 and 12"
        )

    partner = await db.get(Partner, req.partner_id)
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")

    try:
        outline = await generate_story_outline(
            language=req.language,
            level=req.level,
            genre=req.genre,
            tone=req.tone,
            setting=req.setting,
            premise=req.premise,
            partner_name=partner.name,
            total_chapters=req.total_chapters,
        )
    except Exception:
        logger.exception("Story outline generation failed")
        raise HTTPException(
            status_code=502, detail="Story generation failed, please try again"
        )

    story = Story(
        user_id=user.id,
        partner_id=partner.id,
        title=outline.title,
        user_premise=req.premise,
        premise=outline.premise,
        setting_overview=outline.setting_overview,
        genre=req.genre,
        tone=req.tone,
        language=req.language,
        level=req.level,
        total_chapters=len(outline.chapters),
        status="active",
    )
    db.add(story)
    await db.flush()  # assign story.id before adding chapters

    for ch in outline.chapters:
        db.add(
            Chapter(
                story_id=story.id,
                idx=ch.idx,
                title=ch.title,
                premise=ch.premise,
                setting_tag=ch.setting_tag,
                objective=ch.objective,
                target_vocab=ch.target_vocab,
                target_grammar=ch.target_grammar,
                # Chapter 1 is playable immediately; the rest unlock in order.
                status="available" if ch.idx == 1 else "locked",
            )
        )

    await db.commit()
    await db.refresh(story)

    chapters = await _load_chapters(db, story.id)
    return {
        "story": _story_dict(story),
        "chapters": [_chapter_dict(c) for c in chapters],
    }


@router.get("")
async def list_stories(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[dict]:
    """List the current user's stories, newest first."""
    result = await db.execute(
        select(Story)
        .where(Story.user_id == user.id)
        .order_by(Story.created_at.desc())
    )
    return [_story_dict(s) for s in result.scalars().all()]


@router.get("/{story_id}")
async def get_story(
    story_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> dict:
    """Return one story with its chapters."""
    story = await _owned_story(db, story_id, user)
    chapters = await _load_chapters(db, story.id)
    return {
        "story": _story_dict(story),
        "chapters": [_chapter_dict(c) for c in chapters],
    }


@router.get("/{story_id}/chapters")
async def get_chapters(
    story_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[dict]:
    """Return just the chapters of a story."""
    story = await _owned_story(db, story_id, user)
    chapters = await _load_chapters(db, story.id)
    return [_chapter_dict(c) for c in chapters]
