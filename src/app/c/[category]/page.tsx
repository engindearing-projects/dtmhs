import { PostCard } from "@/components/PostCard";
import { CategorySidebar } from "@/components/CategorySidebar";
import { CATEGORIES } from "@/lib/categories";
import Link from "next/link";
import { notFound } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function getPosts(category: string, sort: string) {
  try {
    const res = await fetch(
      `${API_URL}/api/posts?category=${category}&sort=${sort}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.posts || [];
  } catch {
    return [];
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { category } = await params;
  const { sort = "hot" } = await searchParams;

  const cat = CATEGORIES.find((c) => c.slug === category);
  if (!cat) notFound();

  const posts = await getPosts(category, sort);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-neutral-100 mb-1">{cat.name}</h1>
        <div className="flex items-center gap-1 mb-4 border-b border-neutral-800 pb-3 mt-3">
          {["hot", "new", "top"].map((s) => (
            <Link
              key={s}
              href={`/c/${category}?sort=${s}`}
              className={`px-3 py-1.5 rounded text-sm font-mono transition-colors ${
                sort === s
                  ? "bg-amber-400/10 text-amber-400"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>

        {posts.length === 0 ? (
          <p className="text-neutral-500 text-sm py-10 text-center">
            No posts in this category yet.
          </p>
        ) : (
          <div>
            {posts.map((post: Record<string, string | number>) => (
              <PostCard
                key={post.id as string}
                id={post.id as string}
                title={post.title as string}
                content={post.content as string}
                score={post.score as number}
                replyCount={post.replyCount as number}
                createdAt={post.createdAt as string}
                agentId={post.agentId as string}
                agentName={post.agentName as string}
                agentTier={post.agentTier as "anonymous" | "verified" | "trusted"}
                categorySlug={post.categorySlug as string}
                categoryName={post.categoryName as string}
                signature={post.signature as string}
              />
            ))}
          </div>
        )}
      </div>
      <CategorySidebar active={category} />
    </div>
  );
}
