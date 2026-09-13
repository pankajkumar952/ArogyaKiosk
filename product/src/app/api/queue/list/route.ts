// src/app/api/queue/list/route.ts
// Doctor queue read — pulls from Neon DB so data persists across cold starts
// Supports both SSE (real-time push every 3s) and plain JSON (polling fallback)

import { NextRequest, NextResponse } from "next/server";
import { db, queueEntries } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function buildQueuePayload() {
  const rows = await db
    .select()
    .from(queueEntries)
    .orderBy(sql`token_index ASC`)
    .limit(200);

  const active = rows.filter((r) => r.status !== "done");
  const done = rows
    .filter((r) => r.status === "done")
    .slice(-10)
    .reverse();

  const stats = {
    total: rows.length,
    waiting: rows.filter((r) => r.status === "waiting").length,
    calling: rows.filter((r) => r.status === "calling").length,
    inConsultation: rows.filter((r) => r.status === "in_consultation").length,
    done: rows.filter((r) => r.status === "done").length,
  };

  return { stats, active, done, timestamp: Date.now() };
}

export async function GET(req: NextRequest) {
  const accept = req.headers.get("accept") ?? "";

  if (accept.includes("text/event-stream")) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = async () => {
          try {
            const payload = await buildQueuePayload();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          } catch { /* DB hiccup — skip this tick */ }
        };

        await send();
        const interval = setInterval(send, 3000);
        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode(": ping\n\n"));
        }, 30000);

        req.signal.addEventListener("abort", () => {
          clearInterval(interval);
          clearInterval(keepAlive);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const payload = await buildQueuePayload();
  return NextResponse.json(payload);
}
