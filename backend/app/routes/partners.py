"""REST endpoint for listing selectable AI partners."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_session
from app.models import Partner, User

router = APIRouter(prefix="/partners", tags=["partners"])


@router.get("")
async def list_partners(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[dict]:
    """List all AI partners a user can choose for a story."""
    rows = (
        await db.execute(select(Partner).order_by(Partner.name))
    ).scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "language": p.language,
            "persona_prompt": p.persona_prompt,
            "sprite_set_ref": p.sprite_set_ref,
            "voice_id": p.voice_id,
        }
        for p in rows
    ]
