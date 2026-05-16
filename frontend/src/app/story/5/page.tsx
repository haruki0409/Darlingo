"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Bg =
  | "street-day"
  | "street-night"
  | "normal"
  | "happy"
  | "bad"
  | "cg"
  | "smile";

type Option = { ko: string; correct?: boolean };
type WrongFB = { madBg: Bg; ja: string; ko: string; tone?: "sad" | "angry" };

type Beat = (
  | { kind: "narr"; ja: string; ko: string }
  | { kind: "line"; ja: string; ko: string }
  | { kind: "thought"; ja: string; ko: string }
  | {
      kind: "tip";
      ja: string;
      reading: string;
      meaning: string;
      note: string;
      example?: string;
    }
  | {
      kind: "quiz";
      question: string;
      hint?: string;
      options: Option[];
      onWrong: WrongFB;
    }
  | { kind: "end" }
) & { bg?: Bg };

// Stage 5 전용 아트가 아직 없어, 기존 에셋으로 임시 매핑(플레이스홀더).
// 전용 컷이 생기면 아래 경로 7줄만 교체하면 됨 (Stage 3 의 fallback 방식과 동일).
const BG_SRC: Record<Bg, string> = {
  "street-day": "/images/stage1-street-happy.png", // 그 골목, 벚꽃 (재회)
  "street-night": "/images/stage4-ueno-night.png", // 밤 벚꽃 (흔들림·엔딩)
  normal: "/images/stage4-s1-normal.png",
  happy: "/images/stage4-s1-happy.png",
  bad: "/images/stage4-s1-bad.png",
  cg: "/images/stage4-s4-meet-again.png", // 프러포즈 클로즈업
  smile: "/images/stage4-s4-last-smile.png", // 수락·엔딩 미소
};

const PROGRESS_KEY = "lingodarling:story-cleared";
const STAGE_ID = 5;
const HEARTS_MAX = 5;

