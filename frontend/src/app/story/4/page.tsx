"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Bg =
  | "ueno-day"
  | "ueno-night"
  | "s1-normal"
  | "s1-happy"
  | "s1-bad"
  | "s2-sad"
  | "s3-leaving"
  | "s4-cg"
  | "s4-smile";

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
  "ueno-day": "/images/stage4-ueno-day.png",
  "ueno-night": "/images/stage4-ueno-night.png",
  "s1-normal": "/images/stage4-s1-normal.png",
  "s1-happy": "/images/stage4-s1-happy.png",
  "s1-bad": "/images/stage4-s1-bad.png",
  "s2-sad": "/images/stage4-s2-lunch-sad.png",
  "s3-leaving": "/images/stage4-s3-leaving.png",
  "s4-cg": "/images/stage4-s4-meet-again.png",
  "s4-smile": "/images/stage4-s4-last-smile.png",
};

const PROGRESS_KEY = "lingodarling:story-cleared";
const STAGE_ID = 4;
const HEARTS_MAX = 5;

const SCRIPT: Beat[] = [
  // ── 씬 1 : 분홍빛 터널의 설렘 (낮 벚꽃·첫 데이트) ──
  {
    kind: "narr",
    bg: "ueno-day",
    ja: "春(はる)の夕(ゆう)まえ。上野公園(うえのこうえん)、桜(さくら)のトンネル。",
    ko: "봄의 해 지기 전. 우에노 공원, 벚꽃 터널.",
  },
  {
    kind: "narr",
    bg: "s1-normal",
    ja: "ハルキは、今日(きょう)のために選(えら)んだ服(ふく)で、待(ま)っていた。手(て)には、お弁当(べんとう)のかばん。",
    ko: "하루키는, 오늘을 위해 고른 옷차림으로, 기다리고 있었다. 손엔, 도시락 가방.",
  },
  {
    kind: "line",
    bg: "s1-happy",
    ja: "わぁ……見(み)て！ ほんとに、きれい。今日(きょう)、ここに来(き)てよかったね？",
    ko: "와아…… 봐! 진짜, 예쁘다. 오늘, 여기 오길 잘했지?",
  },
  {
    kind: "tip",
    ja: "きれい ／ 桜(さくら)",
    reading: "키레이 ／ 사쿠라",
    meaning: "예쁘다·깨끗하다 ／ 벚꽃",
    note: "「きれい」는 な형용사예요. 「きれいだ・きれいな花(はな)」처럼 써요. 「きれいだね」=예쁘다 그치.",
    example: "桜(さくら)、きれいだね。— 벚꽃, 예쁘다 그치.",
  },
  {
    kind: "quiz",
    question: '하루키 말에 "응, 진짜 예쁘다" 라고 맞장구치려면?',
    hint: "꽃을 같이 보며 동의하는 말",
    options: [
      { ko: "うん、ほんとに、きれい。", correct: true },
      { ko: "うん、ほんとに、こわい。" },
      { ko: "うん、ほんとに、ねむい。" },
    ],
    onWrong: {
      madBg: "s1-bad",
      tone: "angry",
      ja: "ちょっと……ちゃんと、見(み)てる？",
      ko: "잠깐…… 제대로, 보고 있어?",
    },
  },
  {
    kind: "tip",
    ja: "文末(ぶんまつ)の「ね」",
    reading: "~네 ／ ~지",
    meaning: "공감·맞장구",
    note: "문장 끝 「ね」는 상대의 동의를 구하거나 공감할 때 붙여요. 「きれいだね」「よかったね」처럼.",
    example: "楽(たの)しいね。— 즐겁다, 그치.",
  },
  {
    kind: "line",
    bg: "s1-happy",
    ja: "えへへ。今日(きょう)は……ちょっと、頑張(がんば)ったんだ。",
    ko: "에헤헤. 오늘은…… 좀, 신경 썼어.",
  },
  {
    kind: "thought",
    ja: "（今日(きょう)のハルキ、いつもより、ずっと——。）",
    ko: "(오늘 하루키, 평소보다, 훨씬——.)",
  },
  {
    kind: "quiz",
    question: "「頑張(がんば)った」 의 의미는?",
    hint: "옷차림에 공들였다는 뉘앙스",
    options: [
      { ko: "열심히 했어 ・ 공들였어", correct: true },
      { ko: "피곤했어" },
      { ko: "잊어버렸어" },
    ],
    onWrong: {
      madBg: "s1-bad",
      tone: "angry",
      ja: "もう、てきとうに、聞(き)かないでよ。",
      ko: "정말, 대충, 듣지 마.",
    },
  },
  {
    kind: "tip",
    ja: "頑張(がんば)る ／ 頑張(がんば)った",
    reading: "간바루 ／ 간밧타",
    meaning: "노력하다·힘내다 ／ 노력했어",
    note: "「頑張る」=노력하다·분발하다. 過去形「頑張った」=노력했어. 응원할 땐 「頑張って」=힘내.",
    example: "頑張(がんば)ってね。— 힘내.",
  },
  {
    kind: "narr",
    bg: "s1-normal",
    ja: "木陰(こかげ)を見(み)つけて、ふたりは敷物(しきもの)を広(ひろ)げた。",
    ko: "그늘을 찾아, 둘은 돗자리를 폈다.",
  },

  // ── 씬 2 : 엇갈리는 타이밍 (도시락 vs 폰·서운함) ──
  {
    kind: "line",
    bg: "s1-happy",
    ja: "これ……朝(あさ)から、作(つく)ったんだ。たくさん、食(た)べてね。",
    ko: "이거…… 아침부터, 만들었어. 많이, 먹어.",
  },
  {
    kind: "tip",
    ja: "作(つく)る ／ 朝(あさ)から",
    reading: "츠쿠루 ／ 아사카라",
    meaning: "만들다 ／ 아침부터",
    note: "「作った」=만들었어(과거형). 「朝から」=아침부터. 「から」는 시작점을 나타내요.",
    example: "朝(あさ)から、作(つく)ったんだ。— 아침부터, 만든 거야.",
  },
  {
    kind: "quiz",
    question: "「朝(あさ)から作(つく)った」 의 의미는?",
    hint: "도시락을 건네며 한 말",
    options: [
      { ko: "아침부터 만들었어", correct: true },
      { ko: "내일 살 거야" },
      { ko: "아침은 안 먹어" },
    ],
    onWrong: {
      madBg: "s2-sad",
      tone: "sad",
      ja: "……あんまり、興味(きょうみ)、ない、かな。",
      ko: "……별로, 관심, 없나.",
    },
  },
  {
    kind: "narr",
    bg: "s1-normal",
    ja: "その時(とき)——スマホが、けたたましく鳴(な)った。",
    ko: "그때—— 스마트폰이, 요란하게 울렸다.",
  },
  {
    kind: "thought",
    ja: "（急(きゅう)ぎの連絡(れんらく)……。これだけ、すぐ済(す)ませれば——。）",
    ko: "(급한 연락……. 이것만, 빨리 끝내면——.)",
  },
  {
    kind: "quiz",
    question: '하루키에게 "잠깐만 기다려, 금방 끝나" 라고 하려면?',
    hint: "잠깐 양해를 구하는 말",
    options: [
      { ko: "ちょっと待(ま)って、すぐ終(お)わるから。", correct: true },
      { ko: "もう帰(かえ)って、すぐ終(お)わるから。" },
      { ko: "ずっと待(ま)って、まだ終(お)わらない。" },
    ],
    onWrong: {
      madBg: "s2-sad",
      tone: "sad",
      ja: "……うん。気(き)にしないで。",
      ko: "……응. 신경 쓰지 마.",
    },
  },
  {
    kind: "tip",
    ja: "ちょっと待(ま)って ／ すぐ",
    reading: "춋토 맛테 ／ 스구",
    meaning: "잠깐 기다려 ／ 곧·금방",
    note: "「ちょっと待って」=잠깐만. 「すぐ終わる」=금방 끝나. 친한 사이에서 쓰는 회화체예요.",
    example: "ちょっと待(ま)ってね、すぐだから。— 잠깐만, 금방이니까.",
  },
  {
    kind: "line",
    bg: "s2-sad",
    ja: "……うん。ゆっくりで、いいよ。",
    ko: "……응. 천천히 해도, 돼.",
  },
  {
    kind: "thought",
    ja: "（……「いいよ」？　なのに、どうして、その顔(かお)——。）",
    ko: "(……「됐어」? 근데, 왜, 그런 표정——.)",
  },
  {
    kind: "tip",
    ja: "「いいよ」の二(ふた)つの顔(かお)",
    reading: "이이요",
    meaning: "좋아·괜찮아 ↔ 됐어",
    note: "밝고 길게 「いいよ♪」=좋아·괜찮아(허락). 낮고 짧게 「……いいよ」=됐어(서운·거절). 톤과 표정으로 정반대 뜻이 돼요. 일본어 高맥락 핵심!",
    example: "「いいよ」— 좋아 ／ 「……いいよ」— 됐어.",
  },
  {
    kind: "quiz",
    question: "고개 숙인 하루키의 「……いいよ」는 어느 쪽?",
    hint: "표정이 굳어 있다",
    options: [
      { ko: "정말 괜찮다는 뜻" },
      { ko: "사실은 서운하다는 뜻", correct: true },
      { ko: "빨리 하라는 뜻" },
    ],
    onWrong: {
      madBg: "s2-sad",
      tone: "sad",
      ja: "……べつに。なんでも、ない。",
      ko: "……딱히. 아무것도, 아니야.",
    },
  },
  {
    kind: "narr",
    bg: "ueno-night",
    ja: "仕事(しごと)が片付(かたづ)いた頃(ころ)には、桜(さくら)に灯(あか)りが点(つ)いていた。",
    ko: "일이 정리됐을 땐, 벚꽃에 조명이 들어와 있었다.",
  },

  // ── 씬 3 : 밤 벚꽃 아래의 차가운 침묵 (위기) ──
  {
    kind: "narr",
    bg: "ueno-night",
    ja: "ふたりの間(あいだ)の空気(くうき)は、夜桜(よざくら)より、冷(つめ)たかった。",
    ko: "둘 사이의 공기는, 밤 벚꽃보다, 차가웠다.",
  },
  {
    kind: "line",
    bg: "s3-leaving",
    ja: "ううん。わたしも、邪魔(じゃま)しちゃって、ごめん。",
    ko: "아니야. 나도, 방해해서, 미안해.",
  },
  {
    kind: "tip",
    ja: "ううん ／ 邪魔(じゃま)",
    reading: "우운 ／ 자마",
    meaning: "아니(부정) ／ 방해",
    note: "「ううん」=아니 (가벼운 부정). 「うん」(응)과 헷갈리지 마세요. 「邪魔しちゃって」=방해해 버려서.",
    example: "ううん、邪魔(じゃま)じゃないよ。— 아니, 방해 아니야.",
  },
  {
    kind: "quiz",
    question: "「邪魔(じゃま)しちゃって、ごめん」 속 하루키의 진심은?",
    hint: "정말 사과하는 게 맞을까?",
    options: [
      { ko: "진심으로 자기 잘못이라 생각함" },
      { ko: "서운함을 돌려 말하는 것", correct: true },
      { ko: "전혀 화나지 않음" },
    ],
    onWrong: {
      madBg: "s3-leaving",
      tone: "angry",
      ja: "……もう、いいってば。",
      ko: "……됐다니까.",
    },
  },
  {
    kind: "line",
    bg: "s3-leaving",
    ja: "もう、いい。忙(いそが)しいのに、迷惑(めいわく)でしょ。",
    ko: "됐어. 바쁜데, 민폐잖아.",
  },
  {
    kind: "tip",
    ja: "もういい ／ 迷惑(めいわく)",
    reading: "모- 이이 ／ 메이와쿠",
    meaning: "됐어·그만 ／ 민폐·폐",
    note: "「もういい」=(부정) 됐어·그만 (체념·삐짐). 「いいよ」와 또 달라요. 「迷惑でしょ」=폐잖아 (밀어내는 말).",
    example: "もういい。ひとりで帰(かえ)る。— 됐어. 혼자 갈래.",
  },
  {
    kind: "quiz",
    question: "「もう、いい」 라고 할 때, 해야 할 행동은?",
    hint: "밀어내지만, 진심은?",
    options: [
      { ko: "알겠다 하고 폰을 더 본다" },
      { ko: "진심으로 사과하고 붙잡는다", correct: true },
      { ko: "같이 화를 낸다" },
    ],
    onWrong: {
      madBg: "s3-leaving",
      tone: "sad",
      ja: "……ほら。やっぱり、どうでも、いいんだ。",
      ko: "……거봐. 역시, 아무래도, 상관없는 거잖아.",
    },
  },
  {
    kind: "line",
    bg: "s3-leaving",
    ja: "……もう、帰(かえ)る。べつべつで、いいから。",
    ko: "……그만, 갈래. 따로따로, 가도 되니까.",
  },
  {
    kind: "thought",
    ja: "（このまま行(い)かせたら——今日(きょう)が、本当(ほんとう)に終(お)わる。）",
    ko: "(이대로 보내면—— 오늘이, 진짜로 끝난다.)",
  },
  {
    kind: "quiz",
    question: "떠나려는 하루키를 붙잡으려면?",
    hint: "지금, 놓치면 안 된다",
    options: [
      { ko: "待(ま)って。行(い)かないで。", correct: true },
      { ko: "待(ま)って。さよなら。" },
      { ko: "いいよ。帰(かえ)って。" },
    ],
    onWrong: {
      madBg: "s3-leaving",
      tone: "sad",
      ja: "……っ、はなして。",
      ko: "……윽, 놔.",
    },
  },
  {
    kind: "tip",
    ja: "待(ま)って ／ 〜ないで",
    reading: "맛테 ／ ~나이데",
    meaning: "기다려 ／ ~하지 마",
    note: "「行(い)かないで」=가지 마. 동사 ない형+で=~하지 마 (부탁·만류). 「待って」=기다려.",
    example: "行(い)かないで。そばに、いて。— 가지 마. 곁에, 있어줘.",
  },

  // ── 씬 4 : 진심의 고백, 깊어지는 밤 (화해·돈독) ──
  {
    kind: "narr",
    bg: "s4-cg",
    ja: "とっさに、手(て)をつかんだ。——ハルキの目(め)が、大(おお)きく、見開(みひら)く。",
    ko: "반사적으로, 손을 잡았다. ——하루키의 눈이, 크게, 떠진다.",
  },
  {
    kind: "thought",
    ja: "（今(いま)、言(い)わなきゃ。本当(ほんとう)の、気持(きも)ちを。）",
    ko: "(지금, 말해야 해. 진짜, 마음을.)",
  },
  {
    kind: "quiz",
    question: '하루키에게 진심을 전하려면? — "사실은, 너한테만 집중하고 싶어서 서둘렀어"',
    hint: "솔직한 본심을 담아",
    options: [
      { ko: "本当(ほんとう)は、君(きみ)だけ、見(み)ていたかったんだ。", correct: true },
      { ko: "本当(ほんとう)は、君(きみ)に、興味(きょうみ)、なかったんだ。" },
      { ko: "本当(ほんとう)は、もう、帰(かえ)りたいんだ。" },
    ],
    onWrong: {
      madBg: "s3-leaving",
      tone: "sad",
      ja: "……やっぱり、そう、なんだ。",
      ko: "……역시, 그런, 거구나.",
    },
  },
  {
    kind: "tip",
    ja: "本当(ほんとう)は ／ 〜たかった",
    reading: "혼토-와 ／ ~타캇타",
    meaning: "사실은 ／ ~하고 싶었어",
    note: "「本当は」=사실은·실은 (속마음 꺼낼 때). 동사ます형 어간+たかった=~하고 싶었어 (과거의 소망). 見(み)る→見ていたかった.",
    example: "本当(ほんとう)は、ずっと、一緒(いっしょ)に、いたかった。— 사실은, 계속, 같이, 있고 싶었어.",
  },
  {
    kind: "line",
    bg: "s4-cg",
    ja: "……本当(ほんとう)は、はじめての、デートで……すごく、緊張(きんちょう)してたの。よく、見(み)られたくて。",
    ko: "……사실은, 첫, 데이트라서…… 엄청, 긴장했어. 잘, 보이고 싶어서.",
  },
  {
    kind: "tip",
    ja: "緊張(きんちょう) ／ はじめて",
    reading: "킨쵸- ／ 하지메테",
    meaning: "긴장 ／ 처음",
    note: "「緊張する」=긴장하다. 「緊張してた」=긴장했었어. 「はじめてのデート」=첫 데이트 (はじめて+の+명사).",
    example: "はじめてで、緊張(きんちょう)してる。— 처음이라, 긴장돼.",
  },
  {
    kind: "quiz",
    question: "「緊張(きんちょう)してた」 의 의미는?",
    hint: "첫 데이트라서……",
    options: [
      { ko: "긴장했었어", correct: true },
      { ko: "화났었어" },
      { ko: "안 왔었어" },
    ],
    onWrong: {
      madBg: "s3-leaving",
      tone: "sad",
      ja: "もう……笑(わら)わないで、よ。",
      ko: "정말…… 웃지 마, 응.",
    },
  },
  {
    kind: "line",
    bg: "s4-smile",
    ja: "ばか……。言(い)わなきゃ、わかんないよ。今日(きょう)は、わたしだけ、見(み)ててほしかったの。……もう、よそ見(み)、なし、ね？",
    ko: "바보……. 말 안 하면, 모르잖아. 오늘은, 나만, 봐주길 바랐어. ……이제, 한눈팔기, 없기, 다?",
  },
  {
    kind: "tip",
    ja: "言(い)わなきゃ ／ よそ見(み) ／ 〜てほしかった",
    reading: "이와나캬 ／ 요소미 ／ ~테 호시캇타",
    meaning: "말 안 하면 ／ 한눈팔기 ／ ~해주길 바랐어",
    note: "「言わなきゃわからない」=말 안 하면 몰라 (なきゃ=なければ 회화체). 「よそ見」=한눈팔기·딴 데 봄. 「見ててほしかった」=봐주길 바랐어.",
    example: "こっち、見(み)てて、ほしかったの。— 이쪽, 봐주길, 바랐어.",
  },
  {
    kind: "quiz",
    question: '하루키에게 "응. 이제 너만 볼게" 라고 답하려면?',
    hint: "약속을 담아",
    options: [
      { ko: "うん。これからは、君(きみ)だけ、見(み)てる。", correct: true },
      { ko: "うん。これからも、よそ見(み)、する。" },
      { ko: "うん。もう、さよなら。" },
    ],
    onWrong: {
      madBg: "s3-leaving",
      tone: "sad",
      ja: "……むぅ。ほんとに？",
      ko: "……흥. 진짜?",
    },
  },
  {
    kind: "line",
    bg: "s4-smile",
    ja: "……うん。やくそく、だよ。指切(ゆびき)り。",
    ko: "……응. 약속, 이야. 손가락 걸고.",
  },
  {
    kind: "narr",
    bg: "ueno-night",
    ja: "舞(ま)い散(ち)る夜桜(よざくら)の下(した)、ふたつの手(て)が、また、重(かさ)なった。さっきより、ずっと、強(つよ)く。",
    ko: "흩날리는 밤 벚꽃 아래, 두 손이, 다시, 맞닿았다. 아까보다, 훨씬, 단단하게.",
  },
  {
    kind: "narr",
    bg: "ueno-night",
    ja: "——次(つぎ)は、ふたりで、永遠(えいえん)の約束(やくそく)を。",
    ko: "——다음은, 둘이서, 영원의 약속을.",
  },
  { kind: "end", bg: "ueno-night" },
];

