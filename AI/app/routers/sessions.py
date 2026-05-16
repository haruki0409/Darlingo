"""
세션 생성/종료 + 메모리 조회 엔드포인트.

POST   /api/sessions                       세션 생성
DELETE /api/sessions/{session_id}          세션 종료 (메모리 자동 갱신)
GET    /api/sessions/{session_id}          현재 세션 상태
GET    /api/memory/{user_id}/{char_key}    저장된 summary/facts 조회 (디버그용)
DELETE /api/memory/{user_id}/{char_key}    초기화 (디버그용)
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import CreateSessionRequest, MemorySnapshot, SessionInfo
from app.services import history as history_svc
from app.services import memory as memory_svc
from characters import CHARACTERS

router = APIRouter(prefix="/api", tags=["sessions"])


def _to_info(s: history_svc.Session) -> SessionInfo:
    return SessionInfo(
        session_id=s.session_id,
        user_id=s.user_id,
        character_key=s.character_key,
        mode=s.mode,
        created_at=s.created_at,
        turn_count=s.turn_count,
    )


@router.post("/sessions", response_model=SessionInfo)
def create_session(req: CreateSessionRequest) -> SessionInfo:
    if req.character_key not in CHARACTERS:
        raise HTTPException(404, f"unknown character: {req.character_key}")
    s = history_svc.create(req.user_id, req.character_key, req.mode)
    return _to_info(s)


@router.get("/sessions/{session_id}", response_model=SessionInfo)
def get_session(session_id: str) -> SessionInfo:
    s = history_svc.get(session_id)
    if s is None:
        raise HTTPException(404, f"unknown session: {session_id}")
    return _to_info(s)


@router.delete("/sessions/{session_id}")
async def end_session(session_id: str) -> dict:
    s = history_svc.pop(session_id)
    if s is None:
        raise HTTPException(404, f"unknown session: {session_id}")
    # 메모리 consolidate 는 의도적으로 비활성화 (memory_svc.consolidate 미호출).
    # 이전 summary/facts 가 다음 세션 톤을 오염시키는 이슈가 있어 보류 중.
    return {
        "session_id": session_id,
        "ended": True,
        "turn_count": s.turn_count,
        "memory_updated": False,
    }


@router.get("/memory/{user_id}/{character_key}", response_model=MemorySnapshot)
def get_memory(user_id: str, character_key: str) -> MemorySnapshot:
    if character_key not in CHARACTERS:
        raise HTTPException(404, f"unknown character: {character_key}")
    return MemorySnapshot(
        user_id=user_id,
        character_key=character_key,
        summary=memory_svc.read_summary(user_id, character_key),
        facts=memory_svc.read_facts(user_id, character_key),
    )


@router.delete("/memory/{user_id}/{character_key}")
def reset_memory(user_id: str, character_key: str) -> dict:
    if character_key not in CHARACTERS:
        raise HTTPException(404, f"unknown character: {character_key}")
    memory_svc.reset(user_id, character_key)
    return {"user_id": user_id, "character_key": character_key, "reset": True}
