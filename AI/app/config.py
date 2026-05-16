"""
백엔드 전역 설정 상수.
"""

from __future__ import annotations

from pathlib import Path

# ---- 모델 ----
# 텍스트 모드 전용 모델 (가볍고 빠른 일반 generateContent)
TEXT_MODEL = "gemini-flash-latest"

# 메모리 요약/교정 같은 보조 호출에 쓰는 모델 — 텍스트와 동일
UTILITY_MODEL = "gemini-flash-latest"

# 보이스 모드 모델은 character.model 에서 가져옴.

# ---- API 버전 ----
# native-audio + affective_dialog/proactivity 쓰려면 v1alpha 필요.
# 현재 affective 미사용 → v1beta 가 더 안정적.
GENAI_API_VERSION = "v1beta"

# ---- Live API 오디오 스펙 ----
INPUT_SAMPLE_RATE = 16_000   # 마이크 → 모델
OUTPUT_SAMPLE_RATE = 24_000  # 모델 → 스피커
AUDIO_CHANNELS = 1

# ---- 메모리 파일 저장 위치 ----
PROJECT_ROOT = Path(__file__).resolve().parent.parent
MEMORY_ROOT = PROJECT_ROOT / "memory"

# ---- 메모리 요약 정책 ----
# 한 세션이 N턴 이상이면 세션 종료 시 요약 갱신
SUMMARY_MIN_TURNS = 3
# 메모리에 쌓아 모델 컨텍스트에 주입할 최대 글자 수 (대략 토큰 컷)
MAX_SUMMARY_CHARS = 4_000
MAX_FACTS_CHARS = 2_000
