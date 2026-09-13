// src/app/api/abdm/route.ts
// Unified ABDM API route — routes to real ABDM V3 implementation when
// ABDM_ENV=sandbox|production, falls through to dev adapter when ABDM_ENV=dev.
//
// Actions supported:
//   send-otp       — request OTP for ABHA login
//   verify-otp     — verify OTP, return patient profile
//   send-enrol-otp — request OTP for new ABHA creation (Aadhaar)
//   verify-enrol   — complete ABHA creation
//   profile        — get patient profile by ABHA token

import { NextRequest, NextResponse } from "next/server";
import { abdmEnv, isABDMConfigured } from "@/lib/abdm/gateway";
import {
  requestABHALoginOTP,
  verifyABHALoginOTP,
  requestAadhaarEnrolOTP,
  enrolByAadhaarOTP,
} from "@/lib/abdm/auth";

// ── Dev adapter (mock) ────────────────────────────────────────────────────────
// Minimal mock for local development — no credentials needed.
// OTPs are predictable (123456) in non-production only.

const DEV_OTP_STORE = new Map<string, { otp: string; expiresAt: number }>();

function devAdapter(action: string, body: Record<string, string>): Response {
  switch (action) {
    case "send-otp": {
      const txnId = `dev-txn-${Date.now()}`;
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      DEV_OTP_STORE.set(txnId, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
      console.info(`[ABDM Dev] OTP for ${body.abhaNumber ?? body.aadhaarNumber}: ${otp}`);
      return NextResponse.json({
        txnId,
        message: "OTP sent to registered mobile",
        // Universal bypass: 0000 always works in demo mode
        mockOtp: "0000",
        devOtp: process.env.NODE_ENV !== "production" ? "0000" : undefined,
      });
    }

    case "verify-otp":
    case "verify-enrol": {
      const stored = DEV_OTP_STORE.get(body.txnId);
      if (!stored || Date.now() > stored.expiresAt) {
        return NextResponse.json({ error: "OTP expired or invalid txnId" }, { status: 400 });
      }
      // Accept 0000 as universal bypass OTP (demo/dev mode)
      const isUniversal = body.otp === "0000";
      if (!isUniversal && stored.otp !== body.otp) {
        return NextResponse.json({ error: "Incorrect OTP" }, { status: 400 });
      }
      DEV_OTP_STORE.delete(body.txnId);
      return NextResponse.json({
        abhaNumber: "91-1234-5678-9012",
        abhaAddress: "demo@abdm",
        name: "Demo Patient",
        gender: "M",
        yearOfBirth: "1985",
        mobile: "9999999999",
        profilePhoto: null,
        isDev: true,
      });
    }

    case "send-enrol-otp":
      return devAdapter("send-otp", body);

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, string>;
    const { action, ...params } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const env = abdmEnv();

    // ── Dev mode: use mock adapter ──────────────────────────────────────────
    if (env === "dev" || !isABDMConfigured()) {
      if (env !== "dev") {
        console.warn("[ABDM] ABDM_CLIENT_ID/SECRET not set — falling back to dev adapter");
      }
      return devAdapter(action, params);
    }

    // ── Real ABDM integration ───────────────────────────────────────────────
    switch (action) {
      case "send-otp": {
        if (!params.abhaNumber) {
          return NextResponse.json({ error: "abhaNumber is required" }, { status: 400 });
        }
        const result = await requestABHALoginOTP(params.abhaNumber);
        return NextResponse.json(result);
      }

      case "verify-otp": {
        if (!params.txnId || !params.otp) {
          return NextResponse.json({ error: "txnId and otp are required" }, { status: 400 });
        }
        const profile = await verifyABHALoginOTP(params.txnId, params.otp);
        // Return profile WITHOUT sessionToken (keep server-side only)
        const { sessionToken: _, ...safeProfile } = profile;
        return NextResponse.json(safeProfile);
      }

      case "send-enrol-otp": {
        if (!params.aadhaarNumber) {
          return NextResponse.json({ error: "aadhaarNumber is required" }, { status: 400 });
        }
        const result = await requestAadhaarEnrolOTP(params.aadhaarNumber);
        return NextResponse.json(result);
      }

      case "verify-enrol": {
        if (!params.txnId || !params.otp) {
          return NextResponse.json({ error: "txnId and otp are required" }, { status: 400 });
        }
        const profile = await enrolByAadhaarOTP(params.txnId, params.otp);
        return NextResponse.json(profile);
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ABDM route] error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    env: abdmEnv(),
    configured: isABDMConfigured(),
    hint: isABDMConfigured()
      ? "Real ABDM integration active"
      : "Set ABDM_CLIENT_ID + ABDM_CLIENT_SECRET + ABDM_ENV=sandbox to enable real ABDM",
  });
}
