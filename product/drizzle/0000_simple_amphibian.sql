CREATE TABLE "consents" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"data_capture" boolean DEFAULT false NOT NULL,
	"doctor_share" boolean DEFAULT false NOT NULL,
	"abha_link" boolean DEFAULT false NOT NULL,
	"audio_recording" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "history_records" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" jsonb,
	"is_mock" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"name" text,
	"gender" text,
	"year_of_birth" integer,
	"abha_number" text,
	"mobile" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scanned_docs" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"extracted" jsonb NOT NULL,
	"doc_type" text NOT NULL,
	"confidence" text DEFAULT 'medium' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"lang" text DEFAULT 'hi' NOT NULL,
	"mode" text DEFAULT 'combined' NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"submitted_at" timestamp,
	"doctor_reviewed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_records" ADD CONSTRAINT "history_records_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scanned_docs" ADD CONSTRAINT "scanned_docs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;