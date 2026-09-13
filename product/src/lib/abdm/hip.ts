// src/lib/abdm/hip.ts
// ABDM HIP (Health Information Provider) care-context management.
// After a doctor confirms a patient visit, we register the encounter
// as a care context with ABDM so the patient can pull their records.
//
// Requires: ABDM_CLIENT_ID, ABDM_CLIENT_SECRET, ABDM_FACILITY_ID

import { abdmHeaders, abdmEnv } from "./gateway";

const BASE = () => process.env.ABDM_BASE_URL ?? "https://dev.abdm.gov.in";

export interface CareContext {
  referenceNumber: string; // Unique visit/encounter ID
  display: string;         // Human-readable label e.g. "OPD Visit 09-Sep-2026"
}

export interface LinkCareContextRequest {
  abhaNumber: string;
  facilityId: string;
  patientId: string;       // Local MRN or session token
  careContexts: CareContext[];
}

export interface LinkCareContextResult {
  success: boolean;
  requestId: string;
  message: string;
}

/**
 * Register one or more care contexts for a patient after visit completion.
 * This notifies ABDM that new health records are available at this HIP.
 *
 * In dev mode, returns a mock success without calling ABDM.
 */
export async function linkCareContexts(
  req: LinkCareContextRequest
): Promise<LinkCareContextResult> {
  if (abdmEnv() === "dev") {
    return {
      success: true,
      requestId: `dev-req-${Date.now()}`,
      message: "[DEV] Care context link simulated — not sent to ABDM",
    };
  }

  const requestId = crypto.randomUUID();
  const headers = await abdmHeaders({ "X-Request-ID": requestId });

  const payload = {
    requestId,
    timestamp: new Date().toISOString(),
    link: {
      accessToken: req.abhaNumber, // ABDM uses ABHA number as patient token in this flow
      patient: {
        referenceNumber: req.patientId,
        display: "ArogyaKiosk Patient",
        careContexts: req.careContexts,
      },
    },
  };

  const res = await fetch(
    `${BASE()}/gateway/v0.5/links/link/add-contexts`,
    { method: "POST", headers, body: JSON.stringify(payload) }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HIP care-context link failed: HTTP ${res.status} — ${body}`);
  }

  // ABDM gateway responds 202 Accepted — actual status comes via callback
  return {
    success: true,
    requestId,
    message: "Care context link request accepted by ABDM gateway (async)",
  };
}

/**
 * Build a care context from a ArogyaKiosk session.
 */
export function buildCareContext(
  tokenNumber: string,
  date: Date = new Date()
): CareContext {
  const dateStr = date.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
  return {
    referenceNumber: `MK-${tokenNumber}-${date.toISOString().slice(0, 10)}`,
    display: `ArogyaKiosk OPD Visit — ${dateStr} (Token ${tokenNumber})`,
  };
}
