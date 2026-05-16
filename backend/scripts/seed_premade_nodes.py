"""Pre-generate node sequences for every entry in `PREMADE_STORIES` and dump
the result to `app/premade_nodes.json`.

Run this once on the backend host (needs a valid `GEMINI_API_KEY` in `.env`):

    cd backend
    python -m scripts.seed_premade_nodes

The script is resumable — already-generated entries are skipped, and the
output file is rewritten after every successful entry so a crash mid-run
does not lose work.
"""

import asyncio
import json
import logging
from pathlib import Path

from app.node_story import PREMADE_STORIES, generate_story_nodes, premade_key

OUT_PATH = Path(__file__).resolve().parent.parent / "app" / "premade_nodes.json"

logger = logging.getLogger("seed_premade")


def _load() -> dict[str, list[dict]]:
    if OUT_PATH.exists():
        return json.loads(OUT_PATH.read_text(encoding="utf-8"))
    return {}


def _save(data: dict[str, list[dict]]) -> None:
    OUT_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    cache = _load()
    total = len(PREMADE_STORIES)

    for i, concept in enumerate(PREMADE_STORIES, 1):
        key = premade_key(concept["language"], concept["title"])
        if key in cache:
            logger.info("[%d/%d] skip (cached) %s", i, total, key)
            continue
        logger.info("[%d/%d] generating %s", i, total, key)
        try:
            story = await generate_story_nodes(
                premise=concept["premise"],
                language=concept["language"],
                level="beginner",
            )
            cache[key] = [n.model_dump() for n in story.nodes]
            _save(cache)
        except Exception:
            logger.exception("[%d/%d] failed %s", i, total, key)

    logger.info("Done. %d entries written to %s", len(cache), OUT_PATH)


if __name__ == "__main__":
    asyncio.run(main())
