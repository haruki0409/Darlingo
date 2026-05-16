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

const STAGES: Stage[] = [
  { id: 1, ko: "운명의 첫 만남", ja: "運命の出会い", x: 28, y: 740, implemented: true },
  { id: 2, ko: "흔들리는 마음", ja: "揺れる心", x: 72, y: 585, implemented: false },
  { id: 3, ko: "달빛 아래 고백", ja: "月夜の告白", x: 26, y: 415, implemented: false },
  { id: 4, ko: "벚꽃길 산책", ja: "桜並木の散歩", x: 74, y: 250, implemented: false },
  { id: 5, ko: "영원을 약속해", ja: "永遠の約束を", x: 50, y: 90, implemented: false },
];

const PROGRESS_KEY = "lingodarling:story-cleared";
const MAP_HEIGHT = 820;

const PATH_D = `
  M 28 740
  C 28 680, 72 645, 72 585
  C 72 520, 26 475, 26 415
  C 26 350, 74 310, 74 250
  C 74 190, 50 150, 50 90
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
    className="h-6 w-6 text-ink-300"
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
        className="group relative grid h-[90px] w-[90px] place-items-center"
      >
        <span className="absolute inset-[-10px] animate-pulse rounded-full bg-sakura-400/30 blur-md" />
        <span className="animate-heartbeat relative grid h-[88px] w-[88px] place-items-center rounded-full bg-gradient-to-br from-sakura-500 to-lilac-500 shadow-[0_14px_30px_-6px_rgba(255,107,160,0.65)] ring-[5px] ring-white/80">
          <span className="text-[28px] font-black text-white drop-shadow-sm">
            {stage.id}
          </span>
        </span>
        <span className="absolute -bottom-3 whitespace-nowrap rounded-full bg-gradient-to-r from-sakura-500 to-lilac-500 px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] text-white shadow-[0_6px_14px_-4px_rgba(255,107,160,0.55)]">
          ♡ START
        </span>
      </Link>
    );
  } else if (preview) {
    orb = (
      <div
        aria-label={`Stage ${stage.id} 준비 중`}
        className="relative grid h-[88px] w-[88px] cursor-not-allowed place-items-center rounded-full bg-gradient-to-br from-sakura-400/85 to-lilac-400/85 shadow-[0_12px_26px_-8px_rgba(255,107,160,0.5)] ring-[4px] ring-white/65"
      >
        <span className="text-[26px] font-black text-white drop-shadow-sm">
          {stage.id}
        </span>
        <span className="absolute -bottom-3 whitespace-nowrap rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-extrabold tracking-[0.15em] text-lilac-600 shadow-md ring-1 ring-lilac-200">
          준비 중 ・ 準備中
        </span>
      </div>
    );
  } else {
    orb = (
      <div
        aria-label={`Stage ${stage.id} locked`}
        className="relative grid h-[78px] w-[78px] cursor-not-allowed place-items-center rounded-full border-[1.5px] border-lilac-200/70 bg-white/55 shadow-inner backdrop-blur-sm"
      >
        <LockIcon />
        <span className="absolute -bottom-2 grid h-6 min-w-[26px] place-items-center rounded-full bg-white/85 px-2 text-[10px] font-extrabold text-ink-500 shadow-sm ring-1 ring-lilac-100">
          {stage.id}
        </span>
      </div>
    );
  }

  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${stage.x}%`, top: stage.y }}
    >
      {orb}
      <div className="mt-5 flex flex-col items-center text-center">
        <p className={`text-[13px] font-extrabold tracking-tight ${labelTone}`}>
          {stage.ko}
        </p>
        <p className={`mt-0.5 text-[10px] tracking-[0.18em] ${subTone}`}>
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
    <div className="relative flex flex-1 flex-col px-5 pb-12 pt-5">
      {/* Header */}
      <div className="relative z-10 flex items-center gap-3">
        <Link
          href="/home"
          aria-label="뒤로"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-lilac-500 shadow-sm backdrop-blur transition hover:bg-white active:scale-95"
        >
          <BackIcon />
        </Link>
        <div className="flex flex-col">
          <p className="text-lg font-black tracking-tight text-ink-700">
            Story Mode
          </p>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-lilac-500">
            스테이지 선택 ・ ステージ
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-extrabold text-lilac-600 shadow-sm backdrop-blur">
          <span>♡</span>
          <span>
            {cleared}
            <span className="text-ink-300"> / {STAGES.length}</span>
          </span>
        </div>
      </div>

      {/* Map */}
      <div
        className="relative mx-auto mt-6 w-full max-w-[400px]"
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
          className="animate-float-soft absolute right-[10%] top-[160px] text-2xl text-lilac-300/70"
          style={{ animationDelay: "0.8s" }}
        >
          ✦
        </span>
        <span
          aria-hidden
          className="animate-float-soft absolute left-[10%] top-[315px] text-xl text-lilac-400/70"
          style={{ animationDelay: "2.6s" }}
        >
          ♡
        </span>
        <span
          aria-hidden
          className="animate-float-soft absolute right-[7%] top-[490px] text-2xl text-sakura-400/80"
          style={{ animationDelay: "1.4s" }}
        >
          💕
        </span>
        <span
          aria-hidden
          className="animate-float-soft absolute left-[6%] top-[665px] text-3xl text-sakura-300/70"
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
        <div className="pointer-events-none absolute left-1/2 top-[10px] -translate-x-1/2">
          <div className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[10px] font-extrabold tracking-[0.22em] text-lilac-500 shadow-sm backdrop-blur">
            <span>♔</span>
            <span>엔딩 ・ エンディング</span>
          </div>
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-ink-500/80">
        스테이지를 클리어하면 다음 이야기가 열려요 💞
      </p>
    </div>
  );
}
