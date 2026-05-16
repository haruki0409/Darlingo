"""Supabase authentication.

Preferred path: verify the Supabase-issued JWT *locally* with the project's
JWT secret (HS256) — no network call, so it scales to many concurrent users
and is not subject to Supabase Auth rate limits.

Fallback path: if `supabase_jwt_secret` is not configured, validate the token
by calling `GET /auth/v1/user`. Correct, but a per-request HTTP round-trip —
fine for low traffic, a bottleneck under load.
"""

import logging
import uuid

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_session
from app.models import User

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer()

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired token",
)


def decode_supabase_jwt(token: str) -> dict:
    """Verify a Supabase JWT locally and return a normalized user dict.

    Supabase signs user tokens HS256 with the project JWT secret and sets
    `aud="authenticated"`. Anonymous users get the same shape with no email
    and `is_anonymous=True`.

    Returns `{"id", "email", "is_anonymous"}`. Raises HTTPException(401) for
    any missing/invalid/expired token.
    """
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        logger.info("Local JWT verification failed: %s", exc)
        raise _UNAUTHORIZED from exc

    sub = payload.get("sub")
    if not sub:
        raise _UNAUTHORIZED
    return {
        "id": sub,
        "email": payload.get("email"),
        "is_anonymous": payload.get("is_anonymous", False),
    }


async def _verify_via_http(token: str) -> dict:
    """Fallback: validate the token through Supabase's /auth/v1/user."""
    url = f"{settings.supabase_url}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.supabase_anon_key,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, headers=headers)
    if resp.status_code != 200:
        raise _UNAUTHORIZED
    data = resp.json()
    return {
        "id": data["id"],
        "email": data.get("email"),
        "is_anonymous": data.get("is_anonymous", False),
    }


async def verify_supabase_token(token: str) -> dict:
    """Validate a Supabase JWT and return a normalized user dict.

    Uses fast local verification when a JWT secret is configured, otherwise
    falls back to the Supabase HTTP lookup. Raises HTTPException(401) if the
    token is missing, invalid, or expired.
    """
    if settings.supabase_jwt_secret:
        return decode_supabase_jwt(token)
    return await _verify_via_http(token)


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
