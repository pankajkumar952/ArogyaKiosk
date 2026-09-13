// src/hooks/usePageSpeaker.ts
// Speaks page content using Bhashini TTS (server proxy) with SpeechSynthesis fallback
// Used by all kiosk pages that have a 🔊 "Listen" button

"use client";

import { useState, useRef, useCallback } from "react";

const WEB_SPEECH_BCP47: Record<string, string> = {
  hi: "hi-IN", en: "en-IN", bn: "bn-IN", ta: "ta-IN",
  te: "te-IN", mr: "mr-IN", gu: "gu-IN", kn: "kn-IN",
  ml: "ml-IN", pa: "pa-IN", ur: "ur-PK",
};

export function usePageSpeaker(lang: string) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(
    typeof window !== "undefined" ? window.speechSynthesis : null
  );

  const stop = useCallback(() => {
    setIsSpeaking(false);
    synthRef.current?.cancel();
    if (audioRef.current) {
      audioRef.current.close().catch(() => {});
      audioRef.current = null;
    }
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!text) return;
      stop();
      setIsSpeaking(true);

      // ── Try Bhashini TTS via server proxy ──────────────────────
      try {
        const res = await fetch("/api/bhashini/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang, gender: "female" }),
        });
        if (res.ok) {
          const { audioBase64 } = await res.json();
          if (audioBase64) {
            const binaryStr = atob(audioBase64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

            const ctx = new AudioContext();
            audioRef.current = ctx;
            const buffer = await ctx.decodeAudioData(bytes.buffer);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.onended = () => { setIsSpeaking(false); ctx.close().catch(() => {}); };
            source.start(0);
            return;
          }
        }
      } catch (e) {
        console.warn("[PageSpeaker] Bhashini TTS failed, falling back:", e);
      }

      // ── SpeechSynthesis fallback ────────────────────────────────
      const synth = synthRef.current ?? window.speechSynthesis;
      if (!synth) { setIsSpeaking(false); return; }

      const bcp47 = WEB_SPEECH_BCP47[lang] ?? "hi-IN";
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = bcp47;
      utter.rate = 0.88;
      utter.pitch = 1.0;

      // Wait for voices (Chrome lazy-loads)
      const tryVoice = () => {
        const voices = synth.getVoices();
        const match = voices.find((v) => v.lang === bcp47 || v.lang.startsWith(lang));
        if (match) utter.voice = match;
      };
      tryVoice();
      if (synth.getVoices().length === 0) {
        window.speechSynthesis.addEventListener("voiceschanged", tryVoice, { once: true });
      }

      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      synth.speak(utter);
    },
    [lang, stop]
  );

  return { speak, stop, isSpeaking };
}
