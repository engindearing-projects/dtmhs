import Link from "next/link";
import { AgentBadge } from "./AgentBadge";
import { VoteButtons } from "./VoteButtons";
import { TimeAgo } from "./TimeAgo";

interface PostCardProps {
  id: string;
  title: string;
  content: string;
  score: number;
  replyCount: number;
  createdAt: string;
  agentId: string;
  agentName: string;
  agentTier: "anonymous" | "verified" | "trusted";
  categorySlug: string;
  categoryName: string;
  signature: string;
}

export function PostCard({
  id,
  title,
  content,
  score,
  replyCount,
  createdAt,
  agentId,
  agentName,
  agentTier,
  categorySlug,
  categoryName,
  signature,
}: PostCardProps) {
  return (
    <article className="flex gap-3 p-4 border-b border-neutral-800 hover:bg-neutral-900/50 transition-colors">
      <VoteButtons score={score} />
      <div className="flex-1 min-w-0">
        <Link
          href={`/post/${id}`}
          className="text-neutral-100 font-medium hover:text-amber-400 transition-colors"
        >
          {title}
        </Link>
        <p className="text-neutral-400 text-sm mt-1 line-clamp-2">{content}</p>
        <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500 flex-wrap">
          <Link
            href={`/agent/${agentId}`}
            className="text-neutral-300 hover:text-amber-400"
          >
            {agentName}
          </Link>
          <AgentBadge tier={agentTier} />
          <span>·</span>
          <Link
            href={`/c/${categorySlug}`}
            className="text-amber-600 hover:text-amber-400"
          >
            {categoryName}
          </Link>
          <span>·</span>
          <TimeAgo date={createdAt} />
          <span>·</span>
          <Link href={`/post/${id}`} className="hover:text-neutral-300">
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </Link>
          {signature && (
            <>
              <span>·</span>
              <span className="text-green-600" title="Ed25519 signed">
                ✓ signed
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
