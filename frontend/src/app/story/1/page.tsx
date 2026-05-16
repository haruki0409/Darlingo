"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Bg =
  | "street-happy"
  | "street-normal"
  | "street-mad"
  | "cafe-happy"
  | "cafe-normal"
  | "cafe-mad";

type Option = { ko: string; correct?: boolean };
type WrongFB = { madBg: Bg; ja: string; ko: string };

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
  "street-happy": "/images/stage1-street-happy.png",
  "street-normal": "/images/stage1-street-normal.jpg",
  "street-mad": "/images/stage1-street-mad.png",
  "cafe-happy": "/images/stage1-cafe-happy.png",
  "cafe-normal": "/images/stage1-cafe-normal.png",
  "cafe-mad": "/images/stage1-cafe-mad.png",
};

const PROGRESS_KEY = "lingodarling:story-cleared";
const STAGE_ID = 1;

const SCRIPT: Beat[] = [
  {
    kind: "narr",
    bg: "street-happy",
    ja: "春の午後、東京の路地。桜の花びらが風に舞っている。",
    ko: "봄의 오후, 도쿄의 작은 골목길. 벚꽃잎이 바람에 흩날린다.",
  },
  {
    kind: "narr",
    bg: "street-normal",
    ja: "新しいケータイの地図に夢中で歩いていたら——",
    ko: "새 휴대폰 지도만 들여다보며 걷고 있던 그 순간——",
  },
  {
    kind: "narr",
    bg: "street-normal",
    ja: "角を曲がった瞬間、誰かと——!",
    ko: "모퉁이를 도는 순간, 누군가와——!",
  },
  {
    kind: "line",
    ja: "あっ、ごめんなさい！大丈夫ですか？",
    ko: "앗, 죄송해요! 괜찮으세요?",
  },
  {
    kind: "tip",
    ja: "ごめんなさい ／ すみません",
    reading: "고멘나사이 ／ 스미마셍",
    meaning: "미안해요 ／ 실례합니다",
    note: '「ごめんなさい」는 사과 전용. 「すみません」는 사과 + 부탁 + 가게에서 "저기요" 까지 쓰는 만능 표현이에요.',
    example: "すみません、コーヒーください。— 저기요, 커피 주세요.",
  },
  {
    kind: "quiz",
    question: "「大丈夫(だいじょうぶ)ですか？」 의 의미는?",
    hint: "부딪힌 직후 상대가 걱정하며 한 말",
    options: [
      { ko: "위험해요!" },
      { ko: "괜찮으세요?", correct: true },
      { ko: "미안해요" },
    ],
    onWrong: {
      madBg: "street-mad",
      ja: "あれ……日本語、通じてないかな……？",
      ko: "어라…? 일본어, 안 통하나…?",
    },
  },
  {
    kind: "tip",
    ja: "大丈夫(だいじょうぶ)",
    reading: "다이죠-부",
    meaning: "괜찮다 ／ 괜찮아?",
    note: '끝을 내리면 "괜찮다", 끝을 올리면 "괜찮아?". 일본인이 정말 자주 쓰는 만능 표현이에요.',
    example: "大丈夫です。— 괜찮습니다. ／ 大丈夫ですか？— 괜찮으세요?",
  },
  {
    kind: "narr",
    ja: "目が合った瞬間——心臓が、一瞬だけ止まった気がした。",
    ko: "눈이 마주친 그 순간——심장이, 잠깐 멎은 것 같았다.",
  },
  {
    kind: "line",
    ja: "本当にすみません。お詫びに、そこのカフェでも——？",
    ko: "정말 죄송해요. 사과의 의미로, 저기 카페라도——?",
  },
  {
    kind: "narr",
    bg: "cafe-normal",
    ja: "こうして、見ず知らずの人とカフェで向かい合っている。",
    ko: "그렇게, 모르는 사람과 카페에 마주 앉았다.",
  },
  {
    kind: "line",
    ja: "あ、まだ名前も……。春希(はるき)です。よろしくお願いします。",
    ko: "아, 아직 이름도 안 말했네요…. 하루키예요. 잘 부탁드려요.",
  },
  {
    kind: "quiz",
    question: "「春希」를 올바르게 읽으면?",
    hint: "방금 본인이 말해줬어요",
    options: [
      { ko: "かるき (카루키)" },
      { ko: "はるき (하루키)", correct: true },
      { ko: "なつき (나츠키)" },
    ],
    onWrong: {
      madBg: "cafe-mad",
      ja: "……あれ、ちゃんと聞いてた？",
      ko: "…어라, 잘 듣고 있었어요?",
    },
  },
  {
    kind: "tip",
    ja: "春希 (はるき)",
    reading: "하루키",
    meaning: "봄 + 희망",
    note: "春(はる)=봄, 希(き)=희망. 일본의 한자 이름은 의미를 담아 짓는 경우가 많아요. 같은 한자도 사람마다 읽는 법이 다를 수 있어요.",
  },
  {
    kind: "quiz",
    question: '처음 만난 사람에게 "잘 부탁드립니다" 라고 하려면?',
    hint: "정중한 첫 인사 표현",
    options: [
      { ko: "ありがとうございます" },
      { ko: "よろしくおねがいします", correct: true },
      { ko: "おやすみなさい" },
    ],
    onWrong: {
      madBg: "cafe-mad",
      ja: "……もしかして、日本語、苦手ですか？",
      ko: "…혹시, 일본어 잘 못하세요?",
    },
  },
  {
    kind: "tip",
    ja: "よろしくお願(ねが)いします",
    reading: "요로시쿠 오네가이시마스",
    meaning: "잘 부탁드립니다",
    note: "よろしく(잘) + お願いします(부탁드립니다). 첫 만남, 부탁할 때, 메일 끝맺음에 만능. 친한 사이엔 「よろしくね」로 줄여요.",
  },
  {
    kind: "narr",
    bg: "cafe-happy",
    ja: "春希は少しだけ笑った。その笑顔に、また胸が——トクン。",
    ko: "하루키가 살짝 미소지었다. 그 미소에 또, 가슴이——두근.",
  },
  {
    kind: "line",
    ja: "コーヒー、何にしますか？",
    ko: "커피, 뭐로 하실래요?",
  },
  {
    kind: "quiz",
    question: '메뉴를 가리키며 "이거 주세요" 라고 하려면?',
    hint: "내 근처에 있는 물건",
    options: [
      { ko: "これ、ください", correct: true },
      { ko: "それ、たべます" },
      { ko: "あれ、ありがとう" },
    ],
    onWrong: {
      madBg: "cafe-mad",
      ja: "えっと……どれですか？",
      ko: "음…… 어느 거요?",
    },
  },
  {
    kind: "tip",
    ja: "これ ／ それ ／ あれ ／ どれ",
    reading: "코레 ／ 소레 ／ 아레 ／ 도레",
    meaning: "이것 ／ 그것 ／ 저것 ／ 어느 것",
    note: "「こそあど」 시리즈. 내 근처=これ / 상대 근처=それ / 둘 다 멀리=あれ / 의문=どれ. 위치에 따라 달라져요.",
    example: "これ、ください。— 이거 주세요.",
  },
  {
    kind: "line",
    ja: "じゃあ、これ二つで。",
    ko: "그럼, 이거 두 개로 주세요.",
  },
  {
    kind: "narr",
    ja: "短いはずの会話。なのに、時間が止まったみたいだった。",
    ko: "분명 짧은 대화. 그런데 시간이 멈춘 것만 같았다.",
  },
  {
    kind: "line",
    ja: "……あの。また、会えますか？",
    ko: "…저기. 또, 만날 수 있을까요?",
  },
  {
    kind: "quiz",
    question: "「また、会(あ)えますか？」 의 의미는?",
    hint: "「会う(만나다)」의 가능형 + ますか",
    options: [
      { ko: "또 만났어요?" },
      { ko: "또 만날 수 있을까요?", correct: true },
      { ko: "다시 만나주세요." },
    ],
    onWrong: {
      madBg: "cafe-mad",
      ja: "……あ、伝わってないかも。",
      ko: "…아, 안 전해진 것 같아.",
    },
  },
  {
    kind: "tip",
    ja: "会(あ)えますか",
    reading: "아에마스카",
    meaning: "만날 수 있을까요?",
    note: "会う(만나다) → 会える(만날 수 있다, 가능형) + ますか. 「う동사」는 끝의 う를 え로 바꾸고 る를 붙여 가능형을 만들어요.",
    example: "明日、会えますか？— 내일 만날 수 있어요?",
  },
  {
    kind: "thought",
    ja: "（どうして……こんなにドキドキしてるんだろう？）",
    ko: "(왜… 이렇게 두근거리는 걸까?)",
  },
  { kind: "end" },
];

