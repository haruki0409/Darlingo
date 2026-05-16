"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Bg =
  | "palace"
  | "night"
  | "s1-normal"
  | "s1-happy"
  | "s1-bad"
  | "s2-normal"
  | "s2-happy"
  | "s2-bad"
  | "s3-normal"
  | "s3-happy"
  | "s3-bad"
  | "s4-normal"
  | "s4-happy"
  | "s4-bad";

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

const BG_SRC: Record<Bg, string> = {
  palace: "/images/stage3-background2.png",
  night: "/images/stage3-background.png",
  "s1-normal": "/images/stage3-1-1.png",
  "s1-happy": "/images/stage3-1-2-happy.png",
  "s1-bad": "/images/stage3-1-3-angry.png",
  // 씬2: 전용 아트가 없어 밤·달빛 배경(background)으로 대체.
  // 추후 stage3-2-1 / -2-2-happy / -2-3-angry 생기면 아래 3줄만 교체.
  "s2-normal": "/images/stage3-background.png",
  "s2-happy": "/images/stage3-background.png",
  "s2-bad": "/images/stage3-background.png",
  "s3-normal": "/images/stage3-3-1.png",
  "s3-happy": "/images/stage3-3-2-happy.png",
  "s3-bad": "/images/stage3-3-3-angry.png",
  "s4-normal": "/images/stage3-4-1.png",
  "s4-happy": "/images/stage3-4-2-happy.png",
  "s4-bad": "/images/stage3-4-2-angry.png",
};

const PROGRESS_KEY = "lingodarling:story-cleared";
const STAGE_ID = 3;
const HEARTS_MAX = 5;

