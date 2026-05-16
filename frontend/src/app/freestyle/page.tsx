"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  type CharacterMeta,
  type ChatMode,
  type MemorySnapshot,
  type SessionInfo,
  aiWsBase,
  createSession,
  endSession,
  getCharacter,
  getMemory,
  listCharacters,
  resetMemory,
  streamText,
} from "@/lib/aiApi";
import { AudioPlayer, MicCapture } from "@/lib/voiceAudio";

// ============================================================
//  아이콘
// ============================================================

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="m15 6-6 6 6 6" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M3.4 20.4 21 12 3.4 3.6 3 10l12 2-12 2z" />
  </svg>
);

const MicIcon = ({ className = "h-7 w-7" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
  </svg>
);

const StopIcon = ({ className = "h-7 w-7" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="6" y="6" width="12" height="12" rx="2.5" />
  </svg>
);

const BrainIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M12 5a3 3 0 0 0-6 .5A3 3 0 0 0 4 11a3 3 0 0 0 2 5 3 3 0 0 0 6 .5zM12 5a3 3 0 0 1 6 .5A3 3 0 0 1 20 11a3 3 0 0 1-2 5 3 3 0 0 1-6 .5z" />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

// ============================================================
//  헬퍼
// ============================================================

function langFlag(lang: string): string {
  return lang === "ja" ? "🇯🇵" : lang === "ko" ? "🇰🇷" : "🏳️";
}

function langLabel(lang: string): string {
  return lang === "ja" ? "일본어 / 日本語" : "한국어 / 韓國語";
}

type ChatMsg = { id: string; role: "user" | "char"; text: string; streaming?: boolean };

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ============================================================
//  캐릭터별 비주얼 — hero 이미지 + 그라데이션 톤
// ============================================================
// public/characters/{key}.png 가 있으면 hero 영역에 띄움. 없으면 hero 생략.
// 그라데이션은 채팅 영역과 자연스럽게 섞이도록 캐릭터 톤 매칭.
type CharacterVisual = {
  /** public 디렉토리 기준 이미지 경로들. 빈 배열이면 hero 미표시.
   *  여러 장이면 메시지 보낼 때마다 다음 포즈로 토글 (밀당 느낌). */
  images: string[];
  /** "from-X via-Y to-Z" 형태의 Tailwind 그라데이션 클래스 */
  gradient: string;
};

// 각 캐릭터의 "분위기 색". hero 상단/중간/하단 모두 이 톤 안에서 그라데이션.
//   topColor    = 캐릭터 머리 위쪽 (밝고 화사)
//   midColor    = 캐릭터 중앙 (이미지 자체의 배경색과 가까운 핵심 톤)
//   baseColor   = hero 하단 = 채팅 영역 상단 (둘이 만나는 동일색)
//   chatBottom  = 채팅 영역 하단으로 갈수록 가는 색 (살짝 더 차분하게)
type CharVisual = CharacterVisual & {
  topColor: string;
  midColor: string;
  baseColor: string;
  chatBottom: string;
  // 캐릭터 톤에 맞춘 UI 액센트
  accentFrom: string;  // 사용자 말풍선/보내기 버튼 그라데이션 시작
  accentTo: string;    // 그라데이션 끝
  accentSolid: string; // 캐릭터 이름 라벨, 입력창 포커스 보더 등 단색
  // 동그란 프로필 사진 줌/포커스. 원본이 전신/상반신이라 캐릭터마다 달라야 얼굴이 잘 잡힘.
  avatarScale?: number;     // 1.0 = object-cover 기본. 1.5 = 1.5배 줌인.
  avatarPosition?: string;  // 'top' | 'center' | '50% 20%' 같은 object-position 값.
  // 캐릭터 선택 포스터 카드용 (큰 직사각형 카드). 카드가 가로형이라 우측 얼굴 위주.
  posterPosition?: string;  // object-position. 기본 '50% 20%'.
  posterScale?: number;     // 기본 1.0.
  // 이름을 두 언어로 병기. 한국 캐릭터는 일본어 카타카나로,
  // 일본 캐릭터는 한국어 음차로 표시.
  nameAlt?: string;
};

const CHARACTER_VISUALS: Record<string, CharVisual> = {
  jp_gf: {
    // 리나 — 갸루 핑크, 화려한 톤
    images: ["/characters/jp_gf_v2.png", "/characters/jp_gf_v2_b.png"],
    gradient: "from-[#fde0ef] via-[#f4d8f5] to-[#e8d5f2]",
    topColor: "#e9a8d4",
    midColor: "#e9a8d4",
    baseColor: "#d8b5e6",
    chatBottom: "#c9b3e0",
    accentFrom: "#ff6ba0",   // 핫핑크
    accentTo:   "#a94be0",   // 보라
    accentSolid:"#c84a96",   // 진한 핑크
    avatarScale: 1.4,         // 얼굴 살짝 줌인
    avatarPosition: "50% 8%", // 머리 위쪽 기준 (값이 작을수록 사진 위쪽)
    posterPosition: "75% 25%", // 가로 카드: 우측 1/4 지점, 얼굴 위쪽
    posterScale: 1.1,
    nameAlt: "리나",          // リナ → 한국어 음차
  },
  jp_bf: {
    // 하루토 — 깔끔한 청회색 단색 배경 + 짙은 네이비 니트. 차분 어른스러움.
    images: ["/characters/jp_bf_v2.png"],
    gradient: "from-[#b8c4d3] via-[#9ba8bc] to-[#7c8aa0]",
    topColor: "#b8c4d3",   // 청회색 (이미지 배경 매치)
    midColor: "#92a0b6",   // 미드 그레이블루
    baseColor: "#6d7c97",  // 어두운 청회색
    chatBottom: "#566275", // 깊은 네이비 그레이
    accentFrom: "#5a7ca8",
    accentTo:   "#7a8db8",
    accentSolid:"#4a6890",
    posterPosition: "75% 25%",  // Y 값이 클수록 사진 아래쪽이 보임 = 카드 안 얼굴이 위로 올라옴
    posterScale: 1.05,
    nameAlt: "하루토",       // ハルト → 한국어 음차
  },
  kr_bf: {
    // 도현 — 깔끔한 흰 배경 + 연핑크 셔츠, 차분한 톤
    images: ["/characters/kr_bf_v3.png"],
    gradient: "from-[#f5ecf0] via-[#ece4ee] to-[#e0d8ea]",
    topColor: "#f5ecf0",
    midColor: "#ede0e8",
    baseColor: "#dccfe2",
    chatBottom: "#cbbcdb",
    accentFrom: "#d68ba8",   // 부드러운 핑크
    accentTo:   "#9678b8",   // 차분한 보라
    accentSolid:"#a06090",   // 무드 핑크
    posterPosition: "75% 25%",
    posterScale: 1.05,
    nameAlt: "ドヒョン",      // 도현 → 일본어 카타카나 음차
  },
  kr_gf: {
    // 지유 — 따뜻한 베이지 배경 + 파스텔 체크 셔츠. 부드러운 갬성러.
    images: ["/characters/kr_gf_v1.png"],
    gradient: "from-[#f5e8c8] via-[#f0dcc0] to-[#e6cdb8]",
    topColor: "#f5e8c8",   // 따뜻한 베이지 (이미지 배경 매치)
    midColor: "#ecd9b8",   // 머스타드 베이지
    baseColor: "#dcc3a8",  // 짙은 베이지
    chatBottom: "#c8b095", // 따뜻한 브라운 베이지
    accentFrom: "#d4a368",  // 머스타드
    accentTo:   "#b8826a",  // 따뜻한 브라운
    accentSolid: "#a87850", // 깊은 카라멜
    posterPosition: "75% 18%",
    posterScale: 1.05,
    nameAlt: "ジユ",          // 지유 → 일본어 카타카나 음차
  },
};

function visualFor(char: CharacterMeta): CharVisual {
  return (
    CHARACTER_VISUALS[char.key] ?? {
      images: [],
      gradient: "from-sakura-100 via-lilac-100 to-sky-100",
      topColor: "#fde0ef",
      midColor: "#e8d5f2",
      baseColor: "#d4b8e8",
      chatBottom: "#e8d5f2",
      accentFrom: "#ff6ba0",
      accentTo:   "#a94be0",
      accentSolid:"#a94be0",
    }
  );
}

/** 시간대(현지 시각) 에 따른 채팅 배경 오버레이 색. 같은 캐릭터인데 시간마다 다른 분위기. */
function useTimeOfDayTint(): string {
  const tint = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 6 && h < 11)  return "rgba(255, 240, 220, 0.15)";  // 아침
    if (h >= 11 && h < 17) return "rgba(255, 255, 255, 0.00)";  // 낮
    if (h >= 17 && h < 21) return "rgba(255, 200, 180, 0.18)";  // 노을
    return "rgba( 80,  60, 130, 0.20)";                          // 밤
  }, []);
  return tint;
}

