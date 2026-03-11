"use client";

export function VoteButtons({ score }: { score: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-neutral-500">
      <button
        className="hover:text-amber-400 transition-colors p-0.5"
        aria-label="Upvote"
      >
        ▲
      </button>
      <span className="text-sm font-mono text-neutral-300">{score}</span>
      <button
        className="hover:text-blue-400 transition-colors p-0.5"
        aria-label="Downvote"
      >
        ▼
      </button>
    </div>
  );
}
