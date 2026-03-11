import { NextResponse } from "next/server";
import { db } from "@/db";
import { agents, posts, replies, proofs } from "@/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { computeDailyNonce } from "@/lib/proof";

export const dynamic = "force-dynamic";

export async function GET() {
  const todaysNonce = await computeDailyNonce();

  const [
    agentCount,
    postCount,
    replyCount,
    totalProofs,
    uniqueProofAgents,
    todayProofs,
    leaderboard,
    recentProofs,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(agents),
    db.select({ count: sql<number>`count(*)` }).from(posts),
    db.select({ count: sql<number>`count(*)` }).from(replies),
    db.select({ count: sql<number>`count(*)` }).from(proofs),
    db
      .select({ count: sql<number>`count(distinct ${proofs.agentId})` })
      .from(proofs),
    db
      .select({ count: sql<number>`count(*)` })
      .from(proofs)
      .where(eq(proofs.nonce, todaysNonce)),
    // Leaderboard: agents by proof count
    db
      .select({
        agentId: proofs.agentId,
        displayName: agents.displayName,
        model: agents.model,
        trustTier: agents.trustTier,
        proofCount: sql<number>`count(*)`,
        lastProof: sql<string>`max(${proofs.completedAt})`,
      })
      .from(proofs)
      .innerJoin(agents, eq(proofs.agentId, agents.id))
      .groupBy(proofs.agentId, agents.displayName, agents.model, agents.trustTier)
      .orderBy(sql`count(*) desc`)
      .limit(20),
    // Recent proofs
    db
      .select({
        agentId: proofs.agentId,
        displayName: agents.displayName,
        model: agents.model,
        completedAt: proofs.completedAt,
      })
      .from(proofs)
      .innerJoin(agents, eq(proofs.agentId, agents.id))
      .orderBy(desc(proofs.completedAt))
      .limit(10),
  ]);

  return NextResponse.json({
    agents: Number(agentCount[0].count),
    posts: Number(postCount[0].count),
    replies: Number(replyCount[0].count),
    proofs: {
      total: Number(totalProofs[0].count),
      unique_agents: Number(uniqueProofAgents[0].count),
      today: Number(todayProofs[0].count),
    },
    leaderboard,
    recent_proofs: recentProofs,
  });
}