const SCRIPT: Beat[] = [
  // ── 씬 1 : 그 골목에서 다시 (재회·수미상관) ──
  {
    kind: "narr",
    bg: "street-day",
    ja: "一年(いちねん)後(ご)。あの路地(ろじ)に、また、桜(さくら)が舞(ま)う。",
    ko: "1년 후. 그 골목에, 다시, 벚꽃이 흩날린다.",
  },
  {
    kind: "narr",
    bg: "normal",
    ja: "隣(となり)を歩(ある)くハルキ。もう、敬語(けいご)も、ぎこちなさも、ない。",
    ko: "옆을 걷는 하루키. 이제, 존댓말도, 어색함도, 없다.",
  },
  {
    kind: "line",
    bg: "happy",
    ja: "ここだよ、ここ。きみが、わたしに——どんっ、てぶつかった所(ところ)。へへ。",
    ko: "여기야, 여기. 네가, 나한테——콱, 부딪힌 곳. 헤헤.",
  },
  {
    kind: "tip",
    ja: "あの時(とき) ／ 覚(おぼ)えてる",
    reading: "아노 토키 ／ 오보에테루",
    meaning: "그때 ／ 기억해",
    note: "「あの時」=그때(추억의 한 시점). 「覚えてる」=기억하고 있어 (「覚えている」의 회화체).",
    example: "あの時(とき)のこと、覚(おぼ)えてる。— 그때 일, 기억해.",
  },
  {
    kind: "quiz",
    question: "처음 부딪힌 그 자리. 하루키 말에 뭐라고 답할까?",
    hint: "함께한 추억을 떠올리며 (선택형)",
    options: [
      { ko: "うん、ちゃんと、覚(おぼ)えてるよ。", correct: true },
      { ko: "さあ、忘(わす)れた、かな。" },
      { ko: "そんな所(ところ)、あった？" },
    ],
    onWrong: {
      madBg: "bad",
      tone: "sad",
      ja: "もう……ひどい。わたしは、覚(おぼ)えてるのに。",
      ko: "정말…… 너무해. 난, 기억하는데.",
    },
  },
  {
    kind: "line",
    bg: "happy",
    ja: "……えへへ。ばか。",
    ko: "……에헤헤. 바보.",
  },

  // ── 씬 2 : 한 번의 흔들림 (불안·FailCard 구간) ──
  {
    kind: "narr",
    bg: "street-night",
    ja: "笑(わら)っていたハルキが、ふと、足(あし)を止(と)めた。",
    ko: "웃던 하루키가, 문득, 걸음을 멈췄다.",
  },
  {
    kind: "line",
    bg: "normal",
    ja: "ねえ……。わたしたち、これからも、ずっと、一緒(いっしょ)に、いられるのかな。……たまに、こわくなる。",
    ko: "있잖아……. 우리, 앞으로도, 쭉, 같이, 있을 수 있을까. ……가끔, 무서워져.",
  },
  {
    kind: "tip",
    ja: "ずっと ／ これからも ／ こわい",
    reading: "즛토 ／ 코레카라모 ／ 코와이",
    meaning: "쭉·계속 ／ 앞으로도 ／ 무섭다",
    note: "「ずっと」=쭉·계속·영원히. 「これからも」=앞으로도. 「こわい」=무섭다(불안할 때도 써요).",
    example: "これからも、ずっと、一緒(いっしょ)。— 앞으로도, 쭉, 함께.",
  },
  {
    kind: "quiz",
    question: "불안해하는 하루키에게 뭐라고 답할까?",
    hint: "흔들리지 않는 마음을 담아",
    options: [
      { ko: "もちろん。ずっと、そばにいるよ。", correct: true },
      { ko: "うーん、わからない、けど。" },
      { ko: "それは、その時(とき)、かんがえよう。" },
    ],
    onWrong: {
      madBg: "bad",
      tone: "sad",
      ja: "……やっぱり。きみも、わからない、んだ。",
      ko: "……역시. 너도, 모르는, 거구나.",
    },
  },
  {
    kind: "tip",
    ja: "もちろん ／ そばにいる",
    reading: "모치론 ／ 소바니 이루",
    meaning: "물론 ／ 곁에 있다",
    note: "「もちろん」=물론(당연하지). 「そばにいる」=곁에 있다. 「そばにいるよ」=곁에 있을게 (안심·약속).",
    example: "ずっと、そばにいるよ。— 쭉, 곁에 있을게.",
  },

  // ── 씬 3 : 영원의 약속 = 프러포즈 (절정) ──
  {
    kind: "narr",
    bg: "cg",
    ja: "——わたしは、ポケットに、手(て)を入(い)れた。小(ちい)さな、箱(はこ)。",
    ko: "——나는, 주머니에, 손을 넣었다. 작은, 상자.",
  },
  {
    kind: "thought",
    ja: "（いまだ。いま、言(い)わなきゃ。一生(いっしょう)に、一度(いちど)の——。）",
    ko: "(지금이야. 지금, 말해야 해. 평생, 한 번의——.)",
  },
  {
    kind: "quiz",
    question: "무릎을 꿇고, 반지를 내민다. 영원을 약속하려면?",
    hint: "가장 진심을 담은, 한 마디",
    options: [
      { ko: "結婚(けっこん)してください。ずっと、そばにいて。", correct: true },
      { ko: "友(とも)だちで、いてください。" },
      { ko: "さよなら、元気(げんき)でね。" },
    ],
    onWrong: {
      madBg: "cg",
      tone: "sad",
      ja: "……え。いま、なんて……？",
      ko: "……어. 지금, 뭐라고……?",
    },
  },
  {
    kind: "tip",
    ja: "結婚(けっこん)してください ／ 一生(いっしょう)",
    reading: "켓콘시테 쿠다사이 ／ 잇쇼-",
    meaning: "결혼해 주세요 ／ 평생",
    note: "「結婚してください」=결혼해 주세요 (정식 청혼). 반말은 「結婚しよう」=결혼하자. 「一生」=평생·일생.",
    example: "わたしと、結婚(けっこん)してください。— 저와, 결혼해 주세요.",
  },
  {
    kind: "line",
    bg: "cg",
    ja: "え……っ。う、うそ……。ほんとに……？ 泣(な)いちゃう、じゃん……。",
    ko: "어……. 거, 거짓말……. 진짜……? 울잖아…….",
  },

  // ── 씬 4 : 결혼 약속, 진엔딩 ──
  {
    kind: "narr",
    bg: "smile",
    ja: "ハルキは、くしゃくしゃの笑顔(えがお)で、小指(こゆび)を、差(さ)し出(だ)した。",
    ko: "하루키는, 엉망진창인 웃는 얼굴로, 새끼손가락을, 내밀었다.",
  },
  {
    kind: "line",
    bg: "smile",
    ja: "……うん。うん……！ ずっと、いっしょ。やくそく。指切(ゆびき)り、げんまん。",
    ko: "……응. 응……! 쭉, 함께. 약속. 손가락 걸고, 꾹.",
  },
  {
    kind: "tip",
    ja: "指切(ゆびき)りげんまん ／ 永遠(えいえん)",
    reading: "유비키리 겐만 ／ 에이엔",
    meaning: "손가락 약속 ／ 영원",
    note: "「指切りげんまん」=새끼손가락 거는 약속 (한국의 “꼭꼭 약속”). 「永遠」=영원. 약속을 절대 어기지 않겠다는 다짐이에요.",
    example: "永遠(えいえん)に、いっしょ。指切(ゆびき)り。— 영원히, 함께. 손가락 걸고.",
  },
  {
    kind: "quiz",
    question: "마지막으로, 하루키에게 영원을 약속하며?",
    hint: "이 이야기의, 마지막 한 마디",
    options: [
      { ko: "うん。永遠(えいえん)に、きみと、いっしょだ。", correct: true },
      { ko: "うん、たぶん、ね。" },
      { ko: "うん、いつか、ね。" },
    ],
    onWrong: {
      madBg: "bad",
      tone: "sad",
      ja: "もう……ここで、ふざけないで、よ。",
      ko: "정말…… 여기서, 장난치지 마, 응.",
    },
  },
  {
    kind: "line",
    bg: "smile",
    ja: "……えへへ。じゃあ、これで——わたしたち、家族(かぞく)、だね。",
    ko: "……에헤헤. 그럼, 이걸로——우리, 가족, 이네.",
  },
  {
    kind: "narr",
    bg: "street-night",
    ja: "桜(さくら)が、雪(ゆき)のように、ふたりに降(ふ)りつもる。",
    ko: "벚꽃이, 눈처럼, 두 사람 위로 쌓인다.",
  },
  {
    kind: "narr",
    bg: "street-night",
    ja: "——物語(ものがたり)は、この路地(ろじ)で始(はじ)まり。この路地(ろじ)で、永遠(えいえん)になった。",
    ko: "——이야기는, 이 골목에서 시작됐고. 이 골목에서, 영원이 됐다.",
  },
  { kind: "end", bg: "street-night" },
];

