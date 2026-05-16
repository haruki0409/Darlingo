"""AI story generation.

Milestone 2A: story-outline generation. Given a user's customization choices,
Gemini produces a title, premise, and the per-chapter breakdown. Chapter scenes
and summaries are generated later (Milestone 2B).
"""

import logging

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

# Background settings the asset pack must provide. The AI may only choose a
# chapter setting from this list. Keep in sync with the background asset pack
# (see docs/STORY_MODE_PLAN.md section 8).
SETTING_TAGS = [
    "classroom",
    "schoolyard",
    "hallway",
    "cafe",
    "restaurant",
    "street",
    "park",
    "home_room",
    "train_station",
    "convenience_store",
    "rooftop",
    "park_night",
]

# Emotions the AI may tag a line with. The assets team's sprite sets must
# cover this exact list (see docs/STORY_MODE_PLAN.md section 8).
EMOTIONS = [
    "neutral",
    "happy",
    "sad",
    "surprised",
    "embarrassed",
    "shy",
    "thinking",
    "excited",
]

LANGUAGE_NAMES = {"ko": "Korean", "ja": "Japanese"}


class ChapterOutline(BaseModel):
    idx: int
    title: str
    premise: str
    setting_tag: str
    objective: str
    target_vocab: list[str]
    target_grammar: list[str]


class StoryOutline(BaseModel):
    title: str
    premise: str
    setting_overview: str
    chapters: list[ChapterOutline]


_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def _build_prompt(
    *,
    language: str,
    level: str,
    genre: str,
    tone: str,
    setting: str,
    premise: str,
    partner_name: str,
    total_chapters: int,
) -> str:
    lang_name = LANGUAGE_NAMES.get(language, "Korean")
    tags = ", ".join(SETTING_TAGS)
    return f"""You are a story designer for a visual-novel language-learning app. \
The learner is studying {lang_name} at {level} level. Design an engaging, \
wholesome story they will play by chatting with their companion, {partner_name}.

THE PLAYER'S CHOICES
- Genre: {genre}
- Tone: {tone}
- Setting / world: {setting}
- Their story idea (free text): "{premise}"

REQUIREMENTS
- Produce EXACTLY {total_chapters} chapters, with idx running 1 to {total_chapters}.
- Give the whole story an arc: a hook, rising development, and a satisfying close.
- Each chapter needs a clear, conversational objective the learner can reach by \
talking with {partner_name} (e.g. "introduce yourself", "invite {partner_name} to \
the festival", "clear up the misunderstanding").
- Each chapter's setting_tag MUST be exactly one of: {tags}
- target_vocab and target_grammar must suit {lang_name} at {level} level and \
should build gradually across chapters.
- Keep everything wholesome and appropriate for all audiences. If the player's \
idea is unsuitable, gently adapt it into something appropriate.
- Write titles, premises, and the setting overview in English (these are shown \
in the chapter menu).

Return the story outline as structured JSON."""


async def generate_story_outline(
    *,
    language: str,
    level: str,
    genre: str,
    tone: str,
    setting: str,
    premise: str,
    partner_name: str,
    total_chapters: int,
) -> StoryOutline:
    """Generate a full story outline from the user's customization choices."""
    prompt = _build_prompt(
        language=language,
        level=level,
        genre=genre,
        tone=tone,
        setting=setting,
        premise=premise,
        partner_name=partner_name,
        total_chapters=total_chapters,
    )

    response = await _get_client().aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=StoryOutline,
        ),
    )

    outline = response.parsed
    if not isinstance(outline, StoryOutline):
        raise ValueError("Story outline generation returned no usable result")

    # Defend against the model picking an unknown setting tag.
    for chapter in outline.chapters:
        if chapter.setting_tag not in SETTING_TAGS:
            logger.warning(
                "Model returned unknown setting_tag %r; defaulting to 'street'",
                chapter.setting_tag,
            )
            chapter.setting_tag = "street"

    return outline


# --------------------------------------------------------------------------
# Tier 2 — chapter scene generation
# --------------------------------------------------------------------------


class ChapterScene(BaseModel):
    opening_narration: str
    partner_opening_line: str
    partner_opening_line_en: str
    partner_emotion: str
    objective_hint: str


