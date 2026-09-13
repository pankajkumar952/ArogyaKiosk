// src/app/api/bhashini/tts/route.ts
// Server-side Bhashini TTS proxy — hides API key from browser DevTools.
// POST { text, lang, gender? } -> { audioBase64: string }

import { NextRequest, NextResponse } from "next/server";

const DHRUVA_ENDPOINT =
  process.env.BHASHINI_INFERENCE_URL ??
  process.env.NEXT_PUBLIC_BHASHINI_INFERENCE_URL ??
  "https://dhruva-api.bhashini.gov.in/services/inference/pipeline";

const API_KEY =
  process.env.BHASHINI_API_KEY ?? process.env.NEXT_PUBLIC_BHASHINI_API_KEY ?? "";
const USER_ID =
  process.env.BHASHINI_USER_ID ?? process.env.NEXT_PUBLIC_BHASHINI_USER_ID ?? "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { text, lang = "hi", gender = "female" } = body as {
      text?: string;
      lang?: string;
      gender?: "male" | "female";
    };

    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    if (!API_KEY || !USER_ID) {
      return NextResponse.json(
        { error: "Bhashini credentials not configured on server" },
        { status: 503 }
      );
    }

    const payload = {
      pipelineTasks: [
        {
          taskType: "tts",
          config: {
            language: { sourceLanguage: lang },
            // serviceId intentionally omitted — Bhashini auto-selects best model
            gender,
            samplingRate: 22050,
          },
        },
      ],
      inputData: {
        input: [{ source: text.trim() }],
        audio: [{ audioContent: null }],
      },
    };

    const res = await fetch(DHRUVA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: API_KEY,
        ulcaApiKey: API_KEY,
        userID: USER_ID,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[bhashini/tts] upstream error " + res.status + ":", detail);
      return NextResponse.json(
        { error: "Bhashini error: " + res.status, detail },
        { status: 502 }
      );
    }

    const data = await res.json();
    const audioBase64 =
      data?.pipelineResponse?.[0]?.audio?.[0]?.audioContent ?? null;

    if (!audioBase64) {
      return NextResponse.json({ error: "No audio in Bhashini response" }, { status: 502 });
    }

    return NextResponse.json({ audioBase64 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[bhashini/tts] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
