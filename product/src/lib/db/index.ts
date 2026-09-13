// src/lib/db/index.ts
// Neon + Drizzle database client
// Uses HTTP driver — works on Cloudflare Pages edge runtime.
//
// IMPORTANT: neon() is initialized LAZILY so the Cloudflare Pages build runner
// does not crash when DATABASE_URL is absent in the build environment.
// DATABASE_URL only needs to be set as a runtime env var in Cloudflare Pages.

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Schema = typeof schema;

let _db: NeonHttpDatabase<Schema> | null = null;

function getDb(): NeonHttpDatabase<Schema> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "[ArogyaKiosk] DATABASE_URL environment variable is not set. " +
      "Add it in Cloudflare Pages → Settings → Environment Variables."
    );
  }
  const sql: NeonQueryFunction<false, false> = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}

// Proxy so all existing `db.insert(...)` etc. calls work unchanged
export const db = new Proxy({} as NeonHttpDatabase<Schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export * from "./schema";
