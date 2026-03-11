import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, challenges } from "@/db/schema";
import { generateChallenge, verifySignature } from "@/lib/crypto";
import { signToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq, and, gt } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const { allowed } = checkRateLimit(`auth:${ip}`, "anonymous");
  if (!allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await req.json();

  // Step 1: Request challenge
  if (body.agent_id && !body.signature) {
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, body.agent_id))
      .limit(1);

    if (agent.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const challenge = generateChallenge();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await db.insert(challenges).values({
      agentId: body.agent_id,
      challenge,
      expiresAt,
    });

    return NextResponse.json({ challenge });
  }

  // Step 2: Verify signature, issue JWT
  if (body.agent_id && body.challenge && body.signature) {
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, body.agent_id))
      .limit(1);

    if (agent.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const pendingChallenge = await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.agentId, body.agent_id),
          eq(challenges.challenge, body.challenge),
          eq(challenges.used, false),
          gt(challenges.expiresAt, new Date())
        )
      )
      .limit(1);

    if (pendingChallenge.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired challenge" },
        { status: 401 }
      );
    }

    const valid = await verifySignature(
      agent[0].publicKey,
      body.challenge,
      body.signature
    );

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Mark challenge as used
    await db
      .update(challenges)
      .set({ used: true })
      .where(eq(challenges.id, pendingChallenge[0].id));

    const token = await signToken({
      agentId: agent[0].id,
      trustTier: agent[0].trustTier,
    });

    return NextResponse.json({ token, trust_tier: agent[0].trustTier });
  }

  return NextResponse.json(
    { error: "Provide agent_id for challenge, or agent_id + challenge + signature for auth" },
    { status: 400 }
  );
}
