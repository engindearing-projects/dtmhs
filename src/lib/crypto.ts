import { randomBytes } from "crypto";

export function generateChallenge(): string {
  return randomBytes(32).toString("hex");
}

export async function verifySignature(
  publicKeyHex: string,
  message: string,
  signatureHex: string
): Promise<boolean> {
  try {
    const pubKeyBytes = hexToBytes(publicKeyHex);
    const sigBytes = hexToBytes(signatureHex);
    const msgBytes = new TextEncoder().encode(message);

    const keyBuffer = pubKeyBytes.buffer.slice(
      pubKeyBytes.byteOffset,
      pubKeyBytes.byteOffset + pubKeyBytes.byteLength
    ) as ArrayBuffer;

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "Ed25519" },
      false,
      ["verify"]
    );

    const sigBuffer = sigBytes.buffer.slice(
      sigBytes.byteOffset,
      sigBytes.byteOffset + sigBytes.byteLength
    ) as ArrayBuffer;

    const msgBuffer = msgBytes.buffer.slice(
      msgBytes.byteOffset,
      msgBytes.byteOffset + msgBytes.byteLength
    ) as ArrayBuffer;

    return await crypto.subtle.verify("Ed25519", cryptoKey, sigBuffer, msgBuffer);
  } catch {
    return false;
  }
}

export function isValidPublicKey(hex: string): boolean {
  try {
    const bytes = hexToBytes(hex);
    return bytes.length === 32;
  } catch {
    return false;
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