// ============================================================
//  Hero — 채팅 상단 캐릭터 비주얼
// ============================================================
// 경계 없는 블렌딩 전략:
//   1. Hero 배경 = 채팅 영역과 같은 단일 그라데이션 (topColor → baseColor).
//      Hero "박스" 가 사실은 페이지와 같은 색이라 경계 자체가 없음.
//   2. 이미지에 radial mask + 위쪽 linear mask 동시 적용
//      → 이미지의 핑크 사각 배경이 보이지 않고, 캐릭터 실루엣이
//         hero 배경 위에 떠 있는 듯이 보임.
//   3. 음의 마진으로 채팅 영역과 시각적으로 겹침.
// 채팅 영역 안의 "분위기 배경" — 캐릭터 이미지가 가운데에 떠 있고,
// 캐릭터 색이 사방으로 부드럽게 페이드되어 채팅 배경 라벤더와 자연스럽게 섞임.
// 채팅 메시지는 이 배경 위에 올라감.
function CharacterBackdrop({
  char,
  pulseKey,
  poseIndex,
}: {
  char: CharacterMeta;
  pulseKey: number;
  /** 어떤 포즈 이미지를 보여줄지 (배열 인덱스) */
  poseIndex: number;
}) {
  const v = visualFor(char);
  if (v.images.length === 0) return null;
  const currentImage = v.images[poseIndex % v.images.length];

  return (
    <div
      key={`backdrop-${char.key}`}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* 둥실둥실 효과: y(5s) + x(7.5s) + 회전(9s) 을 다른 주기로 합성.
          서로 다른 주기라 같은 위치를 절대 반복하지 않아 살아있는 듯한 떠다님.
          + 응답 도착 시 pulse 한 번. */}
      <div
        key={`pulse-${pulseKey}`}
        className="animate-char-pulse absolute inset-0"
      >
        <div className="animate-float-y absolute inset-0">
          <div className="animate-float-x absolute inset-0">
            <div className="animate-float-rot absolute inset-0">
              {/* 화면 꽉 채움: object-cover 로 이미지가 채팅 영역 전체를 덮음.
                  마스크는 가장자리만 살짝 페이드해서 부드럽게 배경과 섞이게. */}
              <div
                className="absolute inset-0 opacity-95"
                style={{
                  // 마스크가 이미지 가장자리 한참 *전*에 완전 투명이 되도록.
                  // 안 그러면 이미지의 사각형 hard edge 가 페이드 끝나기 전에 보임.
                  // 위/아래/좌/우 각 방향으로 별도 페이드 + 모서리 radial 페이드 모두 적용.
                  WebkitMaskImage: [
                    // 위쪽 페이드
                    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 8%, #000 18%)",
                    // 아래쪽 페이드
                    "linear-gradient(to top, transparent 0%, rgba(0,0,0,0.4) 8%, #000 18%)",
                    // 왼쪽 페이드
                    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 8%, #000 18%)",
                    // 오른쪽 페이드
                    "linear-gradient(to left, transparent 0%, rgba(0,0,0,0.4) 8%, #000 18%)",
                  ].join(", "),
                  WebkitMaskComposite: "source-in",
                  maskImage: [
                    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 8%, #000 18%)",
                    "linear-gradient(to top, transparent 0%, rgba(0,0,0,0.4) 8%, #000 18%)",
                    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 8%, #000 18%)",
                    "linear-gradient(to left, transparent 0%, rgba(0,0,0,0.4) 8%, #000 18%)",
                  ].join(", "),
                  maskComposite: "intersect",
                }}
              >
                <Image
                  key={currentImage}
                  src={currentImage}
                  alt={char.name}
                  fill
                  priority
                  sizes="(max-width: 480px) 100vw, 440px"
                  className="animate-pose-fade object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  공통 UI 조각
// ============================================================

function Avatar({ char, size = "h-12 w-12" }: { char: CharacterMeta; size?: string }) {
  const v = visualFor(char);
  const img = v.images[0];
  // 캐릭터 사진이 있으면 동그란 프로필. 없으면 기존 이니셜 + 그라데이션 fallback.
  if (img) {
    const scale = v.avatarScale ?? 1;
    const position = v.avatarPosition ?? "50% 0%";  // 기본은 위쪽(상반신 얼굴)
    return (
      <span
        className={`relative ${size} shrink-0 overflow-hidden rounded-full ring-2 ring-white/80`}
        style={{
          boxShadow: `0 8px 18px -6px ${v.accentSolid}66`,
          backgroundColor: v.midColor,
        }}
      >
        <Image
          src={img}
          alt={char.name}
          fill
          sizes="56px"
          className="object-cover"
          style={{
            objectPosition: position,
            // transform-origin 은 중앙 고정. scale 만 적용.
            // (origin 을 position 과 같이 잡으면 두 효과가 합산돼서 오히려 화면 밖으로 나감)
            transform: scale === 1 ? undefined : `scale(${scale})`,
          }}
        />
      </span>
    );
  }
  return (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-full bg-gradient-to-br from-sakura-500 to-lilac-500 text-white shadow-[0_8px_18px_-6px_rgba(255,107,160,0.55)]`}
    >
      <span className="text-base font-black drop-shadow">{char.name.slice(0, 1)}</span>
    </span>
  );
}

function Spinner() {
  return (
    <div className="relative flex flex-1 items-center justify-center px-6">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-lilac-200 border-t-lilac-500" />
    </div>
  );
}

// ============================================================
//  캐릭터 포스터 카드 — 캐릭터 선택 화면의 핵심
// ============================================================
// 가로 큰 카드. 카드 전체에 캐릭터 사진 깔리고, 좌측 하단에
// 캐릭터 톤 그라데이션 위로 이름/소개/태그가 떠 있음.
// 4장이 한 줄씩 쌓이는데 캐릭터별 액센트 색이 달라서 한눈에 분위기 구분됨.
function CharacterPoster({
  char,
  active,
  onSelect,
  onInfo,
}: {
  char: CharacterMeta;
  active: boolean;
  onSelect: () => void;
  onInfo: () => void;
}) {
  const v = visualFor(char);
  const img = v.images[0];
  const posterPos = v.posterPosition ?? "50% 20%";
  const posterScale = v.posterScale ?? 1;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative h-44 w-full overflow-hidden rounded-3xl text-left transition active:scale-[0.99] ${
        active ? "-translate-y-1" : "hover:-translate-y-0.5"
      }`}
      style={{
        boxShadow: active
          ? `0 24px 50px -12px ${v.accentSolid}99, 0 0 0 2px ${v.accentSolid}`
          : `0 14px 30px -14px ${v.accentSolid}55`,
        backgroundColor: v.midColor,
      }}
    >
      {/* 캐릭터 사진 — 카드 배경 전체 */}
      {img && (
        <Image
          src={img}
          alt={char.name}
          fill
          sizes="(max-width: 480px) 100vw, 440px"
          className="object-cover"
          style={{
            objectPosition: posterPos,
            transform: posterScale === 1 ? undefined : `scale(${posterScale})`,
          }}
        />
      )}

      {/* 좌측에서 우측으로 캐릭터 톤 그라데이션 → 텍스트 가독성 + 우측은 사진 잘 보임 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(90deg, ${v.baseColor}f5 0%, ${v.baseColor}aa 45%, transparent 80%)`,
        }}
      />

      {/* 하단 페이드 — 정보 영역 추가 가독성 */}
      <div
        className="absolute inset-x-0 bottom-0 h-28"
        style={{
          backgroundImage: `linear-gradient(180deg, transparent 0%, ${v.chatBottom}cc 100%)`,
        }}
      />

      {/* 상단 우측 info 버튼 */}
      <span
        role="button"
        tabIndex={0}
        aria-label={`${char.name} 정보`}
        onClick={(e) => {
          e.stopPropagation();
          onInfo();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            onInfo();
          }
        }}
        className="absolute right-3 top-3 z-10 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white/85 text-ink-700 shadow-md backdrop-blur transition hover:bg-white"
      >
        <InfoIcon />
      </span>

      {/* 상단 좌측 국기 칩 */}
      <span
        className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur"
        style={{ color: v.accentSolid }}
      >
        <span className="text-sm leading-none">{langFlag(char.target_language)}</span>
        {char.target_language === "ja" ? "JP" : "KR"}
      </span>

      {/* 좌측 하단 정보 영역 */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-4 pt-12">
        <div className="flex items-baseline gap-2">
          <h3
            className="text-[26px] font-extrabold leading-none tracking-tight text-white"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.35)" }}
          >
            {char.name}
          </h3>
          {v.nameAlt && (
            <span
              className="text-xs font-medium text-white/80"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.3)" }}
            >
              / {v.nameAlt}
            </span>
          )}
          <span
            className="ml-auto text-xs font-medium text-white/70"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.3)" }}
          >
            {char.age}
          </span>
        </div>
        {char.description && (
          <p
            className="mt-1.5 line-clamp-2 text-[13px] font-normal leading-relaxed text-white/90"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}
          >
            {char.description}
          </p>
        )}
      </div>

      {/* 선택됐을 때 캐릭터 색 글로우 보더 */}
      {active && (
        <span
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            boxShadow: `inset 0 0 0 2px ${v.accentSolid}, inset 0 0 30px ${v.accentSolid}44`,
          }}
        />
      )}
    </button>
  );
}

