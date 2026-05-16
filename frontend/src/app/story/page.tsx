"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Stage = {
  id: number;
  ko: string;
  ja: string;
  x: number;
  y: number;
  implemented: boolean;
};

// 맵을 한 화면에 스크롤 없이 담기 위해 전체 높이를 580px 로 축소.
// y 좌표는 기존(820 기준) 대비 비율을 그대로 유지함.
const STAGES: Stage[] = [
  { id: 1, ko: "운명의 첫 만남", ja: "運命の出会い", x: 28, y: 523, implemented: true },
  { id: 2, ko: "흔들리는 마음", ja: "揺れる心", x: 72, y: 414, implemented: true },
  { id: 3, ko: "달빛 아래 고백", ja: "月夜の告白", x: 26, y: 293, implemented: true },
  { id: 4, ko: "벚꽃길 산책", ja: "桜並木の散歩", x: 74, y: 177, implemented: false },
  { id: 5, ko: "영원을 약속해", ja: "永遠の約束を", x: 50, y: 115, implemented: false },
];

const PROGRESS_KEY = "lingodarling:story-cleared";
const MAP_HEIGHT = 580;

const PATH_D = `
  M 28 523
  C 28 480, 72 457, 72 414
  C 72 368, 26 336, 26 293
  C 26 247, 74 219, 74 177
  C 74 158, 50 140, 50 115
`;

const BackIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="m15 6-6 6 6 6" />
  </svg>
);

const LockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5 text-ink-300"
  >
    <rect x="5" y="11" width="14" height="9" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