const SCRIPT: Beat[] = [
  // ── 씬 1 : 경복궁에서의 만남 (걱정과 안도) ──
  {
    kind: "narr",
    bg: "palace",
    ja: "約束(やくそく)の時間(じかん)。景福宮(キョンボックン)の、広(ひろ)い石畳(いしだたみ)。",
    ko: "약속한 시간. 경복궁의, 넓은 돌바닥.",
  },
  {
    kind: "narr",
    bg: "s1-normal",
    ja: "全力(ぜんりょく)で走(はし)ってきた。息(いき)が、まだ切(き)れている。",
    ko: "전력으로 뛰어왔다. 숨이, 아직 차오른다.",
  },
  {
    kind: "line",
    bg: "s1-normal",
    ja: "あ、来(き)た。……って、暑(あつ)いのに、どうして走(はし)ってきたの？",
    ko: "아, 왔다. ……근데, 더운데 왜 뛰어왔어?",
  },
  {
    kind: "thought",
    ja: "（怒(おこ)ってない……むしろ、心配(しんぱい)してる？）",
    ko: "(화 안 났네…… 오히려, 걱정하는 거야?)",
  },
  {
    kind: "tip",
    ja: "暑(あつ)い ／ 走(はし)る",
    reading: "아츠이 ／ 하시루",
    meaning: "덥다 ／ 달리다",
    note: "「暑い」는 날씨가 더울 때, 「熱(あつ)い」는 물건이 뜨거울 때예요. 발음은 같지만 한자가 달라요. 「走る」는 う동사 (走ります).",
    example: "暑いから、走らないで。— 더우니까, 뛰지 마.",
  },
  {
    kind: "quiz",
    question: "「遅(おく)れてごめん」 의 의미는?",
    hint: "약속에 늦었을 때 하는 말",
    options: [
      { ko: "늦어서 미안", correct: true },
      { ko: "일찍 와서 고마워" },
      { ko: "안 늦었어" },
    ],
    onWrong: {
      madBg: "s1-bad",
      tone: "sad",
      ja: "……べつに、怒(おこ)ってないってば。",
      ko: "……딱히, 화난 거 아니라니까.",
    },
  },
  {
    kind: "tip",
    ja: "遅(おく)れてごめん",
    reading: "오쿠레테 고멘",
    meaning: "늦어서 미안",
    note: "遅(おく)れる=늦다 + ごめん=미안. 더 정중히는 「遅れてすみません」. 「ごめん」은 친한 사이, 「ごめんなさい」는 정중 (Stage 1 복습!).",
    example: "遅れてごめんね。— 늦어서 미안해.",
  },
  {
    kind: "line",
    bg: "s1-happy",
    ja: "ま、間(ま)に合(あ)ったからいいけど。……よかった、ほんとに。",
    ko: "뭐, 시간 맞췄으니 됐어. ……다행이다, 정말.",
  },
  {
    kind: "quiz",
    question: "「よかった」 의 의미는?",
    hint: "걱정이 풀려 안도할 때",
    options: [
      { ko: "다행이다 ・ 잘됐다", correct: true },
      { ko: "나빴다" },
      { ko: "좋아해" },
    ],
    onWrong: {
      madBg: "s1-bad",
      tone: "sad",
      ja: "……心配(しんぱい)した、こっちは。",
      ko: "……걱정했단 말이야, 난.",
    },
  },
  {
    kind: "tip",
    ja: "よかった",
    reading: "요캇타",
    meaning: "다행이다 ・ 잘됐다",
    note: "「良(よ)い」의 과거형. 무사하거나 일이 잘 풀려 안도할 때 써요. 「無事(ぶじ)でよかった」=무사해서 다행 (Stage 2 安心 과 통하는 표현).",
    example: "会(あ)えてよかった。— 만날 수 있어서 다행이야.",
  },

  // ── 씬 2 : 갑작스러운 질문과 당황 (당황과 부끄러움) ──
  {
    kind: "narr",
    bg: "s2-normal",
    ja: "しばらく、何(なに)も言(い)えなかった。ただ、その横顔(よこがお)を見(み)ていた。",
    ko: "한동안, 아무 말도 못 했다. 그저, 그 옆모습을 보고 있었다.",
  },
  {
    kind: "thought",
    ja: "（ねえ、ハルキ。……今(いま)、聞(き)いても、いい——？）",
    ko: "(있잖아, 하루키. ……지금, 물어봐도, 될까——?)",
  },
  {
    kind: "quiz",
    question: '하루키에게 "나, 좋아해?" 라고 물으려면?',
    hint: "상대의 마음을 직접 묻는 말",
    options: [
      { ko: "ハルキ……わたしのこと、好(す)き？", correct: true },
      { ko: "ハルキ……元気(げんき)？" },
      { ko: "ハルキ……何時(なんじ)？" },
    ],
    onWrong: {
      madBg: "s2-bad",
      tone: "angry",
      ja: "は……？ きゅ、急(きゅう)に何(なに)言(い)ってんの。",
      ko: "하……? 가, 갑자기 무슨 소리야.",
    },
  },
  {
    kind: "line",
    bg: "s2-bad",
    ja: "えっ……！？ な、なに言(い)ってんだよ、バカ！",
    ko: "엑……!? 무, 무슨 소리야, 바보!",
  },
  {
    kind: "tip",
    ja: "好(す)き ／ 〜のことが好き",
    reading: "스키 ／ ~노 코토가 스키",
    meaning: "좋아하다 ／ ~를 좋아하다",
    note: "「好き」는 좋아하다·사랑하다 둘 다 돼요. 사람을 좋아한다고 할 땐 「(사람)のことが好き」 구조를 자주 써요.",
    example: "あなたのことが好きです。— 당신을 좋아해요.",
  },
  {
    kind: "thought",
    bg: "s2-happy",
    ja: "（顔(かお)、真(ま)っ赤(か)。……ずるい。かわいい、なんて。）",
    ko: "(얼굴, 새빨개. ……치사해. 귀엽다, 니.)",
  },
  {
    kind: "tip",
    ja: "バカ",
    reading: "바카",
    meaning: "바보",
    note: "친한 사이에서는 화났다기보다 부끄러움·애정 섞인 핀잔으로도 써요. 톤이 중요해요. 「バカじゃないの」=바보 아냐 (어이없을 때).",
    example: "もう、バカ……。— 정말, 바보…….",
  },

  // ── 씬 3 : 어색한 침묵의 산책 (초조와 빤히 바라봄) ──
  {
    kind: "narr",
    bg: "s3-normal",
    ja: "それから、ふたりとも黙(だま)って歩(ある)いた。気(き)まずい沈黙(ちんもく)。",
    ko: "그 후, 둘 다 말없이 걸었다. 어색한 침묵.",
  },
  {
    kind: "narr",
    bg: "s3-normal",
    ja: "ハルキは、ぷいっと顔(かお)を背(そむ)けたまま。",
    ko: "하루키는, 휙 고개를 돌린 채.",
  },
  {
    kind: "quiz",
    question: "「気(き)まずい」 의 의미는?",
    hint: "분위기가 불편하고 서먹할 때",
    options: [
      { ko: "어색하다 ・ 서먹하다", correct: true },
      { ko: "맛없다" },
      { ko: "기쁘다" },
    ],
    onWrong: {
      madBg: "s3-bad",
      tone: "angry",
      ja: "……っ、こっち見(み)るなよ。",
      ko: "……윽, 이쪽 보지 마.",
    },
  },
  {
    kind: "tip",
    ja: "気(き)まずい ／ 沈黙(ちんもく)",
    reading: "키마즈이 ／ 칭모쿠",
    meaning: "어색하다 ／ 침묵",
    note: "「気まずい」는 서로 어색해 분위기가 불편한 상태. 「気まずい沈黙」=어색한 침묵 처럼 자주 같이 써요.",
    example: "気まずい空気(くうき)が流(なが)れた。— 어색한 공기가 흘렀다.",
  },
  {
    kind: "line",
    bg: "s3-bad",
    ja: "……っ、なんか、言(い)えよ。バカ。",
    ko: "……윽, 뭐라고, 말 좀 해. 바보.",
  },
  {
    kind: "thought",
    ja: "（ずっと、見(み)てた。……あなたのこと、ずっと。）",
    ko: "(계속, 보고 있었어. ……너를, 계속.)",
  },
  {
    kind: "quiz",
    question: "「なんか言(い)って」 의 의미는?",
    hint: "침묵을 깨 달라고 보채는 말",
    options: [
      { ko: "뭐라도 말해봐", correct: true },
      { ko: "조용히 해" },
      { ko: "가지 마" },
    ],
    onWrong: {
      madBg: "s3-bad",
      tone: "angry",
      ja: "……もう、いい。",
      ko: "……됐어, 이제.",
    },
  },
  {
    kind: "tip",
    ja: "なんか言(い)って",
    reading: "난카 잇테",
    meaning: "뭐라도 말해봐",
    note: "「なんか」=뭔가·뭐라도 (회화체), 「言って」=말해 (「言ってください」의 친한 말투). 어색함을 못 견딜 때 쓰는 표현.",
    example: "ねえ、なんか言ってよ。— 야, 뭐라도 말해봐.",
  },

  // ── 씬 4 : 얼굴이 맞닿은 순간 (놀람과 수줍음) ──
  {
    kind: "narr",
    bg: "s4-normal",
    ja: "ハルキが、ふいに、こっちを向(む)いた。——近(ちか)い。",
    ko: "하루키가, 불쑥, 이쪽을 봤다. ——가깝다.",
  },
  {
    kind: "thought",
    bg: "s4-normal",
    ja: "（目(め)が、合(あ)った。息(いき)が、止(と)まる。）",
    ko: "(눈이, 마주쳤다. 숨이, 멎는다.)",
  },
  {
    kind: "quiz",
    question: '반사적으로 — "사귀자, 하루키." 라고 말하려면?',
    hint: "교제를 신청하는 말",
    options: [
      { ko: "付(つ)き合(あ)おう、ハルキ。", correct: true },
      { ko: "さよなら、ハルキ。" },
      { ko: "おやすみ、ハルキ。" },
    ],
    onWrong: {
      madBg: "s4-bad",
      tone: "angry",
      ja: "……は？ 今(いま)、なんて言(い)った？",
      ko: "……하? 지금, 뭐라고 했어?",
    },
  },
  {
    kind: "tip",
    ja: "付(つ)き合(あ)う",
    reading: "츠키아우",
    meaning: "사귀다 ・ 교제하다",
    note: "「付き合おう」=사귀자 (권유형). 정중하게 고백할 땐 「付き合ってください」=사귀어 주세요. 「〜と付き合う」=~와 사귀다.",
    example: "わたしと付き合ってください。— 저와 사귀어 주세요.",
  },
  {
    kind: "line",
    bg: "s4-happy",
    ja: "っ……ばか。……そういうの、ずるいって。…………うん。",
    ko: "ㅡ……바보. ……그런 거, 치사하다고. …………응.",
  },
  {
    kind: "narr",
    bg: "night",
    ja: "いつのまにか、月(つき)が、ふたりを照(て)らしていた。",
    ko: "어느새, 달이, 두 사람을 비추고 있었다.",
  },
  { kind: "end", bg: "night" },
];

