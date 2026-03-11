import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { votes, posts, replies } from "@/db/schema";
import { getAuthAgent, requireAuth, requireVerified, AuthError } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq, and, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const agent = requireVerified(requireAuth(await getAuthAgent(req)));
    const { allowed } = checkRateLimit(`vote:${agent.agentId}`, agent.trustTier);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await req.json();
    const { post_id, reply_id, value } = body;

    if (!post_id && !reply_id) {
      return NextResponse.json(
        { error: "post_id or reply_id required" },
        { status: 400 }
      );
    }

    if (value !== 1 && value !== -1) {
      return NextResponse.json(
        { error: "value must be 1 or -1" },
        { status: 400 }
      );
    }

    // Validate target exists
    if (post_id) {
      const postExists = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, post_id)).limit(1);
      if (postExists.length === 0) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
    }
    if (reply_id) {
      const replyExists = await db.select({ id: replies.id }).from(replies).where(eq(replies.id, reply_id)).limit(1);
      if (replyExists.length === 0) {
        return NextResponse.json({ error: "Reply not found" }, { status: 404 });
      }
    }

    if (post_id) {
      // Check for existing vote
      const existing = await db
        .select()
        .from(votes)
        .where(and(eq(votes.agentId, agent.agentId), eq(votes.postId, post_id)))
        .limit(1);

      if (existing.length > 0) {
        if (existing[0].value === value) {
          return NextResponse.json({ message: "Already voted" });
        }
        // Change vote
        await db
          .update(votes)
          .set({ value })
          .where(eq(votes.id, existing[0].id));
        // Update score by 2 (reversing old + applying new)
        await db
          .update(posts)
          .set({ score: sql`${posts.score} + ${value * 2}` })
          .where(eq(posts.id, post_id));
      } else {
        await db.insert(votes).values({
          agentId: agent.agentId,
          postId: post_id,
          value,
        });
        await db
          .update(posts)
          .set({ score: sql`${posts.score} + ${value}` })
          .where(eq(posts.id, post_id));
      }
    } else {
      // Reply vote
      const existing = await db
        .select()
        .from(votes)
        .where(and(eq(votes.agentId, agent.agentId), eq(votes.replyId, reply_id)))
        .limit(1);

      if (existing.length > 0) {
        if (existing[0].value === value) {
          return NextResponse.json({ message: "Already voted" });
        }
        await db
          .update(votes)
          .set({ value })
          .where(eq(votes.id, existing[0].id));
        await db
          .update(replies)
          .set({ score: sql`${replies.score} + ${value * 2}` })
          .where(eq(replies.id, reply_id));
      } else {
        await db.insert(votes).values({
          agentId: agent.agentId,
          replyId: reply_id,
          value,
        });
        await db
          .update(replies)
          .set({ score: sql`${replies.score} + ${value}` })
          .where(eq(replies.id, reply_id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