const TOTAL_QUIZZES = SCRIPT.filter((b) => b.kind === "quiz").length;

// Background is "sticky": a beat without its own `bg` keeps the most recent one.
function resolveBg(idx: number): Bg {
  for (let j = Math.min(idx, SCRIPT.length - 1); j >= 0; j--) {
    const b = SCRIPT[j];
    if (b.bg) return b.bg;
  }
  return "ueno-day";
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
              STAGE 4 ・ 第四話
            </p>
            <p className="truncate text-[13px] font-black leading-tight tracking-tight text-white drop-shadow">
              벚꽃길 산책{" "}
              <span className="text-white/70">・ 桜並木の散歩</span>
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
          「……はじめての、デートだったのに、ね。」
        </p>
        <p className="mt-1 text-[11px] italic leading-relaxed text-white/75">
          ……첫, 데이트였는데, 말이야.
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
          CHAPTER 4 CLEAR
        </p>
        <span className="text-sakura-300">✦</span>
      </div>
      <h2 className="mt-3 text-center text-2xl font-black tracking-tight text-white drop-shadow">
        벚꽃길 산책
      </h2>
      <p className="mt-0.5 text-center text-[12px] font-semibold tracking-[0.25em] text-lilac-200">
        桜並木の散歩
      </p>

      <div className="mt-4 flex justify-center">
        <Hearts score={heartsLeft} max={HEARTS_MAX} />
      </div>
      <p className="mt-1 text-center text-[10px] font-bold tracking-[0.18em] text-white/70">
        남은 마음 ・ 残りのハート
      </p>

      <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur">
        <p className="text-[13px] font-bold italic leading-relaxed text-white">
          「……もう、よそ見(み)、なし、ね？」
        </p>
        <p className="mt-1 text-[11px] italic leading-relaxed text-white/75">
          ……이제, 한눈팔기, 없기, 다?
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-lilac-300/30 bg-lilac-400/15 px-3 py-2.5">
        <div>
          <p className="text-[9px] font-extrabold tracking-[0.25em] text-lilac-200">
            NEXT ・ 다음 화
          </p>
          <p className="mt-0.5 text-[13px] font-extrabold text-white">
            영원을 약속해 <span className="text-lilac-200">・ 永遠の約束を</span>
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

export default function Stage4Page() {
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
    ? "ueno-night"
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
            priority={key === "ueno-day"}
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
