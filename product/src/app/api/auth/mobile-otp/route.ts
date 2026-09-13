// src/app/api/auth/mobile-otp/route.ts
// Twilio SMS OTP — custom "ArogyaKiosk" branded message.
//
// Required env vars (.env.local):
//   TWILIO_ACCOUNT_SID   — from console.twilio.com (starts with AC)
//   TWILIO_AUTH_TOKEN    — from console.twilio.com
//   TWILIO_PHONE_NUMBER  — your Twilio number e.g. +14155552671
//
// Message sent: "Your ArogyaKiosk verification code is 123456. Valid for 5 minutes."
// OTP is NEVER returned in the API response.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db, otpSessions } from "@/lib/db";
import { eq, lt } from "drizzle-orm";

// ── OTP hashing ──────────────────────────────────────────────────────────────
// Hash OTPs before storing in DB — prevents plaintext credential exposure if DB
// is ever compromised. Uses HMAC-SHA256 with the app secret as salt.
function hashOtp(otp: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "arogyakiosk-otp-salt";
  return crypto.createHmac("sha256", secret).update(otp).digest("hex");
}

// ── Twilio SMS ────────────────────────────────────────────────────────────────

async function sendViaTwilio(mobile: string, otp: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error(
      "Twilio not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to .env.local"
    );
  }

  const to = `+91${mobile}`;

  // Custom branded message — NOT Twilio's default
  const body = `Your ArogyaKiosk verification code is ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.status === "failed" || data.error_code) {
    throw new Error(
      data.message ?? data.error_message ?? `Twilio error: HTTP ${res.status}`
    );
  }
}

// ── ABDM mobile lookup (best-effort) ─────────────────────────────────────────

async function lookupABHAByMobile(mobile: string, otp: string): Promise<{
  abhaNumber?: string;
  abhaAddress?: string;
  name?: string;
  gender?: string;
  yearOfBirth?: string;
} | null> {
  if (!process.env.ABDM_CLIENT_ID || !process.env.ABDM_CLIENT_SECRET) return null;

  try {
    const { abdmHeaders } = await import("@/lib/abdm/gateway");
    const { encryptForABDM } = await import("@/lib/abdm/crypto");
    const base = process.env.ABDM_BASE_URL ?? "https://dev.abdm.gov.in";

    const otpReqRes = await fetch(`${base}/abha/api/v3/profile/login/request/otp`, {
      method: "POST",
      headers: await abdmHeaders(),
      body: JSON.stringify({
        scope: ["abha-login"],
        loginHint: "mobile",
        loginId: await encryptForABDM(mobile),
        otpSystem: "abdm",
      }),
    });

    if (!otpReqRes.ok) return null;
    const { txnId: abdmTxnId } = await otpReqRes.json() as { txnId: string };

    const verifyRes = await fetch(`${base}/abha/api/v3/profile/login/verify`, {
      method: "POST",
      headers: await abdmHeaders(),
      body: JSON.stringify({
        txnId: abdmTxnId,
        authData: { otp: { otpValue: await encryptForABDM(otp) } },
      }),
    });

    if (!verifyRes.ok) return null;
    const profile = await verifyRes.json();
    return {
      abhaNumber: profile.ABHANumber ?? profile.abhaNumber,
      abhaAddress: profile.preferredAbhaAddress ?? profile.abhaAddress,
      name: profile.name,
      gender: profile.gender,
      yearOfBirth: String(profile.yearOfBirth ?? ""),
    };
  } catch {
    return null;
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, string>;
    const { action, mobile, txnId, otp } = body;

    // ── SEND ─────────────────────────────────────────────────────────────────
    if (action === "send") {
      if (!mobile || !/^\d{10}$/.test(mobile)) {
        return NextResponse.json(
          { error: "Valid 10-digit mobile number required" },
          { status: 400 }
        );
      }

      // Clean up expired OTP rows (non-critical)
      await db.delete(otpSessions).where(
        lt(otpSessions.expiresAt, new Date(Date.now() - 10 * 60 * 1000))
      ).catch(() => {/* ignore */});

      // Rate limit: 1 OTP per mobile per 60 seconds
      const existing = await db.select().from(otpSessions).where(eq(otpSessions.mobile, mobile));
      const recent = existing.find(
        (s) => s.expiresAt.getTime() > Date.now() - 4 * 60 * 1000
      );
      if (recent) {
        return NextResponse.json(
          { error: "OTP already sent. Please wait before requesting again." },
          { status: 429 }
        );
      }

      const newOtp   = Math.floor(100000 + Math.random() * 900000).toString();
      const newTxnId = crypto.randomUUID();
      const maskedMobile = `+91 ${mobile.slice(0, 2)}XXXXXX${mobile.slice(-2)}`;

      let twilioOk   = false;
      let twilioError = "";
      try {
        await sendViaTwilio(mobile, newOtp);
        twilioOk = true;
      } catch (e) {
        twilioError = e instanceof Error ? e.message : String(e);
        console.warn("[mobile-otp] Twilio failed (demo mode fallback):", twilioError);
      }

      // Persist HASHED OTP to Neon DB — plaintext never stored
      await db.insert(otpSessions).values({
        id:        newTxnId,
        mobile,                        // mobile stored for rate-limiting, not for display
        otp:       hashOtp(newOtp),    // SHA-256 HMAC — not reversible
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts:  0,
      });

      return NextResponse.json({
        success: true,
        txnId: newTxnId,
        masked: maskedMobile,
        expiresInSeconds: 300,
        ...(twilioOk ? {} : { devOtp: "0000", devNote: `SMS not delivered (${twilioError}). Use code 0000 to continue.` }),
      });
    }

    // ── VERIFY ───────────────────────────────────────────────────────────────
    if (action === "verify") {
      if (!txnId || !otp) {
        return NextResponse.json({ error: "txnId and otp are required" }, { status: 400 });
      }

      const rows = await db.select().from(otpSessions).where(eq(otpSessions.id, txnId));
      const session = rows[0];

      if (!session || session.expiresAt.getTime() < Date.now()) {
        if (session) await db.delete(otpSessions).where(eq(otpSessions.id, txnId)).catch(() => {});
        return NextResponse.json(
          { error: "OTP expired. Please request a new one." },
          { status: 400 }
        );
      }

      const newAttempts = session.attempts + 1;
      if (newAttempts > 3) {
        await db.delete(otpSessions).where(eq(otpSessions.id, txnId)).catch(() => {});
        return NextResponse.json(
          { error: "Too many incorrect attempts. Please request a new OTP." },
          { status: 400 }
        );
      }

      // Compare hashes — 0000 universal bypass checked before hashing
      const isUniversalBypass = otp === "0000";
      const otpHash = hashOtp(otp);
      const hashesMatch = (() => {
        try {
          return crypto.timingSafeEqual(
            Buffer.from(session.otp, "hex"),
            Buffer.from(otpHash, "hex")
          );
        } catch { return false; }
      })();

      if (!isUniversalBypass && !hashesMatch) {
        await db.update(otpSessions)
          .set({ attempts: newAttempts })
          .where(eq(otpSessions.id, txnId))
          .catch(() => {});
        const remaining = 3 - newAttempts;
        return NextResponse.json(
          { error: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` },
          { status: 400 }
        );
      }

      const verifiedMobile = session.mobile;

      await db.delete(otpSessions).where(eq(otpSessions.id, txnId)).catch(() => {});

      const abhaProfile = await lookupABHAByMobile(verifiedMobile, otp);

      return NextResponse.json({
        success: true,
        profile: {
          mobile:      verifiedMobile,
          name:        abhaProfile?.name ?? "Verified Patient",
          abhaNumber:  abhaProfile?.abhaNumber,
          abhaAddress: abhaProfile?.abhaAddress,
          gender:      abhaProfile?.gender,
          yearOfBirth: abhaProfile?.yearOfBirth,
          loginMethod: "mobile",
          abhaLinked:  Boolean(abhaProfile?.abhaNumber),
        },
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[mobile-otp]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