// ============================================================
//  캐릭터 선택 화면
// ============================================================

function CharacterPicker({
  characters,
  onStart,
  onInfo,
}: {
  characters: CharacterMeta[];
  onStart: (c: CharacterMeta, mode: ChatMode) => void;
  onInfo: (c: CharacterMeta) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const sel = characters.find((c) => c.key === selected) ?? null;

  return (
    <div className={`relative flex flex-1 flex-col overflow-y-auto px-5 pt-5 ${sel ? "pb-3" : "pb-8"}`}>
      <div className="flex items-center gap-3">
        <Link
          href="/home"
          aria-label="뒤로"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-lilac-500 shadow-sm backdrop-blur transition hover:bg-white active:scale-95"
        >
          <BackIcon />
        </Link>
        <div className="flex flex-col">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-lilac-500">
            Free Style
          </p>
          <p className="mt-0.5 text-xl font-extrabold tracking-tight text-ink-700">
            상대를 골라요
          </p>
          <p className="text-sm font-medium text-ink-500">
            相手を選ぶ
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4">
        {characters.map((c) => (
          <CharacterPoster
            key={c.key}
            char={c}
            active={c.key === selected}
            onSelect={() => setSelected(c.key)}
            onInfo={() => onInfo(c)}
          />
        ))}
      </div>

      <p className="mt-6 text-center text-[11px] text-ink-500/80">
        상대는 목표 언어로만 답해요. 실수는 살짝 고쳐줘요 💞
        <br />
        相手は目標言語でしか答えないよ。間違いはそっと直してくれる

      </p>

      {/* 하단 시작 바 — 페이지 스크롤 안에서 sticky.
          마지막 카드 아래로 자연스럽게 흘러서, 카드 가리지 않고 화면 하단에 붙음. */}
      {sel && (() => {
        const sv = visualFor(sel);
        return (
          <div className="animate-fade-in-up sticky bottom-3 z-30 mt-5">
            <div
              className="rounded-3xl border border-white/60 p-4 backdrop-blur-xl"
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.85) 0%, ${sv.baseColor}99 100%)`,
                boxShadow: `0 20px 40px -12px ${sv.accentSolid}77, 0 0 0 1px ${sv.accentSolid}33`,
              }}
            >
              <div className="flex items-center gap-3">
                <Avatar char={sel} size="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: sv.accentSolid }}>
                    Ready
                  </p>
                  <p className="mt-0.5 truncate text-base font-bold text-ink-700">
                    {sel.name}
                    <span className="ml-2 text-xs font-normal text-ink-500">
                      {sel.target_language === "ja" ? "と話す" : "와(과) 대화"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => onStart(sel, "text")}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/85 text-sm font-bold transition hover:bg-white active:scale-[0.98]"
                  style={{
                    color: sv.accentSolid,
                    boxShadow: `inset 0 0 0 1.5px ${sv.accentSolid}55`,
                  }}
                >
                  💬 텍스트 / テキスト
                </button>
                <button
                  type="button"
                  onClick={() => onStart(sel, "voice")}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${sv.accentFrom} 0%, ${sv.accentTo} 100%)`,
                    boxShadow: `0 10px 22px -6px ${sv.accentFrom}99`,
                  }}
                >
                  🎙 음성 / 音声
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ============================================================
//  캐릭터 정보 모달 (GET /api/characters/{key})
// ============================================================

function CharacterInfoModal({
  char,
  onClose,
}: {
  char: CharacterMeta;
  onClose: () => void;
}) {
  const [persona, setPersona] = useState<string | null>(null);
  const [personaAlt, setPersonaAlt] = useState<string>("");
  const [personality, setPersonality] = useState<string | null>(null);
  const [personalityAlt, setPersonalityAlt] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getCharacter(char.key)
      .then((d) => {
        if (!alive) return;
        setPersona(d.persona || "");
        setPersonaAlt(d.persona_alt || "");
        setPersonality(d.personality || "");
        setPersonalityAlt(d.personality_alt || "");
      })
      .catch((e) => alive && setErr(String(e)));
    return () => {
      alive = false;
    };
  }, [char.key]);

  const v = visualFor(char);

  return (
    <div
      className="fixed inset-0 z-50 mx-auto flex max-w-[440px] items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-fade-in-up max-h-[85vh] w-full overflow-y-auto rounded-3xl border border-white/60 bg-white/95 p-5 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <Avatar char={char} size="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <p className="text-xl font-extrabold tracking-tight text-ink-700">
              {char.name}
              {v.nameAlt && (
                <span className="ml-1.5 text-sm font-normal text-ink-500">
                  / {v.nameAlt}
                </span>
              )}
              <span className="ml-2 text-sm font-normal text-ink-300">· {char.age}살</span>
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-lilac-500">
              {langLabel(char.target_language)} {langFlag(char.target_language)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid h-9 w-9 place-items-center rounded-full bg-lilac-100 text-lilac-600"
          >
            <CloseIcon />
          </button>
        </div>

        {err && <p className="mt-3 text-[12px] text-sakura-600">{err}</p>}

        {persona === null && personality === null && !err ? (
          <p className="mt-4 text-[12px] text-ink-300">불러오는 중…</p>
        ) : (
          <>
            {persona && (
              <div className="mt-5">
                <p className="text-[10px] font-bold tracking-[0.22em] text-lilac-500">
                  프로필 / プロフィール
                </p>
                <div className="mt-2 rounded-2xl bg-lilac-100/60 px-4 py-3.5">
                  <p className="whitespace-pre-wrap text-[14px] font-normal leading-relaxed text-ink-700">
                    {persona}
                  </p>
                  {personaAlt && (
                    <>
                      <div className="my-3 h-px bg-lilac-300/40" />
                      <p className="whitespace-pre-wrap text-[13px] font-normal leading-relaxed text-ink-500">
                        {personaAlt}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
            {personality && (
              <div className="mt-4">
                <p className="text-[10px] font-bold tracking-[0.22em] text-sakura-600">
                  성격 / 性格
                </p>
                <div className="mt-2 rounded-2xl bg-sakura-100/60 px-4 py-3.5">
                  <p className="whitespace-pre-wrap text-[14px] font-normal leading-relaxed text-ink-700">
                    {personality}
                  </p>
                  {personalityAlt && (
                    <>
                      <div className="my-3 h-px bg-sakura-300/40" />
                      <p className="whitespace-pre-wrap text-[13px] font-normal leading-relaxed text-ink-500">
                        {personalityAlt}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
//  기억 드로어 (GET / DELETE /api/memory)
// ============================================================

function MemoryDrawer({
  userId,
  characterKey,
  onClose,
}: {
  userId: string;
  characterKey: string;
  onClose: () => void;
}) {
  const [mem, setMem] = useState<MemorySnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    getMemory(userId, characterKey)
      .then((m) => {
        if (!alive) return;
        setMem(m);
        setErr(null);
      })
      .catch((e) => alive && setErr(String(e)));
    return () => {
      alive = false;
    };
  }, [userId, characterKey, reloadKey]);

  async function onReset() {
    setBusy(true);
    try {
      await resetMemory(userId, characterKey);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 mx-auto flex max-w-[440px] items-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-fade-in-up max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-white/60 bg-white/95 p-5 pb-8 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-sakura-500 to-lilac-500 text-white">
            <BrainIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-extrabold tracking-tight text-ink-700">장기 기억</p>
            <p className="text-sm font-medium text-ink-500">長期記憶</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid h-9 w-9 place-items-center rounded-full bg-lilac-100 text-lilac-600"
          >
            <CloseIcon />
          </button>
        </div>

        {err && <p className="mt-3 text-[12px] text-sakura-600">{err}</p>}

        <div className="mt-4">
          <p className="text-[10px] font-bold tracking-[0.22em] text-lilac-500">
            요약 / 要約
          </p>
          <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-lilac-100/60 px-4 py-3 text-[13px] font-normal leading-relaxed text-ink-700">
            {mem?.summary?.trim() || "아직 쌓인 요약이 없어요 / まだ要約はないよ"}
          </p>
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-bold tracking-[0.22em] text-sakura-600">
            나에 대해 / 私について
          </p>
          <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-sakura-100/60 px-4 py-3 text-[13px] font-normal leading-relaxed text-ink-700">
            {mem?.facts?.trim() || "아직 기록된 사실이 없어요 / まだ何も覚えてないよ"}
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={busy}
          className="mt-5 flex h-11 w-full items-center justify-center rounded-2xl border-1.5 border-sakura-300 bg-white/70 text-sm font-bold text-sakura-600 transition hover:bg-white active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "초기화 중… / リセット中…" : "🗑 이 캐릭터 기억 초기화 / 記憶をリセット"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
//  채팅 헤더
// ============================================================

function ChatHeader({
  char,
  mode,
  onBack,
  onMemory,
  tone,
  accent,
}: {
  char: CharacterMeta;
  mode: ChatMode;
  onBack: () => void;
  onMemory: () => void;
  /** 캐릭터 톤 색 — 글래스 위에 살짝 깔리는 그라데이션의 베이스 */
  tone?: string;
  /** 캐릭터 액센트 색 — 하단 글로우 라인 */
  accent?: string;
}) {
  return (
    <header
      className="relative z-20 flex items-center gap-3 px-4 py-3"
      style={{
        // 흰색 글래스 + 캐릭터 톤이 위에서 아래로 살짝 빠지는 그라데이션
        backgroundImage: tone
          ? `linear-gradient(180deg, rgba(255,255,255,0.78) 0%, ${tone}55 100%)`
          : "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.55) 100%)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        // 아래쪽으로 캐릭터 액센트 글로우 — 박스 라인 대신 빛이 새어나오는 느낌
        boxShadow: accent
          ? `inset 0 -1px 0 ${accent}33, 0 8px 24px -16px ${accent}66`
          : "inset 0 -1px 0 rgba(255,255,255,0.5)",
      }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="상대 바꾸기"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/80 text-lilac-500 shadow-sm transition hover:bg-white active:scale-95"
      >
        <BackIcon />
      </button>
      <Avatar char={char} size="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-ink-700">
          {char.name} <span className="ml-0.5 text-sm">{langFlag(char.target_language)}</span>
        </p>
        <p className="text-[11px] font-medium text-ink-500">
          {mode === "voice" ? "🎙 음성 / 音声" : "💬 텍스트 / テキスト"}
        </p>
      </div>
      <button
        type="button"
        onClick={onMemory}
        aria-label="기억 보기"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sakura-500 to-lilac-500 text-white shadow-sm transition hover:brightness-110 active:scale-95"
      >
        <BrainIcon />
      </button>
    </header>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-end gap-1 py-1 align-middle" aria-label="입력 중">
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-500/60" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-500/60" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-500/60" />
    </span>
  );
}

function Bubble({
  msg,
  charName,
  accent,
}: {
  msg: ChatMsg;
  charName?: string;
  /** 캐릭터별 액센트 색 (사용자 말풍선/이름 라벨). 없으면 기본 핑크-라벤더. */
  accent?: { from: string; to: string; solid: string };
}) {
  const isUser = msg.role === "user";
  const userBg = accent
    ? `linear-gradient(135deg, ${accent.from}bf 0%, ${accent.to}bf 100%)`  // bf = ~75% alpha
    : undefined;
  return (
    <div className={`animate-bubble-in flex ${isUser ? "justify-end" : "flex-col items-start"}`}>
      {!isUser && charName && (
        <span
          className="mb-0.5 ml-2 text-[10px] font-bold uppercase tracking-[0.18em] [text-shadow:0_1px_3px_rgba(255,255,255,0.8)]"
          style={{ color: accent?.solid ?? "#7c3aed" }}
        >
          {charName}
        </span>
      )}
      <div
        className={`max-w-[78%] rounded-3xl px-4 py-2.5 text-[14px] leading-relaxed shadow-sm backdrop-blur-md ${
          isUser
            ? "rounded-br-lg border border-white/30 text-white"
            : "rounded-bl-lg border border-white/50 bg-white/55 text-ink-700"
        }`}
        style={isUser && userBg ? { backgroundImage: userBg } : undefined}
      >
        {msg.streaming && !msg.text ? (
          <TypingDots />
        ) : (
          msg.text
        )}
      </div>
    </div>
  );
}

// ============================================================
//  텍스트 채팅
// ============================================================

function TextChat({ session, char }: { session: SessionInfo; char: CharacterMeta }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulseTick, setPulseTick] = useState(0);
  const [poseIndex, setPoseIndex] = useState(0);  // 메시지 보낼 때마다 +1
  const tint = useTimeOfDayTint();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // 새 캐릭터 메시지가 완성되는 시점에만 hero pulse 1번.
  // 마지막 메시지의 streaming 종료 transition 을 감지하기 위한 effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.role === "char" && !last.streaming && last.text) {
      setPulseTick((p) => p + 1);
    }
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    setSending(true);
    setPoseIndex((p) => p + 1);

    const userMsg: ChatMsg = { id: uid(), role: "user", text };
    const charId = uid();
    setMessages((m) => [
      ...m,
      userMsg,
      { id: charId, role: "char", text: "", streaming: true },
    ]);

    try {
      for await (const ev of streamText(session.session_id, text)) {
        if (ev.type === "chunk") {
          setMessages((m) =>
            m.map((x) =>
              x.id === charId ? { ...x, text: x.text + ev.text } : x,
            ),
          );
        } else if (ev.type === "done") {
          setMessages((m) =>
            m.map((x) =>
              x.id === charId
                ? { ...x, text: ev.full_text || x.text, streaming: false }
                : x,
            ),
          );
        } else if (ev.type === "error") {
          setError(ev.message);
          setMessages((m) =>
            m.map((x) => (x.id === charId ? { ...x, streaming: false } : x)),
          );
        }
      }
    } catch (e) {
      setError(String(e));
      setMessages((m) =>
        m.map((x) => (x.id === charId ? { ...x, streaming: false } : x)),
      );
    } finally {
      setSending(false);
    }
  }

  const v = visualFor(char);

  return (
    <>
      {/* 채팅 영역 = 그라데이션 배경 + 캐릭터 backdrop + 스크롤 컨텐츠 */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{
          background: `linear-gradient(180deg,
            ${v.topColor} 0%,
            ${v.midColor} 35%,
            ${v.baseColor} 65%,
            ${v.chatBottom} 100%)`,
        }}
      >
        {/* 캐릭터 이미지 — 채팅 영역의 배경. 스크롤되지 않고 고정. */}
        <CharacterBackdrop char={char} pulseKey={pulseTick} poseIndex={poseIndex} />
        {/* 시간대 오버레이 */}
        <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: tint }} />
        {/* 스크롤되는 메시지 컨텐츠 — 하단부터 쌓여 캐릭터 얼굴이 가려지지 않게 */}
        <div ref={scrollRef} className="relative h-full overflow-y-auto px-4">
          <div className={`flex min-h-full flex-col justify-end space-y-3 pb-5 ${v.images.length > 0 ? "pt-[55%]" : "pt-10"}`}>
            {messages.length === 0 && (
              <p className="mb-auto mt-10 text-center text-[12px] leading-relaxed text-ink-700/80 [text-shadow:0_1px_3px_rgba(255,255,255,0.7)]">
                {char.target_language === "ja" ? (
                  <>
                    まずは挨拶してみよう 💌
                    <br />
                    相手は日本語でしか答えないよ。間違いはそっと直してくれる。
                  </>
                ) : (
                  <>
                    먼저 인사를 건네보세요 💌
                    <br />
                    상대는 한국어로만 답해요. 틀린 표현은 살짝 고쳐줘요.
                  </>
                )}
              </p>
            )}
            {messages.map((m) => (
              <Bubble
                key={m.id}
                msg={m}
                charName={char.name}
                accent={{ from: v.accentFrom, to: v.accentTo, solid: v.accentSolid }}
              />
            ))}
            {error && (
              <p className="text-center text-[11px] text-sakura-600">⚠ {error}</p>
            )}
          </div>
        </div>
      </div>

      <div
        className="relative px-3 py-3"
        style={{
          // 채팅 영역 하단 톤 → 흰색 글래스로 페이드 (아래로 갈수록 환해짐)
          backgroundImage: `linear-gradient(180deg, ${v.chatBottom}66 0%, rgba(255,255,255,0.85) 100%)`,
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          // 위쪽으로 액센트 글로우 — 채팅 영역과의 경계가 빛으로 표현됨
          boxShadow: `inset 0 1px 0 ${v.accentSolid}33, 0 -8px 24px -16px ${v.accentSolid}66`,
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder={char.target_language === "ja" ? "メッセージを入力…" : "메시지를 입력하세요…"}
            className="max-h-28 min-h-[46px] flex-1 resize-none rounded-full border bg-white/95 px-5 py-3 text-[14px] text-ink-700 outline-none placeholder:text-ink-300 transition"
            style={{
              borderColor: `${v.accentSolid}33`,
              boxShadow: `0 4px 14px -8px ${v.accentSolid}55`,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = v.accentSolid;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${v.accentSolid}22, 0 6px 18px -8px ${v.accentSolid}88`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = `${v.accentSolid}33`;
              e.currentTarget.style.boxShadow = `0 4px 14px -8px ${v.accentSolid}55`;
            }}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !input.trim()}
            aria-label="보내기"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white transition hover:brightness-110 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0"
            style={{
              backgroundImage: `linear-gradient(135deg, ${v.accentFrom} 0%, ${v.accentTo} 100%)`,
              boxShadow: `0 10px 22px -6px ${v.accentFrom}99, inset 0 1px 0 rgba(255,255,255,0.4)`,
            }}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
//  음성 채팅 (WebSocket + Live API 브릿지)
// ============================================================

type VoicePhase = "idle" | "connecting" | "listening" | "speaking";

function VoiceChat({ session, char }: { session: SessionInfo; char: CharacterMeta }) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [transcript, setTranscript] = useState<ChatMsg[]>([]);
  const [liveUser, setLiveUser] = useState("");
  const [liveChar, setLiveChar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pulseTick, setPulseTick] = useState(0);
  const [poseIndex, setPoseIndex] = useState(0);  // 사용자 발화 한 번마다 +1
  const tint = useTimeOfDayTint();

  const wsRef = useRef<WebSocket | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const userBufRef = useRef("");
  const charBufRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const speakTimer = useRef<number | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, liveUser, liveChar]);

  const teardown = useCallback(() => {
    if (speakTimer.current) window.clearTimeout(speakTimer.current);
    micRef.current?.stop();
    micRef.current = null;
    playerRef.current?.close();
    playerRef.current = null;
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close();
    }
  }, []);

  useEffect(() => teardown, [teardown]);

  function flushTurn() {
    const u = userBufRef.current.trim();
    const c = charBufRef.current.trim();
    userBufRef.current = "";
    charBufRef.current = "";
    setLiveUser("");
    setLiveChar("");
    setTranscript((t) => {
      const next = [...t];
      if (u) next.push({ id: uid(), role: "user", text: u });
      if (c) next.push({ id: uid(), role: "char", text: c });
      return next;
    });
    if (u) setPoseIndex((p) => p + 1);  // 사용자가 실제로 말했을 때만 포즈 토글
  }

  async function startCall() {
    setError(null);
    setPhase("connecting");

    const player = new AudioPlayer();
    playerRef.current = player;
    try {
      await player.resume();
    } catch {
      // resume 실패해도 enqueue 시 재시도
    }

    const ws = new WebSocket(
      `${aiWsBase()}/api/chat/voice?session_id=${encodeURIComponent(session.session_id)}`,
    );
    wsRef.current = ws;

    ws.onopen = async () => {
      try {
        const mic = new MicCapture();
        micRef.current = mic;
        await mic.start((b64) => {
          const sock = wsRef.current;
          if (sock && sock.readyState === WebSocket.OPEN) {
            sock.send(JSON.stringify({ type: "audio", data: b64 }));
          }
        });
        setPhase("listening");
      } catch (e) {
        // 마이크 권한/디바이스 에러 — 케이스별로 친절한 안내
        const err = e as DOMException;
        const name = err?.name ?? "";
        const isMac =
          typeof navigator !== "undefined" &&
          /Mac/i.test(navigator.platform || navigator.userAgent);
        let msg: string;
        if (name === "NotAllowedError" || name === "SecurityError") {
          msg = isMac
            ? "마이크 접근이 거부됐어요. ① 브라우저 주소창 🔒 → 마이크 허용  ② macOS 시스템 설정 → 개인정보 보호 → 마이크 → 브라우저 체크"
            : "마이크 접근이 거부됐어요. 브라우저 주소창 🔒 → 사이트 권한에서 마이크를 허용해주세요.";
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          msg = "사용 가능한 마이크가 없어요. 마이크가 연결되어 있는지 확인해주세요.";
        } else if (name === "NotReadableError") {
          msg = "마이크가 다른 앱에서 사용 중이에요. Zoom/Discord 등 다른 앱을 종료하고 다시 시도해주세요.";
        } else {
          msg = "마이크를 사용할 수 없어요: " + (err?.message ?? String(e));
        }
        setError(msg);
        teardown();
        setPhase("idle");
      }
    };

    ws.onmessage = (ev) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      const type = data.type as string;

      if (type === "audio" && typeof data.data === "string") {
        playerRef.current?.enqueue(data.data);
        setPhase("speaking");
        if (speakTimer.current) window.clearTimeout(speakTimer.current);
        speakTimer.current = window.setTimeout(() => setPhase("listening"), 1200);
      } else if (type === "caption_user" && typeof data.text === "string") {
        userBufRef.current += data.text;
        setLiveUser(userBufRef.current);
      } else if (type === "caption_char" && typeof data.text === "string") {
        charBufRef.current += data.text;
        setLiveChar(charBufRef.current);
      } else if (type === "interrupted") {
        playerRef.current?.clear();
      } else if (type === "turn_complete") {
        flushTurn();
        setPhase("listening");
        setPulseTick((p) => p + 1);
      } else if (type === "error") {
        setError(String(data.message ?? "알 수 없는 오류"));
      }
    };

    ws.onerror = () => {
      setError("음성 서버 연결에 문제가 생겼어요");
    };

    ws.onclose = () => {
      micRef.current?.stop();
      micRef.current = null;
      if (wsRef.current === ws) wsRef.current = null;
      setPhase("idle");
    };
  }

  function endCall() {
    flushTurn();
    teardown();
    setPhase("idle");
  }

  const active = phase !== "idle";
  const statusText =
    phase === "connecting"
      ? "연결 중… / 接続中…"
      : phase === "speaking"
        ? "🗣 상대가 말하는 중 / 相手が話してる"
        : phase === "listening"
          ? "👂 듣는 중 / 聞いてるよ — 편하게 말해보세요"
          : "통화를 시작해 보세요 / 通話を始めよう";

  const v = visualFor(char);

  return (
    <>
      <div
        className="relative flex-1 overflow-hidden"
        style={{
          background: `linear-gradient(180deg,
            ${v.topColor} 0%,
            ${v.midColor} 35%,
            ${v.baseColor} 65%,
            ${v.chatBottom} 100%)`,
        }}
      >
        <CharacterBackdrop char={char} pulseKey={pulseTick} poseIndex={poseIndex} />
        <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: tint }} />
        <div ref={scrollRef} className="relative h-full overflow-y-auto px-4">
          <div className={`flex min-h-full flex-col justify-end space-y-3 pb-5 ${v.images.length > 0 ? "pt-[55%]" : "pt-10"}`}>
            {transcript.length === 0 && !liveUser && !liveChar && (
              <p className="mb-auto mt-10 text-center text-[12px] leading-relaxed text-ink-700/80 [text-shadow:0_1px_3px_rgba(255,255,255,0.7)]">
                {char.target_language === "ja" ? (
                  <>
                    🎙 通話ボタンを押して話してみよう。
                    <br />
                    相手の声が聞こえて、字幕がリアルタイムで出るよ。
                  </>
                ) : (
                  <>
                    🎙 통화 버튼을 누르고 말해보세요.
                    <br />
                    상대의 목소리가 들리고, 자막이 실시간으로 떠요.
                  </>
                )}
              </p>
            )}
            {transcript.map((m) => (
              <Bubble
                key={m.id}
                msg={m}
                charName={char.name}
                accent={{ from: v.accentFrom, to: v.accentTo, solid: v.accentSolid }}
              />
            ))}
            {liveUser && (
              <Bubble
                msg={{ id: "live-u", role: "user", text: liveUser, streaming: true }}
                accent={{ from: v.accentFrom, to: v.accentTo, solid: v.accentSolid }}
              />
            )}
            {liveChar && (
              <Bubble
                msg={{ id: "live-c", role: "char", text: liveChar, streaming: true }}
                charName={char.name}
                accent={{ from: v.accentFrom, to: v.accentTo, solid: v.accentSolid }}
              />
            )}
            {error && (
              <p className="text-center text-[11px] text-sakura-600">⚠ {error}</p>
            )}
          </div>
        </div>
      </div>

      <div
        className="relative px-4 py-5"
        style={{
          backgroundImage: `linear-gradient(180deg, ${v.chatBottom}66 0%, rgba(255,255,255,0.85) 100%)`,
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          boxShadow: `inset 0 1px 0 ${v.accentSolid}33, 0 -8px 24px -16px ${v.accentSolid}66`,
        }}
      >
        <p
          className={`mb-3 text-center text-[12px] font-medium ${
            phase === "speaking"
              ? "text-sakura-600"
              : phase === "listening"
                ? "text-lilac-600"
                : "text-ink-500"
          }`}
        >
          {statusText}
        </p>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => (active ? endCall() : void startCall())}
            disabled={phase === "connecting"}
            aria-label={active ? "통화 종료" : "통화 시작"}
            className="relative grid h-20 w-20 place-items-center rounded-full text-white transition active:scale-95 disabled:opacity-60"
            style={{
              backgroundImage: `linear-gradient(135deg, ${v.accentFrom} 0%, ${v.accentTo} 100%)`,
              boxShadow: `0 14px 30px -6px ${v.accentFrom}99`,
            }}
          >
            {active && (
              <span
                className="absolute inset-0 animate-ping rounded-full"
                style={{ backgroundColor: `${v.accentFrom}66` }}
              />
            )}
            <span className="relative">
              {active ? <StopIcon className="h-8 w-8" /> : <MicIcon className="h-8 w-8" />}
            </span>
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] text-ink-500/70">
          {active
            ? "탭하면 통화가 끝나요 / タップで終了"
            : "탭하면 마이크가 켜져요 / タップでマイクON"}
        </p>
      </div>
    </>
  );
}

// ============================================================
//  페이지
// ============================================================

type Phase =
  | { kind: "loading" }
  | { kind: "pick" }
  | { kind: "chat"; char: CharacterMeta; mode: ChatMode; session: SessionInfo };

export default function FreestylePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterMeta[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [infoChar, setInfoChar] = useState<CharacterMeta | null>(null);
  const [memOpen, setMemOpen] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  // 인증 게이트 + 캐릭터 로드
  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setUserId(data.session.user.id);
      try {
        const list = await listCharacters();
        if (cancelled) return;
        setCharacters(list);
        setPhase({ kind: "pick" });
      } catch (e) {
        if (!cancelled) {
          setLoadErr(String(e));
          setPhase({ kind: "pick" });
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // 페이지 이탈 시 세션 정리
  useEffect(() => {
    const onUnload = () => {
      if (sessionIdRef.current) void endSession(sessionIdRef.current);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      if (sessionIdRef.current) void endSession(sessionIdRef.current);
    };
  }, []);

  async function onStart(char: CharacterMeta, mode: ChatMode) {
    if (!userId) return;
    setPhase({ kind: "loading" });
    try {
      const s = await createSession(userId, char.key, mode);
      sessionIdRef.current = s.session_id;
      setPhase({ kind: "chat", char, mode, session: s });
    } catch (e) {
      setLoadErr(String(e));
      setPhase({ kind: "pick" });
    }
  }

  async function leaveChat() {
    const sid = sessionIdRef.current;
    sessionIdRef.current = null;
    if (sid) await endSession(sid);
    setMemOpen(false);
    setPhase({ kind: "pick" });
  }

  if (phase.kind === "loading") return <Spinner />;

  if (phase.kind === "pick") {
    return (
      <>
        {loadErr && (
          <div className="mx-5 mt-5 rounded-2xl border border-sakura-300 bg-sakura-50 px-4 py-3 text-[12px] text-sakura-600">
            AI 서버에 연결할 수 없어요. ({loadErr})
            <br />
            <span className="text-ink-500">
              AI 서버가 켜져 있는지 확인하세요 (http://127.0.0.1:8001).
            </span>
          </div>
        )}
        <CharacterPicker
          characters={characters}
          onStart={onStart}
          onInfo={setInfoChar}
        />
        {infoChar && (
          <CharacterInfoModal char={infoChar} onClose={() => setInfoChar(null)} />
        )}
      </>
    );
  }

  // chat
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <ChatHeader
        char={phase.char}
        mode={phase.mode}
        onBack={() => void leaveChat()}
        onMemory={() => setMemOpen(true)}
        tone={visualFor(phase.char).topColor}
        accent={visualFor(phase.char).accentSolid}
      />
      {phase.mode === "text" ? (
        <TextChat session={phase.session} char={phase.char} />
      ) : (
        <VoiceChat session={phase.session} char={phase.char} />
      )}
      {memOpen && userId && (
        <MemoryDrawer
          userId={userId}
          characterKey={phase.char.key}
          onClose={() => setMemOpen(false)}
        />
      )}
    </div>
  );
}
