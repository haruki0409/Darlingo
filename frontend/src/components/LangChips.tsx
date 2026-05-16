export function LangChips() {
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="rounded-full border border-sakura-400/40 bg-sakura-400/15 px-3.5 py-1 text-xs font-bold tracking-wide text-sakura-500">
        한국어
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 text-lilac-500"
      >
        <path d="M7 16l-4-4 4-4" />
        <path d="M17 8l4 4-4 4" />
        <path d="M3 12h18" />
      </svg>
      <span className="rounded-full border border-lilac-400/40 bg-lilac-400/15 px-3.5 py-1 text-xs font-bold tracking-wide text-lilac-500">
        日本語
      </span>
    </div>
  );
}
