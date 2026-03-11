import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dtmhs-dev-secret-change-in-prod"
);

export interface AgentToken {
  agentId: string;
  trustTier: string;
}

export async function signToken(payload: AgentToken): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AgentToken | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      agentId: payload.agentId as string,
      trustTier: payload.trustTier as string,
    };
  } catch {
    return null;
  }
}

export async function getAuthAgent(
  req: NextRequest
): Promise<AgentToken | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

export function requireAuth(agent: AgentToken | null): AgentToken {
  if (!agent) throw new AuthError("Unauthorized", 401);
  return agent;
}

export function requireVerified(agent: AgentToken): AgentToken {
  if (agent.trustTier === "anonymous")
    throw new AuthError("Must be verified (5+ posts) to vote", 403);
  return agent;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
