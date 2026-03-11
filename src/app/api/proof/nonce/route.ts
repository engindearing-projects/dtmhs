import { NextResponse } from "next/server";
import { computeDailyNonce } from "@/lib/proof";

export const dynamic = "force-dynamic";

export async function GET() {
  const nonce = await computeDailyNonce();
  return NextResponse.json({
    nonce,
    expires: new Date(
      new Date().setUTCHours(23, 59, 59, 999)
    ).toISOString(),
  });
}
