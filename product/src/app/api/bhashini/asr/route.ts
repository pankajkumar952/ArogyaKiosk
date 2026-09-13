// src/app/api/bhashini/asr/route.ts
import { NextRequest, NextResponse } from "next/server";

const DHRUVA_ENDPOINT =
  process.env.BHASHINI_INFERENCE_URL ??
  process.env.NEXT_PUBLIC_BHASHINI_INFERENCE_URL ??
  "https://dhruva-api.bhashini.gov.in/services/inference/pipeline";
const API_KEY = process.env.BHASHINI_API_KEY ?? process.env.NEXT_PUBLIC_BHASHINI_API_KEY ?? "";
const USER_ID = process.env.BHASHINI_USER_ID ?? process.env.NEXT_PUBLIC_BHASHINI_USER_ID ?? "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { audioBase64, mimeType = "audio/webm", lang = "hi" } = body;
    if (!audioBase64) return NextResponse.json({ error: "audioBase64 required" }, { status: 400 });
    if (!API_KEY || !USER_ID) return NextResponse.json({ error: "Bhashini not configured" }, { status: 503 });

    let audioFormat = "webm";
    if (mimeType.includes("wav")) audioFormat = "wav";
    else if (mimeType.includes("mp3") || mimeType.includes("mpeg")) audioFormat = "mp3";

    const payload = {
      pipelineTasks: [{ taskType: "asr", config: { language: { sourceLanguage: lang }, audioFormat, postProcessors: null } }],
      inputData: { audio: [{ audioContent: audioBase64 }] },
    };

    const res = await fetch(DHRUVA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: API_KEY, ulcaApiKey: API_KEY, userID: USER_ID },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return NextResponse.json({ error: "Bhashini ASR error: " + res.status }, { status: 502 });
    const data = await res.json();
    const transcript = (data?.pipelineResponse?.[0]?.output?.[0]?.source ?? "").trim();
    return NextResponse.json({ transcript });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}