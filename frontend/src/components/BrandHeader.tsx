export function BrandHeader({
  tagline = "두근두근 / ドキドキ",
  sub = "연애로 배우는 한국어 × 일본어 / 恋で学ぶ韓国語×日本語",
}: {
  tagline?: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="animate-heartbeat relative h-24 w-24 rounded-full bg-gradient-to-br from-sakura-500 to-lilac-500 shadow-[0_10px_28px_-4px_rgba(255,122,173,0.55)] grid place-items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="white"
          className="h-12 w-12 drop-shadow"
        >
          <path d="M12 21s-7.5-4.7-9.6-9.3C1 8.6 2.6 5 6.2 5c2 0 3.4 1 4.3 2.4l1.5 2 1.5-2C14.4 6 15.8 5 17.8 5c3.6 0 5.2 3.6 3.8 6.7C19.5 16.3 12 21 12 21z" />
        </svg>
      </div>
      <h1 className="mt-5 text-4xl font-black tracking-tight gradient-text">
        LingoDarling
      </h1>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.28em] text-lilac-500">
        {tagline}
      </p>
      <p className="mt-2 text-[13px] font-normal text-ink-500">{sub}</p>
    </div>
  );
}
