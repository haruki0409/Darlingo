"""
WebSocket /api/chat/voice  ↔  Gemini Live API.

연결 시 query param 으로 session_id 전달:
    ws://.../api/chat/voice?session_id=xxx

클라 → 서버 JSON 메시지:
    {"type":"audio","data":"<base64 PCM16 16kHz mono>"}
    {"type":"text","text":"..."}
    {"type":"end_turn"}

서버 → 클라 JSON 메시지: schemas.WsServer* 참고
"""

from __future__ import annotations

import base64
import json

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from google import genai

from app.deps import get_genai_client
from app.services import history as history_svc
from app.services.live_session import LiveBridge
from characters import CHARACTERS

router = APIRouter(prefix="/api/chat", tags=["voice_chat"])


@router.websocket("/voice")
async def voice_chat(
    ws: WebSocket,
    session_id: str = Query(..., description="POST /api/sessions 로 받은 session_id"),
    client: genai.Client = Depends(get_genai_client),
) -> None:
    await ws.accept()

    session = history_svc.get(session_id)
    if session is None:
        await ws.send_json({"type": "error", "message": f"unknown session_id: {session_id}"})
        await ws.close()
        return
    if session.mode != "voice":
        await ws.send_json({
            "type": "error",
            "message": f"session is mode={session.mode}, not voice",
        })
        await ws.close()
        return
    char = CHARACTERS.get(session.character_key)
    if char is None:
        await ws.send_json({"type": "error", "message": f"character missing: {session.character_key}"})
        await ws.close()
        return

    async def on_event(event: dict) -> None:
        try:
            await ws.send_json(event)
        except Exception:
            pass

    try:
        async with LiveBridge(client, session, char, on_event) as bridge:
            while True:
                msg = await ws.receive_text()
                try:
                    data = json.loads(msg)
                except json.JSONDecodeError:
                    await ws.send_json({"type": "error", "message": "invalid json"})
                    continue

                mtype = data.get("type")
                if mtype == "audio":
                    raw = base64.b64decode(data.get("data", ""))
                    if raw:
                        await bridge.send_audio(raw)
                elif mtype == "text":
                    await bridge.send_text(data.get("text", ""))
                else:
                    await ws.send_json({
                        "type": "error",
                        "message": f"unknown type: {mtype}",
                    })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await ws.close()
        except Exception:
            pass
