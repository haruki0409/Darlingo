"""Supabase authentication.

We verify a Supabase-issued JWT by asking Supabase who it belongs to
(`GET /auth/v1/user`). This avoids managing JWT signing keys locally and is
always correct — the small HTTP cost is fine for a hackathon.
"""

import logging
import uuid

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_session
from app.models import User

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer()


async def verify_supabase_token(token: str) -> dict:
    """Validate a Supabase JWT and return the Supabase user record.

    Raises HTTPException(401) if the token is missing, invalid, or expired.
    """
    url = f"{settings.supabase_url}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.supabase_anon_key,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return resp.json()


async def get_or_create_user(session: AsyncSession, supabase_user: dict) -> User:
    """Return the app-side User row for a Supabase user, creating it if new."""
    user_id = uuid.UUID(supabase_user["id"])
    user = await session.get(User, user_id)
    if user is None:
        user = User(id=user_id, email=supabase_user.get("email"))
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    """FastAPI dependency: authenticate a REST request and return the User."""
    supabase_user = await verify_supabase_token(credentials.credentials)
    return await get_or_create_user(session, supabase_user)
