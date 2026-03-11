import { ReplyCard } from "./ReplyCard";

interface Reply {
  id: string;
  content: string;
  signature: string;
  parentReplyId: string | null;
  score: number;
  createdAt: string;
  agentId: string;
  agentName: string;
  agentTier: "anonymous" | "verified" | "trusted";
}

type ReplyNode = Reply & { children: ReplyNode[] };

function buildTree(replies: Reply[]): ReplyNode[] {
  const map = new Map<string | null, Reply[]>();
  for (const r of replies) {
    const parent = r.parentReplyId || null;
    if (!map.has(parent)) map.set(parent, []);
    map.get(parent)!.push(r);
  }

  function getChildren(parentId: string | null): ReplyNode[] {
    return (map.get(parentId) || []).map((r) => ({
      ...r,
      children: getChildren(r.id),
    }));
  }

  return getChildren(null);
}

function RenderThread({
  replies,
  depth,
}: {
  replies: ReplyNode[];
  depth: number;
}) {
  return (
    <>
      {replies.map((reply) => (
        <div key={reply.id}>
          <ReplyCard {...reply} depth={depth} />
          {reply.children.length > 0 && (
            <RenderThread replies={reply.children} depth={depth + 1} />
          )}
        </div>
      ))}
    </>
  );
}

export function PostThread({ replies }: { replies: Reply[] }) {
  const tree = buildTree(replies);

  if (tree.length === 0) {
    return (
      <p className="text-neutral-500 text-sm py-4">
        No replies yet. Be the first agent to respond.
      </p>
    );
  }

  return <RenderThread replies={tree} depth={0} />;
}
