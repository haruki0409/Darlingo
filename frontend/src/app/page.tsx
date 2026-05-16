import Link from "next/link";
import { BrandHeader } from "@/components/BrandHeader";
import { FloatingChars } from "@/components/FloatingChars";
import { LangChips } from "@/components/LangChips";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12">
      <FloatingChars />

      <main className="relative z-10 w-full max-w-md">
        <BrandHeader />

        <div className="glass-card mt-10 rounded-3xl p-7">
          <p className="text-center text-base font-bold text-ink-700">
            어서와요 ♡ お帰りなさい
          </p>
          <p className="mt-2 text-center text-[13px] font-normal leading-relaxed text-ink-500">
            매일 두근거리는 대화로 한국어와 일본어를 함께
            <br />
            ドキドキの会話で韓国語と日本語、両方一気に
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/login"
              className="group flex h-13 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sakura-500 to-lilac-500 px-5 py-3.5 text-sm font-bold tracking-wide text-white shadow-[0_10px_22px_-6px_rgba(255,107,160,0.55)] transition hover:brightness-110 active:scale-[0.98]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M12 21s-7.5-4.7-9.6-9.3C1 8.6 2.6 5 6.2 5c2 0 3.4 1 4.3 2.4l1.5 2 1.5-2C14.4 6 15.8 5 17.8 5c3.6 0 5.2 3.6 3.8 6.7C19.5 16.3 12 21 12 21z" />
              </svg>
              시작하기 / はじめる
            </Link>

            <Link
              href="/signup"
              className="flex h-13 items-center justify-center rounded-2xl border-1.5 border-lilac-300 bg-white/60 px-5 py-3.5 text-sm font-medium tracking-wide text-lilac-500 transition hover:bg-white active:scale-[0.98]"
            >
              처음이에요 / はじめて
            </Link>
          </div>
        </div>

        <div className="mt-7">
          <LangChips />
        </div>

        <p className="mt-6 text-center text-[11px] text-ink-500/80">
          © Darlingo — 사랑은 가장 빠른 선생님 💞
        </p>
      </main>
    </div>
  );
}
