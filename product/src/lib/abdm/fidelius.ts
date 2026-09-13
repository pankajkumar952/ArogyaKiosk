// src/lib/abdm/fidelius.ts
// Fidelius-compatible FHIR bundle encryption for ABDM data transfer.
//
// Fidelius is the ABDM E2E encryption protocol using:
//   - Curve25519 (X25519) for key exchange
//   - AES-256-GCM for symmetric encryption
//   - Ephemeral key pairs per session
//
// References:
//   - https://github.com/SeventhGlitch/Fidelius
//   - ABDM HIE-CM data flow specification
//
// NOTE: Full Curve25519 requires the `@noble/curves` package or Node.js
// built-in `crypto.generateKeyPairSync` with 'x25519' (Node 18+).
// This implementation uses Node.js built-in crypto (X25519 + AES-256-GCM).

import crypto from "crypto";

export interface FideliusKeyPair {
  publicKey: string;  // Base64
  privateKey: string; // Base64 — never transmitted
}

export interface FideliusEncryptedBundle {
  /** Sender's ephemeral X25519 public key (Base64) */
  keyMaterial: {
    cryptoAlg: "ECDH";
    curve: "X25519";
    dhPublicKey: {
      expiry: string;      // ISO timestamp
      parameters: string | null;
      keyValue: string;    // Base64 sender public key
    };
    nonce: string;         // Base64, 32 bytes
  };
  /** AES-256-GCM encrypted FHIR bundle (Base64) */
  data: string;
}

/**
 * Generate an ephemeral X25519 key pair for Fidelius.
 * The private key is used once for key exchange and then discarded.
 */
export function generateFideliusKeyPair(): FideliusKeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("x25519");
  return {
    publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    privateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
  };
}

/**
 * Encrypt a FHIR bundle using Fidelius protocol.
 *
 * @param fhirBundleJson - JSON string of the FHIR R4 Bundle to encrypt
 * @param recipientPublicKeyBase64 - Recipient's X25519 public key (Base64 DER SPKI)
 * @param senderNonce - 32-byte nonce (Base64) — must be same as used in ABDM consent artefact
 * @param recipientNonce - 32-byte nonce from recipient (Base64) — from ABDM data flow request
 * @returns Fidelius-compatible encrypted envelope
 */
export function encryptFHIRBundle(
  fhirBundleJson: string,
  recipientPublicKeyBase64: string,
  senderNonce: string,
  recipientNonce: string
): FideliusEncryptedBundle {
  // Generate ephemeral sender key pair
  const { publicKey: senderPublicKeyObj, privateKey: senderPrivateKeyObj } =
    crypto.generateKeyPairSync("x25519");

  // Import recipient public key
  const recipientKeyDer = Buffer.from(recipientPublicKeyBase64, "base64");
  const recipientPublicKey = crypto.createPublicKey({
    key: recipientKeyDer,
    format: "der",
    type: "spki",
  });

  // ECDH: compute shared secret
  const sharedSecret = crypto.diffieHellman({
    privateKey: senderPrivateKeyObj,
    publicKey: recipientPublicKey,
  });

  // Fidelius XOR-nonce: sender_nonce XOR recipient_nonce (both 32 bytes)
  const senderNonceBytes = Buffer.from(senderNonce, "base64");
  const recipientNonceBytes = Buffer.from(recipientNonce, "base64");
  const combinedNonce = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    combinedNonce[i] = (senderNonceBytes[i] ?? 0) ^ (recipientNonceBytes[i] ?? 0);
  }

  // Derive AES key: HKDF(sharedSecret, combinedNonce, "Fidelius", 32)
  const aesKey = crypto.hkdfSync(
    "sha256",
    sharedSecret,
    combinedNonce,
    Buffer.from("Fidelius"),
    32
  );

  // AES-256-GCM encrypt
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(fhirBundleJson, "utf8")),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Combine: IV (12 bytes) + authTag (16 bytes) + ciphertext
  const encryptedData = Buffer.concat([iv, authTag, encrypted]).toString("base64");

  // Sender public key for recipient to derive the same shared secret
  const senderPublicKeyDer = senderPublicKeyObj
    .export({ type: "spki", format: "der" })
    .toString("base64");

  return {
    keyMaterial: {
      cryptoAlg: "ECDH",
      curve: "X25519",
      dhPublicKey: {
        expiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
        parameters: null,
        keyValue: senderPublicKeyDer,
      },
      nonce: senderNonce,
    },
    data: encryptedData,
  };
}

/**
 * Generate a cryptographically random 32-byte nonce (Base64).
 * Use a new nonce for every Fidelius encryption operation.
 */
export function generateFideliusNonce(): string {
  return crypto.randomBytes(32).toString("base64");
}

/**
 * DEV ADAPTER: Returns a mock Fidelius envelope when ABDM_ENV=dev.
 * Clearly marked as dev-only — never usable in real ABDM data flow.
 */
export function mockFideliusEnvelope(fhirBundleJson: string): FideliusEncryptedBundle {
  return {
    keyMaterial: {
      cryptoAlg: "ECDH",
      curve: "X25519",
      dhPublicKey: {
        expiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        parameters: null,
        keyValue: "DEV_MOCK_PUBLIC_KEY_NOT_REAL",
      },
      nonce: generateFideliusNonce(),
    },
    // In dev, we base64-encode the plaintext so the structure is correct
    // but the data is NOT encrypted. NEVER use this in production.
    data: Buffer.from(fhirBundleJson).toString("base64"),
  };
}
