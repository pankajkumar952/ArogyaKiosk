"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  KioskHeader,
  KioskScreen,
  KioskBody,
  KioskFooter,
} from "@/components/kiosk/KioskLayout";
import { Button, Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { t } from "@/lib/translations";
import type { DocType, ExtractedDoc } from "@/app/api/scan/extract/route";

// ── Document type options ────────────────────────────────────────
const DOC_TYPES: { id: DocType; icon: string; hi: string; en: string }[] = [
  { id: "prescription",      icon: "💊", hi: "पर्चा / नुस्खा",  en: "Prescription" },
  { id: "lab_report",        icon: "🧪", hi: "जाँच रिपोर्ट",    en: "Lab Report" },
  { id: "discharge_summary", icon: "🏥", hi: "छुट्टी का सारांश", en: "Discharge Summary" },
  { id: "xray_report",       icon: "🩻", hi: "X-Ray / रेडियोलॉजी", en: "X-Ray / Radiology" },
  { id: "other",             icon: "📄", hi: "अन्य दस्तावेज़",   en: "Other Document" },
];

type ScanStep = "select_type" | "capture" | "processing" | "review" | "done";

export default function ScanPage() {
  const router = useRouter();
  const [lang, setLang] = useState("hi");
  const [step, setStep] = useState<ScanStep>("select_type");
  const [selectedType, setSelectedType] = useState<DocType | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null); // base64
  const [capturedMime, setCapturedMime] = useState("image/jpeg");
  const [imagePreview, setImagePreview] = useState<string | null>(null); // object URL
  const [fileName, setFileName] = useState("");
  const [extracted, setExtracted] = useState<ExtractedDoc | null>(null);
  const [extractError, setExtractError] = useState("");
  const [scannedDocs, setScannedDocs] = useState<ExtractedDoc[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLang(sessionStorage.getItem("mk_lang") ?? "hi");
    const saved = sessionStorage.getItem("mk_docs");
    if (saved) {
      try { setScannedDocs(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // ── Image → base64 helper ────────────────────────────────────
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data URL prefix → pure base64
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // ── Handle file(s) selected (camera or gallery) ──────────────
  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;

      const file = files[0];

      // 100 MB size limit
      if (file.size > 100 * 1024 * 1024) {
        setExtractError(`File "${file.name}" is too large. Please use files under 100 MB.`);
        return;
      }

      // Detect MIME — some browsers leave file.type blank for PDFs
      let mime = file.type || "";
      if (!mime || mime === "application/octet-stream") {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (ext === "pdf") mime = "application/pdf";
        else if (["jpg", "jpeg"].includes(ext)) mime = "image/jpeg";
        else if (ext === "png") mime = "image/png";
        else if (ext === "webp") mime = "image/webp";
        else mime = "image/jpeg"; // safe default
      }

      setFileName(file.name);
      setCapturedMime(mime);

      // For PDFs show a placeholder preview; for images show a blob URL
      if (mime === "application/pdf") {
        setImagePreview(""); // no image preview for PDF
      } else {
        setImagePreview(URL.createObjectURL(file));
      }

      const b64 = await fileToBase64(file);
      setCapturedImage(b64);
      setExtractError("");
      setStep("capture");

      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [fileToBase64]
  );


  // ── Send to Gemini Vision API ────────────────────────────────
  const handleExtract = useCallback(async () => {
    if (!capturedImage || !selectedType) return;
    setStep("processing");
    setExtractError("");

    try {
      const res = await fetch("/api/scan/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: capturedImage,
          mimeType: capturedMime,
          docType: selectedType,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setExtractError(json.error ?? "Extraction failed");
        setStep("capture");
        return;
      }

      setExtracted(json.data as ExtractedDoc);
      setStep("review");
    } catch {
      setExtractError("Network error — please try again.");
      setStep("capture");
    }
  }, [capturedImage, capturedMime, selectedType]);

  // ── Confirm extracted doc → save → next doc or continue ──────
  const handleConfirm = useCallback(() => {
    if (!extracted) return;
    const updated = [...scannedDocs, extracted];
    setScannedDocs(updated);
    sessionStorage.setItem("mk_docs", JSON.stringify(updated));

    // Reset for potential next doc
    setCapturedImage(null);
    setImagePreview(null);
    setExtracted(null);
    setSelectedType(null);
    setStep("done");
  }, [extracted, scannedDocs]);

  function handleAddAnother() {
    setStep("select_type");
    setSelectedType(null);
  }

  function handleContinue() {
    router.push("/summary");
  }

  // ════════════════════════════════════════════════════════════════
  // STEP: Select document type
  // ════════════════════════════════════════════════════════════════
  if (step === "select_type") {
    return (
      <KioskScreen>
        <KioskHeader
          title={t(lang, "uploadDocuments")}
          subtitle="Upload Documents"
          onBack={() => router.push("/history")}
          progress={70}
          stepLabel="5 / 6"
        />
        <KioskBody className="space-y-3">
          <p className="text-sm text-neutral-500 text-center">
            {t(lang, "doYouHaveDocs")}
            <br />
            <span className="text-xs text-neutral-400">Do you have any old documents?</span>
          </p>

          {/* Doc type buttons */}
          <div className="grid grid-cols-1 gap-2.5">
            {DOC_TYPES.map((dt, i) => (
              <motion.button
                key={dt.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => { setSelectedType(dt.id); }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all",
                  "active:scale-[0.98]",
                  selectedType === dt.id
                    ? "border-brand-500 bg-brand-50"
                    : "border-neutral-200 bg-white hover:border-brand-200"
                )}
              >
                <span className="text-3xl shrink-0">{dt.icon}</span>
                <div>
                  <p className="font-bold text-neutral-900">{dt.hi}</p>
                  <p className="text-xs text-neutral-400">{dt.en}</p>
                </div>
                {selectedType === dt.id && (
                  <div className="ml-auto h-6 w-6 rounded-full bg-brand-600
                                   flex items-center justify-center text-white text-sm shrink-0">
                    ✓
                  </div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Already scanned docs */}
          {scannedDocs.length > 0 && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm font-semibold text-green-800">
                ✅ {scannedDocs.length} document{scannedDocs.length > 1 ? "s" : ""} scanned
              </p>
              {scannedDocs.map((d, i) => (
                <p key={i} className="text-xs text-green-700 mt-0.5">
                  {DOC_TYPES.find((dt) => dt.id === d.docType)?.icon}{" "}
                  {DOC_TYPES.find((dt) => dt.id === d.docType)?.en}
                  {d.confidence === "low" && " ⚠️ low confidence"}
                </p>
              ))}
            </div>
          )}
        </KioskBody>

        <KioskFooter className="space-y-2">
          {selectedType && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-1.5 p-4 rounded-2xl
                           bg-brand-600 text-white font-bold text-sm
                           active:scale-95 transition-all"
              >
                <span className="text-2xl">📷</span>
                <span>कैमरा / Camera</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-1.5 p-4 rounded-2xl
                           bg-secondary-500 text-white font-bold text-sm
                           active:scale-95 transition-all"
              >
                <span className="text-2xl">🖼️</span>
                <span>गैलरी / Gallery</span>
              </button>
            </div>
          )}
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onClick={handleContinue}
          >
            {scannedDocs.length > 0 ? "✅ Done — Continue to Summary" : "Skip — No Documents →"}
          </Button>
        </KioskFooter>

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelected}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileSelected}
        />
      </KioskScreen>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // STEP: Image captured — preview before extraction
  // ════════════════════════════════════════════════════════════════
  if (step === "capture") {
    return (
      <KioskScreen>
        <KioskHeader
          title={t(lang, "capturePhoto")}
          subtitle="Review Image"
          onBack={() => setStep("select_type")}
          progress={75}
          stepLabel="5 / 6"
        />
        <KioskBody className="flex flex-col items-center gap-4">
          {/* Preview */}
          {(imagePreview || capturedMime === "application/pdf") && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full rounded-2xl overflow-hidden border-2 border-neutral-200 bg-neutral-100"
            >
              {capturedMime === "application/pdf" ? (
                <div className="p-8 flex flex-col items-center justify-center text-center bg-white">
                  <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-3xl mb-3 shadow-inner">
                    📄
                  </div>
                  <p className="font-bold text-neutral-800 text-base max-w-xs truncate">
                    {fileName || "Medical Document (PDF)"}
                  </p>
                  <span className="mt-1.5 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    PDF Document Ready for OCR
                  </span>
                </div>
              ) : (
                <img
                  src={imagePreview ?? ""}
                  alt="Document preview"
                  className="w-full max-h-72 object-contain"
                />
              )}

            </motion.div>
          )}

          <div className="w-full bg-brand-50 rounded-xl p-3 text-center">
            <p className="text-sm font-semibold text-brand-900">
              {DOC_TYPES.find((d) => d.id === selectedType)?.icon}{" "}
              {DOC_TYPES.find((d) => d.id === selectedType)?.hi}
            </p>
            <p className="text-xs text-brand-600">
              {DOC_TYPES.find((d) => d.id === selectedType)?.en}
            </p>
          </div>

          {extractError && (
            <p className="text-sm text-red-600 text-center bg-red-50
                           rounded-xl px-4 py-2 border border-red-200">
              ⚠️ {extractError}
            </p>
          )}
        </KioskBody>

        <KioskFooter className="space-y-2">
          <Button variant="primary" size="xl" fullWidth onClick={handleExtract}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ArogyaKiosk" className="h-5 w-5 rounded-full object-cover inline-block mr-1.5 align-middle" />
            ArogyaKiosk से पढ़ें · Extract with ArogyaKiosk AI
          </Button>
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onClick={() => { setCapturedImage(null); setImagePreview(null); setStep("select_type"); }}
          >
            🔄 दूसरी फोटो लें · Retake
          </Button>
        </KioskFooter>
      </KioskScreen>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // STEP: AI Processing
  // ════════════════════════════════════════════════════════════════
  if (step === "processing") {
    return (
      <KioskScreen>
        <KioskBody className="flex flex-col items-center justify-center gap-6 py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="h-16 w-16 rounded-full border-4 border-brand-100 border-t-brand-600"
          />
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-neutral-900">ArogyaKiosk पढ़ रहा है…</h2>
            <p className="text-sm text-neutral-400">ArogyaKiosk AI is reading your document</p>
          </div>
          <div className="text-left w-full max-w-xs space-y-2">
            {[
              "Recognising text...",
              "Identifying medications...",
              "Extracting lab values...",
              "Mapping diagnoses...",
            ].map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.6 }}
                className="flex items-center gap-2 text-sm text-neutral-500"
              >
                <span className="text-brand-500">✓</span> {step}
              </motion.div>
            ))}
          </div>
        </KioskBody>
      </KioskScreen>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // STEP: Review extracted data
  // ════════════════════════════════════════════════════════════════
  if (step === "review" && extracted) {
    return (
      <KioskScreen>
        <KioskHeader
          title={t(lang, "extractedSuccessfully")}
          subtitle="Review Extracted Data"
          onBack={() => setStep("capture")}
          progress={80}
          stepLabel="5 / 6"
        />
        <KioskBody className="space-y-3">
          {/* ── ArogyaKiosk Document Read Confirmation ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3 bg-brand-600 text-white rounded-2xl px-4 py-3 shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="ArogyaKiosk" className="h-8 w-8 rounded-lg object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm leading-tight">
                ArogyaKiosk ने दस्तावेज़ पढ़ लिया है ✓
              </p>
              <p className="text-xs text-white/75 mt-0.5">
                Document successfully read by ArogyaKiosk AI
              </p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/70 shrink-0">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </motion.div>

          {/* Confidence badge */}
          <div className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold",
            extracted.confidence === "high"
              ? "bg-green-50 border-green-200 text-green-800"
              : extracted.confidence === "medium"
              ? "bg-secondary-50 border-secondary-200 text-secondary-800"
              : "bg-red-50 border-red-200 text-red-800"
          )}>
            {extracted.confidence === "high" ? "✅" : extracted.confidence === "medium" ? "⚠️" : "❌"}
            <span>
              AI Confidence: {extracted.confidence}
              {extracted.confidence === "low" && " — handwriting unclear, verify manually"}
            </span>
          </div>

          {/* Medications */}
          {extracted.medications?.length > 0 && (
            <Card className="p-4">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wide mb-2">
                💊 Medications ({extracted.medications.length})
              </p>
              <div className="space-y-2">
                {extracted.medications.map((med, i) => (
                  <div key={i} className="flex flex-col bg-neutral-50 rounded-xl p-3">
                    <p className="font-bold text-neutral-900">{med.name}</p>
                    <p className="text-sm text-neutral-600">
                      {[med.dose, med.frequency, med.duration].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Lab values */}
          {extracted.labValues?.length > 0 && (
            <Card className="p-4">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wide mb-2">
                🧪 Lab Values ({extracted.labValues.length})
              </p>
              <div className="space-y-1.5">
                {extracted.labValues.map((lv, i) => (
                  <div key={i} className="flex items-center justify-between
                                           bg-neutral-50 rounded-xl px-3 py-2">
                    <div>
                      <p className="font-semibold text-sm text-neutral-900">{lv.test}</p>
                      <p className="text-xs text-neutral-400">Ref: {lv.reference} {lv.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-neutral-900">{lv.value} <span className="text-xs font-normal">{lv.unit}</span></p>
                      {lv.flag && (
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-full",
                          lv.flag === "H" ? "bg-red-100 text-red-700"
                          : lv.flag === "L" ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                        )}>
                          {lv.flag === "H" ? "⬆ HIGH" : lv.flag === "L" ? "⬇ LOW" : "✓ NORMAL"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Diagnoses */}
          {extracted.diagnoses?.length > 0 && (
            <Card className="p-4">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wide mb-2">
                🏷️ Diagnoses
              </p>
              <div className="flex flex-wrap gap-2">
                {extracted.diagnoses.map((d, i) => (
                  <span key={i} className="bg-brand-50 text-brand-800 text-sm
                                             px-3 py-1 rounded-full border border-brand-200 font-medium">
                    {d}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Vitals */}
          {Object.values(extracted.vitals ?? {}).some(Boolean) && (
            <Card className="p-4">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wide mb-2">
                📊 Vitals
              </p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(extracted.vitals ?? {}).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="bg-neutral-50 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-neutral-400 font-semibold">{k}</p>
                    <p className="font-bold text-neutral-900 text-sm">{v}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Hospital / Doctor / Date */}
          {(extracted.hospitalName || extracted.doctorName || extracted.date) && (
            <Card className="p-3">
              <div className="space-y-1 text-sm">
                {extracted.hospitalName && <p><span className="text-neutral-400">Hospital:</span> {extracted.hospitalName}</p>}
                {extracted.doctorName && <p><span className="text-neutral-400">Doctor:</span> {extracted.doctorName}</p>}
                {extracted.date && <p><span className="text-neutral-400">Date:</span> {extracted.date}</p>}
                {extracted.notes && <p><span className="text-neutral-400">Notes:</span> {extracted.notes}</p>}
              </div>
            </Card>
          )}
        </KioskBody>

        <KioskFooter className="space-y-2">
          <Button variant="primary" size="xl" fullWidth onClick={handleConfirm}>
            ✅ Confirm &amp; Save
          </Button>
          <Button variant="ghost" size="lg" fullWidth onClick={() => setStep("capture")}>
            🔄 Retake Photo
          </Button>
        </KioskFooter>
      </KioskScreen>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // STEP: Done — add another or continue
  // ════════════════════════════════════════════════════════════════
  if (step === "done") {
    return (
      <KioskScreen>
        <KioskBody className="flex flex-col items-center justify-center gap-5 py-12">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl"
          >
            ✅
          </motion.div>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-neutral-900">
              दस्तावेज़ सेव हुआ!
            </h2>
            <p className="text-sm text-neutral-400">Document saved successfully</p>
          </div>

          {/* All docs so far */}
          <div className="w-full space-y-2">
            {scannedDocs.map((d, i) => (
              <div key={i} className="flex items-center gap-3 bg-green-50
                                       border border-green-200 rounded-xl px-4 py-3">
                <span className="text-xl">{DOC_TYPES.find((dt) => dt.id === d.docType)?.icon}</span>
                <div>
                  <p className="font-semibold text-green-900 text-sm">
                    {DOC_TYPES.find((dt) => dt.id === d.docType)?.en}
                  </p>
                  <p className="text-xs text-green-700">
                    {d.medications?.length > 0 && `${d.medications.length} medications · `}
                    {d.labValues?.length > 0 && `${d.labValues.length} lab values · `}
                    {d.diagnoses?.length > 0 && `${d.diagnoses.length} diagnoses`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </KioskBody>

        <KioskFooter className="space-y-2">
          <Button variant="primary" size="xl" fullWidth onClick={handleContinue}>
            → Summary देखें · View Summary
          </Button>
          <Button variant="outline" size="lg" fullWidth onClick={handleAddAnother}>
            ➕ और दस्तावेज़ · Add Another Document
          </Button>
        </KioskFooter>
      </KioskScreen>
    );
  }

  return null;
}
