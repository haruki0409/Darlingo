"""
GET /api/characters       → 4 캐릭터 메타 목록
GET /api/characters/{key} → 단건 (시스템 인스트럭션 미리보기 포함)
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import CharacterMeta
from characters import CHARACTERS, build_system_instruction
from voices import VOICES_META

router = APIRouter(prefix="/api/characters", tags=["characters"])


def _meta(key: str) -> CharacterMeta:
    p = CHARACTERS[key]
    tone, gender = VOICES_META.get(p.voice, ("", "N"))
    return CharacterMeta(
        key=key,
        name=p.name,
        age=p.age,
        target_language=p.target_language,
        language_code=p.language_code,
        description=p.description,
        voice=p.voice,
        voice_tone=tone,
        voice_gender=gender,
        model=p.model,
        audition_sample=p.audition_sample,
    )


@router.get("")
def list_characters() -> list[CharacterMeta]:
    return [_meta(k) for k in CHARACTERS]


@router.get("/{character_key}")
def get_character(character_key: str) -> dict:
    if character_key not in CHARACTERS:
        raise HTTPException(404, f"unknown character: {character_key}")
    meta = _meta(character_key)
    return {
        **meta.model_dump(),
        "system_instruction_preview": build_system_instruction(CHARACTERS[character_key]),
    }
