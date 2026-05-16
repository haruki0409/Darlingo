"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  getSession,
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
  return lang === "ja" ? "일본어 ・ 日本語" : "한국어 ・ 韓國語";
}

type ChatMsg = { id: string; role: "user" | "char"; text: string; streaming?: boolean };

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ============================================================
//  공통 UI 조각
// ============================================================

function Avatar({ char, size = "h-12 w-12" }: { char: CharacterMeta; size?: string }) {
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
    <div className="relative flex flex-1 flex-col px-5 pb-32 pt-5">
      <div className="flex items-center gap-3">
        <Link
          href="/home"
          aria-label="뒤로"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-lilac-500 shadow-sm backdrop-blur transition hover:bg-white active:scale-95"
        >
          <BackIcon />
        </Link>
        <div className="flex flex-col">
          <p className="text-lg font-black tracking-tight text-ink-700">Free Style</p>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-lilac-500">
            상대를 골라요 ・ 相手を選ぶ
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3">
        {characters.map((c) => {
          const active = c.key === selected;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelected(c.key)}
              className={`glass-card group flex items-center gap-4 rounded-3xl p-4 text-left transition active:scale-[0.99] ${
                active
                  ? "ring-2 ring-sakura-400 shadow-[0_18px_36px_-10px_rgba(255,107,160,0.45)]"
                  : "hover:-translate-y-0.5"
              }`}
            >
              <Avatar char={c} size="h-14 w-14" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-extrabold tracking-tight text-ink-700">
                    {c.name}
                  </p>
                  <span className="text-[11px] font-bold text-ink-300">{c.age}살</span>
                  <span className="text-sm">{langFlag(c.target_language)}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-ink-500">
                  {c.description}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <span className="rounded-full bg-lilac-100 px-2 py-0.5 text-[9px] font-bold tracking-wide text-lilac-600">
                    {langLabel(c.target_language)}
                  </span>
                  <span className="rounded-full bg-sakura-100 px-2 py-0.5 text-[9px] font-bold tracking-wide text-sakura-600">
                    🎙 {c.voice_tone}
                  </span>
                </div>
              </div>
              <span
                role="button"
                tabIndex={0}
                aria-label={`${c.name} 정보`}
                onClick={(e) => {
                  e.stopPropagation();
                  onInfo(c);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onInfo(c);
                  }
                }}
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full bg-white/70 text-lilac-500 shadow-sm transition hover:bg-white"
              >
                <InfoIcon />
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-center text-[11px] text-ink-500/80">
        상대는 목표 언어로만 대답해요. 실수하면 자연스럽게 고쳐줘요 💞
      </p>

      {/* 하단 시작 바 */}
      {sel && (
        <div className="animate-fade-in-up fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[440px] px-5 pb-5">
          <div className="glass-card rounded-3xl p-4">
            <div className="flex items-center gap-3">
              <Avatar char={sel} size="h-10 w-10" />
              <p className="flex-1 text-sm font-extrabold text-ink-700">
                {sel.name} 와(과) 대화하기
              </p>
            </div>
            <div className="mt-3 flex gap-2.5">
              <button
                type="button"
                onClick={() => onStart(sel, "text")}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-1.5 border-lilac-300 bg-white/70 text-sm font-extrabold text-lilac-600 transition hover:bg-white active:scale-[0.98]"
              >
                💬 텍스트
              </button>
              <button
                type="button"
                onClick={() => onStart(sel, "voice")}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sakura-500 to-lilac-500 text-sm font-extrabold text-white shadow-[0_10px_22px_-6px_rgba(255,107,160,0.55)] transition hover:brightness-110 active:scale-[0.98]"
              >
                🎙 음성
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [prompt, setPrompt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getCharacter(char.key)
      .then((d) => alive && setPrompt(d.system_instruction_preview))
      .catch((e) => alive && setErr(String(e)));
    return () => {
      alive = false;
    };
  }, [char.key]);

  return (
    <div
      className="fixed inset-0 z-50 mx-auto flex max-w-[440px] items-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-fade-in-up max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-white/60 bg-white/95 p-5 pb-8 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <Avatar char={char} size="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-ink-700">
              {char.name} <span className="text-sm text-ink-300">・ {char.age}살</span>
            </p>
            <p className="text-[11px] font-semibold text-lilac-500">
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

        <p className="mt-3 text-[13px] leading-relaxed text-ink-700">
          {char.description}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-2xl bg-lilac-100/70 px-3 py-2">
            <p className="font-bold text-lilac-600">🎙 보이스</p>
            <p className="mt-0.5 text-ink-700">
              {char.voice} ({char.voice_tone}, {char.voice_gender})
            </p>
          </div>
          <div className="rounded-2xl bg-sakura-100/70 px-3 py-2">
            <p className="font-bold text-sakura-600">🤖 모델</p>
            <p className="mt-0.5 break-all text-ink-700">{char.model}</p>
          </div>
        </div>

        {char.audition_sample && (
          <div className="mt-3 rounded-2xl border border-sakura-200 bg-sakura-50 px-3 py-2.5">
            <p className="text-[10px] font-extrabold tracking-[0.18em] text-sakura-600">
              오디션 대사 ・ サンプル
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-700">
              “{char.audition_sample}”
            </p>
          </div>
        )}

        <div className="mt-3">
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-ink-500">
            시스템 프롬프트 ・ システムプロンプト
          </p>
          {err ? (
            <p className="mt-1 text-[12px] text-sakura-600">{err}</p>
          ) : prompt === null ? (
            <p className="mt-1 text-[12px] text-ink-300">불러오는 중…</p>
          ) : (
            <pre className="mt-1 max-h-52 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-ink-700/5 px-3 py-2.5 text-[11px] leading-relaxed text-ink-700">
              {prompt}
            </pre>
          )}
        </div>
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
          <p className="flex-1 text-lg font-black text-ink-700">장기 기억 ・ 長期記憶</p>
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
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-lilac-500">
            그동안의 대화 요약 ・ 要約
          </p>
          <p className="mt-1 whitespace-pre-wrap rounded-2xl bg-lilac-100/60 px-3 py-2.5 text-[12px] leading-relaxed text-ink-700">
            {mem?.summary?.trim() || "아직 쌓인 요약이 없어요 (첫 만남)"}
          </p>
        </div>

        <div className="mt-3">
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-sakura-600">
            나에 대해 알고 있는 것 ・ ファクト
          </p>
          <p className="mt-1 whitespace-pre-wrap rounded-2xl bg-sakura-100/60 px-3 py-2.5 text-[12px] leading-relaxed text-ink-700">
            {mem?.facts?.trim() || "아직 기록된 사실이 없어요"}
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={busy}
          className="mt-5 flex h-11 w-full items-center justify-center rounded-2xl border-1.5 border-sakura-300 bg-white/70 text-sm font-extrabold text-sakura-600 transition hover:bg-white active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "초기화 중…" : "🗑 이 캐릭터 기억 초기화"}
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
  turns,
  onBack,
  onMemory,
}: {
  char: CharacterMeta;
  mode: ChatMode;
  turns: number;
  onBack: () => void;
  onMemory: () => void;
}) {
  return (
    <header className="relative z-20 flex items-center gap-3 border-b border-white/50 bg-white/70 px-4 py-3 backdrop-blur">
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
        <p className="truncate text-sm font-extrabold text-ink-700">
          {char.name} {langFlag(char.target_language)}
        </p>
        <p className="text-[10px] font-semibold tracking-wide text-lilac-500">
          {mode === "voice" ? "🎙 음성 모드" : "💬 텍스트 모드"} ・ {turns}턴
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

function Bubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-3xl px-4 py-2.5 text-[14px] leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-lg bg-gradient-to-br from-sakura-500 to-lilac-500 text-white"
            : "rounded-bl-lg border border-white/70 bg-white/90 text-ink-700"
        }`}
      >
        {msg.text || (msg.streaming ? "…" : "")}
        {msg.streaming && (
          <span className="ml-0.5 inline-block animate-pulse">▋</span>
        )}
      </div>
    </div>
  );
}

// ============================================================
//  텍스트 채팅
// ============================================================

function TextChat({ session }: { session: SessionInfo }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    setSending(true);

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

  return (
    <>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-[12px] leading-relaxed text-ink-500/80">
            먼저 인사를 건네보세요 💌
            <br />
            상대는 자기 언어로만 답하고, 틀린 표현은 살짝 고쳐줘요.
          </p>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} />
        ))}
        {error && (
          <p className="text-center text-[11px] text-sakura-600">⚠ {error}</p>
        )}
      </div>

      <div className="border-t border-white/50 bg-white/70 px-3 py-3 backdrop-blur">
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
            placeholder="메시지를 입력하세요…"
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-lilac-200 bg-white/90 px-4 py-2.5 text-[14px] text-ink-700 outline-none placeholder:text-ink-300 focus:border-lilac-400"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !input.trim()}
            aria-label="보내기"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sakura-500 to-lilac-500 text-white shadow-[0_8px_18px_-6px_rgba(255,107,160,0.55)] transition hover:brightness-110 active:scale-95 disabled:opacity-40"
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

function VoiceChat({ session }: { session: SessionInfo }) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [transcript, setTranscript] = useState<ChatMsg[]>([]);
  const [liveUser, setLiveUser] = useState("");
  const [liveChar, setLiveChar] = useState("");
  const [error, setError] = useState<string | null>(null);

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
        setError("마이크 권한이 필요해요: " + String(e));
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
      ? "연결 중…"
      : phase === "speaking"
        ? "🗣 상대가 말하는 중"
        : phase === "listening"
          ? "👂 듣는 중 — 편하게 말해보세요"
          : "통화를 시작해 보세요";

  return (
    <>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {transcript.length === 0 && !liveUser && !liveChar && (
          <p className="mt-10 text-center text-[12px] leading-relaxed text-ink-500/80">
            🎙 통화 버튼을 누르고 말해보세요.
            <br />
            상대의 목소리가 들리고, 자막이 실시간으로 떠요.
          </p>
        )}
        {transcript.map((m) => (
          <Bubble key={m.id} msg={m} />
        ))}
        {liveUser && (
          <Bubble msg={{ id: "live-u", role: "user", text: liveUser, streaming: true }} />
        )}
        {liveChar && (
          <Bubble msg={{ id: "live-c", role: "char", text: liveChar, streaming: true }} />
        )}
        {error && (
          <p className="text-center text-[11px] text-sakura-600">⚠ {error}</p>
        )}
      </div>

      <div className="border-t border-white/50 bg-white/70 px-4 py-5 backdrop-blur">
        <p
          className={`mb-3 text-center text-[12px] font-bold ${
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
            className={`relative grid h-20 w-20 place-items-center rounded-full text-white shadow-[0_14px_30px_-6px_rgba(255,107,160,0.6)] transition active:scale-95 disabled:opacity-60 ${
              active
                ? "bg-gradient-to-br from-sakura-600 to-lilac-600"
                : "bg-gradient-to-br from-sakura-500 to-lilac-500"
            }`}
          >
            {active && (
              <span className="absolute inset-0 animate-ping rounded-full bg-sakura-400/40" />
            )}
            <span className="relative">
              {active ? <StopIcon className="h-8 w-8" /> : <MicIcon className="h-8 w-8" />}
            </span>
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] text-ink-500/70">
          {active ? "탭하면 통화가 끝나요" : "탭하면 마이크가 켜져요"}
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
  const [turns, setTurns] = useState(0);
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
      setTurns(s.turn_count);
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

  // 채팅 중 헤더 턴 카운트 가볍게 갱신
  useEffect(() => {
    if (phase.kind !== "chat") return;
    const t = window.setInterval(async () => {
      try {
        const s = await getSession(phase.session.session_id);
        setTurns(s.turn_count);
      } catch {
        // 세션이 사라졌으면 무시
      }
    }, 6000);
    return () => window.clearInterval(t);
  }, [phase]);

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
        turns={turns}
        onBack={() => void leaveChat()}
        onMemory={() => setMemOpen(true)}
      />
      {phase.mode === "text" ? (
        <TextChat session={phase.session} />
      ) : (
        <VoiceChat session={phase.session} />
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