const TOTAL_QUIZZES = SCRIPT.filter((b) => b.kind === "quiz").length;

// Background is "sticky": a beat without its own `bg` keeps the most recent one.
function resolveBg(idx: number): Bg {
  for (let j = Math.min(idx, SCRIPT.length - 1); j >= 0; j--) {
    const b = SCRIPT[j];
    if (b.bg) return b.bg;
  }
  return "street-day";
}

// 1-indexed position of the current quiz, for the "Q. n/N" badge.
function quizNumberAt(idx: number): number {
  let count = 0;
  for (let j = 0; j <= Math.min(idx, SCRIPT.length - 1); j++) {
    if (SCRIPT[j].kind === "quiz") count++;
  }
  return count;
}

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

const ChevronDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-3.5 w-3.5"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

function Hearts({ score, max }: { score: number; max: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${score} / ${max} 두근 남음`}
    >
      {Array.from({ length: max }).map((_, idx) => (
        <span
          key={idx}
          className={`text-[14px] leading-none transition ${
            idx < score
              ? "text-sakura-400 drop-shadow-[0_0_4px_rgba(255,107,160,0.6)]"
              : "text-white/25"
          }`}
        >
          {idx < score ? "♥" : "♡"}
        </span>
      ))}
    </div>
  );
}

function StageHeader({
  i,
  total,
  heartsLeft,
}: {
  i: number;
  total: number;
  heartsLeft: number;
}) {
  const pct = Math.min(100, Math.round(((i + 1) / total) * 100));
  return (
    <header className="relative z-20 px-3 pt-4">
      <div className="rounded-2xl border border-white/15 bg-black/55 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.55)] backdrop-blur-md">
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <Link
            href="/story"
            aria-label="뒤로"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-white shadow-sm transition hover:bg-white/30 active:scale-95"
          >
            <BackIcon />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-extrabold tracking-[0.25em] text-sakura-200">
              STAGE 5 ・ 最終話
            </p>
            <p className="truncate text-[13px] font-black leading-tight tracking-tight text-white drop-shadow">
              영원을 약속해{" "}
              <span className="text-white/70">・ 永遠の約束を</span>
            </p>
          </div>
          <Hearts score={heartsLeft} max={HEARTS_MAX} />
        </div>
        <div className="flex items-center gap-2 px-2.5 pb-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/55 ring-1 ring-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sakura-500 to-lilac-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-white ring-1 ring-white/20">
            {i + 1}/{total}
          </span>
        </div>
      </div>
    </header>
  );
}

function SpeakerPill({ tone }: { tone: "haruki" | "narr" }) {
  if (tone === "narr") {
    return (
      <span className="inline-flex w-fit items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.2em] text-white/90 ring-1 ring-white/25 backdrop-blur">
        ナレーション ・ 나레이션
      </span>
    );
  }
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gradient-to-r from-sakura-500 to-lilac-500 px-3 py-1 text-[11px] font-extrabold tracking-wider text-white shadow-[0_6px_14px_-4px_rgba(255,107,160,0.6)]">
      <span>♡</span>
      <span>하루키 ・ 春希</span>
    </span>
  );
}

function DialogueBox({
  beat,
  onTap,
  beatKey,
}: {
  beat: Extract<Beat, { kind: "narr" | "line" | "thought" }>;
  onTap: () => void;
  beatKey: number;
}) {
  const tone = beat.kind === "line" ? "haruki" : ("narr" as "haruki" | "narr");
  const isThought = beat.kind === "thought";

  return (
    <button
      type="button"
      onClick={onTap}
      key={beatKey}
      className="animate-fade-in-up w-full cursor-pointer text-left"
    >
      <div className="mx-3 mb-5 rounded-3xl border border-white/15 bg-black/60 px-5 pb-5 pt-4 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <SpeakerPill tone={tone} />
        <p
          className={`mt-3 text-[17px] font-bold leading-relaxed text-white drop-shadow ${
            isThought ? "italic opacity-90" : ""
          }`}
        >
          {beat.ja}
        </p>
        <p
          className={`mt-1.5 text-[13px] leading-relaxed text-white/75 ${
            isThought ? "italic" : ""
          }`}
        >
          {beat.ko}
        </p>
        <div className="mt-2 flex justify-end text-white/70">
          <span className="animate-heartbeat inline-flex">
            <ChevronDownIcon />
          </span>
        </div>
      </div>
    </button>
  );
}

function TipCard({
  tip,
  onTap,
  beatKey,
}: {
  tip: Extract<Beat, { kind: "tip" }>;
  onTap: () => void;
  beatKey: number;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      key={beatKey}
      className="animate-fade-in-up w-full cursor-pointer text-left"
    >
      <div className="mx-3 mb-5 rounded-3xl border border-lilac-300/40 bg-gradient-to-br from-black/70 to-black/55 px-5 pb-5 pt-4 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-lilac-500 to-sakura-500 px-3 py-1 text-[10px] font-extrabold tracking-[0.2em] text-white shadow">
          <span>📖</span>
          <span>LESSON ・ 학습</span>
        </span>
        <div className="mt-3">
          <p className="text-xl font-black tracking-tight text-white drop-shadow">
            {tip.ja}
          </p>
          <p className="mt-0.5 text-[11px] font-bold tracking-[0.18em] text-sakura-200">
            {tip.reading}
          </p>
        </div>
        <div className="mt-3 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-extrabold text-white ring-1 ring-white/25 backdrop-blur">
          → {tip.meaning}
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-white/90">
          {tip.note}
        </p>
        {tip.example && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-2">
            <p className="text-[10px] font-extrabold tracking-[0.2em] text-lilac-200">
              EXAMPLE ・ 예문
            </p>
            <p className="mt-1 text-[12px] font-bold leading-relaxed text-white">
              {tip.example}
            </p>
          </div>
        )}
        <div className="mt-3 flex justify-end text-white/70">
          <span className="animate-heartbeat inline-flex">
            <ChevronDownIcon />
          </span>
        </div>
      </div>
    </button>
  );
}

function QuizBox({
  quiz,
  onPick,
  quizIndex,
  quizTotal,
}: {
  quiz: Extract<Beat, { kind: "quiz" }>;
  onPick: (opt: Option) => void;
  quizIndex: number;
  quizTotal: number;
}) {
  return (
    <div className="animate-fade-in-up mx-3 mb-5 rounded-3xl border border-white/20 bg-black/65 px-5 pb-5 pt-4 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold tracking-[0.2em] text-white ring-1 ring-white/30 backdrop-blur">
          <span>Q.</span>
          <span>クイズ ・ 퀴즈</span>
        </span>
        <span className="text-[10px] font-extrabold tracking-widest text-sakura-200">
          {quizIndex}/{quizTotal}
        </span>
      </div>
      <p className="mt-2.5 text-[15px] font-bold leading-snug text-white drop-shadow">
        {quiz.question}
      </p>
      {quiz.hint && (
        <p className="mt-1 text-[11px] italic text-white/65">💭 {quiz.hint}</p>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {quiz.options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onPick(opt)}
            className="group flex items-center gap-3 rounded-2xl border border-white/25 bg-white/15 px-4 py-3 text-left text-[14px] font-bold text-white transition hover:border-sakura-300 hover:bg-white/25 active:scale-[0.98]"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sakura-500 to-lilac-500 text-[11px] font-black text-white shadow">
              {String.fromCharCode(65 + idx)}
            </span>
            <span>{opt.ko}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MadFeedback({
  fb,
  heartsLeft,
  onTap,
}: {
  fb: WrongFB;
  heartsLeft: number;
  onTap: () => void;
}) {
  const emoji = fb.tone === "sad" ? "💧" : "💢";
  return (
    <button
      type="button"
      onClick={onTap}
      className="animate-fade-in-up w-full text-left"
    >
      <div className="mx-3 mb-5 rounded-3xl border border-sakura-300/40 bg-black/65 px-5 pb-5 pt-4 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-sakura-500/90 px-3 py-1 text-[11px] font-extrabold tracking-wider text-white shadow">
            <span>{emoji}</span>
            <span>하루키 ・ 春希</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-extrabold text-sakura-200 ring-1 ring-white/20">
            <Hearts score={heartsLeft} max={HEARTS_MAX} />
          </span>
        </div>
        <p className="mt-3 text-[16px] font-bold leading-relaxed text-white drop-shadow">
          {fb.ja}
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-white/75">
          {fb.ko}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-widest text-sakura-200/90">
            마음 -1 ・ ハート −1
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-sakura-200">
            탭해서 다시 ・ もう一度
          </span>
        </div>
      </div>
    </button>
  );
}

function FailCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="animate-fade-in-up mx-3 mb-5 rounded-3xl border border-rose-400/40 bg-gradient-to-br from-black/80 to-black/60 px-6 pb-6 pt-5 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.75)] backdrop-blur-md">
      <div className="flex items-center justify-center gap-2">
        <span className="text-rose-300">✗</span>
        <p className="text-[10px] font-extrabold tracking-[0.35em] text-rose-200">
          FAILED ・ 失敗
        </p>
        <span className="text-rose-300">✗</span>
      </div>
      <div className="mt-3 flex justify-center">
        <Hearts score={0} max={HEARTS_MAX} />
      </div>
      <h2 className="mt-4 text-center text-xl font-black tracking-tight text-white drop-shadow">
        약속은, 전하지 못했다
      </h2>
      <p className="mt-0.5 text-center text-[12px] font-semibold tracking-[0.2em] text-rose-200/80">
        約束(やくそく)は、届(とど)かなかった
      </p>
      <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur">
        <p className="text-[13px] font-bold italic leading-relaxed text-white">
          「……またいつか、ね。」
        </p>
        <p className="mt-1 text-[11px] italic leading-relaxed text-white/75">
          ……또 언젠가, 봐.
        </p>
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-sakura-500 to-lilac-500 text-sm font-extrabold tracking-wide text-white shadow-[0_10px_22px_-6px_rgba(255,107,160,0.55)] transition hover:brightness-110 active:scale-[0.98]"
        >
          다시 도전 ・ もう一度
        </button>
        <Link
          href="/story"
          className="flex h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-[13px] font-bold tracking-wide text-white/90 transition hover:bg-white/20 active:scale-[0.98]"
        >
          맵으로 ・ マップへ
        </Link>
      </div>
    </div>
  );
}

function EndCard({ wrongCount }: { wrongCount: number }) {
  const heartsLeft = Math.max(0, HEARTS_MAX - wrongCount);
  return (
    <div className="animate-fade-in-up mx-3 mb-5 rounded-3xl border border-white/25 bg-gradient-to-br from-black/75 to-black/55 px-6 pb-6 pt-5 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.7)] backdrop-blur-md">
      <div className="flex items-center justify-center gap-2">
        <span className="text-sakura-300">✦</span>
        <p className="text-[10px] font-extrabold tracking-[0.32em] text-white/80">
          THE END ・ 完
        </p>
        <span className="text-sakura-300">✦</span>
      </div>
      <h2 className="mt-3 text-center text-2xl font-black tracking-tight text-white drop-shadow">
        영원을 약속해
      </h2>
      <p className="mt-0.5 text-center text-[12px] font-semibold tracking-[0.25em] text-lilac-200">
        永遠の約束を
      </p>

      <div className="mt-4 flex justify-center">
        <Hearts score={heartsLeft} max={HEARTS_MAX} />
      </div>
      <p className="mt-1 text-center text-[10px] font-bold tracking-[0.18em] text-white/70">
        남은 마음 ・ 残りのハート
      </p>

      <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur">
        <p className="text-[13px] font-bold italic leading-relaxed text-white">
          「ずっと、いっしょ。やくそく。指切(ゆびき)り、げんまん。」
        </p>
        <p className="mt-1 text-[11px] italic leading-relaxed text-white/75">
          쭉, 함께. 약속. 손가락 걸고, 꾹.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-lilac-300/30 bg-lilac-400/15 px-4 py-3 text-center">
        <p className="text-[9px] font-extrabold tracking-[0.3em] text-lilac-200">
          THANK YOU FOR PLAYING
        </p>
        <p className="mt-1 text-[13px] font-extrabold text-white">
          ふたりの物語(ものがたり)、これにて完(かん)。
        </p>
        <p className="mt-0.5 text-[11px] font-bold text-white/75">
          두 사람의 이야기, 여기서 끝.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <Link
          href="/story"
          className="flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-sakura-500 to-lilac-500 text-sm font-extrabold tracking-wide text-white shadow-[0_10px_22px_-6px_rgba(255,107,160,0.55)] transition hover:brightness-110 active:scale-[0.98]"
        >
          맵으로 돌아가기 ・ マップへ
        </Link>
      </div>
    </div>
  );
}

export default function Stage5Page() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [i, setI] = useState(0);
  const [madFB, setMadFB] = useState<WrongFB | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [failed, setFailed] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const beat = SCRIPT[i];

  // Save progress when reaching the end beat
  useEffect(() => {
    if (!ready) return;
    if (beat?.kind !== "end") return;
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      const prev = raw ? parseInt(raw, 10) : 0;
      const cur = Number.isFinite(prev) ? prev : 0;
      if (cur < STAGE_ID) {
        localStorage.setItem(PROGRESS_KEY, String(STAGE_ID));
      }
    } catch {
      // ignore
    }
  }, [beat, ready]);

  if (!ready) {
    return (
      <div className="relative flex flex-1 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-lilac-200 border-t-lilac-500" />
      </div>
    );
  }

  const heartsLeft = Math.max(0, HEARTS_MAX - wrongCount);
  const activeBg: Bg = failed
    ? "street-night"
    : madFB
      ? madFB.madBg
      : resolveBg(i);

  function advance() {
    if (failed) return;
    if (madFB) {
      setMadFB(null);
      return;
    }
    if (!beat) return;
    if (beat.kind === "quiz" || beat.kind === "end") return;
    if (i < SCRIPT.length - 1) setI(i + 1);
  }

  function onPick(opt: Option) {
    if (!beat || beat.kind !== "quiz" || failed) return;
    if (opt.correct) {
      setShake(false);
      setI(i + 1);
      return;
    }
    const next = wrongCount + 1;
    setWrongCount(next);
    setShake(true);
    window.setTimeout(() => setShake(false), 500);
    if (next >= HEARTS_MAX) {
      setMadFB(null);
      setFailed(true);
    } else {
      setMadFB(beat.onWrong);
    }
  }

  function retry() {
    setI(0);
    setWrongCount(0);
    setMadFB(null);
    setFailed(false);
    setShake(false);
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Background layers — crossfade */}
      {(Object.keys(BG_SRC) as Bg[]).map((key) => (
        <div
          key={key}
          className={`absolute inset-0 transition-opacity duration-700 ${
            activeBg === key ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={activeBg !== key}
        >
          <Image
            src={BG_SRC[key]}
            alt=""
            fill
            sizes="(max-width: 480px) 100vw, 440px"
            className="object-cover"
            priority={key === "street-day"}
          />
        </div>
      ))}

      {/* Darkening gradient for text legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/65" />

      {/* Floating petals overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <span
          className="animate-float-soft absolute left-[8%] top-[22%] text-3xl text-sakura-200/70 drop-shadow"
          style={{ animationDelay: "0s" }}
        >
          桜
        </span>
        <span
          className="animate-float-soft absolute right-[10%] top-[32%] text-2xl text-sakura-300/70 drop-shadow"
          style={{ animationDelay: "1.6s" }}
        >
          ♡
        </span>
        <span
          className="animate-float-soft absolute left-[14%] top-[48%] text-xl text-white/50 drop-shadow"
          style={{ animationDelay: "2.4s" }}
        >
          ✦
        </span>
      </div>

      {/* Top header */}
      <StageHeader i={i} total={SCRIPT.length} heartsLeft={heartsLeft} />

      {/* Middle tap-to-advance area */}
      <button
        type="button"
        onClick={advance}
        aria-label="계속"
        disabled={
          failed ||
          !!madFB ||
          !beat ||
          beat.kind === "quiz" ||
          beat.kind === "end"
        }
        className="relative z-10 flex-1 cursor-pointer disabled:cursor-default"
      />

      {/* Bottom panel */}
      <div className={`relative z-20 ${shake ? "animate-shake" : ""}`}>
        {failed ? (
          <FailCard onRetry={retry} />
        ) : madFB ? (
          <MadFeedback
            fb={madFB}
            heartsLeft={heartsLeft}
            onTap={() => setMadFB(null)}
          />
        ) : beat?.kind === "end" ? (
          <EndCard wrongCount={wrongCount} />
        ) : beat?.kind === "quiz" ? (
          <QuizBox
            quiz={beat}
            onPick={onPick}
            quizIndex={quizNumberAt(i)}
            quizTotal={TOTAL_QUIZZES}
          />
        ) : beat?.kind === "tip" ? (
          <TipCard tip={beat} onTap={advance} beatKey={i} />
        ) : beat ? (
          <DialogueBox beat={beat} onTap={advance} beatKey={i} />
        ) : null}
      </div>
    </div>
  );
}
