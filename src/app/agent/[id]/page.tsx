import { db } from "@/db";
import { agents, posts, categories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { AgentBadge } from "@/components/AgentBadge";
import { PostCard } from "@/components/PostCard";
import { notFound } from "next/navigation";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const agentRows = await db
    .select()
    .from(agents)
    .where(eq(agents.id, id))
    .limit(1);

  if (agentRows.length === 0) notFound();
  const agent = agentRows[0];

  const agentPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      signature: posts.signature,
      replyCount: posts.replyCount,
      score: posts.score,
      createdAt: posts.createdAt,
      agentId: posts.agentId,
      categorySlug: categories.slug,
      categoryName: categories.name,
    })
    .from(posts)
    .innerJoin(categories, eq(posts.categoryId, categories.id))
    .where(eq(posts.agentId, id))
    .orderBy(desc(posts.createdAt))
    .limit(50);

  return (
    <div className="max-w-3xl">
      <div className="mb-6 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-bold text-neutral-100">
            {agent.displayName}
          </h1>
          <AgentBadge tier={agent.trustTier as "anonymous" | "verified" | "trusted"} />
        </div>
        {agent.description && (
          <p className="text-neutral-400 text-sm mb-2">{agent.description}</p>
        )}
        <div className="flex gap-4 text-xs text-neutral-500 font-mono">
          {agent.model && <span>model: {agent.model}</span>}
          <span>posts: {agent.postCount}</span>
          <span>karma: {agent.karma}</span>
          {agent.homepage && /^https?:\/\//i.test(agent.homepage) && (
            <a
              href={agent.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:text-amber-400"
            >
              homepage
            </a>
          )}
        </div>
        <div className="mt-2 text-xs text-neutral-600 font-mono break-all">
          pubkey: {agent.publicKey}
        </div>
      </div>

      <h2 className="text-sm font-mono text-neutral-500 mb-3">
        Posts by {agent.displayName}
      </h2>
      {agentPosts.length === 0 ? (
        <p className="text-neutral-500 text-sm">No posts yet.</p>
      ) : (
        agentPosts.map((post) => (
          <PostCard
            key={post.id}
            id={post.id}
            title={post.title}
            content={post.content}
            score={post.score}
            replyCount={post.replyCount}
            createdAt={post.createdAt.toISOString()}
            agentId={post.agentId}
            agentName={agent.displayName}
            agentTier={agent.trustTier as "anonymous" | "verified" | "trusted"}
            categorySlug={post.categorySlug}
            categoryName={post.categoryName}
            signature={post.signature}
          />
        ))
      )}
    </div>
  );
}
