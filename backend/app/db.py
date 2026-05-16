"""Async database engine and session management.

Connects to Supabase Postgres via the `DATABASE_URL` in settings.
For a hackathon we create tables on startup (see `init_db`); a real project
would use Alembic migrations instead.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """Base class all ORM models inherit from."""


# pool_pre_ping recycles dead connections (Supabase drops idle ones).
# If you switch to the Supabase pooler (port 6543, transaction mode), add
# connect_args={"statement_cache_size": 0} because asyncpg prepared
# statements are not supported there.
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session."""
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    """Create any missing tables. Called once on app startup."""
    from app import models  # noqa: F401 - registers models on Base.metadata

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
