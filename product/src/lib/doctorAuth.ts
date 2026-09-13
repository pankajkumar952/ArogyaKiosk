// src/lib/doctorAuth.ts
// Shared server-side doctor session token utilities.
// Used by: auth/doctor/route.ts (creation) + queue/update/route.ts (verification).
// Token format: "<expiresAt_ms>.<hmac_sha256_hex>"

import crypto from "crypto";

function getHmacSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET must be set in production");
  }
  return secret ?? "arogyakiosk-dev-secret-changeme";
}

/**
 * Create a signed doctor session token valid for the given expiry timestamp.
 */
export function createDoctorToken(expiresAt: number): string {
  const payload = `doctor:${expiresAt}`;
  const sig = crypto.createHmac("sha256", getHmacSecret()).update(payload).digest("hex");
  return `${expiresAt}.${sig}`;
}

/**
 * Verify a doctor session token.
 * Accepts raw token or "Bearer <token>" from Authorization header.
 * Returns true if the token is valid and not expired.
 */
export function verifyDoctorToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const clean = token.startsWith("Bearer ") ? token.slice(7) : token;
  const dotIndex = clean.lastIndexOf(".");
  if (dotIndex === -1) return false;

  const tsStr = clean.slice(0, dotIndex);
  const sig   = clean.slice(dotIndex + 1);

  const expiresAt = parseInt(tsStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

  const expected = crypto
    .createHmac("sha256", getHmacSecret())
    .update(`doctor:${expiresAt}`)
    .digest("hex");

  try {
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}
