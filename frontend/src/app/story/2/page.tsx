"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Bg =
  | "store-happy"
  | "store-normal"
  | "store-sad"
  | "rival-normal"
  | "rival-shy"
  | "rival-mad";

type Speaker = "haruki" | "mystery" | "sister";

type Option = { ko: string; correct?: boolean };
type WrongFB = { madBg: Bg; ja: string; ko: string; speaker?: Speaker };

type Beat = (
  | { kind: "narr"; ja: string; ko: string }
  | { kind: "line"; ja: string; ko: string; speaker?: Speaker }
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
  "store-happy": "/images/stage2-main-happy.png",
  "store-normal": "/images/stage2-main-normal.png",
  "store-sad": "/images/stage2-main-sad.png",
  "rival-normal": "/images/stage2-subchar-normal.PNG",
  "rival-shy": "/images/stage2-subchar-shy.PNG",
  "rival-mad": "/images/stage2-subchar-mad.PNG",
};

const PROGRESS_KEY = "lingodarling:story-cleared";
const STAGE_ID = 2;

const SCRIPT: Beat[] = [
  {
    kind: "narr",
    bg: "store-normal",
    ja: "あの日から数日。あの人の名前が、ずっと頭から離れなかった。",
    ko: "그날로부터 며칠. 그 사람 이름이 계속 머릿속을 떠나지 않았다.",
  },
  {
    kind: "narr",
    bg: "store-normal",
    ja: "「あの本屋(ほんや)で待ってます」——その一通(いっつう)のメッセージで、ここに来た。",
    ko: "\"그 책방에서 기다릴게요\" —— 그 한 통의 메시지에, 여기까지 왔다.",
  },
  {
    kind: "line",
    bg: "store-happy",
    speaker: "haruki",
    ja: "あっ、来てくれた！ここ、わたしのいちばん好きな本屋なんです。",
    ko: "앗, 와줬네요! 여기, 제가 제일 좋아하는 책방이에요.",
  },
  {
    kind: "tip",
    ja: "本屋(ほんや) ／ 書店(しょてん)",
    reading: "혼야 ／ 쇼텐",
    meaning: "책방 ／ 서점",
    note: "「本屋」는 일상에서 쓰는 캐주얼한 말, 「書店」는 간판·정식 명칭에 자주 써요. 「〜屋(や)」는 '~가게'라는 뜻이에요. (パン屋=빵집)",
    example: "本屋に行きます。— 책방에 가요.",
  },
  {
    kind: "narr",
    ja: "紙(かみ)の匂(にお)い、静かな店内。並んだ背表紙(せびょうし)の間で、春希が笑った。",
    ko: "종이 냄새, 조용한 가게 안. 늘어선 책등 사이에서 하루키가 웃었다.",
  },
  {
    kind: "line",
    speaker: "haruki",
    ja: "これ、おすすめですよ。もう読(よ)みました？",
    ko: "이거, 추천이에요. 벌써 읽어봤어요?",
  },
  {
    kind: "quiz",
    question: "「おすすめ」 의 의미는?",
    hint: "춘희가 책을 건네며 한 말",
    options: [
      { ko: "재미없어요" },
      { ko: "추천이에요", correct: true },
      { ko: "품절이에요" },
    ],
    onWrong: {
      madBg: "store-sad",
      speaker: "haruki",
      ja: "……あれ、興味(きょうみ)、ない…？",
      ko: "…어라, 관심… 없어요…?",
    },
  },
  {
    kind: "tip",
    ja: "おすすめ",
    reading: "오스스메",
    meaning: "추천",
    note: "「勧(すす)める(권하다)」에서 온 명사예요. 「お＋すすめ」로 정중하게. 가게·메뉴·책을 추천할 때 만능으로 써요.",
    example: "これがおすすめです。— 이게 추천이에요.",
  },
  {
    kind: "line",
    speaker: "haruki",
    ja: "わたしの好きな作家(さっか)なんです。全部(ぜんぶ)で三冊(さんさつ)あります。",
    ko: "제가 좋아하는 작가예요. 전부 세 권 있어요.",
  },
  {
    kind: "quiz",
    question: "「三冊(さんさつ)」 의 의미는?",
    hint: "책을 셀 때 쓰는 말",
    options: [
      { ko: "세 번" },
      { ko: "세 권", correct: true },
      { ko: "세 명" },
    ],
    onWrong: {
      madBg: "store-sad",
      speaker: "haruki",
      ja: "……数(かぞ)え方(かた)、ちょっと違(ちが)うかも。",
      ko: "…세는 법이, 좀 다른 것 같아요.",
    },
  },
  {
    kind: "tip",
    ja: "〜冊(さつ)",
    reading: "사츠",
    meaning: "~권 (책을 세는 말)",
    note: "일본어는 세는 대상마다 단위가 달라요. 책=冊, 사람=人(にん), 물건=つ／個(こ). 一冊(いっさつ)・二冊(にさつ)・三冊(さんさつ)。",
    example: "本(ほん)を二冊(にさつ)ください。— 책 두 권 주세요.",
  },
  {
    kind: "narr",
    bg: "store-happy",
    ja: "肩(かた)が触(ふ)れそうな距離(きょり)。胸(むね)が、また——トクン。",
    ko: "어깨가 닿을 듯한 거리. 가슴이, 또——두근.",
  },
  {
    kind: "line",
    bg: "rival-normal",
    speaker: "mystery",
    ja: "あら、春希じゃない。久(ひさ)しぶり〜。",
    ko: "어머, 하루키 아냐. 오랜만이야~.",
  },
  {
    kind: "thought",
    ja: "（誰(だれ)…？ 春希と、すごく親(した)しそう……）",
    ko: "(누구지…? 하루키랑, 엄청 친해 보여……)",
  },
  {
    kind: "quiz",
    question: '"저 사람, 누구예요?" 라고 물으려면?',
    hint: "모르는 사람을 가리키며 정중하게",
    options: [
      { ko: "あの人、誰ですか？", correct: true },
      { ko: "あの人、どこですか？" },
      { ko: "あの人、何ですか？" },
    ],
    onWrong: {
      madBg: "rival-mad",
      speaker: "mystery",
      ja: "……わたしのこと、噂(うわさ)してる？",
      ko: "…내 얘기, 하는 거야?",
    },
  },
  {
    kind: "tip",
    ja: "誰(だれ)ですか",
    reading: "다레데스카",
    meaning: "누구예요?",
    note: "사람=誰, 사물=何(なに), 장소=どこ, 시간=いつ。 더 정중하게는 「どなたですか」를 써요.",
    example: "あの方(かた)はどなたですか？— 저분은 누구세요?",
  },
  {
    kind: "line",
    bg: "rival-shy",
    speaker: "mystery",
    ja: "へえ……あなたが、春希の。ふふっ。",
    ko: "헤에…… 당신이, 하루키의. 후훗.",
  },
  {
    kind: "line",
    bg: "store-sad",
    speaker: "haruki",
    ja: "あの、これはその——そういうのじゃ、なくて。",
    ko: "저, 이건 그게——그런 거, 아니라……",
  },
  {
    kind: "thought",
    ja: "胸が、ざわっとした。……この気持(きも)ちは、何だろう。",
    ko: "가슴이, 철렁했다. ……이 기분은, 뭘까.",
  },
  {
    kind: "quiz",
    question: "친구・연인・가족 중 「恋人(こいびと)」 의 뜻은?",
    hint: "서로 사귀고 있는 사이",
    options: [
      { ko: "친구" },
      { ko: "연인", correct: true },
      { ko: "가족" },
    ],
    onWrong: {
      madBg: "store-sad",
      speaker: "haruki",
      ja: "……そ、そういう意味(いみ)じゃ、ないですよ？",
      ko: "…그, 그런 뜻이, 아니에요?",
    },
  },
  {
    kind: "tip",
    ja: "友達(ともだち) ／ 恋人(こいびと) ／ 家族(かぞく)",
    reading: "토모다치 ／ 코이비토 ／ 카조쿠",
    meaning: "친구 ／ 연인 ／ 가족",
    note: "「恋人」는 사귀는 사이를 통틀어 말해요. 남친=彼氏(かれし), 여친=彼女(かのじょ). 「ただの友達」=그냥 친구.",
    example: "ただの友達です。— 그냥 친구예요.",
  },
  {
    kind: "line",
    bg: "rival-normal",
    speaker: "mystery",
    ja: "ふふ、ごめんね。私(わたし)、春希の姉(あね)なの。よろしくね。",
    ko: "후후, 미안. 나, 하루키 누나야. 잘 부탁해.",
  },
  {
    kind: "quiz",
    question: "「姉(あね)」 의 의미는?",
    hint: "방금 본인이 밝힌 관계",
    options: [
      { ko: "여동생" },
      { ko: "언니・누나", correct: true },
      { ko: "어머니" },
    ],
    onWrong: {
      madBg: "rival-mad",
      speaker: "sister",
      ja: "……失礼(しつれい)ね、お姉(ねえ)さんに。",
      ko: "…실례네, 누나한테.",
    },
  },
  {
    kind: "tip",
    ja: "姉(あね) ／ お姉(ねえ)さん",
    reading: "아네 ／ 오네에상",
    meaning: "언니・누나",
    note: "내 가족을 남에게 말할 땐 姉(낮춤), 남의 가족이거나 부를 땐 お姉さん(높임). 兄(あに)=형・오빠, 妹(いもうと)=여동생, 弟(おとうと)=남동생.",
    example: "姉(あね)が二人(ふたり)います。— 누나가 둘 있어요.",
  },
  {
    kind: "narr",
    bg: "store-happy",
    ja: "張(は)りつめていた何(なに)かが、ふっと、ほどけた。",
    ko: "팽팽하던 무언가가, 스르르, 풀렸다.",
  },
  {
    kind: "line",
    bg: "store-happy",
    speaker: "haruki",
    ja: "もう、姉(ねえ)さんったら。……心配(しんぱい)、しました？",
    ko: "정말, 누나도 참. ……걱정, 했어요?",
  },
  {
    kind: "thought",
    ja: "安心(あんしん)した。……でも、安心したってことは——。",
    ko: "안심했다. ……그런데, 안심했다는 건——.",
  },
  {
    kind: "quiz",
    question: "「安心(あんしん)しました」 의 의미는?",
    hint: "걱정이 사라졌을 때 하는 말",
    options: [
      { ko: "안심했어요", correct: true },
      { ko: "실망했어요" },
      { ko: "깜짝 놀랐어요" },
    ],
    onWrong: {
      madBg: "store-sad",
      speaker: "haruki",
      ja: "……まだ、不安(ふあん)そうですね。",
      ko: "…아직, 불안해 보여요.",
    },
  },
  {
    kind: "tip",
    ja: "安心(あんしん)しました",
    reading: "안싱시마시타",
    meaning: "안심했어요",
    note: "安心(안심) ↔ 心配(しんぱい, 걱정). 「〜して安心した」=~해서 안심했다.",
    example: "無事(ぶじ)で安心しました。— 무사해서 안심했어요.",
  },
  {
    kind: "line",
    bg: "store-happy",
    speaker: "haruki",
    ja: "また会(あ)えて、ほんとうに嬉(うれ)しい。",
    ko: "다시 만나서, 정말 기뻐요.",
  },
  {
    kind: "quiz",
    question: "「嬉(うれ)しい」 의 의미는?",
    hint: "좋은 일이 있을 때의 마음",
    options: [
      { ko: "슬프다" },
      { ko: "기쁘다", correct: true },
      { ko: "지루하다" },
    ],
    onWrong: {
      madBg: "store-sad",
      speaker: "haruki",
      ja: "……この気持ち、伝(つた)わってないのかな。",
      ko: "…이 마음, 안 전해지나.",
    },
  },
  {
    kind: "tip",
    ja: "嬉(うれ)しい ／ 楽(たの)しい",
    reading: "우레시이 ／ 타노시이",
    meaning: "기쁘다 ／ 즐겁다",
    note: "「嬉しい」는 어떤 일로 마음이 기쁜 순간의 감정, 「楽しい」는 무언가를 하는 동안의 즐거움이에요.",
    example: "会(あ)えて嬉しいです。— 만나서 기뻐요.",
  },
  {
    kind: "thought",
    bg: "store-happy",
    ja: "この胸の揺(ゆ)れの正体(しょうたい)が、もう、わかってしまった気がした。",
    ko: "이 흔들리는 마음의 정체를, 이제, 알아버린 것 같았다.",
  },
  { kind: "end" },
];

