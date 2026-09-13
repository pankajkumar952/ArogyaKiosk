// src/lib/abdm/auth.ts
// Real ABHA V3 authentication — OTP request + verification.
// Wraps POST /v3/profile/login/request/otp and POST /v3/profile/login/verify
//
// SECURITY CONTRACT:
//   - ABHA number and OTP are RSA-encrypted BEFORE leaving this function
//   - Raw Aadhaar / OTP values are NEVER stored, logged, or persisted
//   - Session tokens are stored in server memory only (not client)

import { encryptForABDM } from "./crypto";
import { abdmHeaders, invalidateGatewayToken } from "./gateway";

const BASE = () => process.env.ABDM_BASE_URL ?? "https://dev.abdm.gov.in";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ABHAProfile {
  abhaNumber: string;
  abhaAddress: string;
  name: string;
  gender: "M" | "F" | "O";
  yearOfBirth: string;
  mobile: string;
  /** Base64-encoded profile photo (may be absent) */
  profilePhoto?: string;
  /** ABDM session token — short-lived, not stored on client */
  sessionToken?: string;
}

export interface OTPRequestResult {
  txnId: string;
  message: string;
}

// ── ABHA Login (existing ABHA holder) ────────────────────────────────────────

/**
 * Step 1: Request OTP for ABHA number login.
 * The ABHA number is RSA-encrypted before transmission.
 * Returns txnId to use in verifyABHALoginOTP.
 */
export async function requestABHALoginOTP(
  abhaNumber: string
): Promise<OTPRequestResult> {
  const encryptedAbha = await encryptForABDM(abhaNumber);
  const headers = await abdmHeaders();

  const res = await fetch(
    `${BASE()}/abha/api/v3/profile/login/request/otp`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        scope: ["abha-login"],
        loginHint: "abha-number",
        loginId: encryptedAbha,
        otpSystem: "abdm",
      }),
    }
  );

  if (res.status === 401) {
    invalidateGatewayToken();
    throw new Error("ABDM gateway token expired — please retry");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ABDM OTP request failed: HTTP ${res.status} — ${body}`);
  }

  const data = await res.json();
  return {
    txnId: data.txnId,
    message: data.message ?? "OTP sent to registered mobile",
  };
}

/**
 * Step 2: Verify OTP and retrieve patient profile.
 * The OTP is RSA-encrypted before transmission.
 * Returns the patient's ABHA profile.
 */
export async function verifyABHALoginOTP(
  txnId: string,
  otp: string
): Promise<ABHAProfile> {
  const encryptedOTP = await encryptForABDM(otp);
  const headers = await abdmHeaders();

  const res = await fetch(
    `${BASE()}/abha/api/v3/profile/login/verify`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        txnId,
        authData: {
          otp: { otpValue: encryptedOTP },
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body?.message ?? `ABDM OTP verification failed: HTTP ${res.status}`
    );
  }

  const data = await res.json();

  return {
    abhaNumber: data.ABHANumber ?? data.abhaNumber,
    abhaAddress: data.preferredAbhaAddress ?? data.abhaAddress ?? "",
    name: data.name ?? "",
    gender: data.gender ?? "O",
    yearOfBirth: String(data.yearOfBirth ?? ""),
    mobile: data.mobile ?? "",
    profilePhoto: data.profilePhoto ?? undefined,
    sessionToken: data.token ?? undefined,
  };
}

// ── Aadhaar OTP (new ABHA creation) ──────────────────────────────────────────

/**
 * Request OTP for new ABHA creation via Aadhaar.
 * Aadhaar number is RSA-encrypted. Raw Aadhaar is NEVER stored.
 */
export async function requestAadhaarEnrolOTP(
  aadhaarNumber: string
): Promise<OTPRequestResult> {
  // Validate format before encrypting (12 digits, not stored after this call)
  if (!/^\d{12}$/.test(aadhaarNumber.replace(/\s/g, ""))) {
    throw new Error("Invalid Aadhaar format — must be 12 digits");
  }

  const encryptedAadhaar = await encryptForABDM(
    aadhaarNumber.replace(/\s/g, "")
  );
  const headers = await abdmHeaders();

  const res = await fetch(
    `${BASE()}/abha/api/v3/enrollment/request/otp`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        scope: ["abha-enrol"],
        loginHint: "aadhaar",
        loginId: encryptedAadhaar,
        otpSystem: "aadhaar",
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ABDM enrol OTP request failed: HTTP ${res.status} — ${body}`);
  }

  const data = await res.json();
  return { txnId: data.txnId, message: data.message ?? "OTP sent to Aadhaar-linked mobile" };
}

/**
 * Complete ABHA creation by verifying Aadhaar OTP.
 * Creates a new ABHA number for the patient.
 */
export async function enrolByAadhaarOTP(
  txnId: string,
  otp: string
): Promise<ABHAProfile> {
  const encryptedOTP = await encryptForABDM(otp);
  const headers = await abdmHeaders();

  const res = await fetch(
    `${BASE()}/abha/api/v3/enrollment/enrol/byAadhaar`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        authData: {
          otp: { timeStamp: new Date().toISOString(), txnId, otpValue: encryptedOTP },
        },
        consent: {
          code: "abha-enrollment",
          version: "1.4",
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body?.message ?? `ABHA enrolment failed: HTTP ${res.status}`
    );
  }

  const data = await res.json();
  return {
    abhaNumber: data.ABHANumber ?? data.abhaNumber,
    abhaAddress: data.preferredAbhaAddress ?? "",
    name: data.name ?? "",
    gender: data.gender ?? "O",
    yearOfBirth: String(data.yearOfBirth ?? ""),
    mobile: data.mobile ?? "",
    profilePhoto: data.profilePhoto ?? undefined,
  };
}
