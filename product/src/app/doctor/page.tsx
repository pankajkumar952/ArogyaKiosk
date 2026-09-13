"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { QueuePatient } from "@/lib/queue";

interface QueueData {
  stats: { total: number; waiting: number; calling: number; inConsultation: number; done: number };
  active: QueuePatient[];
  done: QueuePatient[];
  timestamp: number;
}

const SEV_STYLE: Record<string, string> = {
  mild: "bg-green-100 text-green-800 border-green-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200",
  severe: "bg-red-100 text-red-800 border-red-200",
  "very severe": "bg-red-200 text-red-900 border-red-300",
};

const STATUS_STYLE: Record<QueuePatient["status"], string> = {
  waiting: "bg-neutral-100 text-neutral-600",
  calling: "bg-secondary-100 text-secondary-700 animate-pulse",
  in_consultation: "bg-brand-100 text-brand-700",
  done: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<QueuePatient["status"], string> = {
  waiting: "Waiting",
  calling: "📢 Calling",
  in_consultation: "🩺 In Room",
  done: "✅ Done",
};

// ── Doctor auth — PIN verified server-side (never in client bundle) ──
export default function DoctorDashboard() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState(""); // HMAC-signed doctor token
  const [data, setData] = useState<QueueData | null>(null);
  const [selected, setSelected] = useState<QueuePatient | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pollingOk, setPollingOk] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Doctor annotations keyed by token
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState(false);

  // ── SSE real-time connection ──────────────────────────────────
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/queue/list", { cache: "no-store" });
      const json: QueueData = await res.json();
      setData(json);
      setLastUpdate(new Date());
      setPollingOk(true);
    } catch {
      setPollingOk(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;

    // Initial fetch
    fetchQueue();

    // SSE for real-time updates
    const es = new EventSource("/api/queue/list");
    es.onmessage = (e) => {
      try {
        const json: QueueData = JSON.parse(e.data);
        setData(json);
        setLastUpdate(new Date());
        setPollingOk(true);
      } catch { /* ignore malformed */ }
    };
    es.onerror = () => {
      setPollingOk(false);
      // SSE reconnects automatically — fallback poll
      if (intervalRef.current) return;
      intervalRef.current = setInterval(fetchQueue, 4000);
    };
    es.onopen = () => {
      setPollingOk(true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    return () => {
      es.close();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [authed, fetchQueue]);

  // ── Update patient status ─────────────────────────────────────
  const updateStatus = useCallback(async (token: string, status: QueuePatient["status"]) => {
    await fetch("/api/queue/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ token, status }),
    });
    await fetchQueue();
    // Update selected if it's the same patient
    setSelected((prev) =>
      prev?.token === token ? { ...prev, status } : prev
    );
  }, [fetchQueue, sessionToken]);

  // ── PIN screen ────────────────────────────────────────────────
  if (!authed) {
    async function handlePinSubmit() {
      if (!pin || pin.length < 4) return;
      setPinLoading(true);
      setPinError("");
      try {
        const res = await fetch("/api/auth/doctor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        const data = await res.json();
        if (data.success) {
          setAuthed(true);
          setSessionToken(data.sessionToken ?? "");
        } else {
          setPinError(data.error ?? "Incorrect PIN");
          setPin("");
        }
      } catch {
        setPinError("Network error. Try again.");
      }
      setPinLoading(false);
    }

    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl"
        >
          <div className="text-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-brand-600 flex items-center
                            justify-center text-white text-3xl mx-auto mb-4">🩺</div>
            <h1 className="text-xl font-black text-neutral-900">Doctor Dashboard</h1>
            <p className="text-sm text-neutral-400 mt-1">ArogyaKiosk · चिकित्सक पैनल</p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setPinError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handlePinSubmit(); }}
                placeholder="Enter PIN"
                className={cn(
                  "w-full border-2 rounded-xl px-4 py-3 text-center text-xl",
                  "tracking-widest focus:outline-none transition-colors",
                  pinError
                    ? "border-red-400 bg-red-50"
                    : "border-neutral-200 focus:border-brand-500"
                )}
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-red-600 text-center mt-1">{pinError}</p>
              )}
            </div>

            <button
              onClick={handlePinSubmit}
              disabled={pin.length < 4 || pinLoading}
              className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl
                         hover:bg-brand-700 transition-colors disabled:opacity-50
                         disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {pinLoading ? (
                <><span className="animate-spin">⏳</span> Verifying…</>
              ) : (
                "Enter Dashboard →"
              )}
            </button>
          </div>

          <p className="text-xs text-neutral-300 text-center mt-4">
            Authorised personnel only
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Main dashboard ────────────────────────────────────────────
  const calling = data?.active.filter((p) => p.status === "calling") ?? [];
  const waiting = data?.active.filter((p) => p.status === "waiting") ?? [];
  const inRoom = data?.active.filter((p) => p.status === "in_consultation") ?? [];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center
                            justify-center text-white text-lg">🩺</div>
            <div>
              <h1 className="font-black text-neutral-900 text-lg leading-none">
                Doctor Dashboard
              </h1>
              <p className="text-xs text-neutral-400">ArogyaKiosk · Live Patient Queue</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "h-2 w-2 rounded-full",
                pollingOk ? "bg-green-500 animate-pulse" : "bg-red-400"
              )} />
              <span className="text-xs text-neutral-500">
                {pollingOk ? `Live · ${lastUpdate?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Connection lost"}
              </span>
            </div>

            {/* Stats pills */}
            <div className="flex gap-2">
              {[
                { label: "Waiting", val: data?.stats.waiting ?? 0, color: "bg-neutral-100 text-neutral-700" },
                { label: "Calling", val: data?.stats.calling ?? 0, color: "bg-secondary-100 text-secondary-700" },
                { label: "In Room", val: data?.stats.inConsultation ?? 0, color: "bg-brand-100 text-brand-700" },
                { label: "Done", val: data?.stats.done ?? 0, color: "bg-green-100 text-green-700" },
              ].map((s) => (
                <span key={s.label} className={cn(
                  "text-xs font-bold px-3 py-1.5 rounded-full",
                  s.color
                )}>
                  {s.val} {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-12 gap-5">
        {/* ── LEFT: Queue list ───────────────────────────────────── */}
        <div className="col-span-5 space-y-3">
          <h2 className="font-bold text-neutral-700 text-sm uppercase tracking-wide">
            Patient Queue ({data?.active.length ?? 0})
          </h2>

          {/* Calling */}
          {calling.map((p) => (
            <motion.div
              key={p.token}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setSelected(p)}
              className={cn(
                "bg-secondary-50 border-2 border-secondary-300 rounded-2xl p-4",
                "cursor-pointer hover:shadow-md transition-all",
                selected?.token === p.token && "ring-2 ring-secondary-500"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-secondary-700">{p.token}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full
                                  bg-secondary-200 text-secondary-800 animate-pulse">
                  📢 Calling…
                </span>
              </div>
              <p className="text-sm font-semibold text-neutral-800 mt-1 truncate">
                {p.chiefComplaint}
              </p>
            </motion.div>
          ))}

          {/* In room */}
          {inRoom.map((p) => (
            <motion.div
              key={p.token}
              layout
              onClick={() => setSelected(p)}
              className={cn(
                "bg-brand-50 border-2 border-brand-200 rounded-2xl p-4",
                "cursor-pointer hover:shadow-md transition-all",
                selected?.token === p.token && "ring-2 ring-brand-500"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-brand-700">{p.token}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full
                                  bg-brand-100 text-brand-700">
                  🩺 In Room
                </span>
              </div>
              <p className="text-sm font-semibold text-neutral-800 mt-1 truncate">
                {p.chiefComplaint}
              </p>
            </motion.div>
          ))}

          {/* Waiting list */}
          <div className="space-y-2">
            <AnimatePresence>
              {waiting.map((p, i) => (
                <motion.div
                  key={p.token}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelected(p)}
                  className={cn(
                    "bg-white border border-neutral-200 rounded-2xl p-4",
                    "cursor-pointer hover:border-brand-300 hover:shadow-sm transition-all",
                    selected?.token === p.token && "border-brand-400 ring-1 ring-brand-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[3rem]">
                      <p className="text-xs text-neutral-400 font-semibold">#</p>
                      <p className="text-xl font-black text-neutral-900">{p.token}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-800 text-sm truncate">
                        {p.chiefComplaint}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-full border",
                          SEV_STYLE[p.severity] ?? SEV_STYLE.moderate
                        )}>
                          {p.severity}
                        </span>
                        {p.hasDocuments && (
                          <span className="text-xs text-neutral-400">📄 docs</span>
                        )}
                        {p.redFlags?.length > 0 && (
                          <span className="text-xs text-red-600 font-bold">🚨 flags</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(p.token, "calling");
                        }}
                        className="bg-secondary-500 text-white text-xs font-bold
                                   px-3 py-2 rounded-xl hover:bg-secondary-600 transition-colors"
                      >
                        📢 Call
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {data?.active.length === 0 && (
            <div className="text-center py-12 text-neutral-400">
              <p className="text-4xl mb-2">🎉</p>
              <p className="font-semibold">Queue is empty</p>
              <p className="text-sm">No patients waiting</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Selected patient detail ─────────────────────── */}
        <div className="col-span-7">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.token}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden"
              >
                {/* Patient header */}
                <div className="bg-brand-600 text-white px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-70 mb-1">Patient Token</p>
                      <p className="text-5xl font-black tracking-wide">{selected.token}</p>
                    </div>
                    <div className="text-right space-y-2">
                      <span className={cn(
                        "inline-block text-xs font-bold px-3 py-1.5 rounded-full",
                        STATUS_STYLE[selected.status]
                      )}>
                        {STATUS_LABEL[selected.status]}
                      </span>
                      <p className="text-xs opacity-60 block">
                        {selected.loginMethod === "abha" ? "🆔 ABHA"
                          : selected.loginMethod === "aadhaar" ? "🆔 Aadhaar"
                          : "👤 Anonymous"}
                        {selected.lang && ` · ${selected.lang.toUpperCase()}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {selected.status === "waiting" && (
                      <button onClick={() => updateStatus(selected.token, "calling")}
                        className="flex-1 bg-secondary-500 text-white font-bold py-3 rounded-xl
                                   hover:bg-secondary-600 transition-colors text-sm">
                        📢 Call Patient
                      </button>
                    )}
                    {selected.status === "calling" && (
                      <button onClick={() => updateStatus(selected.token, "in_consultation")}
                        className="flex-1 bg-brand-600 text-white font-bold py-3 rounded-xl
                                   hover:bg-brand-700 transition-colors text-sm">
                        🩺 Patient Arrived — Start
                      </button>
                    )}
                    {selected.status === "in_consultation" && (
                      <button onClick={() => updateStatus(selected.token, "done")}
                        className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl
                                   hover:bg-green-700 transition-colors text-sm">
                        ✅ Consultation Done
                      </button>
                    )}
                    {selected.status !== "done" && (
                      <button onClick={() => updateStatus(selected.token, "waiting")}
                        className="px-4 bg-neutral-100 text-neutral-600 font-bold py-3
                                   rounded-xl hover:bg-neutral-200 transition-colors text-sm">
                        ↩ Reset
                      </button>
                    )}
                  </div>

                  {/* Chief complaint */}
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">
                      Chief Complaint
                    </p>
                    <p className="text-xl font-bold text-neutral-900">
                      {selected.chiefComplaint}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className={cn(
                        "text-xs font-bold px-2.5 py-1 rounded-full border",
                        SEV_STYLE[selected.severity] ?? SEV_STYLE.moderate
                      )}>
                        {selected.severity}
                      </span>
                      {selected.hasDocuments && (
                        <span className="text-xs bg-purple-100 text-purple-700
                                          border border-purple-200 px-2.5 py-1 rounded-full font-bold">
                          📄 Documents attached
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ICD-10 */}
                  {selected.suggestedICD10 && (
                    <div className="flex items-center gap-3 bg-blue-50 rounded-2xl p-4
                                    border border-blue-100">
                      <span className="text-2xl">🏷️</span>
                      <div>
                        <p className="text-xs text-blue-500 font-bold uppercase">AI Suggested ICD-10</p>
                        <p className="font-bold text-blue-900">{selected.suggestedICD10}</p>
                      </div>
                    </div>
                  )}

                  {/* Red flags */}
                  {selected.redFlags?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-1.5">
                      <p className="text-sm font-bold text-red-800 flex items-center gap-2">
                        🚨 Red Flags — Urgent Attention Required
                      </p>
                      {selected.redFlags.map((flag) => (
                        <p key={flag} className="text-sm text-red-700 flex gap-2">
                          <span className="shrink-0 mt-0.5">⚠️</span> {flag}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* AYUSH note */}
                  {selected.ayushNote && (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                      <p className="text-xs font-bold text-green-700 uppercase mb-1">
                        🌿 AYUSH Clinical Note
                      </p>
                      <p className="text-sm text-green-900">{selected.ayushNote}</p>
                    </div>
                  )}

                  {/* ── Doctor Annotation ──────────────────────── */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                        📝 Doctor&apos;s Note / Annotation
                      </p>
                      <button
                        onClick={() => setEditingNote((v) => !v)}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-800
                                   underline transition-colors"
                      >
                        {editingNote ? "Done" : "Edit"}
                      </button>
                    </div>
                    {editingNote ? (
                      <textarea
                        value={notes[selected.token] ?? ""}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [selected.token]: e.target.value,
                          }))
                        }
                        placeholder="Add clinical notes, differential diagnosis, treatment plan…"
                        rows={4}
                        className="w-full text-sm text-neutral-800 bg-white border border-amber-300
                                   rounded-xl p-3 focus:outline-none focus:border-amber-500 resize-none"
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm text-amber-900 whitespace-pre-wrap">
                        {notes[selected.token] || (
                          <span className="text-amber-400 italic">
                            No notes yet — click Edit to add
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* ── Action: Print Summary ──────────────────── */}
                  <button
                    onClick={() => {
                      const note = notes[selected.token] ?? "";
                      const content = [
                        `ArogyaKiosk — Patient Summary`,
                        `Token: ${selected.token}`,
                        `Time: ${new Date(selected.submittedAt).toLocaleString("en-IN")}`,
                        `Language: ${selected.lang?.toUpperCase() ?? "—"}`,
                        ``,
                        `Chief Complaint: ${selected.chiefComplaint}`,
                        `Severity: ${selected.severity}`,
                        `ICD-10 (AI): ${selected.suggestedICD10 || "—"}`,
                        ``,
                        selected.redFlags?.length
                          ? `RED FLAGS:\n${selected.redFlags.map((f) => `  ⚠ ${f}`).join("\n")}`
                          : "",
                        ``,
                        selected.ayushNote
                          ? `AYUSH Note:\n  ${selected.ayushNote}`
                          : "",
                        ``,
                        note ? `Doctor Note:\n${note}` : "",
                        ``,
                        `Generated by ArogyaKiosk AI · ABDM Compliant`,
                      ]
                        .filter(Boolean)
                        .join("\n");
                      const win = window.open("", "_blank");
                      if (win) {
                        win.document.write(
                          `<pre style="font-family:monospace;font-size:14px;padding:24px;white-space:pre-wrap">${content}</pre>`
                        );
                        win.print();
                        win.close();
                      }
                    }}
                    className="w-full border-2 border-neutral-300 text-neutral-600 font-semibold
                               py-3 rounded-xl hover:bg-neutral-50 transition-colors text-sm
                               flex items-center justify-center gap-2"
                  >
                    🖨️ Print Patient Summary
                  </button>

                  {/* Submitted at */}
                  <p className="text-xs text-neutral-400 text-right">
                    Submitted:{" "}
                    {new Date(selected.submittedAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl border border-neutral-200 h-96
                           flex flex-col items-center justify-center gap-3 text-neutral-400"
              >
                <div className="text-5xl">👈</div>
                <p className="font-semibold">Select a patient to view details</p>
                <p className="text-sm">Click any patient in the queue</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recently done */}
          {data?.done && data.done.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wide mb-2">
                Recently Completed
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.done.map((p) => (
                  <button
                    key={p.token}
                    onClick={() => setSelected(p)}
                    className="bg-green-50 border border-green-200 text-green-800
                               font-bold text-sm px-3 py-1.5 rounded-xl
                               hover:bg-green-100 transition-colors"
                  >
                    ✅ {p.token}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