def _build_scene_prompt(
    *,
    partner_name: str,
    persona: str,
    story_title: str,
    chapter_title: str,
    chapter_premise: str,
    setting_tag: str,
    objective: str,
    language: str,
    level: str,
    prior_summary: str | None,
) -> str:
    lang_name = LANGUAGE_NAMES.get(language, "Korean")
    emotions = ", ".join(EMOTIONS)
    previously = f"\nPREVIOUSLY\n{prior_summary}\n" if prior_summary else ""
    return f"""You are opening a chapter of a visual-novel language-learning story.

PARTNER
{partner_name} — {persona}

STORY: "{story_title}"
THIS CHAPTER: "{chapter_title}"
{chapter_premise}
Setting: {setting_tag}
Objective for the learner: {objective}
{previously}
The learner studies {lang_name} at {level} level.

Write the opening of this chapter:
- opening_narration: 1-2 sentences of scene-setting narration, in English.
- partner_opening_line: {partner_name}'s first spoken line, in {lang_name}, \
suitable for {level} level.
- partner_opening_line_en: a natural English translation of that line.
- partner_emotion: {partner_name}'s emotion — exactly one of: {emotions}
- objective_hint: a short, friendly English hint about what the learner should \
try to do in this chapter.

Keep it warm and wholesome. Return structured JSON."""


async def generate_chapter_scene(
    *,
    partner_name: str,
    persona: str,
    story_title: str,
    chapter_title: str,
    chapter_premise: str,
    setting_tag: str,
    objective: str,
    language: str,
    level: str,
    prior_summary: str | None = None,
) -> ChapterScene:
    """Generate the opening scene of a chapter (narration + partner's first line)."""
    prompt = _build_scene_prompt(
        partner_name=partner_name,
        persona=persona,
        story_title=story_title,
        chapter_title=chapter_title,
        chapter_premise=chapter_premise,
        setting_tag=setting_tag,
        objective=objective,
        language=language,
        level=level,
        prior_summary=prior_summary,
    )

    response = await _get_client().aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ChapterScene,
        ),
    )

    scene = response.parsed
    if not isinstance(scene, ChapterScene):
        raise ValueError("Chapter scene generation returned no usable result")

    if scene.partner_emotion not in EMOTIONS:
        scene.partner_emotion = "neutral"

    return scene


# --------------------------------------------------------------------------
# Wrap-up — chapter summary
# --------------------------------------------------------------------------


class ChapterWrapup(BaseModel):
    summary: str
    vocab_practiced: list[str]


async def summarize_chapter(
    *,
    chapter_title: str,
    objective: str,
    transcript: str,
    language: str,
) -> ChapterWrapup:
    """Summarize a finished chapter for continuity and produce a vocab recap."""
    lang_name = LANGUAGE_NAMES.get(language, "Korean")
    prompt = f"""A learner just finished a chapter of a {lang_name} \
language-learning story.

CHAPTER: "{chapter_title}"
OBJECTIVE: {objective}

TRANSCRIPT
{transcript}

Write:
- summary: 2-3 sentences in English recapping what happened, so the next \
chapter can continue naturally from it.
- vocab_practiced: up to 8 useful {lang_name} words or short phrases that came \
up in the conversation.

Return structured JSON."""

    response = await _get_client().aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ChapterWrapup,
        ),
    )

    wrapup = response.parsed
    if not isinstance(wrapup, ChapterWrapup):
        raise ValueError("Chapter wrap-up generation returned no usable result")
    return wrapup


# --------------------------------------------------------------------------
# Beginner aid — suggested replies
# --------------------------------------------------------------------------


class ReplySuggestion(BaseModel):
    text: str
    translation: str


class ReplySuggestions(BaseModel):
    suggestions: list[ReplySuggestion]


async def generate_reply_suggestions(
    *,
    transcript: str,
    language: str,
    level: str,
    objective: str,
) -> ReplySuggestions:
    """Suggest a few things the learner could say next (a beginner aid)."""
    lang_name = LANGUAGE_NAMES.get(language, "Korean")
    prompt = f"""A {lang_name} learner ({level} level) is in a conversation \
and may not know what to say next. Suggest 3 short, natural things THEY could \
say in response.

CONVERSATION SO FAR
{transcript}

CHAPTER OBJECTIVE: {objective}

For each suggestion provide:
- text: a short line the learner could say, in {lang_name}, at {level} level
- translation: its natural English translation

Make the 3 suggestions varied and helpful for moving the scene toward the \
objective. Return structured JSON."""

    response = await _get_client().aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ReplySuggestions,
        ),
    )

    result = response.parsed
    if not isinstance(result, ReplySuggestions):
        raise ValueError("Reply suggestion generation returned no usable result")
    return result
