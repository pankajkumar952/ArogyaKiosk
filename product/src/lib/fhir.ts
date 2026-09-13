// src/lib/fhir.ts
// FHIR R4 Bundle generator — produces spec-compliant health records
// Works WITHOUT ABDM credentials — generates proper bundles locally
// When ABDM credentials arrive → push these bundles to ABHA HIE via POST /fhir/r4

import { StructuredSummary } from "@/app/api/history/chat/route";

// ── Types ─────────────────────────────────────────────────────────
export interface PatientSession {
  abhaNumber?: string;
  name?: string;
  gender?: string;
  yearOfBirth?: string;
  lang?: string;
}

// ── FHIR R4 Bundle builder ────────────────────────────────────────
export function buildFHIRBundle(
  patient: PatientSession,
  summary: StructuredSummary,
  sessionId: string
): object {
  const now = new Date().toISOString();
  const patientId = `patient-${sessionId}`;
  const encounterId = `encounter-${sessionId}`;
  const conditionId = `condition-${sessionId}`;
  const compositionId = `composition-${sessionId}`;

  // ── Patient resource ───────────────────────────────────────────
  const patientResource = {
    resourceType: "Patient",
    id: patientId,
    meta: { profile: ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient"] },
    identifier: patient.abhaNumber
      ? [{ system: "https://healthid.ndhm.gov.in", value: patient.abhaNumber }]
      : [],
    name: patient.name ? [{ text: patient.name }] : [],
    gender: patient.gender ?? "unknown",
    birthDate: patient.yearOfBirth ?? undefined,
    communication: [
      {
        language: {
          coding: [{ system: "urn:ietf:bcp:47", code: patient.lang ?? "hi" }],
        },
        preferred: true,
      },
    ],
  };

  // ── Encounter resource ─────────────────────────────────────────
  const encounterResource = {
    resourceType: "Encounter",
    id: encounterId,
    status: "finished",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "AMB",
      display: "Ambulatory OPD",
    },
    subject: { reference: `Patient/${patientId}` },
    period: { start: now },
    reasonCode: [
      {
        coding: [{ system: "http://snomed.info/sct", display: summary.chiefComplaint }],
        text: summary.chiefComplaint,
      },
    ],
    serviceProvider: {
      display: "AYUSH Healthcare Facility",
    },
  };

  // ── Condition resource (diagnosis) ─────────────────────────────
  const conditionResource = {
    resourceType: "Condition",
    id: conditionId,
    clinicalStatus: {
      coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }],
    },
    verificationStatus: {
      coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "provisional" }],
    },
    code: summary.suggestedICD10
      ? {
          coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: summary.suggestedICD10 }],
          text: summary.chiefComplaint,
        }
      : { text: summary.chiefComplaint },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    recordedDate: now,
    note: [
      {
        text: `Severity: ${summary.severity ?? "moderate"}. ${
          summary.redFlags?.length
            ? "RED FLAGS: " + summary.redFlags.join("; ")
            : "No red flags."
        }`,
      },
    ],
  };

  // ── Medication statements from summary ────────────────────────
  // currentMedications may be a plain string (comma-separated) or a string[] after future refactor
  const medList: string[] = (() => {
    const raw = summary.currentMedications;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as string[];
    return (raw as string)
      .split(/[,;،、\n]+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  })();

  const medicationStatements = medList.map((med: string, i: number) => ({
    resourceType: "MedicationStatement",
    id: `med-${sessionId}-${i}`,
    status: "active",
    medicationCodeableConcept: { text: med },
    subject: { reference: `Patient/${patientId}` },
    context: { reference: `Encounter/${encounterId}` },
    dateAsserted: now,
  }));

  // ── Observation — AYUSH Prakriti note ────────────────────────
  const ayushObservation = summary.ayushNote
    ? [
        {
          resourceType: "Observation",
          id: `obs-ayush-${sessionId}`,
          status: "final",
          category: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/observation-category",
                  code: "social-history",
                },
              ],
            },
          ],
          code: { text: "AYUSH Clinical Note" },
          subject: { reference: `Patient/${patientId}` },
          valueString: summary.ayushNote,
          issued: now,
        },
      ]
    : [];

  // ── Composition (the document wrapper) ────────────────────────
  const compositionResource = {
    resourceType: "Composition",
    id: compositionId,
    meta: {
      profile: [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord",
      ],
    },
    status: "preliminary",
    type: {
      coding: [
        { system: "http://snomed.info/sct", code: "371530004", display: "Clinical consultation report" },
      ],
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    date: now,
    author: [{ display: "ArogyaKiosk AI — Vaidya Sahayak" }],
    title: "OPD Pre-Consultation History Record",
    section: [
      {
        title: "Chief Complaint",
        text: { status: "generated", div: `<div>${summary.chiefComplaint}</div>` },
        entry: [{ reference: `Condition/${conditionId}` }],
      },
      ...(medicationStatements.length > 0
        ? [
            {
              title: "Current Medications",
              entry: medicationStatements.map((_: object, i: number) => ({
                reference: `MedicationStatement/med-${sessionId}-${i}`,
              })),
            },
          ]
        : []),
      ...(summary.ayushNote
        ? [
            {
              title: "AYUSH Clinical Note",
              entry: [{ reference: `Observation/obs-ayush-${sessionId}` }],
            },
          ]
        : []),
    ],
  };

  // ── FHIR Bundle (document type) ───────────────────────────────
  return {
    resourceType: "Bundle",
    id: `bundle-${sessionId}`,
    meta: { lastUpdated: now },
    type: "document",
    timestamp: now,
    entry: [
      { fullUrl: `Patient/${patientId}`, resource: patientResource },
      { fullUrl: `Encounter/${encounterId}`, resource: encounterResource },
      { fullUrl: `Condition/${conditionId}`, resource: conditionResource },
      ...medicationStatements.map((ms: object, i: number) => ({
        fullUrl: `MedicationStatement/med-${sessionId}-${i}`,
        resource: ms,
      })),
      ...ayushObservation.map((obs: object) => ({
        fullUrl: `Observation/obs-ayush-${sessionId}`,
        resource: obs,
      })),
      { fullUrl: `Composition/${compositionId}`, resource: compositionResource },
    ],
  };
}
