"""Async database engine and session management.

Connects to Supabase Postgres via the `DATABASE_URL` in settings.
For a hackathon we create tables on startup (see `init_db`); a real project
would use Alembic migrations instead.
"""

from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """Base class all ORM models inherit from."""


# Connected through the Supabase pooler in transaction mode (port 6543),
# which multiplexes connections and is the right choice for a concurrent /
# autoscaling backend.
#  - statement_cache_size=0: transaction mode does not support asyncpg's
#    server-side prepared statements, so caching them must be disabled.
#  - pool_pre_ping recycles connections the pooler has dropped.
#  - pool_size/max_overflow cap connections per process; with N backend
#    instances total connections are N * (pool_size + max_overflow), so keep
#    this modest and watch it against the Supabase connection limit.
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=1800,
    connect_args={"statement_cache_size": 0},
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


async def run_migrations() -> None:
    """Apply small, idempotent schema changes that create_all cannot make
    (adding columns to existing tables). Hackathon-grade; use Alembic later."""
    statements = [
        "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS chapter_id UUID "
        "REFERENCES chapters(id) ON DELETE SET NULL",
        "ALTER TABLE messages ADD COLUMN IF NOT EXISTS emotion VARCHAR(24)",
    ]
    async with engine.begin() as conn:
        for statement in statements:
            await conn.execute(text(statement))
