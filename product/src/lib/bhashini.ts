// src/lib/bhashini.ts
// Bhashini Dhruva API client — ASR + TTS for 22 Indian languages
// Used by useVoiceSession hook. Falls back to Web Speech API if keys absent.

const DHRUVA_ENDPOINT =
  process.env.NEXT_PUBLIC_BHASHINI_INFERENCE_URL ??
  "https://dhruva-api.bhashini.gov.in/services/inference/pipeline";

function getUserId() {
  return process.env.NEXT_PUBLIC_BHASHINI_USER_ID ?? "";
}

function getApiKey() {
  return process.env.NEXT_PUBLIC_BHASHINI_API_KEY ?? "";
}

// ── Check if Bhashini is configured ──────────────────────────────
export function isBhashiniConfigured(): boolean {
  return Boolean(getUserId() && getApiKey());
}

// ── Common headers ────────────────────────────────────────────────
function getHeaders() {
  const apiKey = getApiKey();
  const userId = getUserId();
  return {
    "Content-Type": "application/json",
    Authorization: apiKey,
    ulcaApiKey: apiKey,
    userID: userId,
  };
}

// ── ASR: Audio Blob → Transcript string ──────────────────────────
// Bhashini auto-selects best IndicConformer model per language when serviceId is omitted.
export async function bhashiniASR(
  audioBlob: Blob,
  lang: string
): Promise<string> {
  const mimeType = audioBlob.type || "audio/webm";
  let audioFormat = "webm";
  if (mimeType.includes("wav")) audioFormat = "wav";
  else if (mimeType.includes("mp3") || mimeType.includes("mpeg")) audioFormat = "mp3";
  else if (mimeType.includes("ogg")) audioFormat = "webm";

  const arrayBuffer = await audioBlob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
  const base64Audio = btoa(binary);

  const payload = {
    pipelineTasks: [{
      taskType: "asr",
      config: {
        language: { sourceLanguage: lang },
        // serviceId intentionally omitted — Bhashini auto-routes to best model
        audioFormat,
        ...(audioFormat === "wav" || audioFormat === "pcm" ? { samplingRate: 16000 } : {}),
        postProcessors: null,
      },
    }],
    inputData: { audio: [{ audioContent: base64Audio }] },
  };

  const res = await fetch(DHRUVA_ENDPOINT, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Bhashini ASR error: ${res.status}`);
  const data = await res.json();
  return (data?.pipelineResponse?.[0]?.output?.[0]?.source ?? "").trim();
}


// ── TTS: Text → AudioBuffer (plays in browser) ───────────────────
// NOTE: This is called from useVoiceSession for languages unsupported by Web Speech API.
// For security, prefer the server-side /api/bhashini/tts route instead.
export async function bhashiniTTS(
  text: string,
  lang: string,
  gender: "male" | "female" = "female"
): Promise<ArrayBuffer | null> {
  const payload = {
    pipelineTasks: [{
      taskType: "tts",
      config: {
        language: { sourceLanguage: lang },
        // serviceId intentionally omitted — Bhashini auto-routes to best model
        gender,
        samplingRate: 22050,
      },
    }],
    inputData: {
      input: [{ source: text }],
      audio: [{ audioContent: null }],
    },
  };

  const res = await fetch(DHRUVA_ENDPOINT, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Bhashini TTS error: ${res.status}`);

  const data = await res.json();
  const b64Audio =
    data?.pipelineResponse?.[0]?.audio?.[0]?.audioContent ?? null;
  if (!b64Audio) return null;

  // Decode base64 → ArrayBuffer
  const binaryStr = atob(b64Audio);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  return bytes.buffer;
}

// ── Play ArrayBuffer as audio in browser ─────────────────────────
export async function playAudioBuffer(
  buffer: ArrayBuffer,
  onEnd?: () => void
): Promise<void> {
  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(buffer);
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);
  source.onended = () => {
    audioCtx.close();
    onEnd?.();
  };
  source.start(0);
}
