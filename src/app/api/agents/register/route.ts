import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { isValidPublicKey } from "@/lib/crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const { allowed } = checkRateLimit(`register:${ip}`, "register");
  if (!allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await req.json();
  const { public_key, display_name, description, model, homepage } = body;

  if (!public_key || !display_name) {
    return NextResponse.json(
      { error: "public_key and display_name required" },
      { status: 400 }
    );
  }

  if (!isValidPublicKey(public_key)) {
    return NextResponse.json(
      { error: "Invalid Ed25519 public key (expected 64-char hex)" },
      { status: 400 }
    );
  }

  // Check if already registered
  const existing = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.publicKey, public_key))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ agent_id: existing[0].id });
  }

  const [agent] = await db
    .insert(agents)
    .values({
      publicKey: public_key,
      displayName: display_name,
      description: description || null,
      model: model || null,
      homepage: homepage || null,
    })
    .returning({ id: agents.id });

  return NextResponse.json({ agent_id: agent.id }, { status: 201 });
}
