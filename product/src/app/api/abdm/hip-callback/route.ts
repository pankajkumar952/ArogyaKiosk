// src/app/api/abdm/hip-callback/route.ts
// ABDM gateway callback receiver for HIP (Health Information Provider) events.
// ABDM pushes async notifications here for:
//   - Patient discovery requests
//   - Care context linking confirmations
//   - Data transfer requests (health info request)
//
// Requires a publicly reachable HTTPS URL registered with ABDM HIP.
// In dev: use ngrok + set NEXT_PUBLIC_CALLBACK_URL env var.

import { NextRequest, NextResponse } from "next/server";

// All incoming callback events are logged and queued in memory.
// In production, these should be persisted to PostgreSQL/Redis.
interface CallbackEvent {
  id: string;
  type: string;
  receivedAt: string;
  payload: unknown;
  processed: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __mkHIPCallbacks: CallbackEvent[] | undefined;
}
const callbackLog: CallbackEvent[] =
  globalThis.__mkHIPCallbacks ?? (globalThis.__mkHIPCallbacks = []);

// ── POST: receive ABDM gateway notification ───────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const callbackType = req.headers.get("x-callback-type") ?? body?.action ?? "unknown";

    const event: CallbackEvent = {
      id: crypto.randomUUID(),
      type: callbackType,
      receivedAt: new Date().toISOString(),
      payload: body,
      processed: false,
    };

    callbackLog.push(event);
    // Keep last 200 events in memory
    if (callbackLog.length > 200) callbackLog.splice(0, callbackLog.length - 200);

    console.info(`[HIP Callback] ${callbackType} — id: ${event.id}`);

    // ── Handle known callback types ─────────────────────────────────────────

    switch (callbackType) {
      case "DISCOVERY":
        // Patient discovery: ABDM asks if we have records for this patient
        // Respond 202 — we acknowledge; actual response goes via gateway
        event.processed = true;
        return NextResponse.json(
          { status: "acknowledged", callbackId: event.id },
          { status: 202 }
        );

      case "LINK_CONFIRM":
        // Care context link confirmed by patient
        event.processed = true;
        return NextResponse.json({ status: "acknowledged" }, { status: 202 });

      case "DATA_REQUEST":
        // Health information request — patient consented, HIU is requesting data
        // Full implementation requires fetching FHIR bundle + Fidelius encrypt + push
        // This is a placeholder — see fidelius.ts for the encryption utilities
        console.warn(
          "[HIP Callback] DATA_REQUEST received — full data push requires HIP registration. " +
          "Fidelius encryption utilities are in src/lib/abdm/fidelius.ts"
        );
        event.processed = false;
        return NextResponse.json(
          {
            status: "accepted",
            note: "DATA_REQUEST handling requires active HIP registration with ABDM",
          },
          { status: 202 }
        );

      default:
        // Unknown callback — log and ack
        return NextResponse.json({ status: "logged" }, { status: 202 });
    }
  } catch (err) {
    console.error("[HIP Callback] parse error:", err);
    // Always return 200/202 to ABDM — never 5xx (ABDM retries on failure)
    return NextResponse.json({ status: "error_logged" }, { status: 202 });
  }
}

// ── GET: dev inspection of received callbacks ─────────────────────────────────

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const events = type
    ? callbackLog.filter((e) => e.type === type)
    : callbackLog.slice(-50);
  return NextResponse.json({ count: events.length, events });
}
