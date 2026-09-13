// src/app/api/rag/query/route.ts
// RAG retrieval endpoint — accepts a natural-language query, embeds it with Gemini,
// and returns the top-K most relevant clinical knowledge chunks.

import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/rag/embedder";
import {
  retrieveByVector,
  retrieveByKeyword,
  hasEmergencyTrigger,
  formatContextForLLM,
} from "@/lib/rag/retriever";
import type { KnowledgeDomain } from "@/lib/rag/knowledge-base";

export interface RAGQueryRequest {
  query: string;
  /** ISO language code of the query — used to translate to English if needed before embedding */
  lang?: string;
  domain?: KnowledgeDomain | KnowledgeDomain[];
  k?: number;
}

export interface RAGQueryResponse {
  chunks: Array<{
    id: string;
    title: string;
    content: string;
    domain: string;
    symptomSystem: string;
    score: number;
    source: string;
  }>;
  emergencyTriage: boolean;
  contextForLLM: string;
  retrievalMethod: "vector" | "keyword" | "empty";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RAGQueryRequest;
    const { query, domain, k = 4 } = body;

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    let results;
    let retrievalMethod: "vector" | "keyword" | "empty" = "empty";

    // Try vector retrieval first (requires Gemini API key + embeddings cache)
    if (process.env.GEMINI_API_KEY) {
      try {
        const queryEmbedding = await embedText(query);
        results = await retrieveByVector(queryEmbedding, { k, domain });
        retrievalMethod = results.length > 0 ? "vector" : "keyword";
      } catch (embedErr) {
        console.warn("[RAG] Vector retrieval failed, falling back to keyword:", embedErr);
        results = await retrieveByKeyword(query, { k, domain });
        retrievalMethod = results.length > 0 ? "keyword" : "empty";
      }
    } else {
      // No API key — keyword fallback
      results = await retrieveByKeyword(query, { k, domain });
      retrievalMethod = results.length > 0 ? "keyword" : "empty";
    }

    const emergencyTriage = hasEmergencyTrigger(results);
    const contextForLLM = formatContextForLLM(results);

    const response: RAGQueryResponse = {
      chunks: results.map((r) => ({
        id: r.entry.id,
        title: r.entry.title,
        content: r.entry.embeddedText,
        domain: r.entry.domain,
        symptomSystem: r.entry.symptomSystem,
        score: Math.round(r.score * 1000) / 1000,
        source: r.entry.source,
      })),
      emergencyTriage,
      contextForLLM,
      retrievalMethod,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[RAG] /api/rag/query error:", err);
    return NextResponse.json({ error: "RAG query failed" }, { status: 500 });
  }
}