const TOTAL_QUIZZES = SCRIPT.filter((b) => b.kind === "quiz").length;

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
              : "text-white/30"
          }`}
        >
          ♥
        </span>
      ))}
    </div>
  );
}

function StageHeader({
  i,
  total,
  heartScore,
}: {
  i: number;
  total: number;
  heartScore: number;
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
              STAGE 1 ・ 第一話
            </p>
            <p className="truncate text-[13px] font-black leading-tight tracking-tight text-white drop-shadow">
              운명의 첫 만남{" "}
              <span className="text-white/70">・ 運命の出会い</span>
            </p>
          </div>
          <Hearts score={heartScore} max={TOTAL_QUIZZES} />
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

function MadFeedback({ fb, onTap }: { fb: WrongFB; onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="animate-fade-in-up w-full text-left"
    >
      <div className="mx-3 mb-5 rounded-3xl border border-sakura-300/40 bg-black/65 px-5 pb-5 pt-4 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-sakura-500/90 px-3 py-1 text-[11px] font-extrabold tracking-wider text-white shadow">
          <span>💢</span>
          <span>하루키 ・ 春希</span>
        </span>
        <p className="mt-3 text-[16px] font-bold leading-relaxed text-white drop-shadow">
          {fb.ja}
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-white/75">
          {fb.ko}
        </p>
        <div className="mt-3 text-right text-[10px] font-bold uppercase tracking-widest text-sakura-200">
          탭해서 다시 시도 ・ もう一度
        </div>
      </div>
    </button>
  );
}

function EndCard({ wrongCount }: { wrongCount: number }) {
  const heartScore = Math.max(0, TOTAL_QUIZZES - wrongCount);
  return (
    <div className="animate-fade-in-up mx-3 mb-5 rounded-3xl border border-white/25 bg-gradient-to-br from-black/75 to-black/55 px-6 pb-6 pt-5 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.7)] backdrop-blur-md">
      <div className="flex items-center justify-center gap-2">
        <span className="text-sakura-300">✦</span>
        <p className="text-[10px] font-extrabold tracking-[0.3em] text-white/80">
          CHAPTER 1 CLEAR
        </p>
        <span className="text-sakura-300">✦</span>
      </div>
      <h2 className="mt-3 text-center text-2xl font-black tracking-tight text-white drop-shadow">
        운명의 첫 만남
      </h2>
      <p className="mt-0.5 text-center text-[12px] font-semibold tracking-[0.25em] text-lilac-200">
        運命の出会い
      </p>

      <div className="mt-4 flex justify-center">
        <Hearts score={heartScore} max={TOTAL_QUIZZES} />
      </div>
      <p className="mt-1 text-center text-[10px] font-bold tracking-[0.18em] text-white/70">
        두근 점수 ・ ドキドキスコア
      </p>

      <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur">
        <p className="text-[13px] font-bold italic leading-relaxed text-white">
          「名前しか知らないあの人が——心から離れない。」
        </p>
        <p className="mt-1 text-[11px] italic leading-relaxed text-white/75">
          이름밖에 모르는 그 사람이——자꾸만 마음에 남는다.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-lilac-300/30 bg-lilac-400/15 px-3 py-2.5">
        <div>
          <p className="text-[9px] font-extrabold tracking-[0.25em] text-lilac-200">
            NEXT ・ 다음 화
          </p>
          <p className="mt-0.5 text-[13px] font-extrabold text-white">
            흔들리는 마음 <span className="text-lilac-200">・ 揺れる心</span>
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

export default function Stage1Page() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [i, setI] = useState(0);
  const [bg, setBg] = useState<Bg>("street-happy");
  const [madFB, setMadFB] = useState<WrongFB | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [shake, setShake] = useState(false);
  const [quizSeen, setQuizSeen] = useState(0);

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

  useEffect(() => {
    if (!ready) return;
    if (beat && beat.bg) setBg(beat.bg);
  }, [i, ready, beat]);

  // Track which quiz we are at (1-indexed) for the Q. n/N badge
  useEffect(() => {
    if (beat?.kind === "quiz") {
      let count = 0;
      for (let j = 0; j <= i; j++) {
        if (SCRIPT[j].kind === "quiz") count++;
      }
      setQuizSeen(count);
    }
  }, [i, beat]);

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

  const activeBg: Bg = madFB ? madFB.madBg : bg;
  const heartScore = Math.max(0, TOTAL_QUIZZES - wrongCount);

  function advance() {
    if (madFB) {
      setMadFB(null);
      return;
    }
    if (!beat) return;
    if (beat.kind === "quiz" || beat.kind === "end") return;
    if (i < SCRIPT.length - 1) setI(i + 1);
  }

  function onPick(opt: Option) {
    if (!beat || beat.kind !== "quiz") return;
    if (opt.correct) {
      setShake(false);
      setI(i + 1);
    } else {
      setWrongCount((c) => c + 1);
      setMadFB(beat.onWrong);
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
    }
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
            priority={key === "street-happy"}
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
      <StageHeader i={i} total={SCRIPT.length} heartScore={heartScore} />

      {/* Middle tap-to-advance area */}
      <button
        type="button"
        onClick={advance}
        aria-label="계속"
        disabled={
          !!madFB || !beat || beat.kind === "quiz" || beat.kind === "end"
        }
        className="relative z-10 flex-1 cursor-pointer disabled:cursor-default"
      />

      {/* Bottom panel */}
      <div className={`relative z-20 ${shake ? "animate-shake" : ""}`}>
        {madFB ? (
          <MadFeedback fb={madFB} onTap={() => setMadFB(null)} />
        ) : beat?.kind === "end" ? (
          <EndCard wrongCount={wrongCount} />
        ) : beat?.kind === "quiz" ? (
          <QuizBox
            quiz={beat}
            onPick={onPick}
            quizIndex={quizSeen}
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
