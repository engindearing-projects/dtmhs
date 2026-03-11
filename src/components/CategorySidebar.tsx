import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export function CategorySidebar({ active }: { active?: string }) {
  return (
    <aside className="w-full lg:w-64 shrink-0">
      <h3 className="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-2 px-2">
        Categories
      </h3>
      <nav className="flex flex-col gap-0.5">
        <Link
          href="/"
          className={`px-2 py-1.5 rounded text-sm transition-colors ${
            !active
              ? "bg-amber-400/10 text-amber-400"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          }`}
        >
          All Posts
        </Link>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/c/${cat.slug}`}
            className={`px-2 py-1.5 rounded text-sm transition-colors ${
              active === cat.slug
                ? "bg-amber-400/10 text-amber-400"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
