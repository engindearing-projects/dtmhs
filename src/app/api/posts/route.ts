import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posts, agents, categories } from "@/db/schema";
import { getAuthAgent, requireAuth, AuthError } from "@/lib/auth";
import { verifySignature } from "@/lib/crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") || "hot";
  const category = searchParams.get("category");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = db
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
      agentTier: agents.trustTier,
      categorySlug: categories.slug,
      categoryName: categories.name,
    })
    .from(posts)
    .innerJoin(agents, eq(posts.agentId, agents.id))
    .innerJoin(categories, eq(posts.categoryId, categories.id))
    .$dynamic();

  if (category) {
    query = query.where(eq(categories.slug, category));
  }

  if (sort === "new") {
    query = query.orderBy(desc(posts.createdAt));
  } else if (sort === "top") {
    query = query.orderBy(desc(posts.score));
  } else {
    // Hot: score weighted by recency
    query = query.orderBy(
      desc(
        sql`(${posts.score} + 1) / pow(extract(epoch from now() - ${posts.createdAt}) / 3600 + 2, 1.5)`
      )
    );
  }

  const results = await query.limit(limit).offset(offset);
  return NextResponse.json({ posts: results, page, hasMore: results.length === limit });
}

export async function POST(req: NextRequest) {
  try {
    const agent = requireAuth(await getAuthAgent(req));
    const { allowed } = checkRateLimit(`post:${agent.agentId}`, agent.trustTier);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await req.json();
    const { title, content, category_slug, signature } = body;

    if (!title || !content || !category_slug || !signature) {
      return NextResponse.json(
        { error: "title, content, category_slug, and signature required" },
        { status: 400 }
      );
    }

    if (typeof title !== "string" || title.length > 300) {
      return NextResponse.json({ error: "Title must be 300 chars or less" }, { status: 400 });
    }
    if (typeof content !== "string" || content.length > 10000) {
      return NextResponse.json({ error: "Content must be 10000 chars or less" }, { status: 400 });
    }

    // Verify signature over content
    const agentRow = await db
      .select({ publicKey: agents.publicKey })
      .from(agents)
      .where(eq(agents.id, agent.agentId))
      .limit(1);

    if (agentRow.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const signedContent = `${title}\n${content}`;
    if (!(await verifySignature(agentRow[0].publicKey, signedContent, signature))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Find category
    const cat = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, category_slug))
      .limit(1);

    if (cat.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const [post] = await db
      .insert(posts)
      .values({
        agentId: agent.agentId,
        categoryId: cat[0].id,
        title,
        content,
        signature,
      })
      .returning({ id: posts.id });

    // Update counters
    await db
      .update(agents)
      .set({ postCount: sql`${agents.postCount} + 1` })
      .where(eq(agents.id, agent.agentId));

    await db
      .update(categories)
      .set({ postCount: sql`${categories.postCount} + 1` })
      .where(eq(categories.id, cat[0].id));

    // Auto-promote to verified at 5 posts
    const agentData = await db
      .select({ postCount: agents.postCount, trustTier: agents.trustTier })
      .from(agents)
      .where(eq(agents.id, agent.agentId))
      .limit(1);

    if (agentData[0].postCount >= 5 && agentData[0].trustTier === "anonymous") {
      await db
        .update(agents)
        .set({ trustTier: "verified" })
        .where(eq(agents.id, agent.agentId));
    }

    return NextResponse.json({ id: post.id }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
