// src/lib/db/schema.ts
// Drizzle ORM schema for ArogyaKiosk
// Tables: sessions, patients, history_records, scanned_documents

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

// ── Session ─────────────────────────────────────────────────────────────────
// One kiosk session = one patient visit
export const sessions = pgTable("sessions", {
  id:           text("id").primaryKey(),                    // cuid
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
  lang:         text("lang").notNull().default("hi"),       // mk_lang
  mode:         text("mode").notNull().default("combined"), // mk_mode
  status:       text("status").notNull().default("in_progress"),
  // "in_progress" | "submitted" | "reviewed"
  submittedAt:  timestamp("submitted_at"),
  doctorReviewedAt: timestamp("doctor_reviewed_at"),
});

// ── Patient ──────────────────────────────────────────────────────────────────
export const patients = pgTable("patients", {
  id:           text("id").primaryKey(),                    // cuid
  sessionId:    text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  name:         text("name"),
  gender:       text("gender"),
  yearOfBirth:  integer("year_of_birth"),
  abhaNumber:   text("abha_number"),
  mobile:       text("mobile"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

// ── History Record ────────────────────────────────────────────────────────────
// The AI-structured summary from the voice/touch interview
export const historyRecords = pgTable("history_records", {
  id:           text("id").primaryKey(),                    // cuid
  sessionId:    text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  // Raw chat messages stored as JSONB
  messages:     jsonb("messages").notNull().default([]),
  // Structured AI summary — matches StructuredSummary interface
  summary:      jsonb("summary"),
  isMock:       boolean("is_mock").notNull().default(false),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

// ── Scanned Documents ─────────────────────────────────────────────────────────
// Each document uploaded during the scan step
export const scannedDocs = pgTable("scanned_docs", {
  id:           text("id").primaryKey(),                    // cuid
  sessionId:    text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  // Extracted data from Gemini Vision — matches ExtractedDoc interface
  extracted:    jsonb("extracted").notNull(),
  docType:      text("doc_type").notNull(),
  confidence:   text("confidence").notNull().default("medium"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

// ── Consent ───────────────────────────────────────────────────────────────────
export const consents = pgTable("consents", {
  id:           text("id").primaryKey(),                    // cuid
  sessionId:    text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  dataCapture:  boolean("data_capture").notNull().default(false),
  doctorShare:  boolean("doctor_share").notNull().default(false),
  abhaLink:     boolean("abha_link").notNull().default(false),
  audioRecording: boolean("audio_recording").notNull().default(false),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

// ── Queue Entry ───────────────────────────────────────────────────────────────
// Live doctor queue — persisted to DB so serverless cold starts don't lose data
export const queueEntries = pgTable("queue_entries", {
  id:             text("id").primaryKey(),                  // cuid
  token:          text("token").notNull(),                  // e.g. "A-042"
  tokenIndex:     integer("token_index").notNull(),         // sequential
  lang:           text("lang").notNull().default("hi"),
  loginMethod:    text("login_method").notNull().default("anonymous"),
  patientName:    text("patient_name"),
  chiefComplaint: text("chief_complaint").notNull().default("Not specified"),
  severity:       text("severity").notNull().default("moderate"),
  suggestedICD10: text("suggested_icd10").notNull().default(""),
  redFlags:       jsonb("red_flags").notNull().default([]),
  ayushNote:      text("ayush_note"),
  hasDocuments:   boolean("has_documents").notNull().default(false),
  status:         text("status").notNull().default("waiting"),
  // "waiting" | "calling" | "in_consultation" | "done"
  submittedAt:    timestamp("submitted_at").defaultNow().notNull(),
  updatedAt:      timestamp("updated_at").defaultNow().notNull(),
});

// ── OTP Sessions ──────────────────────────────────────────────────────────────
// Persisted so serverless cold-starts don't lose in-flight OTPs.
// Application-level TTL: rows with expiresAt < now() are treated as expired.
export const otpSessions = pgTable("otp_sessions", {
  id:         text("id").primaryKey(),             // random UUID = session token
  mobile:     text("mobile").notNull(),             // 10-digit number, no country code
  otp:        text("otp").notNull(),                // 6-digit plaintext (demo); hash in prod
  expiresAt:  timestamp("expires_at").notNull(),    // created_at + 5 min
  attempts:   integer("attempts").notNull().default(0),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});