const TOTAL_QUIZZES = SCRIPT.filter((b) => b.kind === "quiz").length;

// Background is "sticky": a beat without its own `bg` keeps the most recent one.
function resolveBg(idx: number): Bg {
  for (let j = Math.min(idx, SCRIPT.length - 1); j >= 0; j--) {
    const b = SCRIPT[j];
    if (b.bg) return b.bg;
  }
  return "store-normal";
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
              STAGE 2 ・ 第二話
            </p>
            <p className="truncate text-[13px] font-black leading-tight tracking-tight text-white drop-shadow">
              흔들리는 마음{" "}
              <span className="text-white/70">・ 揺れる心</span>
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

function SpeakerPill({ tone }: { tone: Speaker | "narr" }) {
  if (tone === "narr") {
    return (
      <span className="inline-flex w-fit items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.2em] text-white/90 ring-1 ring-white/25 backdrop-blur">
        ナレーション ・ 나레이션
      </span>
    );
  }
  if (tone === "mystery") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/25 px-3 py-1 text-[11px] font-extrabold tracking-wider text-white ring-1 ring-white/40 backdrop-blur">
        <span>？</span>
        <span>누구…? ・ 謎の女性</span>
      </span>
    );
  }
  if (tone === "sister") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gradient-to-r from-lilac-500 to-sky-400 px-3 py-1 text-[11px] font-extrabold tracking-wider text-white shadow-[0_6px_14px_-4px_rgba(140,120,230,0.6)]">
        <span>✿</span>
        <span>하루키의 누나 ・ お姉さん</span>
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
  const tone: Speaker | "narr" =
    beat.kind === "line" ? beat.speaker ?? "haruki" : "narr";
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
  const who: Speaker = fb.speaker ?? "haruki";
  const isSister = who === "sister" || who === "mystery";
  const emoji = isSister ? "💢" : "💧";
  const label = isSister ? "謎の女性 ・ お姉さん" : "하루키 ・ 春希";
  const pillTone = isSister ? "bg-lilac-500/90" : "bg-sakura-500/90";

  return (
    <button
      type="button"
      onClick={onTap}
      className="animate-fade-in-up w-full text-left"
    >
      <div className="mx-3 mb-5 rounded-3xl border border-sakura-300/40 bg-black/65 px-5 pb-5 pt-4 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <span
          className={`inline-flex w-fit items-center gap-1 rounded-full ${pillTone} px-3 py-1 text-[11px] font-extrabold tracking-wider text-white shadow`}
        >
          <span>{emoji}</span>
          <span>{label}</span>
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
          CHAPTER 2 CLEAR
        </p>
        <span className="text-sakura-300">✦</span>
      </div>
      <h2 className="mt-3 text-center text-2xl font-black tracking-tight text-white drop-shadow">
        흔들리는 마음
      </h2>
      <p className="mt-0.5 text-center text-[12px] font-semibold tracking-[0.25em] text-lilac-200">
        揺れる心
      </p>

      <div className="mt-4 flex justify-center">
        <Hearts score={heartScore} max={TOTAL_QUIZZES} />
      </div>
      <p className="mt-1 text-center text-[10px] font-bold tracking-[0.18em] text-white/70">
        두근 점수 ・ ドキドキスコア
      </p>

      <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur">
        <p className="text-[13px] font-bold italic leading-relaxed text-white">
          「この気持ちの名前を、そろそろ認(みと)めなきゃ。」
        </p>
        <p className="mt-1 text-[11px] italic leading-relaxed text-white/75">
          이 마음의 이름을, 이제 슬슬 인정해야만 할 것 같아.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-lilac-300/30 bg-lilac-400/15 px-3 py-2.5">
        <div>
          <p className="text-[9px] font-extrabold tracking-[0.25em] text-lilac-200">
            NEXT ・ 다음 화
          </p>
          <p className="mt-0.5 text-[13px] font-extrabold text-white">
            달빛 아래 고백 <span className="text-lilac-200">・ 月夜の告白</span>
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

export default function Stage2Page() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [i, setI] = useState(0);
  const [madFB, setMadFB] = useState<WrongFB | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
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

  const activeBg: Bg = madFB ? madFB.madBg : resolveBg(i);
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
            priority={key === "store-normal"}
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
