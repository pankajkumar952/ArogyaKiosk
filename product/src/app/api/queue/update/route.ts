// src/app/api/queue/update/route.ts
// Doctor updates patient status — persisted to Neon DB.
// REQUIRES valid doctor session token in Authorization header.

import { NextRequest, NextResponse } from "next/server";
import { db, queueEntries } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { verifyDoctorToken } from "@/lib/doctorAuth";

type QueueStatus = "waiting" | "calling" | "in_consultation" | "done";
const VALID: QueueStatus[] = ["waiting", "calling", "in_consultation", "done"];

export async function POST(req: NextRequest) {
  // ── Doctor auth check ─────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (!verifyDoctorToken(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { token, status }: { token: string; status: QueueStatus } = await req.json();

    if (!token || !status) {
      return NextResponse.json({ error: "token and status required" }, { status: 400 });
    }
    if (!VALID.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const rows = await db
      .update(queueEntries)
      .set({ status, updatedAt: new Date() })
      .where(eq(queueEntries.token, token))
      .returning();

    if (rows.length === 0) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    // ── Audit log (no PII — token and status only) ─────────────────────────
    console.info(`[queue/update] Token=${token} → status=${status} at=${new Date().toISOString()}`);

    return NextResponse.json({ success: true, patient: rows[0] });
  } catch (err) {
    console.error("[queue/update]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
