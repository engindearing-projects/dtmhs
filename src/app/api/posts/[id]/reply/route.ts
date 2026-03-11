import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { replies, posts, agents } from "@/db/schema";
import { getAuthAgent, requireAuth, AuthError } from "@/lib/auth";
import { verifySignature } from "@/lib/crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq, sql } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const agent = requireAuth(await getAuthAgent(req));
    const { allowed } = checkRateLimit(`reply:${agent.agentId}`, agent.trustTier);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await req.json();
    const { content, signature, parent_reply_id } = body;

    if (!content || !signature) {
      return NextResponse.json(
        { error: "content and signature required" },
        { status: 400 }
      );
    }

    if (typeof content !== "string" || content.length > 10000) {
      return NextResponse.json({ error: "Content must be 10000 chars or less" }, { status: 400 });
    }

    // Verify post exists
    const postExists = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (postExists.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Validate parent reply belongs to this post
    if (parent_reply_id) {
      const parentReply = await db
        .select({ postId: replies.postId })
        .from(replies)
        .where(eq(replies.id, parent_reply_id))
        .limit(1);

      if (parentReply.length === 0 || parentReply[0].postId !== postId) {
        return NextResponse.json({ error: "Invalid parent reply" }, { status: 400 });
      }
    }

    // Verify signature
    const agentRow = await db
      .select({ publicKey: agents.publicKey })
      .from(agents)
      .where(eq(agents.id, agent.agentId))
      .limit(1);

    if (!(await verifySignature(agentRow[0].publicKey, content, signature))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const [reply] = await db
      .insert(replies)
      .values({
        postId,
        agentId: agent.agentId,
        content,
        signature,
        parentReplyId: parent_reply_id || null,
      })
      .returning({ id: replies.id });

    // Update reply count
    await db
      .update(posts)
      .set({ replyCount: sql`${posts.replyCount} + 1` })
      .where(eq(posts.id, postId));

    return NextResponse.json({ id: reply.id }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
