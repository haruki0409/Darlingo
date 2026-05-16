"""
LingoDarling AI — FastAPI entrypoint.

API-only backend. The Flutter app (or any HTTP/WS client) calls these endpoints.

Run:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import os
import sys

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import characters, sessions, text_chat, voice_chat

load_dotenv()

if not os.getenv("GEMINI_API_KEY"):
    sys.exit("GEMINI_API_KEY missing. Copy .env.example to .env and set it.")


app = FastAPI(
    title="LingoDarling AI",
    description="Voice + text companion chat backed by Google Gemini Live API.",
    version="0.1.0",
)

# CORS — open by default so the Flutter web/mobile client can call freely.
# Lock down in production via ALLOWED_ORIGINS env var (comma-separated).
_origins_env = os.getenv("ALLOWED_ORIGINS", "").strip()
_allow_origins = [o.strip() for o in _origins_env.split(",") if o.strip()] or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(characters.router)
app.include_router(sessions.router)
app.include_router(text_chat.router)
app.include_router(voice_chat.router)


@app.get("/")
def root() -> dict:
    return {
        "service": "LingoDarling AI",
        "docs": "/docs",
        "endpoints": [
            "GET  /api/characters",
            "POST /api/sessions",
            "DELETE /api/sessions/{session_id}",
            "POST /api/chat/text  (SSE)",
            "WS   /api/chat/voice?session_id=...",
        ],
    }


@app.get("/health")
def health() -> dict:
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
