"""AI generation of node-based visual-novel stories.

A story is a sequence of typed nodes — narration, dialogue, and quiz. Nodes use
generic `target` / `native` fields so a story works for either learning
direction:
  - Japanese stories: target = Japanese, native = Korean
  - Korean stories:   target = Korean,   native = Japanese
"""

import json
import logging
from pathlib import Path

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

# language code -> (target language name, the learner's translation language)
_LANG_PAIR = {
    "ja": ("Japanese", "Korean"),
    "ko": ("Korean", "Japanese"),
}


class StoryNodeGen(BaseModel):
    """One story node. A flat shape — only the fields relevant to `type` are
    populated; the rest stay empty."""

    type: str  # "narration" | "dialogue" | "quiz"
    # narration & dialogue
    target: str = ""  # text in the language being learned
    native: str = ""  # translation in the learner's language
    # dialogue only
    speaker: str = ""
    reading: str = ""  # romanization of the target line
    # quiz only
    prompt: str = ""
    options: list[str] = []
    correct_index: int = 0
    explanation: str = ""


class GeneratedStory(BaseModel):
    title: str
    nodes: list[StoryNodeGen]


# Pre-made story concepts — nodes are generated lazily on first play.
# `companion` is informational (the love-interest character); "guy" entries are
# the male-companion versions.
PREMADE_STORIES: list[dict] = [
    # --- Japanese stories (target = Japanese) ---
    {"language": "ja", "title": "First Day in Tokyo",
     "premise": "A newcomer gets lost near Shinjuku station and is helped by a warm, cheerful local woman named Akari."},
    {"language": "ja", "title": "The Cat Cafe",
     "premise": "Two strangers bond over the cats at a cozy Tokyo cat cafe on a rainy afternoon; the companion is a gentle woman named Yuki."},
    {"language": "ja", "title": "Cherry Blossom Picnic",
     "premise": "A spring hanami picnic in Ueno Park where the player grows close to a kind woman named Akari."},
    {"language": "ja", "title": "Summer Festival",
     "premise": "An evening at a summer matsuri — yukata, games, fireworks — and a chance meeting with a friendly, easygoing young man named Haruto."},
    {"language": "ja", "title": "Train to Kyoto",
     "premise": "A long shinkansen ride where the player and a thoughtful woman named Sora share stories about their travels."},
    {"language": "ja", "title": "The Bookshop Corner",
     "premise": "A quiet used-bookshop where a recommendation from a calm, witty young man named Daiki sparks an unexpected friendship."},
    {"language": "ja", "title": "Convenience Store at Midnight",
     "premise": "A late-night konbini run leads to a small, warm conversation with the night-shift clerk, a friendly woman named Mei."},
    {"language": "ja", "title": "The Cooking Class",
     "premise": "A beginner cooking class where the player teams up with a cheerful woman named Hana to make a simple Japanese dish."},
    {"language": "ja", "title": "Rainy Day Umbrella",
     "premise": "Sharing an umbrella in a sudden Tokyo downpour turns a commute into a meeting with a soft-spoken woman named Rin."},
    {"language": "ja", "title": "The Beach Trip",
     "premise": "A seaside day trip in Kamakura with a lively, sun-loving young man named Sota — swimming, snacks, and sunset talk."},
    # --- Korean stories (target = Korean) ---
    {"language": "ko", "title": "First Day in Seoul",
     "premise": "A newcomer gets lost near Hongdae and is helped by a warm, bright local woman named Jiwoo."},
    {"language": "ko", "title": "The Cat Cafe in Seoul",
     "premise": "Two strangers bond over the cats at a cozy cat cafe in Seoul on a rainy afternoon; the companion is a gentle woman named Yuna."},
    {"language": "ko", "title": "Cherry Blossom Walk",
     "premise": "A spring walk among the cherry blossoms along the Han River where the player grows close to a kind woman named Soyeon."},
    {"language": "ko", "title": "Hangang Picnic",
     "premise": "A riverside picnic at Hangang Park with a friendly, easygoing young man named Minjun — chicken, mats, and city lights."},
    {"language": "ko", "title": "The Night Market",
     "premise": "An evening at Gwangjang Market — street food and lively stalls — and a chance meeting with a charming young man named Doyoon."},
    {"language": "ko", "title": "The Bookcafe",
     "premise": "A quiet book-cafe in Seongsu where a recommendation from a calm, witty woman named Hyejin sparks a friendship."},
    {"language": "ko", "title": "Convenience Store at Midnight",
     "premise": "A late-night convenience-store run leads to a warm conversation with the night-shift clerk, a friendly woman named Eunbi."},
    {"language": "ko", "title": "The Pottery Class",
     "premise": "A beginner pottery class in Insadong where the player teams up with a cheerful woman named Areum."},
    {"language": "ko", "title": "Rainy Day in Insadong",
     "premise": "Sharing an umbrella in a sudden downpour in Insadong turns a stroll into a meeting with a soft-spoken woman named Chaewon."},
    {"language": "ko", "title": "Namsan Sunset",
     "premise": "A walk up to Namsan Tower at golden hour with a lively, kind young man named Jihun — views, snacks, and easy talk."},
]


