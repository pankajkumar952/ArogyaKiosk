// src/lib/queue.ts
// In-memory patient token queue — singleton across serverless invocations
// Production upgrade: swap Map for Vercel KV (Redis) — same interface

export interface QueuePatient {
  token: string;           // e.g. "A-042"
  tokenIndex: number;      // 1-based sequential number
  lang: string;
  loginMethod: "abha" | "aadhaar" | "anonymous";
  patientName?: string;
  chiefComplaint: string;
  severity: "mild" | "moderate" | "severe" | "very severe" | string;
  suggestedICD10: string;
  redFlags: string[];
  ayushNote?: string;
  hasDocuments: boolean;
  submittedAt: string;     // ISO timestamp
  status: "waiting" | "calling" | "in_consultation" | "done";
}

// ── Global singleton (survives warm serverless restarts) ──────────
declare global {
  // eslint-disable-next-line no-var
  var __mkQueue: QueuePatient[] | undefined;
  // eslint-disable-next-line no-var
  var __mkTokenCounter: number | undefined;
}

function getQueue(): QueuePatient[] {
  if (!global.__mkQueue) global.__mkQueue = [];
  return global.__mkQueue;
}

function getCounter(): number {
  if (!global.__mkTokenCounter) global.__mkTokenCounter = 0;
  return global.__mkTokenCounter;
}

function incrementCounter(): number {
  if (!global.__mkTokenCounter) global.__mkTokenCounter = 0;
  global.__mkTokenCounter += 1;
  return global.__mkTokenCounter;
}

// ── Public API ────────────────────────────────────────────────────
export function addToQueue(patient: Omit<QueuePatient, "token" | "tokenIndex" | "submittedAt" | "status">): QueuePatient {
  const index = incrementCounter();
  const letter = String.fromCharCode(65 + Math.floor((index - 1) / 99) % 26); // A, B, C...
  const num = String(((index - 1) % 99) + 1).padStart(3, "0");
  const token = `${letter}-${num}`;

  const entry: QueuePatient = {
    ...patient,
    token,
    tokenIndex: index,
    submittedAt: new Date().toISOString(),
    status: "waiting",
  };

  getQueue().push(entry);
  return entry;
}

export function getQueueSnapshot(): QueuePatient[] {
  return [...getQueue()];
}

export function getWaitingCount(): number {
  return getQueue().filter((p) => p.status === "waiting").length;
}

export function updatePatientStatus(token: string, status: QueuePatient["status"]): boolean {
  const q = getQueue();
  const idx = q.findIndex((p) => p.token === token);
  if (idx === -1) return false;
  q[idx].status = status;
  return true;
}

export function getPatientByToken(token: string): QueuePatient | undefined {
  return getQueue().find((p) => p.token === token);
}

export function getQueueStats() {
  const q = getQueue();
  return {
    total: q.length,
    waiting: q.filter((p) => p.status === "waiting").length,
    calling: q.filter((p) => p.status === "calling").length,
    inConsultation: q.filter((p) => p.status === "in_consultation").length,
    done: q.filter((p) => p.status === "done").length,
  };
}
