// src/app/api/session/save/route.ts
// Saves a complete patient session to Neon DB at the end of the kiosk flow
// Called from summary/page.tsx when patient taps "Submit to Doctor"

import { NextRequest, NextResponse } from "next/server";
import { db, sessions, patients, historyRecords, scannedDocs, consents } from "@/lib/db";

// Inline cuid if package not available
function cuid() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      lang,
      mode,
      patient: patientData,
      consent: consentData,
      history,
      docs,
    } = body;

    const sessionId = cuid();
    const patientId = cuid();
    const historyId = cuid();
    const consentId = cuid();

    // 1. Create session
    await db.insert(sessions).values({
      id: sessionId,
      lang: lang ?? "hi",
      mode: mode ?? "combined",
      status: "submitted",
      submittedAt: new Date(),
    });

    // 2. Create patient
    if (patientData) {
      await db.insert(patients).values({
        id: patientId,
        sessionId,
        name: patientData.name ?? null,
        gender: patientData.gender ?? null,
        yearOfBirth: patientData.yearOfBirth ? parseInt(patientData.yearOfBirth) : null,
        abhaNumber: patientData.abhaNumber ?? null,
        mobile: patientData.mobile ?? null,
      });
    }

    // 3. Save history record
    if (history) {
      await db.insert(historyRecords).values({
        id: historyId,
        sessionId,
        messages: history.messages ?? [],
        summary: history.summary ?? null,
        isMock: !history.summary?.chiefComplaint,
      });
    }

    // 4. Save scanned documents (one row per doc)
    if (Array.isArray(docs) && docs.length > 0) {
      await db.insert(scannedDocs).values(
        docs.map((doc: Record<string, unknown>) => ({
          id: cuid(),
          sessionId,
          extracted: doc,
          docType: (doc.docType as string) ?? "other",
          confidence: (doc.confidence as string) ?? "medium",
        }))
      );
    }

    // 5. Save consent
    if (consentData) {
      await db.insert(consents).values({
        id: consentId,
        sessionId,
        dataCapture: consentData.dataCapture ?? false,
        doctorShare: consentData.doctorShare ?? false,
        abhaLink: consentData.abhaLink ?? false,
        audioRecording: consentData.audioRecording ?? false,
      });
    }

    return NextResponse.json({ success: true, sessionId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[session/save] error:", msg);
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }
}
