"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthField } from "@/components/AuthField";
import { getSupabase } from "@/lib/supabase";

type Mode = "login" | "signup";

const TEXT: Record<
  Mode,
  {
    greeting: string;
    sub: string;
    cta: string;
    busyCta: string;
    swap: string;
    swapHref: string;
    swapLabel: string;
    success?: string;
  }
> = {
  login: {
    greeting: "어서와요 ♡ お帰りなさい",
    sub: "오늘도 두근거리는 한 마디를 시작해볼까요?",
    cta: "시작하기 ・ はじめる",
    busyCta: "로그인 중...",
    swap: "처음이에요?",
    swapHref: "/signup",
    swapLabel: "회원가입 ・ 新規登録",
  },
  signup: {
    greeting: "처음 만나서 반가워요 ♡ はじめまして",
    sub: "이메일과 비밀번호로 1분 만에 가입해요.",
    cta: "가입하고 시작 ・ 新規登録",
    busyCta: "가입 중...",
    swap: "이미 계정이 있어요.",
    swapHref: "/login",
    swapLabel: "로그인 ・ ログイン",
    success: "확인 메일을 보냈어요. 메일함을 확인해 주세요 💌",
  },
};

const MailIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m3 7 9 6 9-6" />
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
    className="h-4 w-4"
  >
    <rect x="4" y="11" width="16" height="10" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const t = TEXT[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const supabase = getSupabase();
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        // If email confirmation is disabled, session is created immediately.
        if (data.session) {
          router.replace("/home");
        } else {
          setInfo(t.success ?? "가입이 완료됐어요!");
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        router.replace("/home");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass-card mt-10 rounded-3xl p-7">
      <p className="text-center text-sm font-bold text-ink-700">{t.greeting}</p>
      <p className="mt-1.5 text-center text-xs text-ink-500">{t.sub}</p>

      <div className="mt-6 flex flex-col gap-3.5">
        <AuthField
          id="email"
          label="이메일 ・ メール"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="darling@lingo.app"
          icon={<MailIcon />}
        />
        <AuthField
          id="password"
          label="비밀번호 ・ パスワード"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          icon={<LockIcon />}
        />
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-sakura-100 px-3.5 py-2.5 text-xs font-medium text-sakura-600">
          <span className="mt-0.5">💔</span>
          <span className="leading-relaxed">{error}</span>
        </div>
      )}
      {info && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-lilac-100 px-3.5 py-2.5 text-xs font-medium text-lilac-600">
          <span className="mt-0.5">💌</span>
          <span className="leading-relaxed">{info}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sakura-500 to-lilac-500 px-5 py-3.5 text-sm font-extrabold tracking-wide text-white shadow-[0_10px_22px_-6px_rgba(255,107,160,0.55)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:saturate-50"
      >
        {busy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M12 21s-7.5-4.7-9.6-9.3C1 8.6 2.6 5 6.2 5c2 0 3.4 1 4.3 2.4l1.5 2 1.5-2C14.4 6 15.8 5 17.8 5c3.6 0 5.2 3.6 3.8 6.7C19.5 16.3 12 21 12 21z" />
          </svg>
        )}
        {busy ? t.busyCta : t.cta}
      </button>

      <p className="mt-5 text-center text-xs text-ink-500">
        {t.swap}{" "}
        <Link
          href={t.swapHref}
          className="font-bold text-lilac-500 underline-offset-4 hover:underline"
        >
          {t.swapLabel}
        </Link>
      </p>
    </form>
  );
}
