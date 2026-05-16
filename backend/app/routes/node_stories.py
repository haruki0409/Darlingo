"""REST endpoints for node-based stories (the pivoted Story Mode).

Pre-made stories are seeded from `PREMADE_STORIES` on first listing; their node
sequences (and custom stories' nodes) are AI-generated. Nodes for a pre-made
story are generated lazily on first play; custom stories generate on creation.
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_session
from app.models import NodeStory, User
from app.node_story import (
    PREMADE_STORIES,
    generate_story_nodes,
    load_premade_nodes,
    premade_key,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/node-stories", tags=["node-stories"])


def _concept(story: NodeStory) -> dict:
    """A story without its nodes — for list views."""
    return {
        "id": str(story.id),
        "title": story.title,
        "premise": story.premise,
        "language": story.language,
        "level": story.level,
        "is_premade": story.is_premade,
        "ready": story.nodes is not None,
    }


def _full(story: NodeStory) -> dict:
    return {**_concept(story), "nodes": story.nodes or []}


async def _ensure_premade(db: AsyncSession) -> None:
    """Seed pre-made story concepts and backfill their nodes from
    `premade_nodes.json` (produced by `scripts/seed_premade_nodes.py`).

    Idempotent: inserts any concept that is not yet in the DB, and backfills
    nodes on existing rows whose `nodes` is still NULL.
    """
    nodes_map = load_premade_nodes()

    existing = (
        await db.execute(
            select(NodeStory).where(NodeStory.is_premade.is_(True))
        )
    ).scalars().all()
    existing_keys = {premade_key(s.language, s.title) for s in existing}

    inserted = 0
    for concept in PREMADE_STORIES:
        key = premade_key(concept["language"], concept["title"])
        if key in existing_keys:
            continue
        db.add(
            NodeStory(
                title=concept["title"],
                premise=concept["premise"],
                language=concept["language"],
                level="beginner",
                is_premade=True,
                nodes=nodes_map.get(key),
            )
        )
        inserted += 1

    backfilled = 0
    for s in existing:
        if s.nodes is None:
            cached = nodes_map.get(premade_key(s.language, s.title))
            if cached is not None:
                s.nodes = cached
                backfilled += 1

    if inserted or backfilled:
        await db.commit()
        logger.info(
            "Premade seed: %d inserted, %d backfilled (cache has %d entries)",
            inserted,
            backfilled,
            len(nodes_map),
        )


@router.get("")
async def list_node_stories(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> dict:
    """List pre-made stories and the user's custom stories."""
    await _ensure_premade(db)
    premade = (
        await db.execute(
            select(NodeStory)
            .where(NodeStory.is_premade.is_(True))
            .order_by(NodeStory.created_at)
        )
    ).scalars().all()
    custom = (
        await db.execute(
            select(NodeStory)
            .where(NodeStory.user_id == user.id)
            .order_by(NodeStory.created_at.desc())
        )
    ).scalars().all()
    return {
        "premade": [_concept(s) for s in premade],
        "custom": [_concept(s) for s in custom],
    }


@router.get("/{story_id}")
async def get_node_story(
    story_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> dict:
    """Return a story with its nodes, generating them on first play."""
    story = await db.get(NodeStory, story_id)
    if story is None or (
        story.user_id is not None and story.user_id != user.id
    ):
        raise HTTPException(status_code=404, detail="Story not found")

    if story.nodes is None:
        # Premade stories are served entirely from the pre-generated JSON
        # cache; if a row is missing nodes the cache is incomplete, not a
        # signal to call the LLM.
        if story.is_premade:
            raise HTTPException(
                status_code=503,
                detail=(
                    "This story has not been prepared yet. "
                    "Run `python -m scripts.seed_premade_nodes` once on the "
                    "backend host to generate node sequences."
                ),
            )
        try:
            generated = await generate_story_nodes(
                premise=story.premise,
                language=story.language,
                level=story.level,
            )
        except Exception:
            logger.exception("Story node generation failed")
            raise HTTPException(
                status_code=502,
                detail="Story generation failed, please try again",
            )
        story.nodes = [node.model_dump() for node in generated.nodes]
        await db.commit()
        await db.refresh(story)

    return _full(story)


class CreateNodeStory(BaseModel):
    premise: str
    language: str = "ja"
    level: str = "beginner"


@router.post("")
async def create_node_story(
    req: CreateNodeStory,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> dict:
    """Create a custom story from the user's premise (generates nodes now)."""
    premise = req.premise.strip()
    if not premise:
        raise HTTPException(status_code=400, detail="premise is required")

    try:
        generated = await generate_story_nodes(
            premise=premise, language=req.language, level=req.level
        )
    except Exception:
        logger.exception("Custom story generation failed")
        raise HTTPException(
            status_code=502, detail="Story generation failed, please try again"
        )

    story = NodeStory(
        user_id=user.id,
        title=generated.title,
        premise=premise,
        language=req.language,
        level=req.level,
        is_premade=False,
        nodes=[node.model_dump() for node in generated.nodes],
    )
    db.add(story)
    await db.commit()
    await db.refresh(story)
    return _full(story)
