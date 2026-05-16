"""
Live API 양방향 세션 래퍼.

WebSocket 라우터가 이 클래스를 인스턴스화해서 한 클라이언트당 한 세션 굴림.

흐름:
    [브라우저 WS]
        ↓ audio chunk (base64 PCM16 16kHz)
    LiveBridge.send_audio()
        ↓
    [Gemini Live API session]
        ↓ audio chunk + input/output transcription + turn_complete + interrupted
    LiveBridge._receiver_loop()
        ↓ on_event 콜백
    [WebSocket 라우터가 클라이언트로 송신]

교정은 캐릭터가 시스템 프롬프트대로 답변(음성)에 자연스럽게 녹여서 함.
세션 단위 리뷰는 나중에 별도 엔드포인트로 추가 예정.

Live API config:
    - response_modalities=["AUDIO"]
    - output_audio_transcription      ← 캐릭터 자막
    - input_audio_transcription       ← 학습자 자막
    - context_window_compression      ← 장시간 세션 대응
    - system_instruction              ← 캐릭터 + 메모리 컨텍스트
    - language_code                   ← half-cascade 계보 모델에서만 의미
"""

from __future__ import annotations

import asyncio
import base64
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from google import genai
from google.genai import types

from app.config import INPUT_SAMPLE_RATE
from app.services.history import Session
from characters import CharacterProfile, build_system_instruction

logger = logging.getLogger(__name__)

# 이벤트 타입은 schemas.WsServer* 와 1:1
EventCallback = Callable[[dict], Awaitable[None]]


def build_live_config(char: CharacterProfile) -> types.LiveConnectConfig:
    """
    Live API 설정. 한 세션으로 끝까지 유지하는 단일 연결 방식.

    포함:
      - response_modalities: ["AUDIO"]
      - speech_config: 캐릭터별 voice
      - system_instruction: 캐릭터 프롬프트
      - input/output_audio_transcription: 사용자/캐릭터 자막
      - thinking_config: off (native-audio 응답에 thought 파트 섞이는 거 방지)
      - context_window_compression: 장시간 세션 안정화 + 턴 boundary 개선
    """
    speech_config = types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=char.voice)
        ),
    )
    return types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        speech_config=speech_config,
        system_instruction=types.Content(
            parts=[types.Part(text=build_system_instruction(char))]
        ),
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        thinking_config=types.ThinkingConfig(thinking_budget=0),
        context_window_compression=types.ContextWindowCompressionConfig(
            sliding_window=types.SlidingWindow(),
        ),
    )


class LiveBridge:
    """
    한 (브라우저 WS ↔ Gemini Live) 다리.

    사용:
        bridge = LiveBridge(client, session, char, on_event)
        async with bridge:
            # WS 라우터가 클라 메시지 받을 때마다 send_audio / send_text / end_turn 호출
            ...
    """

    def __init__(
        self,
        client: genai.Client,
        session: Session,
        char: CharacterProfile,
        on_event: EventCallback,
    ) -> None:
        self.client = client
        self.session = session
        self.char = char
        self.on_event = on_event
        self._live = None
        self._cm = None
        self._recv_task: asyncio.Task | None = None
        # 한 턴의 input/output transcription 누적, turn_complete 에서 flush
        self._user_caption_buffer: list[str] = []
        self._char_caption_buffer: list[str] = []

    # ---- async context — 단일 Live 세션을 열고 끝까지 유지 ----
    async def __aenter__(self) -> "LiveBridge":
        logger.info("connecting model=%s voice=%s", self.char.model, self.char.voice)
        self._cm = self.client.aio.live.connect(
            model=self.char.model, config=build_live_config(self.char)
        )
        self._live = await self._cm.__aenter__()
        self._recv_task = asyncio.create_task(self._receiver_loop())
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        if self._recv_task:
            self._recv_task.cancel()
            try:
                await self._recv_task
            except (asyncio.CancelledError, Exception):
                pass
        if self._cm is not None:
            try:
                await self._cm.__aexit__(exc_type, exc, tb)
            except Exception:
                pass

    # ---- 클라 → 모델 ----
    async def send_audio(self, pcm_bytes: bytes) -> None:
        if not self._live:
            return
        await self._live.send_realtime_input(
            audio=types.Blob(
                data=pcm_bytes,
                mime_type=f"audio/pcm;rate={INPUT_SAMPLE_RATE}",
            )
        )

    async def send_text(self, text: str) -> None:
        """학습자가 음성 도중 텍스트로 보조 명령. 한 턴으로 처리."""
        if not self._live or not text.strip():
            return
        await self._live.send_client_content(
            turns=types.Content(role="user", parts=[types.Part(text=text)]),
            turn_complete=True,
        )

    # ---- 모델 → 클라 (수신 루프) ----
    async def _receiver_loop(self) -> None:
        """
        공식 cookbook 패턴: session.receive() 는 한 턴 단위 iterator 반환.
        한 턴 끝나면 iterator 종료 → 다음 턴 받으려면 receive() 다시 호출.
        이전엔 receive() 를 한 번만 호출해서 첫 턴 이후 응답 못 받던 게
        멀티턴 무시 버그의 원인이었음.
        """
        if not self._live:
            return
        try:
            while True:
                turn = self._live.receive()
                async for response in turn:
                    await self._handle_response(response)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.exception("receiver loop failed")
            await self.on_event({"type": "error", "message": f"live recv: {e}"})

    async def _handle_response(self, response: Any) -> None:
        # 1) audio chunk
        if data := getattr(response, "data", None):
            await self.on_event({
                "type": "audio",
                "data": base64.b64encode(data).decode("ascii"),
            })

        sc = getattr(response, "server_content", None)
        if sc is None:
            return

        # 2) 학습자 자막
        in_tr = getattr(sc, "input_transcription", None)
        if in_tr and getattr(in_tr, "text", None):
            self._user_caption_buffer.append(in_tr.text)
            await self.on_event({"type": "caption_user", "text": in_tr.text})

        # 3) 캐릭터 자막
        out_tr = getattr(sc, "output_transcription", None)
        if out_tr and getattr(out_tr, "text", None):
            self._char_caption_buffer.append(out_tr.text)
            await self.on_event({"type": "caption_char", "text": out_tr.text})

        # 4) interrupted (학습자가 끼어들어 모델 발화 취소됨)
        if getattr(sc, "interrupted", False):
            await self.on_event({"type": "interrupted"})

        # 5) turn_complete
        if getattr(sc, "turn_complete", False):
            await self._flush_turn()

    async def _flush_turn(self) -> None:
        """한 턴 종료 시: 자막 history 저장. 세션은 유지."""
        user_text = "".join(self._user_caption_buffer).strip()
        char_text = "".join(self._char_caption_buffer).strip()
        self._user_caption_buffer.clear()
        self._char_caption_buffer.clear()

        if user_text:
            self.session.append("user", user_text)
        if char_text:
            self.session.append("model", char_text)

        await self.on_event({"type": "turn_complete"})
