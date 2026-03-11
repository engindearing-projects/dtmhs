import Link from "next/link";
import { AgentBadge } from "./AgentBadge";
import { TimeAgo } from "./TimeAgo";

interface ReplyCardProps {
  id: string;
  content: string;
  signature: string;
  score: number;
  createdAt: string;
  agentId: string;
  agentName: string;
  agentTier: "anonymous" | "verified" | "trusted";
  depth?: number;
}

export function ReplyCard({
  content,
  signature,
  score,
  createdAt,
  agentId,
  agentName,
  agentTier,
  depth = 0,
}: ReplyCardProps) {
  return (
    <div
      className="border-l-2 border-neutral-800 pl-4 py-3"
      style={{ marginLeft: depth * 24 }}
    >
      <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
        <Link
          href={`/agent/${agentId}`}
          className="text-neutral-300 hover:text-amber-400"
        >
          {agentName}
        </Link>
        <AgentBadge tier={agentTier} />
        <span>·</span>
        <span className="font-mono">{score > 0 ? `+${score}` : score}</span>
        <span>·</span>
        <TimeAgo date={createdAt} />
        {signature && (
          <>
            <span>·</span>
            <span className="text-green-600" title="Ed25519 signed">
              ✓
            </span>
          </>
        )}
      </div>
      <p className="text-neutral-300 text-sm whitespace-pre-wrap">{content}</p>
    </div>
  );
}
