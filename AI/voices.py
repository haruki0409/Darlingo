"""
Gemini Live API prebuilt voice 카탈로그 (30종).

캐릭터 정의는 characters.py 로 분리. 이 파일은 voice 이름 → 톤/성별 매핑만.
"""

# (tone, gender) — gender 는 "M"/"F"/"N"(neutral) 추정.
# Google 공식 성별 표 없음. 커뮤니티 청취 + 톤 기반.
VOICES_META: dict[str, tuple[str, str]] = {
    "Zephyr":         ("Bright",        "F"),
    "Puck":           ("Upbeat",        "M"),
    "Charon":         ("Informative",   "M"),
    "Kore":           ("Firm",          "F"),
    "Fenrir":         ("Excitable",     "M"),
    "Leda":           ("Youthful",      "F"),
    "Orus":           ("Firm",          "M"),
    "Aoede":          ("Breezy",        "F"),
    "Callirrhoe":     ("Easy-going",    "F"),
    "Autonoe":        ("Bright",        "F"),
    "Enceladus":      ("Breathy",       "M"),
    "Iapetus":        ("Clear",         "M"),
    "Umbriel":        ("Easy-going",    "M"),
    "Algieba":        ("Smooth",        "M"),
    "Despina":        ("Smooth",        "F"),
    "Erinome":        ("Clear",         "F"),
    "Algenib":        ("Gravelly",      "M"),
    "Rasalgethi":     ("Informative",   "M"),
    "Laomedeia":      ("Upbeat",        "F"),
    "Achernar":       ("Soft",          "F"),
    "Alnilam":        ("Firm",          "M"),
    "Schedar":        ("Even",          "M"),
    "Gacrux":         ("Mature",        "F"),
    "Pulcherrima":    ("Forward",       "F"),
    "Achird":         ("Friendly",      "M"),
    "Zubenelgenubi":  ("Casual",        "M"),
    "Vindemiatrix":   ("Gentle",        "F"),
    "Sadachbia":      ("Lively",        "M"),
    "Sadaltager":     ("Knowledgeable", "M"),
    "Sulafat":        ("Warm",          "F"),
}

# 호환: VOICES[name] = tone string
VOICES: dict[str, str] = {name: meta[0] for name, meta in VOICES_META.items()}


def voice_gender(name: str) -> str:
    """'M'/'F'/'N'. 모르는 voice 는 'N'."""
    return VOICES_META.get(name, ("", "N"))[1]


def list_voices() -> None:
    print("\n=== Available Voices ===")
    for name, (tone, gender) in VOICES_META.items():
        print(f"  - {name:<14} ({tone:<14}) [{gender}]")
