// src/app/api/rag/ingest/route.ts
// Admin-only route to rebuild the embedding cache from the knowledge base.
// POST /api/rag/ingest — generates embeddings for all KNOWLEDGE_BASE entries
// and writes them to src/lib/rag/embeddings-cache.json.
//
// Security: Protected by INGEST_SECRET env var. Never expose in production without auth.

import { NextRequest, NextResponse } from "next/server";
import { KNOWLEDGE_BASE } from "@/lib/rag/knowledge-base";
import { embedAllEntries } from "@/lib/rag/embedder";
import { invalidateCache } from "@/lib/rag/retriever";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  // ── Auth gate ────────────────────────────────────────────────────────────
  const secret = process.env.INGEST_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "INGEST_SECRET must be set in production" },
      { status: 403 }
    );
  }

  // ── Check API key ────────────────────────────────────────────────────────
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured — cannot generate embeddings" },
      { status: 503 }
    );
  }

  const startTime = Date.now();
  console.info(`[RAG Ingest] Starting embedding of ${KNOWLEDGE_BASE.length} entries...`);

  try {
    const embedded = await embedAllEntries(KNOWLEDGE_BASE);

    // Write to cache file
    const cachePath = path.join(process.cwd(), "src", "lib", "rag", "embeddings-cache.json");
    fs.writeFileSync(cachePath, JSON.stringify(embedded, null, 2), "utf-8");

    // Invalidate in-memory cache so next retrieval loads the fresh file
    invalidateCache();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.info(`[RAG Ingest] Done. ${embedded.length} entries embedded in ${duration}s`);

    return NextResponse.json({
      success: true,
      entriesEmbedded: embedded.length,
      durationSeconds: parseFloat(duration),
      cacheFile: cachePath,
      // Report any zero-vector entries (failed embeddings)
      failedEntries: embedded
        .filter((e) => e.embedding.every((v) => v === 0))
        .map((e) => e.id),
    });
  } catch (err) {
    console.error("[RAG Ingest] Failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  // Report cache status without triggering ingestion
  const cachePath = path.join(process.cwd(), "src", "lib", "rag", "embeddings-cache.json");
  const exists = fs.existsSync(cachePath);
  let count = 0;
  let lastModified: string | null = null;

  if (exists) {
    try {
      const raw = fs.readFileSync(cachePath, "utf-8");
      const data = JSON.parse(raw);
      count = Array.isArray(data) ? data.length : 0;
      lastModified = fs.statSync(cachePath).mtime.toISOString();
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    cacheExists: exists,
    embeddedEntries: count,
    knowledgeBaseEntries: KNOWLEDGE_BASE.length,
    lastModified,
    status: exists ? (count === KNOWLEDGE_BASE.length ? "up-to-date" : "stale") : "not-built",
    hint: exists ? null : "POST /api/rag/ingest to build the embedding cache",
  });
}
