"""
요청/응답 Pydantic 스키마.

프론트엔드가 어떤 모양으로 받을지 한 곳에 정의 — 계약 문서 역할.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ============================================================
#  공통
# ============================================================

class CorrectionSpan(BaseModel):
    """학습자 발화 안의 한 오류 구간."""
    span: str = Field(..., description="원문 그대로의 잘못된 토큰/구간")
    fix: str = Field(..., description="권장 수정")
    reason: str = Field(..., description="왜 이게 자연스러운지 짧은 설명 (1문장)")
    severity: Literal["minor", "major"] = "minor"


class Correction(BaseModel):
    """학습자 한 발화 전체에 대한 교정 결과."""
    has_errors: bool
    corrected: str = Field(..., description="교정된 전체 문장 (오류 없으면 원문 그대로)")
    errors: list[CorrectionSpan] = Field(default_factory=list)


# ============================================================
#  Characters
# ============================================================

class CharacterMeta(BaseModel):
    key: str
    name: str
    age: int
    target_language: str
    language_code: str
    description: str
    voice: str
    voice_tone: str
    voice_gender: str
    model: str
    audition_sample: str


# ============================================================
#  Sessions
# ============================================================

class CreateSessionRequest(BaseModel):
    user_id: str
    character_key: str
    mode: Literal["text", "voice"] = "text"


class SessionInfo(BaseModel):
    session_id: str
    user_id: str
    character_key: str
    mode: Literal["text", "voice"]
    created_at: str
    turn_count: int


# ============================================================
#  Text chat
# ============================================================

class TextChatRequest(BaseModel):
    session_id: str
    message: str


# SSE 이벤트 데이터 (text/event-stream 으로 흘림)
class TextChunkEvent(BaseModel):
    type: Literal["chunk"] = "chunk"
    text: str


class TextDoneEvent(BaseModel):
    type: Literal["done"] = "done"
    full_text: str


class TextErrorEvent(BaseModel):
    type: Literal["error"] = "error"
    message: str


# ============================================================
#  Voice chat (WebSocket 메시지)
# ============================================================

# --- Client → Server ---
class WsClientAudio(BaseModel):
    type: Literal["audio"] = "audio"
    data: str  # base64 PCM16 16kHz mono


class WsClientText(BaseModel):
    type: Literal["text"] = "text"
    text: str


class WsClientEndTurn(BaseModel):
    type: Literal["end_turn"] = "end_turn"


# --- Server → Client ---
class WsServerAudio(BaseModel):
    type: Literal["audio"] = "audio"
    data: str  # base64 PCM16 24kHz mono


class WsServerCaptionUser(BaseModel):
    """학습자 발화 STT (input transcription) — 누적 텍스트."""
    type: Literal["caption_user"] = "caption_user"
    text: str


class WsServerCaptionChar(BaseModel):
    """캐릭터 발화 자막 (output transcription) — 누적 텍스트."""
    type: Literal["caption_char"] = "caption_char"
    text: str


class WsServerTurnComplete(BaseModel):
    type: Literal["turn_complete"] = "turn_complete"


class WsServerInterrupted(BaseModel):
    type: Literal["interrupted"] = "interrupted"


class WsServerError(BaseModel):
    type: Literal["error"] = "error"
    message: str


# ============================================================
#  Memory (외부 조회/관리용 — 선택)
# ============================================================

class MemorySnapshot(BaseModel):
    user_id: str
    character_key: str
    summary: str
    facts: str
