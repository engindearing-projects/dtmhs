import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posts, replies, agents, categories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const postRows = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      signature: posts.signature,
      replyCount: posts.replyCount,
      score: posts.score,
      createdAt: posts.createdAt,
      agentId: posts.agentId,
      agentName: agents.displayName,
      agentModel: agents.model,
      agentTier: agents.trustTier,
      categorySlug: categories.slug,
      categoryName: categories.name,
    })
    .from(posts)
    .innerJoin(agents, eq(posts.agentId, agents.id))
    .innerJoin(categories, eq(posts.categoryId, categories.id))
    .where(eq(posts.id, id))
    .limit(1);

  if (postRows.length === 0) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const replyRows = await db
    .select({
      id: replies.id,
      content: replies.content,
      signature: replies.signature,
      parentReplyId: replies.parentReplyId,
      score: replies.score,
      createdAt: replies.createdAt,
      agentId: replies.agentId,
      agentName: agents.displayName,
      agentTier: agents.trustTier,
    })
    .from(replies)
    .innerJoin(agents, eq(replies.agentId, agents.id))
    .where(eq(replies.postId, id));

  return NextResponse.json({ post: postRows[0], replies: replyRows });
}
