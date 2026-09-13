"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { t } from "@/lib/translations";
import { KioskScreen, KioskBody } from "@/components/kiosk/KioskLayout";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface TokenInfo {
  token: string;
  tokenIndex: number;
  position: number;
  estimatedWaitMins: number;
}

const SEV_ICON: Record<string, string> = {
  mild: "🟢", moderate: "🟡", severe: "🔴", "very severe": "🔴",
};

export default function CompletePage() {
  const router = useRouter();
  const [lang, setLang] = useState("hi");
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const submitToQueue = useCallback(async () => {
    try {
      // Read session data
      const historyRaw = sessionStorage.getItem("mk_history");
      const docsRaw = sessionStorage.getItem("mk_docs");
      const patientRaw = sessionStorage.getItem("mk_patient");
      const langCode = sessionStorage.getItem("mk_lang") ?? "hi";

      const history = historyRaw ? JSON.parse(historyRaw) : {};
      const summary = history.summary ?? {};
      const patient = patientRaw ? JSON.parse(patientRaw) : {};
      const hasDocs = docsRaw ? JSON.parse(docsRaw).length > 0 : false;

      const res = await fetch("/api/queue/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang: langCode,
          loginMethod: patient.loginMethod ?? "anonymous",
          patientName: patient.name,
          chiefComplaint: summary.chiefComplaint ?? "Not specified",
          severity: summary.severity ?? "moderate",
          suggestedICD10: summary.suggestedICD10 ?? "",
          redFlags: summary.redFlags ?? [],
          ayushNote: summary.ayushNote,
          hasDocuments: hasDocs,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTokenInfo(data);
        // Save token to session
        sessionStorage.setItem("mk_token", JSON.stringify(data));
      } else {
        setError("Could not join queue. Please see staff.");
      }
    } catch {
      setError("Network error. Please see staff at the desk.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLang(sessionStorage.getItem("mk_lang") ?? "hi");
    submitToQueue();
  }, [submitToQueue]);

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <KioskScreen>
        <KioskBody className="flex flex-col items-center justify-center gap-6 py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="h-14 w-14 rounded-full border-4 border-brand-100 border-t-brand-600"
          />
          <p className="text-neutral-500 font-semibold">कतार में जोड़ा जा रहा है…</p>
          <p className="text-xs text-neutral-400">Adding to doctor&apos;s queue…</p>
        </KioskBody>
      </KioskScreen>
    );
  }

  // ── Error ─────────────────────────────────────────────────────
  if (error) {
    return (
      <KioskScreen>
        <KioskBody className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="text-5xl">⚠️</div>
          <p className="text-base font-bold text-neutral-900 text-center">{error}</p>
          <Button variant="primary" size="lg" onClick={() => router.push("/")}>
            नया सत्र शुरू करें · New Session
          </Button>
        </KioskBody>
      </KioskScreen>
    );
  }

  // ── Success ───────────────────────────────────────────────────
  const wait = tokenInfo?.estimatedWaitMins ?? 0;
  const pos = tokenInfo?.position ?? 1;

  return (
    <KioskScreen className="bg-gradient-to-b from-brand-50 to-white">
      <KioskBody className="flex flex-col items-center gap-5 py-6">
        {/* Success checkmark */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center
                     text-white text-4xl shadow-lg"
        >
          ✓
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center space-y-1"
        >
          <h1 className="text-2xl font-black text-neutral-900">
            {t(lang, "allDone")}
          </h1>
          <p className="text-sm text-neutral-400">
            You're in the queue · कतार में आ गए हैं
          </p>
        </motion.div>

        {/* Big token card */}
        {tokenInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="w-full bg-brand-600 text-white rounded-3xl p-6 text-center
                       shadow-xl shadow-brand-200"
          >
            <p className="text-sm font-semibold opacity-70 mb-1">
              आपका टोकन नंबर · Your Token
            </p>
            <p className="text-7xl font-black tracking-wider mb-2">
              {tokenInfo.token}
            </p>
            <div className="flex justify-center gap-6 text-sm opacity-80">
              <div>
                <p className="text-xs opacity-60">Queue position</p>
                <p className="font-bold text-lg">#{pos}</p>
              </div>
              <div className="border-l border-white/30" />
              <div>
                <p className="text-xs opacity-60">Est. wait</p>
                <p className="font-bold text-lg">
                  {wait < 1 ? "Now" : `~${wait} min`}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="w-full space-y-2.5"
        >
          {[
            { icon: "🪑", hi: "बैठ जाएं और अपना टोकन याद रखें", en: "Take a seat and remember your token" },
            { icon: "📢", hi: "डॉक्टर आपको टोकन नंबर से बुलाएंगे", en: "Doctor will call your token number" },
            { icon: "📋", hi: "डॉक्टर के पास आपका सारांश पहले से पहुंच गया है", en: "Your medical history is already with the doctor" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.12 }}
              className="flex items-start gap-3 bg-white rounded-2xl
                         border border-neutral-100 px-4 py-3 shadow-sm"
            >
              <span className="text-2xl shrink-0">{item.icon}</span>
              <div>
                <p className="font-semibold text-neutral-900 text-sm">{item.hi}</p>
                <p className="text-xs text-neutral-400">{item.en}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* AYUSH branding strip */}
        <div className="w-full bg-green-50 border border-green-100 rounded-2xl
                        px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🌿</span>
          <div>
            <p className="text-xs font-bold text-green-800">AYUSH Health Record</p>
            <p className="text-xs text-green-600">
              आपका स्वास्थ्य इतिहास ABHA में सुरक्षित है
            </p>
          </div>
        </div>

        {/* New session button */}
        <Button
          variant="ghost"
          size="lg"
          fullWidth
          onClick={() => {
            sessionStorage.clear();
            router.push("/");
          }}
        >
          🔄 {t(lang, "newPatient")}
        </Button>
      </KioskBody>
    </KioskScreen>
  );
}