_client: genai.Client | None = None

_PREMADE_NODES_PATH = Path(__file__).parent / "premade_nodes.json"
_premade_nodes_cache: dict[str, list[dict]] | None = None


def premade_key(language: str, title: str) -> str:
    """Stable key used to look up pre-generated node sequences in
    `premade_nodes.json`. Title is not unique across languages, so we namespace
    by language."""
    return f"{language}|{title}"


def load_premade_nodes(*, refresh: bool = False) -> dict[str, list[dict]]:
    """Return the cached `{language|title: nodes}` map for premade stories.

    The map is loaded from `premade_nodes.json` next to this module; if the
    file is missing (no one ran the seed script yet) we return an empty dict
    and let callers handle the absence.
    """
    global _premade_nodes_cache
    if _premade_nodes_cache is None or refresh:
        if _PREMADE_NODES_PATH.exists():
            _premade_nodes_cache = json.loads(
                _PREMADE_NODES_PATH.read_text(encoding="utf-8")
            )
        else:
            _premade_nodes_cache = {}
    return _premade_nodes_cache


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def generate_story_nodes(
    *, premise: str, language: str, level: str
) -> GeneratedStory:
    """Generate a full node-based story from a premise for a target language."""
    target_name, native_name = _LANG_PAIR.get(language, _LANG_PAIR["ja"])

    prompt = f"""You are writing an interactive {target_name}-learning visual \
novel. The learner reads {target_name} with {native_name} translations, at \
"{level}" level.

STORY PREMISE: {premise}

Write the story as a sequence of 16 to 24 nodes. Each node is exactly one of:

- narration — scene-setting prose. Set type="narration", target (the narration \
in {target_name}), native (a natural {native_name} translation).
- dialogue — a character speaking. Set type="dialogue", speaker (the \
character's name), target (the spoken line in {target_name}), reading \
(romanization of the line), native (a natural {native_name} translation).
- quiz — a short comprehension check about a word or phrase from nearby \
dialogue. Set type="quiz", prompt (the question, written in {native_name}), \
options (exactly 4 answer choices in {native_name}), correct_index (0-3), \
explanation (a short {native_name} explanation).

GUIDELINES
- Open with 1-2 narration nodes, then mix dialogue and narration naturally.
- Include 3 to 5 quiz nodes spread through the story; each must test a word or \
phrase that appeared in a nearby dialogue node.
- Keep the {target_name} suitable for "{level}" level. Keep the story warm, \
wholesome, and self-contained with a satisfying ending.
- Leave fields that do not apply to a node's type empty.

Return the story as structured JSON."""

    # Generation occasionally returns a degenerate (too-short, quiz-less)
    # story — retry a couple of times and keep the best attempt.
    best: GeneratedStory | None = None
    for attempt in range(2):
        response = await _get_client().aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeneratedStory,
            ),
        )
        story = response.parsed
        if not isinstance(story, GeneratedStory):
            continue
        has_quiz = any(n.type == "quiz" for n in story.nodes)
        if len(story.nodes) >= 10 and has_quiz:
            return story
        logger.warning(
            "Degenerate story generation (attempt %d): %d nodes, quiz=%s",
            attempt + 1,
            len(story.nodes),
            has_quiz,
        )
        if best is None or len(story.nodes) > len(best.nodes):
            best = story

    if best is None:
        raise ValueError("Story node generation returned no usable result")
    return best
