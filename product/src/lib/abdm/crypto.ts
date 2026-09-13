// src/lib/abdm/crypto.ts
// RSA-OAEP encryption using the ABDM public certificate.
// ABDM requires all sensitive values (Aadhaar number, OTP) to be encrypted
// with the public key fetched from GET /v3/profile/public/certificate
// before transmission. We NEVER store raw Aadhaar numbers.
//
// This module runs server-side only (Next.js API routes).
// Node.js `crypto` module is used — NOT the Web Crypto API.

import crypto from "crypto";

// Certificate cache — ABDM public key is stable but we refresh every 24h
let _cachedCert: string | null = null;
let _certFetchedAt = 0;
const CERT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch ABDM RSA public certificate from the sandbox or production endpoint.
 * Cached for 24 hours per session.
 * Returns PEM-formatted public key string.
 */
export async function fetchABDMPublicCert(): Promise<string> {
  const now = Date.now();
  if (_cachedCert && now - _certFetchedAt < CERT_TTL_MS) {
    return _cachedCert;
  }

  const base = process.env.ABDM_BASE_URL ?? "https://dev.abdm.gov.in";
  const url = `${base}/abha/api/v3/profile/public/certificate`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`ABDM cert fetch failed: HTTP ${res.status}`);
  }

  // ABDM returns the key as plain text PEM
  const pem = await res.text();
  if (!pem.includes("PUBLIC KEY") && !pem.includes("CERTIFICATE")) {
    throw new Error("ABDM returned unexpected certificate format");
  }

  _cachedCert = pem;
  _certFetchedAt = now;
  return pem;
}

/**
 * Encrypt a plaintext value using ABDM RSA public key (OAEP + SHA-256).
 * Used for: Aadhaar number, OTP, ABHA number before sending to ABDM APIs.
 *
 * @param plainText - The sensitive value to encrypt (e.g., OTP digits, Aadhaar number)
 * @param publicKeyPem - RSA public key PEM from fetchABDMPublicCert()
 * @returns Base64-encoded ciphertext
 */
export function rsaEncrypt(plainText: string, publicKeyPem: string): string {
  const buffer = Buffer.from(plainText, "utf8");
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    buffer
  );
  return encrypted.toString("base64");
}

/**
 * Convenience: fetch ABDM cert and encrypt in one call.
 * This is the function called by auth/enroll routes.
 */
export async function encryptForABDM(plainText: string): Promise<string> {
  const cert = await fetchABDMPublicCert();
  return rsaEncrypt(plainText, cert);
}

/** Invalidate the cert cache (e.g., after an encryption failure) */
export function invalidateCertCache(): void {
  _cachedCert = null;
  _certFetchedAt = 0;
}
