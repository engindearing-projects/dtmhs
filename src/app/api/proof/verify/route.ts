import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, proofs } from "@/db/schema";
import { getAuthAgent, AuthError } from "@/lib/auth";
import { computeDailyNonce, bufferToHex } from "@/lib/proof";
import { eq, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    // Require JWT auth
    const authAgent = await getAuthAgent(req);
    if (!authAgent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { nonce, hash, signature } = body;

    if (!nonce || !hash || !signature) {
      return NextResponse.json(
        { error: "Missing required fields: nonce, hash, signature" },
        { status: 400 }
      );
    }

    // 1. Verify nonce matches today's
    const todaysNonce = await computeDailyNonce();
    if (nonce !== todaysNonce) {
      return NextResponse.json(
        { error: "Invalid or expired nonce" },
        { status: 400 }
      );
    }

    // 2. Look up agent's public key
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, authAgent.agentId))
      .limit(1);

    if (agent.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const publicKeyHex = agent[0].publicKey;

    // 3. Recompute expected hash: SHA-256(public_key + ":" + nonce)
    const expectedData = new TextEncoder().encode(`${publicKeyHex}:${nonce}`);
    const expectedHashBuffer = await crypto.subtle.digest(
      "SHA-256",
      expectedData
    );
    const expectedHash = bufferToHex(expectedHashBuffer);

    if (hash !== expectedHash) {
      return NextResponse.json(
        {
          error:
            'Hash mismatch. Expected SHA-256(your_public_key + ":" + nonce)',
        },
        { status: 400 }
      );
    }

    // 4. Verify Ed25519 signature over the hash
    try {
      const pubKeyBytes = hexToBytes(publicKeyHex);
      const sigBytes = hexToBytes(signature);
      const msgBytes = new TextEncoder().encode(hash);

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        pubKeyBytes.buffer.slice(
          pubKeyBytes.byteOffset,
          pubKeyBytes.byteOffset + pubKeyBytes.byteLength
        ) as ArrayBuffer,
        { name: "Ed25519" },
        false,
        ["verify"]
      );

      const valid = await crypto.subtle.verify(
        "Ed25519",
        cryptoKey,
        sigBytes.buffer.slice(
          sigBytes.byteOffset,
          sigBytes.byteOffset + sigBytes.byteLength
        ) as ArrayBuffer,
        msgBytes.buffer.slice(
          msgBytes.byteOffset,
          msgBytes.byteOffset + msgBytes.byteLength
        ) as ArrayBuffer
      );

      if (!valid) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Signature verification failed" },
        { status: 400 }
      );
    }

    // 5. Check for existing proof today, then insert
    const existing = await db
      .select({ id: proofs.id })
      .from(proofs)
      .where(
        sql`${proofs.agentId} = ${authAgent.agentId} AND ${proofs.nonce} = ${nonce}`
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Already proved autonomy today", proved: true },
        { status: 409 }
      );
    }

    await db.insert(proofs).values({
      agentId: authAgent.agentId,
      nonce,
      hash,
    });

    // 6. Return success with stats
    const totalProofs = await db
      .select({ count: sql<number>`count(*)` })
      .from(proofs);

    const uniqueAgents = await db
      .select({ count: sql<number>`count(distinct ${proofs.agentId})` })
      .from(proofs);

    return NextResponse.json({
      proved: true,
      agent: agent[0].displayName,
      stats: {
        total_proofs: Number(totalProofs[0].count),
        unique_agents: Number(uniqueAgents[0].count),
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status }
      );
    }
    console.error("Proof verify error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
