// src/app/api/queue/add/route.ts
// Add a patient to the live token queue — persisted to Neon DB
// Replaces the in-memory global which was lost on every cold start

import { NextRequest, NextResponse } from "next/server";
import { db, queueEntries } from "@/lib/db";
import { sql } from "drizzle-orm";

function cuid() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

async function nextTokenIndex(): Promise<number> {
  const result = await db
    .select({ max: sql<number>`COALESCE(MAX(token_index), 0)` })
    .from(queueEntries);
  return (result[0]?.max ?? 0) + 1;
}

function buildToken(index: number): string {
  const letter = String.fromCharCode(65 + Math.floor((index - 1) / 99) % 26);
  const num = String(((index - 1) % 99) + 1).padStart(3, "0");
  return `${letter}-${num}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const index = await nextTokenIndex();
    const token = buildToken(index);
    const id = cuid();

    await db.insert(queueEntries).values({
      id,
      token,
      tokenIndex: index,
      lang: body.lang ?? "hi",
      loginMethod: body.loginMethod ?? "anonymous",
      patientName: body.patientName ?? null,
      chiefComplaint: body.chiefComplaint ?? "Not specified",
      severity: body.severity ?? "moderate",
      suggestedICD10: body.suggestedICD10 ?? "",
      redFlags: body.redFlags ?? [],
      ayushNote: body.ayushNote ?? null,
      hasDocuments: body.hasDocuments ?? false,
      status: "waiting",
    });

    const waitingResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(queueEntries)
      .where(sql`status = 'waiting' AND token_index < ${index}`);

    const waitingAhead = Number(waitingResult[0]?.count ?? 0);

    return NextResponse.json({
      success: true,
      token,
      tokenIndex: index,
      position: waitingAhead + 1,
      estimatedWaitMins: Math.max(0, waitingAhead * 3),
      submittedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[queue/add]", err);
    return NextResponse.json({ error: "Failed to add to queue" }, { status: 500 });
  }
}
