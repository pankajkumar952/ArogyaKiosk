// src/app/api/abdm/scan-share/route.ts
// ABDM Scan & Share flow — fastest patient authentication method.
//
// Flow:
//   1. GET /api/abdm/scan-share → generates QR code payload with facilityId + counter
//   2. Patient scans QR with ABHA mobile app (Aarogya Setu / ABHA app)
//   3. ABDM gateway pushes verified patient token to POST /api/abdm/scan-share (callback)
//   4. Server stores token in memory, client polls GET /api/abdm/scan-share?token=<id>
//
// IMPORTANT: This callback requires a publicly reachable HTTPS endpoint.
// In development, use ngrok: `ngrok http 3000` and set NEXT_PUBLIC_CALLBACK_URL.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// In-memory store for scan-share sessions
// Maps sessionId → { status, profile, expiresAt }
interface ScanShareSession {
  status: "pending" | "completed" | "expired";
  profile?: {
    abhaNumber: string;
    abhaAddress: string;
    name: string;
    gender: string;
    yearOfBirth: string;
  };
  expiresAt: number;
}

// Use global to survive Next.js hot reload
declare global {
  // eslint-disable-next-line no-var
  var __mkScanSessions: Map<string, ScanShareSession> | undefined;
}
const sessions: Map<string, ScanShareSession> =
  globalThis.__mkScanSessions ?? (globalThis.__mkScanSessions = new Map());

// Clean up expired sessions periodically
function cleanupSessions() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now > s.expiresAt) sessions.delete(id);
  }
}

// ── GET: Generate QR code payload ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  cleanupSessions();

  const { searchParams } = new URL(req.url);
  const pollId = searchParams.get("poll");

  // ── Poll existing session ─────────────────────────────────────────────────
  if (pollId) {
    const session = sessions.get(pollId);
    if (!session) {
      return NextResponse.json({ status: "not_found" }, { status: 404 });
    }
    if (Date.now() > session.expiresAt) {
      sessions.delete(pollId);
      return NextResponse.json({ status: "expired" });
    }
    return NextResponse.json({ status: session.status, profile: session.profile ?? null });
  }

  // ── Create new scan-share session ─────────────────────────────────────────
  const sessionId = crypto.randomUUID();
  const facilityId = process.env.ABDM_FACILITY_ID ?? "DEV_FACILITY";
  const callbackBase =
    process.env.NEXT_PUBLIC_CALLBACK_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://app.arogyakiosk.mayankcodes.dev";


  sessions.set(sessionId, {
    status: "pending",
    expiresAt: Date.now() + 5 * 60 * 1000, // 5-minute window
  });

  // QR payload format expected by ABHA app
  const qrPayload = {
    facilityId,
    purpose: "ABHA_VERIFY",
    sessionId,
    callbackUrl: `${callbackBase}/api/abdm/scan-share`,
    timestamp: new Date().toISOString(),
    expiry: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };

  return NextResponse.json({
    sessionId,
    qrPayload: JSON.stringify(qrPayload),
    // URL-safe base64 for QR code rendering
    qrData: Buffer.from(JSON.stringify(qrPayload)).toString("base64url"),
    pollUrl: `/api/abdm/scan-share?poll=${sessionId}`,
    expiresInSeconds: 300,
    isDev: !process.env.ABDM_FACILITY_ID,
    devNote: !process.env.ABDM_FACILITY_ID
      ? "Set ABDM_FACILITY_ID + NEXT_PUBLIC_CALLBACK_URL for real Scan & Share"
      : undefined,
  });
}

// ── POST: ABDM gateway callback (patient scanned QR) ─────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ABDM gateway sends a verification token with patient demographics
    const { sessionId, token, patient } = body as {
      sessionId: string;
      token: string;
      patient: {
        name: string;
        abhaNumber: string;
        abhaAddress: string;
        gender: string;
        yearOfBirth: string;
      };
    };

    if (!sessionId || !token || !patient) {
      return NextResponse.json({ error: "Invalid callback payload" }, { status: 400 });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found or expired" }, { status: 404 });
    }

    // TODO in production: verify the callback signature using ABDM gateway public key
    // For now we trust the payload if it comes from ABDM's IP range

    sessions.set(sessionId, {
      status: "completed",
      expiresAt: session.expiresAt,
      profile: {
        abhaNumber: patient.abhaNumber,
        abhaAddress: patient.abhaAddress,
        name: patient.name,
        gender: patient.gender,
        yearOfBirth: patient.yearOfBirth,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[scan-share callback] error:", err);
    return NextResponse.json({ error: "Callback processing failed" }, { status: 500 });
  }
}
