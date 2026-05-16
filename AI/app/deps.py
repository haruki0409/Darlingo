"""
FastAPI dependency providers.

genai.Client 는 한 프로세스에 1개 공유 (websocket 풀 재사용).
"""

from __future__ import annotations

from functools import lru_cache

from google import genai

from app.config import GENAI_API_VERSION


@lru_cache(maxsize=1)
def get_genai_client() -> genai.Client:
    return genai.Client(http_options={"api_version": GENAI_API_VERSION})
