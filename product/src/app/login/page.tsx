"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  KioskHeader,
  KioskScreen,
  KioskBody,
} from "@/components/kiosk/KioskLayout";
import { Button, Divider } from "@/components/ui/primitives";
import { formatABHA } from "@/lib/utils";
import { t } from "@/lib/translations";

type LoginMethod = null | "mobile" | "abha" | "aadhaar" | "otp";
type OtpContext = "mobile" | "abha" | "aadhaar";

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState("hi");
  const [method, setMethod] = useState<LoginMethod>(null);
  const [otpContext, setOtpContext] = useState<OtpContext>("mobile");

  // Input state
  const [mobileInput, setMobileInput] = useState("");
  const [abhaInput, setAbhaInput] = useState("");
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [otpInput, setOtpInput] = useState("");

  // Flow state
  const [loading, setLoading] = useState(false);
  const [txnId, setTxnId] = useState("");
  const [otpError, setOtpError] = useState("");
  const [maskedMobile, setMaskedMobile] = useState("");

  useEffect(() => {
    setLang(sessionStorage.getItem("mk_lang") ?? "hi");
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function maskAadhaar(val: string) {
    const d = val.replace(/\D/g, "").slice(0, 12);
    if (d.length <= 4) return d;
    if (d.length <= 8) return `${d.slice(0, 4)} ${d.slice(4)}`;
    return `${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8)}`;
  }

  function formatMobile(val: string) {
    const d = val.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)} ${d.slice(5)}`;
  }

  // ── Mobile OTP send ───────────────────────────────────────────────────────
  async function handleSendMobileOTP() {
    const mobile = mobileInput.replace(/\D/g, "");
    if (mobile.length !== 10) return;
    setLoading(true);
    setOtpError("");
    try {
      const res = await fetch("/api/auth/mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", mobile }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setOtpError(data.error ?? "Failed to send OTP");
        setLoading(false);
        return;
      }
      setTxnId(data.txnId);
      setMaskedMobile(data.masked ?? `+91 ${mobile.slice(0, 2)}XXXXXX${mobile.slice(-2)}`);
      setOtpContext("mobile");
      // Demo fallback: show OTP on screen if SMS delivery failed (trial/DLT)
      if (data.devOtp) {
        setOtpInput(data.devOtp);
        setOtpError(`📋 Demo mode: SMS not delivered. OTP auto-filled → ${data.devOtp}`);
      }
      setMethod("otp");
    } catch {
      setOtpError("Network error. Please try again.");
    }
    setLoading(false);
  }

  // ── ABHA / Aadhaar OTP send (dev mock) ───────────────────────────────────
  async function handleSendABDMOTP(context: "abha" | "aadhaar") {
    setLoading(true);
    setOtpContext(context);
    setOtpError("");
    try {
      const res = await fetch("/api/abdm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-otp",
          abhaNumber: context === "abha" ? abhaInput.replace(/-/g, "") : undefined,
          aadhaarNumber: context === "aadhaar" ? aadhaarInput.replace(/\s/g, "") : undefined,
        }),
      });
      const data = await res.json();
      if (data.txnId) {
        setTxnId(data.txnId);
        // Sandbox always returns mockOtp — auto-fill for demo
        if (data.mockOtp) {
          setOtpInput(data.mockOtp);
          setOtpError(`📋 Demo sandbox: OTP auto-filled → ${data.mockOtp}`);
        }
        setMethod("otp");
      } else {
        setOtpError(data.message ?? "Failed to send OTP");
      }
    } catch {
      setOtpError("Network error.");
    }
    setLoading(false);
  }

  // ── OTP verify ────────────────────────────────────────────────────────────
  async function handleOTPVerify() {
    setLoading(true);
    setOtpError("");
    try {
      let profile: Record<string, string | boolean | undefined> = {};

      if (otpContext === "mobile") {
        const res = await fetch("/api/auth/mobile-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", txnId, otp: otpInput }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setOtpError(data.error ?? "Incorrect OTP");
          setLoading(false);
          return;
        }
        profile = data.profile;
      } else {
        const res = await fetch("/api/abdm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify-otp", txnId, otp: otpInput }),
        });
        const data = await res.json();
        if (data.error) {
          setOtpError(data.error);
          setLoading(false);
          return;
        }
        profile = {
          abhaNumber: data.abhaNumber,
          abhaAddress: data.abhaAddress,
          name: data.name ?? "Verified Patient",
          gender: data.gender === "M" ? "male" : data.gender === "F" ? "female" : "other",
          yearOfBirth: data.yearOfBirth,
          loginMethod: otpContext,
        };
      }

      sessionStorage.setItem("mk_patient", JSON.stringify(profile));
      setLoading(false);
      router.push("/consent");
    } catch {
      setOtpError("Verification failed. Please try again.");
      setLoading(false);
    }
  }

  function handleGuest() {
    sessionStorage.setItem(
      "mk_patient",
      JSON.stringify({ name: "Guest", loginMethod: "anonymous" })
    );
    router.push("/consent");
  }

  // ── OTP Screen ────────────────────────────────────────────────────────────
  if (method === "otp") {
    const contextLabel =
      otpContext === "mobile"
        ? maskedMobile
        : otpContext === "abha"
        ? `ABHA: ${formatABHA(abhaInput)}`
        : `Aadhaar: XXXX XXXX ${aadhaarInput.replace(/\D/g, "").slice(-4)}`;

    return (
      <KioskScreen>
        <KioskHeader
          title={t(lang, "enterOTP")}
          subtitle="Enter OTP"
          onBack={() => { setMethod(otpContext as LoginMethod); setOtpInput(""); }}
          progress={15}
          stepLabel="1 / 6"
        />
        <KioskBody className="flex flex-col items-center gap-6 justify-center py-10">
          <div className="text-center space-y-1">
            <p className="text-5xl">📱</p>
            <h2 className="text-xl font-bold text-neutral-900">
              {t(lang, "otpSentMessage")}
            </h2>
            <p className="text-sm text-neutral-400">
              {contextLabel}
            </p>
          </div>

          <div className="bg-neutral-50 rounded-xl px-5 py-2.5 text-sm text-neutral-600 text-center font-medium">
            {contextLabel}
          </div>

          <input
            type="tel"
            inputMode="numeric"
            maxLength={6}
            placeholder="— — — — — —"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={`w-52 text-center text-3xl tracking-[0.4em] font-bold
                       border-2 rounded-2xl py-4
                       focus:outline-none transition-colors
                       ${otpError ? "border-red-400 bg-red-50" : "border-neutral-300 focus:border-brand-500"}`}
            autoFocus
          />

          {otpError && (
            <p className="text-sm text-red-600 font-semibold text-center bg-red-50
                          border border-red-200 rounded-xl px-4 py-2 w-full max-w-xs">
              ⚠️ {otpError}
            </p>
          )}

          <Button
            variant="primary"
            size="xl"
            fullWidth
            className="max-w-xs"
            loading={loading}
            disabled={otpInput.length < 4}
            onClick={handleOTPVerify}
          >
            ✅ &nbsp;{t(lang, "verifyAndContinue")}
          </Button>

          <button
            className="text-brand-600 text-sm font-semibold hover:underline"
            onClick={() =>
              otpContext === "mobile" ? handleSendMobileOTP() : handleSendABDMOTP(otpContext)
            }
          >
            🔁 {t(lang, "resendOTP")}
          </button>
        </KioskBody>
      </KioskScreen>
    );
  }

  // ── Mobile Number Input ───────────────────────────────────────────────────
  if (method === "mobile") {
    const mobile = mobileInput.replace(/\D/g, "");
    return (
      <KioskScreen>
        <KioskHeader
          title="मोबाइल नंबर दर्ज करें"
          subtitle="Enter Mobile Number"
          onBack={() => setMethod(null)}
          progress={10}
          stepLabel="1 / 6"
        />
        <KioskBody className="flex flex-col items-center gap-6 justify-center py-10">
          <p className="text-6xl text-center">📱</p>
          <div className="w-full max-w-sm space-y-3">
            <p className="text-sm text-neutral-500 text-center">
              आपके मोबाइल नंबर पर OTP भेजा जाएगा
            </p>
            <p className="text-xs text-neutral-400 text-center">
              Your OTP will be sent to this number. If this number is also linked to ABHA, your health ID will be automatically fetched.
            </p>
            {/* Mobile input with +91 prefix */}
            <div className="flex items-center gap-2 border-2 border-neutral-300 rounded-2xl px-4 py-4 focus-within:border-brand-500 transition-colors">
              <span className="text-lg font-bold text-neutral-500 shrink-0">+91</span>
              <div className="w-px h-6 bg-neutral-300" />
              <input
                type="tel"
                inputMode="numeric"
                placeholder="XXXXX XXXXX"
                value={formatMobile(mobileInput)}
                onChange={(e) => setMobileInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="flex-1 text-xl tracking-widest font-bold focus:outline-none bg-transparent"
                autoFocus
              />
            </div>
            {otpError && (
              <p className="text-sm text-red-600 text-center">{otpError}</p>
            )}
          </div>
          <Button
            variant="primary"
            size="xl"
            fullWidth
            className="max-w-sm"
            loading={loading}
            disabled={mobile.length < 10}
            onClick={handleSendMobileOTP}
          >
            📲 &nbsp;OTP भेजें / Send OTP
          </Button>
        </KioskBody>
      </KioskScreen>
    );
  }

  // ── ABHA Number Input ─────────────────────────────────────────────────────
  if (method === "abha") {
    return (
      <KioskScreen>
        <KioskHeader
          title={t(lang, "enterABHANumber")}
          subtitle="Enter ABHA Number"
          onBack={() => setMethod(null)}
          progress={10}
          stepLabel="1 / 6"
        />
        <KioskBody className="flex flex-col items-center gap-6 justify-center py-10">
          <p className="text-6xl text-center">🪪</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center w-full max-w-sm">
            <p className="text-xs font-bold text-amber-700">🧪 Dev / Sandbox Mode</p>
            <p className="text-xs text-amber-600">Real ABDM integration available when ABDM_ENV=sandbox</p>
          </div>
          <div className="w-full max-w-sm space-y-3">
            <p className="text-xs text-neutral-400 text-center">Format: 91-XXXX-XXXX-XXXX</p>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="91-XXXX-XXXX-XXXX"
              value={formatABHA(abhaInput)}
              onChange={(e) => setAbhaInput(e.target.value.replace(/\D/g, "").slice(0, 14))}
              className="w-full text-center text-xl tracking-widest font-bold
                         border-2 border-neutral-300 rounded-2xl py-4 px-4
                         focus:border-brand-500 focus:outline-none transition-colors"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setAbhaInput("91845210934125")}
              className="text-xs bg-blue-50 hover:bg-blue-100 text-brand-700 border border-brand-200 rounded-full px-3 py-1.5 font-medium mx-auto block"
            >
              🧪 Use Sandbox ABHA: 91-8452-1093-4125
            </button>
          </div>
          {otpError && <p className="text-sm text-red-600 text-center">{otpError}</p>}
          <Button
            variant="primary"
            size="xl"
            fullWidth
            className="max-w-sm"
            loading={loading}
            disabled={abhaInput.replace(/\D/g, "").length < 14}
            onClick={() => handleSendABDMOTP("abha")}
          >
            📲 &nbsp;{t(lang, "sendOTP")}
          </Button>
        </KioskBody>
      </KioskScreen>
    );
  }

  // ── Aadhaar Number Input ──────────────────────────────────────────────────
  if (method === "aadhaar") {
    return (
      <KioskScreen>
        <KioskHeader
          title={t(lang, "enterAadhaarNumber")}
          subtitle="Enter Aadhaar Number"
          onBack={() => setMethod(null)}
          progress={10}
          stepLabel="1 / 6"
        />
        <KioskBody className="flex flex-col items-center gap-6 justify-center py-10">
          <p className="text-6xl text-center">🪪</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center w-full max-w-sm">
            <p className="text-xs font-bold text-amber-700">🧪 Dev / Sandbox Mode</p>
            <p className="text-xs text-amber-600">Real Aadhaar OTP requires ABDM_ENV=sandbox + NHA credentials</p>
          </div>
          <div className="w-full max-w-sm space-y-3">
            <input
              type="tel"
              inputMode="numeric"
              placeholder="XXXX XXXX XXXX"
              value={maskAadhaar(aadhaarInput)}
              onChange={(e) => setAadhaarInput(e.target.value.replace(/\D/g, "").slice(0, 12))}
              className="w-full text-center text-xl tracking-[0.3em] font-bold
                         border-2 border-neutral-300 rounded-2xl py-4 px-4
                         focus:border-secondary-500 focus:outline-none transition-colors"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setAadhaarInput("542189632145")}
              className="text-xs bg-orange-50 hover:bg-orange-100 text-secondary-700 border border-secondary-200 rounded-full px-3 py-1.5 font-medium mx-auto block"
            >
              🧪 Use Sandbox Aadhaar: 5421 8963 2145
            </button>
            <p className="text-xs text-neutral-400 text-center">
              🔒 {t(lang, "aadhaarNeverStored")}
            </p>
          </div>
          {otpError && <p className="text-sm text-red-600 text-center">{otpError}</p>}
          <Button
            variant="primary"
            size="xl"
            fullWidth
            className="max-w-sm"
            loading={loading}
            disabled={aadhaarInput.replace(/\D/g, "").length < 12}
            onClick={() => handleSendABDMOTP("aadhaar")}
          >
            📲 &nbsp;{t(lang, "sendOTP")}
          </Button>
        </KioskBody>
      </KioskScreen>
    );
  }

  // ── Default: Method Selection ─────────────────────────────────────────────
  return (
    <KioskScreen>
      <KioskHeader
        title={t(lang, "identifyYourself")}
        subtitle="Identify Yourself"
        onBack={() => router.push("/")}
        progress={5}
        stepLabel="1 / 6"
      />

      <KioskBody className="space-y-4">

        {/* ── THREE PRIMARY options (big cards, equal visual weight) ── */}
        <div className="grid grid-cols-1 gap-3">

          {/* 1. Mobile Number — REAL OTP (recommended) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
          >
            <button
              onClick={() => setMethod("mobile")}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2
                         border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400
                         active:scale-[0.98] transition-all duration-150 text-left relative"
            >
              {/* "Recommended" badge */}
              <span className="absolute top-2 right-3 text-[10px] font-bold uppercase
                               bg-green-600 text-white rounded-full px-2 py-0.5 tracking-wide">
                ✓ {t(lang, "recommendedBadge")}
              </span>
              <div className="h-14 w-14 rounded-2xl bg-green-600 flex items-center
                              justify-center text-white text-2xl shrink-0 shadow-sm">
                📱
              </div>
              <div className="flex-1">
                <p className="font-bold text-green-900 text-lg leading-tight">
                  {t(lang, "mobileNumber")} / Mobile Number
                </p>
                <p className="text-sm text-green-700 font-medium mt-0.5">{t(lang, "loginViaMobileOtp")}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {t(lang, "mobileOtpDesc")}
                </p>
              </div>
              <svg className="text-green-400 shrink-0" width="20" height="20"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </motion.div>

          {/* 2. ABHA Number */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <button
              onClick={() => setMethod("abha")}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2
                         border-brand-200 bg-brand-50 hover:bg-brand-100 hover:border-brand-400
                         active:scale-[0.98] transition-all duration-150 text-left"
            >
              <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center
                              justify-center text-white text-2xl shrink-0 shadow-sm">
                🪪
              </div>
              <div className="flex-1">
                <p className="font-bold text-brand-900 text-lg leading-tight">
                  {t(lang, "loginWithABHA")}
                </p>
                <p className="text-sm text-brand-700 font-medium mt-0.5">ABHA Number / Health ID</p>
                <p className="text-xs text-neutral-400 mt-1">{t(lang, "loginWithABHADesc")}</p>
              </div>
              <svg className="text-brand-400 shrink-0" width="20" height="20"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </motion.div>

          {/* 3. Aadhaar */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <button
              onClick={() => setMethod("aadhaar")}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2
                         border-secondary-200 bg-secondary-50 hover:bg-secondary-100
                         hover:border-secondary-400 active:scale-[0.98] transition-all
                         duration-150 text-left"
            >
              <div className="h-14 w-14 rounded-2xl bg-secondary-500 flex items-center
                              justify-center text-white text-2xl shrink-0 shadow-sm">
                🪪
              </div>
              <div className="flex-1">
                <p className="font-bold text-secondary-900 text-lg leading-tight">
                  {t(lang, "loginWithAadhaar")}
                </p>
                <p className="text-sm text-secondary-700 font-medium mt-0.5">Aadhaar OTP Login</p>
                <p className="text-xs text-neutral-400 mt-1">{t(lang, "loginWithAadhaarDesc")}</p>
              </div>
              <svg className="text-secondary-400 shrink-0" width="20" height="20"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </motion.div>
        </div>

        <Divider />

        {/* ── TWO SECONDARY options — smaller, lower visual hierarchy ── */}
        <div className="grid grid-cols-2 gap-2.5">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <a
              href="https://abha.abdm.gov.in/abha/v3/register"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-neutral-200
                         bg-white hover:bg-neutral-50 hover:border-neutral-300 active:scale-95
                         transition-all text-center w-full"
            >
              <span className="text-lg">✨</span>
              <p className="font-semibold text-neutral-600 text-xs leading-tight">{t(lang, "createABHA")}</p>
              <p className="text-[10px] text-neutral-400">Create New ABHA</p>
            </a>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.24 }}>
            <button
              onClick={handleGuest}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-neutral-200
                         bg-white hover:bg-neutral-50 hover:border-neutral-300 active:scale-95
                         transition-all text-center w-full"
            >
              <span className="text-lg">👤</span>
              <p className="font-semibold text-neutral-600 text-xs leading-tight">{t(lang, "continueWithoutABHA")}</p>
              <p className="text-[10px] text-neutral-400">Skip Login</p>
            </button>
          </motion.div>
        </div>

        {/* Privacy note */}
        <p className="text-xs text-neutral-400 text-center pt-1">
          🔒 Aadhaar is never stored — encrypted & discarded after OTP.
          <br />DPDP Act 2023 compliant.
        </p>
      </KioskBody>
    </KioskScreen>
  );
}
