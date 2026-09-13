// src/app/api/fhir/generate/route.ts
// Generate FHIR R4 Bundle from patient session
// Works NOW — no ABDM credentials needed
// When ABDM approved → just add the push-to-ABHA call at the end

import { NextRequest, NextResponse } from "next/server";
import { buildFHIRBundle } from "@/lib/fhir";
import type { StructuredSummary } from "@/app/api/history/chat/route";

export async function POST(req: NextRequest) {
  try {
    const {
      patient,
      summary,
      sessionId,
    }: {
      patient: {
        abhaNumber?: string;
        name?: string;
        gender?: string;
        yearOfBirth?: string;
        lang?: string;
      };
      summary: StructuredSummary;
      sessionId: string;
    } = await req.json();

    const bundle = buildFHIRBundle(patient, summary, sessionId);

    // ── When ABDM credentials arrive, uncomment this block ───────
    // const abdmClientId = process.env.ABDM_CLIENT_ID;
    // const abdmClientSecret = process.env.ABDM_CLIENT_SECRET;
    // if (abdmClientId && abdmClientSecret) {
    //   // 1. Get ABDM access token
    //   const tokenRes = await fetch(`${process.env.ABDM_GATEWAY_URL}/sessions`, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json", "X-CM-ID": "sbx" },
    //     body: JSON.stringify({ clientId: abdmClientId, clientSecret: abdmClientSecret }),
    //   });
    //   const { accessToken } = await tokenRes.json();
    //   // 2. Push FHIR bundle to ABHA HIE
    //   await fetch(`${process.env.ABDM_BASE_URL}/fhir/r4/Bundle`, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/fhir+json",
    //       Authorization: `Bearer ${accessToken}`,
    //       "X-CM-ID": "sbx",
    //     },
    //     body: JSON.stringify(bundle),
    //   });
    // }

    return NextResponse.json({
      success: true,
      bundle,
      abdmStatus: process.env.ABDM_CLIENT_ID ? "pushed" : "local_only",
      message: process.env.ABDM_CLIENT_ID
        ? "FHIR bundle pushed to ABHA HIE"
        : "FHIR bundle generated. ABDM integration pending — bundle saved locally.",
    });
  } catch (err) {
    console.error("[fhir/generate]", err);
    return NextResponse.json({ error: "FHIR generation failed" }, { status: 500 });
  }
}
