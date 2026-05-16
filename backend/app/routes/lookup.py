"""REST endpoint for tap-a-line word lookup."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.lookup import break_down_sentence
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lookup", tags=["lookup"])


class LookupRequest(BaseModel):
    text: str
    language: str = "ko"


@router.post("")
async def lookup(
    req: LookupRequest,
    user: User = Depends(get_current_user),
) -> dict:
    """Break a sentence into words with readings and meanings."""
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    try:
        breakdown = await break_down_sentence(text, req.language)
    except Exception:
        logger.exception("Word breakdown failed")
        raise HTTPException(
            status_code=502, detail="Lookup failed, please try again"
        )
    return {"words": [w.model_dump() for w in breakdown.words]}
