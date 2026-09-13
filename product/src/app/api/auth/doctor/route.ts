// src/app/api/auth/doctor/route.ts
// Server-side doctor PIN verification — PIN never exposed to client.
// Token creation/verification lives in @/lib/doctorAuth (shared with queue routes).
// Brute-force protection: in-memory lockout (5 attempts / 15 min).

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyDoctorToken, createDoctorToken } from "@/lib/doctorAuth";

// ── Brute-force lockout (in-memory, per-IP) ────────────────────────────────
interface LockEntry { attempts: number; lockedUntil: number; }
const lockStore = new Map<string, LockEntry>();
const MAX_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

function getLockKey(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return `doclock:${ip}`;
}

// ── Constant-time PIN comparison ───────────────────────────────────────────
function safeCompare(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(maxLen, 0);
  const bufB = Buffer.alloc(maxLen, 0);
  bufA.write(a, "utf8");
  bufB.write(b, "utf8");
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  // Warn at runtime (not build time) when DOCTOR_PIN not configured in prod
  if (process.env.NODE_ENV === "production" && !process.env.DOCTOR_PIN) {
    console.error("[doctor-auth] CRITICAL: DOCTOR_PIN env var is not set in production!");
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";

    if (!pin || pin.length > 20) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // ── Lockout check ─────────────────────────────────────────────────────
    const lockKey = getLockKey(req);
    const lock = lockStore.get(lockKey);
    if (lock && Date.now() < lock.lockedUntil) {
      const secondsLeft = Math.ceil((lock.lockedUntil - Date.now()) / 1000);
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json(
        { error: `Account locked. Try again in ${secondsLeft}s.` },
        { status: 429 }
      );
    }

    const correctPin = process.env.DOCTOR_PIN ?? "1234";
    const isCorrect = safeCompare(pin, correctPin);

    if (!isCorrect) {
      const entry = lockStore.get(lockKey) ?? { attempts: 0, lockedUntil: 0 };
      entry.attempts += 1;
      if (entry.attempts >= MAX_ATTEMPTS) entry.lockedUntil = Date.now() + LOCK_WINDOW_MS;
      lockStore.set(lockKey, entry);
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 100));
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }

    lockStore.delete(lockKey);

    const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
    const sessionToken = createDoctorToken(expiresAt);

    return NextResponse.json({ success: true, sessionToken, expiresAt });
  } catch (e) {
    console.error("[doctor-auth] error:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}

// ── GET: Verify endpoint — queue routes call this to check tokens ──────────
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization") ?? "";
  const valid = verifyDoctorToken(token);
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true });
}

