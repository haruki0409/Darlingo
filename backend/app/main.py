import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db, run_migrations
from app.routes import (
    chapters,
    chat,
    conversations,
    node_stories,
    partners,
    stories,
)
from app.seed import seed_partners

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create any missing tables and seed placeholder data on startup
    # (hackathon convenience).
    await init_db()
    await run_migrations()
    await seed_partners()
    yield


app = FastAPI(title="LingoDarling API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # Allow any origin: `flutter run -d chrome` serves on a random port, so a
    # fixed allow-list does not work. Auth uses a Bearer header (not cookies),
    # so credentials stay off, which keeps the "*" origin valid.
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(conversations.router)
app.include_router(partners.router)
app.include_router(stories.router)
app.include_router(chapters.router)
app.include_router(node_stories.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
