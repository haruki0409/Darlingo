"""Seed placeholder data so the app works before the assets team delivers real
partners. Idempotent: only inserts when the partners table is empty.
"""

import logging

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Partner

logger = logging.getLogger(__name__)

_PLACEHOLDER_PARTNERS = [
    {
        "name": "Yuna",
        "language": "ko",
        "persona_prompt": (
            "Yuna is a warm, playful, and encouraging Korean companion. She is "
            "curious about the learner's life, patient with mistakes, and chats "
            "like a close friend who happens to be a native Korean speaker."
        ),
    },
    {
        "name": "Yuki",
        "language": "ja",
        "persona_prompt": (
            "Yuki is a warm, playful, and encouraging Japanese companion. She is "
            "curious about the learner's life, patient with mistakes, and chats "
            "like a close friend who happens to be a native Japanese speaker."
        ),
    },
]


async def seed_partners() -> None:
    """Insert placeholder partners if none exist yet."""
    async with SessionLocal() as db:
        existing = (await db.execute(select(Partner.id).limit(1))).first()
        if existing is not None:
            return
        for data in _PLACEHOLDER_PARTNERS:
            db.add(Partner(**data))
        await db.commit()
        logger.info("Seeded %d placeholder partners", len(_PLACEHOLDER_PARTNERS))
