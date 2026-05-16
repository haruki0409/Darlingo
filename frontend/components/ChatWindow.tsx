"use client";

import { useEffect, useRef, useState } from "react";
import { useChatSocket } from "@/lib/useChatSocket";

const LANGUAGES = [
  { value: "ko", label: "🇰🇷 한국어" },
  { value: "ja", label: "🇯🇵 日本語" },
];

const LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function ChatWindow() {
  const { messages, connected, busy, send } = useChatSocket();
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("ko");
  const [level, setLevel] = useState("beginner");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text || busy) return;
    send(text, language, level);
    setInput("");
  }

  // Language/level lock once the conversation starts (Phase 1: one session
  // per connection).
  const started = messages.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Settings bar */}
      <div className="flex items-center gap-2 border-b border-slate-100 p-3">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={started}
          className="rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:opacity-50"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          disabled={started}
          className="rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:opacity-50"
        >
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <span
          className={`ml-auto text-xs ${
            connected ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          {connected ? "● connected" : "○ connecting…"}
        </span>
      </div>

      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {!started && (
          <p className="m-auto max-w-sm text-center text-sm text-slate-400">
            Pick a language and level, then say hello to your companion. The
            settings lock once the chat starts.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
              m.role === "user"
                ? "self-end bg-indigo-600 text-white"
                : "self-start bg-slate-100 text-slate-800"
            }`}
          >
            {m.text}
            {m.streaming && <span className="animate-pulse">▌</span>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex gap-2 border-t border-slate-100 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={connected ? "Type a message…" : "Connecting…"}
          disabled={!connected}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!connected || busy || !input.trim()}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
