import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import chat

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Bridge API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
