"""AI-powered word lookup.

Breaks a sentence into its individual words with readings and meanings, so a
learner can tap a line and understand it. Uses Gemini instead of installing
JA/KO tokenizers + dictionaries — it handles conjugated forms in context and
needs no system dependencies.
"""

import logging

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

LANGUAGE_NAMES = {"ko": "Korean", "ja": "Japanese"}


class WordEntry(BaseModel):
    word: str
    reading: str
    meaning: str


class Breakdown(BaseModel):
    words: list[WordEntry]


_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def break_down_sentence(text: str, language: str) -> Breakdown:
    """Split a sentence into words with readings and short meanings."""
    lang_name = LANGUAGE_NAMES.get(language, "Korean")
    reading_kind = "hiragana" if language == "ja" else "romanization"

    prompt = f"""Break this {lang_name} sentence into its individual words for \
a language learner.

SENTENCE: {text}

For each word, in the order it appears, provide:
- word: the word exactly as it appears in the sentence
- reading: a pronunciation aid ({reading_kind})
- meaning: a short English meaning; if the word is conjugated or inflected, \
include its dictionary/base form in the meaning

Skip pure punctuation. Return structured JSON."""

    response = await _get_client().aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=Breakdown,
        ),
    )

    breakdown = response.parsed
    if not isinstance(breakdown, Breakdown):
        raise ValueError("Word breakdown returned no usable result")
    return breakdown