function StageNode({
  stage,
  unlocked,
}: {
  stage: Stage;
  unlocked: boolean;
}) {
  const playable = unlocked && stage.implemented;
  const preview = unlocked && !stage.implemented;
  const labelTone = unlocked ? "text-ink-700" : "text-ink-500/70";
  const subTone = unlocked ? "text-lilac-500" : "text-ink-300";

  let orb;
  if (playable) {
    orb = (
      <Link
        href={`/story/${stage.id}`}
        aria-label={`Stage ${stage.id}: ${stage.ko}`}
        className="group relative grid h-[66px] w-[66px] place-items-center"
      >
        <span className="absolute inset-[-8px] animate-pulse rounded-full bg-sakura-400/30 blur-md" />
        <span className="animate-heartbeat relative grid h-[64px] w-[64px] place-items-center rounded-full bg-gradient-to-br from-sakura-500 to-lilac-500 shadow-[0_10px_22px_-6px_rgba(255,107,160,0.65)] ring-[3px] ring-white/80">
          <span className="text-[20px] font-black text-white drop-shadow-sm">
            {stage.id}
          </span>
        </span>
        <span className="absolute -bottom-2.5 whitespace-nowrap rounded-full bg-gradient-to-r from-sakura-500 to-lilac-500 px-2.5 py-0.5 text-[9px] font-bold tracking-[0.18em] text-white shadow-[0_4px_10px_-3px_rgba(255,107,160,0.55)]">
          ♡ START
        </span>
      </Link>
    );
  } else if (preview) {
    orb = (
      <div
        aria-label={`Stage ${stage.id} 준비 중`}
        className="relative grid h-[64px] w-[64px] cursor-not-allowed place-items-center rounded-full bg-gradient-to-br from-sakura-400/85 to-lilac-400/85 shadow-[0_10px_20px_-6px_rgba(255,107,160,0.5)] ring-[3px] ring-white/65"
      >
        <span className="text-[20px] font-black text-white drop-shadow-sm">
          {stage.id}
        </span>
        <span className="absolute -bottom-2.5 whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] text-lilac-600 shadow-md ring-1 ring-lilac-200">
          준비 중 / 準備中
        </span>
      </div>
    );
  } else {
    orb = (
      <div
        aria-label={`Stage ${stage.id} locked`}
        className="relative grid h-[56px] w-[56px] cursor-not-allowed place-items-center rounded-full border-[1.5px] border-lilac-200/70 bg-white/55 shadow-inner backdrop-blur-sm"
      >
        <LockIcon />
        <span className="absolute -bottom-1.5 grid h-5 min-w-[22px] place-items-center rounded-full bg-white/85 px-1.5 text-[9px] font-bold text-ink-500 shadow-sm ring-1 ring-lilac-100">
          {stage.id}
        </span>
      </div>
    );
  }

  // 라벨이 다음 노드 disc 와 충돌 방지: 노드 위치에 따라 좌/우/위로 흩뿌림.
  //   좌측 노드(x < 40) → 라벨을 노드 *우측*에
  //   우측 노드(x > 60) → 라벨을 노드 *좌측*에
  //   가운데(x ≈ 50) → 라벨을 노드 *위*에 (마지막 5번 노드 등)
  const labelSide =
    stage.x < 40 ? "right" : stage.x > 60 ? "left" : "top";

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${stage.x}%`, top: stage.y }}
    >
      {/* 노드 disc 는 항상 중앙 */}
      <div className="relative flex flex-col items-center">
        {orb}
      </div>

      {/* 라벨 — 노드 disc 옆/위로 배치 */}
      <div
        className={`pointer-events-none absolute flex w-[120px] flex-col ${
          labelSide === "right"
            ? "left-full top-1/2 ml-3 -translate-y-1/2 items-start text-left"
            : labelSide === "left"
              ? "right-full top-1/2 mr-3 -translate-y-1/2 items-end text-right"
              : "bottom-full left-1/2 mb-3 -translate-x-1/2 items-center text-center"
        }`}
      >
        <p className={`text-[11px] font-bold leading-tight tracking-tight ${labelTone}`}>
          {stage.ko}
        </p>
        <p className={`mt-0.5 text-[9px] font-normal tracking-[0.16em] ${subTone}`}>
          {stage.ja}
        </p>
      </div>
    </div>
  );
}

export default function StoryStagesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [cleared, setCleared] = useState(0);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        router.replace("/login");
        return;
      }
      try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        const v = raw ? parseInt(raw, 10) : 0;
        setCleared(Number.isFinite(v) ? v : 0);
      } catch {
        // ignore
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const unlockedThrough = Math.max(1, cleared + 1);

  if (!ready) {
    return (
      <div className="relative flex flex-1 items-center justify-center px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-lilac-200 border-t-lilac-500" />
      </div>
    );
  }

  return (
    // 페이지는 부모(app-frame, 고정 높이) 채움. overflow-hidden 으로 스크롤 차단.
    <div className="relative flex flex-1 flex-col overflow-hidden px-5 pb-4 pt-5">
      {/* Header */}
      <div className="relative z-10 flex shrink-0 items-center gap-3">
        <Link
          href="/home"
          aria-label="뒤로"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-lilac-500 shadow-sm backdrop-blur transition hover:bg-white active:scale-95"
        >
          <BackIcon />
        </Link>
        <div className="flex flex-col">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-lilac-500">
            Story Mode
          </p>
          <p className="text-base font-extrabold tracking-tight text-ink-700">
            스테이지 선택 <span className="text-xs font-medium text-ink-500">/ ステージ</span>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-bold text-lilac-600 shadow-sm backdrop-blur">
          <span>♡</span>
          <span>
            {cleared}
            <span className="text-ink-300"> / {STAGES.length}</span>
          </span>
        </div>
      </div>

      {/* Map — 고정 높이라 한 화면에 다 들어감. 스크롤 없음. */}
      <div
        className="relative mx-auto mt-3 w-full max-w-[360px] shrink-0"
        style={{ height: MAP_HEIGHT }}
      >
        {/* Winding path */}
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 100 ${MAP_HEIGHT}`}
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="storyPath" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ff6ba0" />
              <stop offset="55%" stopColor="#b565e8" />
              <stop offset="100%" stopColor="#a68bb8" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {/* Soft halo behind path */}
          <path
            d={PATH_D}
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="10"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* Dotted journey line */}
          <path
            d={PATH_D}
            stroke="url(#storyPath)"
            strokeWidth="4"
            strokeDasharray="2 7"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.85"
          />
        </svg>

        {/* Floating decorations on the map */}
        <span
          aria-hidden
          className="animate-float-soft absolute right-[10%] top-[113px] text-xl text-lilac-300/70"
          style={{ animationDelay: "0.8s" }}
        >
          ✦
        </span>
        <span
          aria-hidden
          className="animate-float-soft absolute left-[10%] top-[223px] text-lg text-lilac-400/70"
          style={{ animationDelay: "2.6s" }}
        >
          ♡
        </span>
        <span
          aria-hidden
          className="animate-float-soft absolute right-[7%] top-[347px] text-xl text-sakura-400/80"
          style={{ animationDelay: "1.4s" }}
        >
          💕
        </span>
        <span
          aria-hidden
          className="animate-float-soft absolute left-[6%] top-[470px] text-2xl text-sakura-300/70"
        >
          桜
        </span>

        {/* Stage nodes */}
        {STAGES.map((stage) => (
          <StageNode
            key={stage.id}
            stage={stage}
            unlocked={stage.id <= unlockedThrough}
          />
        ))}

        {/* Goal banner above the final (topmost) stage */}
        <div className="pointer-events-none absolute left-1/2 top-[6px] -translate-x-1/2">
          <div className="flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-0.5 text-[9px] font-bold tracking-[0.22em] text-lilac-500 shadow-sm backdrop-blur">
            <span>♔</span>
            <span>엔딩 / エンディング</span>
          </div>
        </div>
      </div>

      <p className="mt-auto pt-2 text-center text-[10px] font-normal leading-snug text-ink-500/80">
        스테이지를 클리어하면 다음 이야기가 열려요 💞
        <br />
        ステージをクリアすると次の物語が開くよ
      </p>
    </div>
  );
}
