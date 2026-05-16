const CHARS: {
  text: string;
  className: string;
  size: string;
  color: string;
  delay: string;
}[] = [
  { text: "桜", className: "top-[8%] left-[6%]", size: "text-4xl", color: "text-sakura-400/60", delay: "0s" },
  { text: "💕", className: "top-[14%] right-[8%]", size: "text-3xl", color: "text-sakura-500", delay: "1.2s" },
  { text: "사", className: "top-[30%] left-[3%]", size: "text-3xl", color: "text-lilac-400/60", delay: "2s" },
  { text: "恋", className: "bottom-[22%] right-[5%]", size: "text-4xl", color: "text-sakura-400/60", delay: "0.6s" },
  { text: "랑", className: "bottom-[10%] left-[7%]", size: "text-3xl", color: "text-lilac-500/60", delay: "1.8s" },
  { text: "♡", className: "top-[55%] right-[12%]", size: "text-2xl", color: "text-sakura-500/70", delay: "3s" },
  { text: "あ", className: "bottom-[40%] left-[12%]", size: "text-2xl", color: "text-lilac-400/50", delay: "2.4s" },
];

export function FloatingChars() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {CHARS.map((c, i) => (
        <span
          key={i}
          className={`absolute font-bold animate-float-soft ${c.className} ${c.size} ${c.color}`}
          style={{ animationDelay: c.delay }}
        >
          {c.text}
        </span>
      ))}
    </div>
  );
}
