"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { FloatingChars } from "@/components/FloatingChars";
import { getSupabase } from "@/lib/supabase";

const BookIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-7 w-7"
  >
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5z" />
    <path d="M4 4.5v18" />
  </svg>
);

const ChatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-7 w-7"
  >
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
  </svg>
);

const ChevronIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-lilac-500"
  >
    <path d="m9 6 6 6-6 6" />
  </svg>
);

const HeartIcon = ({ size = "h-12 w-12" }: { size?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="white"
    className={`${size} drop-shadow`}
  >
    <path d="M12 21s-7.5-4.7-9.6-9.3C1 8.6 2.6 5 6.2 5c2 0 3.4 1 4.3 2.4l1.5 2 1.5-2C14.4 6 15.8 5 17.8 5c3.6 0 5.2 3.6 3.8 6.7C19.5 16.3 12 21 12 21z" />
  </svg>
);

function ModeCard({
  href,
  icon,
  title,
  subKo,
  subJa,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  subKo: string;
  subJa: string;
}) {
  return (
    <Link
      href={href}
      className="glass-card group flex items-center gap-4 rounded-3xl p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-10px_rgba(181,101,232,0.4)] active:scale-[0.99]"
    >
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sakura-500 to-lilac-500 text-white shadow-[0_8px_18px_-6px_rgba(255,107,160,0.55)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-extrabold tracking-tight text-ink-700">
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs leading-relaxed text-ink-500">
          {subKo}
          <span className="mx-1.5 text-ink-300">・</span>
          {subJa}
        </p>
      </div>
      <ChevronIcon />
    </Link>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setEmail(data.session.user.email ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      } else {
        setEmail(session.user.email ?? null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function onSignOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (!ready) {
    return (
      <div className="relative flex flex-1 items-center justify-center px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-lilac-200 border-t-lilac-500" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12">
      <FloatingChars />

      <main className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center">
          <div className="animate-heartbeat grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-sakura-500 to-lilac-500 shadow-[0_10px_24px_-4px_rgba(255,122,173,0.55)]">
            <HeartIcon size="h-10 w-10" />
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight gradient-text">
            LingoDarling
          </h1>
          <p className="mt-1.5 text-xs font-semibold tracking-widest text-lilac-500">
            어떻게 배울까요? ・ どう学ぶ？
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <ModeCard
            href="/story"
            icon={<BookIcon />}
            title="Story Mode"
            subKo="비주얼 노벨로 배우기"
            subJa="ビジュアルノベルで学ぶ"
          />
          <ModeCard
            href="/freestyle"
            icon={<ChatIcon />}
            title="Free Style"
            subKo="자유롭게 대화하기"
            subJa="自由に会話する"
          />
        </div>

        <div className="mt-7 flex flex-col items-center gap-2">
          {email && (
            <p className="text-[11px] text-ink-500/80">
              <span className="mr-1">💌</span>
              {email}
            </p>
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="text-xs font-semibold text-ink-500 underline-offset-4 transition hover:text-lilac-500 hover:underline"
          >
            로그아웃 ・ ログアウト
          </button>
        </div>

        <p className="mt-6 text-center text-[11px] text-ink-500/80">
          © LingoDarling — 사랑은 가장 빠른 선생님 💞
        </p>
      </main>
    </div>
  );
}
