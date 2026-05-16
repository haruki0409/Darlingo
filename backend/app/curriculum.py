"""AI curriculum generation.

Milestone C1: generates a structured curriculum (units -> lessons -> target
items) for a language and level. Exercises are generated later (Milestone C2).

The curriculum is global — shared by all users — and generated once per
(language, level) combination.
"""

import logging

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

LANGUAGE_NAMES = {"ko": "Korean", "ja": "Japanese"}
FRAMEWORKS = {"ko": "the TOPIK framework", "ja": "the JLPT framework"}


class TargetItem(BaseModel):
    term: str
    reading: str
    meaning: str
    kind: str  # "vocab" or "grammar"


class LessonOutline(BaseModel):
    idx: int
    title: str
    focus: str
    target_items: list[TargetItem]


class UnitOutline(BaseModel):
    idx: int
    title: str
    description: str
    lessons: list[LessonOutline]


class Curriculum(BaseModel):
    units: list[UnitOutline]


_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def generate_curriculum(language: str, level: str) -> Curriculum:
    """Generate a full structured curriculum for a language and level."""
    lang_name = LANGUAGE_NAMES.get(language, "Korean")
    framework = FRAMEWORKS.get(language, "the TOPIK framework")

    prompt = f"""You are a language curriculum designer. Create a structured \
{lang_name} curriculum for a "{level}"-level learner, aligned with {framework}.

REQUIREMENTS
- Produce exactly 5 units, idx 1 to 5. Each unit is a coherent theme \
(e.g. greetings, food, daily routine, shopping, basic past tense).
- Each unit has exactly 3 lessons, idx 1 to 3.
- Each lesson has a short 'focus' (one sentence on what it teaches) and \
exactly 5 target_items.
- Each target item: term (in {lang_name}), reading (a pronunciation aid), \
meaning (English), and kind — either "vocab" or "grammar".
- Order units and lessons from easier to harder; vocabulary should build up.
- Keep everything appropriate for the "{level}" level.

Return the curriculum as structured JSON."""

    response = await _get_client().aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=Curriculum,
        ),
    )

    curriculum = response.parsed
    if not isinstance(curriculum, Curriculum):
        raise ValueError("Curriculum generation returned no usable result")
    return curriculum


# --------------------------------------------------------------------------
# C2 — lesson exercises
# --------------------------------------------------------------------------


class Exercise(BaseModel):
    type: str  # "multiple_choice" or "translate"
    prompt: str
    options: list[str]
    answer: str


class LessonExercises(BaseModel):
    exercises: list[Exercise]


async def generate_lesson_exercises(
    *,
    lesson_title: str,
    focus: str,
    target_items: list[dict],
    language: str,
    level: str,
) -> LessonExercises:
    """Generate practice exercises from a lesson's target items."""
    lang_name = LANGUAGE_NAMES.get(language, "Korean")
    items = "\n".join(
        f"- {it.get('term')} ({it.get('reading')}): {it.get('meaning')} "
        f"[{it.get('kind')}]"
        for it in target_items
    )

    prompt = f"""Create 6 practice exercises for this {lang_name} lesson \
("{level}" level).

LESSON: {lesson_title}
FOCUS: {focus}
TARGET ITEMS:
{items}

Use a mix of two exercise types:
- "multiple_choice": a question with exactly 4 options, one correct. Test \
recognition — the meaning of a word, or which word fits.
- "translate": ask the learner to translate a short phrase; state the \
direction in the prompt (e.g. "Translate to {lang_name}: ...").

For each exercise provide:
- type: "multiple_choice" or "translate"
- prompt: the question or instruction
- options: 4 options for multiple_choice; an empty list for translate
- answer: the correct answer — the exact correct option for multiple_choice, \
or a natural correct translation for translate

Base the exercises on the target items above. Return structured JSON."""

    response = await _get_client().aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=LessonExercises,
        ),
    )
    result = response.parsed
    if not isinstance(result, LessonExercises):
        raise ValueError("Exercise generation returned no usable result")
    return result


class GradeResult(BaseModel):
    correct: bool
    feedback: str


async def grade_translation(
    *,
    task: str,
    expected: str,
    user_answer: str,
    language: str,
) -> GradeResult:
    """Judge a learner's free-text translation answer, leniently."""
    lang_name = LANGUAGE_NAMES.get(language, "Korean")
    prompt = f"""You are gently grading a {lang_name} learner's translation.

TASK GIVEN TO THE LEARNER: {task}
A CORRECT ANSWER: {expected}
THE LEARNER'S ANSWER: {user_answer}

Decide if the learner's answer is acceptable. Accept reasonable variations, \
minor spacing differences, and valid synonyms. Be encouraging but honest.

Provide:
- correct: true if acceptable, false otherwise
- feedback: one short, friendly sentence; if it is wrong, show the better form

Return structured JSON."""

    response = await _get_client().aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GradeResult,
        ),
    )
    result = response.parsed
    if not isinstance(result, GradeResult):
        raise ValueError("Grading returned no usable result")
    return result
