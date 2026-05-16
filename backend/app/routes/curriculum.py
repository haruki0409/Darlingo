"""REST endpoint for the structured curriculum (Curriculum Mode).

The curriculum is global and generated once per (language, level): the first
request for a combination triggers AI generation and persists it; later
requests are served straight from the database.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.curriculum import generate_curriculum
from app.db import get_session
from app.models import Lesson, Unit, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/curriculum", tags=["curriculum"])


def _lesson_dict(lesson: Lesson) -> dict:
    return {
        "id": str(lesson.id),
        "idx": lesson.idx,
        "title": lesson.title,
        "focus": lesson.focus,
        "target_items": lesson.target_items,
        "has_exercises": lesson.exercises is not None,
    }


def _unit_dict(unit: Unit, lessons: list[Lesson]) -> dict:
    return {
        "id": str(unit.id),
        "idx": unit.idx,
        "title": unit.title,
        "description": unit.description,
        "lessons": [_lesson_dict(le) for le in lessons],
    }


async def _load_units(db: AsyncSession, language: str, level: str) -> list[Unit]:
    result = await db.execute(
        select(Unit)
        .where(Unit.language == language, Unit.level == level)
        .order_by(Unit.idx)
    )
    return list(result.scalars().all())


@router.get("")
async def get_curriculum(
    language: str = "ko",
    level: str = "beginner",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> dict:
    """Return the curriculum for a language+level, generating it on first use."""
    units = await _load_units(db, language, level)

    if not units:
        try:
            outline = await generate_curriculum(language, level)
        except Exception:
            logger.exception("Curriculum generation failed")
            raise HTTPException(
                status_code=502,
                detail="Curriculum generation failed, please try again",
            )

        for unit_outline in outline.units:
            unit = Unit(
                language=language,
                level=level,
                idx=unit_outline.idx,
                title=unit_outline.title,
                description=unit_outline.description,
            )
            db.add(unit)
            await db.flush()  # assign unit.id
            for lesson_outline in unit_outline.lessons:
                db.add(
                    Lesson(
                        unit_id=unit.id,
                        idx=lesson_outline.idx,
                        title=lesson_outline.title,
                        focus=lesson_outline.focus,
                        target_items=[
                            item.model_dump()
                            for item in lesson_outline.target_items
                        ],
                    )
                )
        await db.commit()
        units = await _load_units(db, language, level)

    result = []
    for unit in units:
        lessons = (
            await db.execute(
                select(Lesson)
                .where(Lesson.unit_id == unit.id)
                .order_by(Lesson.idx)
            )
        ).scalars().all()
        result.append(_unit_dict(unit, list(lessons)))

    return {"language": language, "level": level, "units": result}
