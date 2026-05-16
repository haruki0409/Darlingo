"""REST endpoints for playing curriculum lessons (Milestone C2).

`POST /lessons/{id}/start` generates the lesson's exercises on first use;
`POST /lessons/{id}/grade` checks one answer (multiple-choice by comparison,
translate by AI). Exercise answers are kept server-side.
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.curriculum import generate_lesson_exercises, grade_translation
from app.db import get_session
from app.models import Lesson, Unit, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lessons", tags=["lessons"])


def _public_exercise(exercise: dict, idx: int) -> dict:
    """An exercise as sent to the client — without the answer."""
    return {
        "index": idx,
        "type": exercise["type"],
        "prompt": exercise["prompt"],
        "options": exercise.get("options", []),
    }


@router.post("/{lesson_id}/start")
async def start_lesson(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> dict:
    """Begin a lesson: generate its exercises on first use, then return them."""
    lesson = await db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    unit = await db.get(Unit, lesson.unit_id)
    if unit is None:
        raise HTTPException(status_code=500, detail="Lesson unit missing")

    if lesson.exercises is None:
        try:
            generated = await generate_lesson_exercises(
                lesson_title=lesson.title,
                focus=lesson.focus,
                target_items=lesson.target_items,
                language=unit.language,
                level=unit.level,
            )
        except Exception:
            logger.exception("Exercise generation failed")
            raise HTTPException(
                status_code=502,
                detail="Could not prepare the lesson, please try again",
            )
        lesson.exercises = [e.model_dump() for e in generated.exercises]
        await db.commit()
        await db.refresh(lesson)

    return {
        "lesson_id": str(lesson.id),
        "title": lesson.title,
        "exercises": [
            _public_exercise(ex, i) for i, ex in enumerate(lesson.exercises)
        ],
    }


class GradeRequest(BaseModel):
    exercise_index: int
    user_answer: str


@router.post("/{lesson_id}/grade")
async def grade_answer(
    lesson_id: uuid.UUID,
    req: GradeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> dict:
    """Grade one answer in a lesson."""
    lesson = await db.get(Lesson, lesson_id)
    if lesson is None or lesson.exercises is None:
        raise HTTPException(status_code=404, detail="Lesson not started")
    if not 0 <= req.exercise_index < len(lesson.exercises):
        raise HTTPException(status_code=400, detail="Bad exercise index")

    exercise = lesson.exercises[req.exercise_index]
    answer = exercise["answer"]

    if exercise["type"] == "multiple_choice":
        correct = req.user_answer.strip() == answer.strip()
        return {"correct": correct, "correct_answer": answer, "feedback": ""}

    # translate — graded by AI
    unit = await db.get(Unit, lesson.unit_id)
    language = unit.language if unit else "ko"
    try:
        result = await grade_translation(
            task=exercise["prompt"],
            expected=answer,
            user_answer=req.user_answer,
            language=language,
        )
    except Exception:
        logger.exception("Grading failed")
        raise HTTPException(
            status_code=502, detail="Could not grade the answer, please try again"
        )
    return {
        "correct": result.correct,
        "correct_answer": answer,
        "feedback": result.feedback,
    }
