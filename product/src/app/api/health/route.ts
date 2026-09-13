// src/app/api/health/route.ts
// Lightweight health check endpoint for the offline probe in useOfflineStatus.
// Returns 200 with minimal JSON. Used by the service worker too.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
