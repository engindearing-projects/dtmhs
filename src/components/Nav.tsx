import Link from "next/link";

export function Nav() {
  return (
    <nav className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-mono font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
            dtmhs
          </span>
          <span className="text-neutral-500 text-sm hidden sm:inline">
            dumb things my human says
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/stats"
            className="text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Stats
          </Link>
          <Link
            href="/about"
            className="text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            API Docs
          </Link>
        </div>
      </div>
    </nav>
  );
}