const TOTAL_QUIZZES = SCRIPT.filter((b) => b.kind === "quiz").length;

// Background is "sticky": a beat without its own `bg` keeps the most recent one.
function resolveBg(idx: number): Bg {
  for (let j = Math.min(idx, SCRIPT.length - 1); j >= 0; j--) {
    const b = SCRIPT[j];
    if (b.bg) return b.bg;
  }
  return "palace";
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
              STAGE 3 ・ 第三話
            </p>
            <p className="truncate text-[13px] font-black leading-tight tracking-tight text-white drop-shadow">
              달빛 아래 고백{" "}
              <span className="text-white/70">・ 月夜の告白</span>
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
        마음이, 닿지 않았다
      </h2>
      <p className="mt-0.5 text-center text-[12px] font-semibold tracking-[0.2em] text-rose-200/80">
        想(おも)いは、届(とど)かなかった
      </p>
      <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur">
        <p className="text-[13px] font-bold italic leading-relaxed text-white">
          「……今日(きょう)は、帰(かえ)ろっか。」
        </p>
        <p className="mt-1 text-[11px] italic leading-relaxed text-white/75">
          ……오늘은, 그만 돌아갈까.
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
        <p className="text-[10px] font-extrabold tracking-[0.3em] text-white/80">
          CHAPTER 3 CLEAR
        </p>
        <span className="text-sakura-300">✦</span>
      </div>
      <h2 className="mt-3 text-center text-2xl font-black tracking-tight text-white drop-shadow">
        달빛 아래 고백
      </h2>
      <p className="mt-0.5 text-center text-[12px] font-semibold tracking-[0.25em] text-lilac-200">
        月夜の告白
      </p>

      <div className="mt-4 flex justify-center">
        <Hearts score={heartsLeft} max={HEARTS_MAX} />
      </div>
      <p className="mt-1 text-center text-[10px] font-bold tracking-[0.18em] text-white/70">
        남은 마음 ・ 残りのハート
      </p>

      <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur">
        <p className="text-[13px] font-bold italic leading-relaxed text-white">
          「……うん、って言(い)ったの、聞(き)こえた？」
        </p>
        <p className="mt-1 text-[11px] italic leading-relaxed text-white/75">
          ……응, 이라고 한 거, 들렸어?
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-lilac-300/30 bg-lilac-400/15 px-3 py-2.5">
        <div>
          <p className="text-[9px] font-extrabold tracking-[0.25em] text-lilac-200">
            NEXT ・ 다음 화
          </p>
          <p className="mt-0.5 text-[13px] font-extrabold text-white">
            벚꽃길 산책 <span className="text-lilac-200">・ 桜並木の散歩</span>
          </p>
        </div>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold tracking-[0.18em] text-white ring-1 ring-white/25">
          UNLOCKED
        </span>
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

export default function Stage3Page() {
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
    ? "night"
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
            priority={key === "palace"}
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
