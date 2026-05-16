"""
세션별 인메모리 메시지 버퍼 + 세션 메타.

- session_id 생성/조회
- 텍스트 모드: generateContent 의 contents 리스트 형태로 변환해 multi-turn 전송
- 보이스 모드: Live API 가 세션 내부에서 history 관리 — 여기 history 는 백업/요약용
- 세션 종료 시 memory.consolidate() 에 넘김
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from threading import Lock
from typing import Literal


Role = Literal["user", "model"]
Mode = Literal["text", "voice"]


@dataclass
class Message:
    role: Role
    text: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))


@dataclass
class Session:
    session_id: str
    user_id: str
    character_key: str
    mode: Mode
    created_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    messages: list[Message] = field(default_factory=list)

    @property
    def turn_count(self) -> int:
        return len(self.messages)

    def append(self, role: Role, text: str) -> None:
        text = (text or "").strip()
        if not text:
            return
        self.messages.append(Message(role=role, text=text))

    def to_dicts(self) -> list[dict]:
        return [{"role": m.role, "text": m.text, "ts": m.timestamp} for m in self.messages]


# ============================================================
#  in-memory store
# ============================================================

_sessions: dict[str, Session] = {}
_lock = Lock()


def create(user_id: str, character_key: str, mode: Mode) -> Session:
    sid = uuid.uuid4().hex
    s = Session(session_id=sid, user_id=user_id, character_key=character_key, mode=mode)
    with _lock:
        _sessions[sid] = s
    return s


def get(session_id: str) -> Session | None:
    with _lock:
        return _sessions.get(session_id)


def pop(session_id: str) -> Session | None:
    with _lock:
        return _sessions.pop(session_id, None)


def list_for_user(user_id: str) -> list[Session]:
    with _lock:
        return [s for s in _sessions.values() if s.user_id == user_id]
