/// <reference types="vitest/globals" />
// Global test setup — runs before every test file

// Set env vars needed by all tests
process.env.NEXTAUTH_SECRET = "test-secret-32chars-abcdefghijkl";
process.env.DOCTOR_PIN = "1234";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://test:test@localhost/test";

// Suppress known build-time noise from console during tests
const _origError = console.error;
const _origWarn = console.warn;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? "");
    if (!msg.includes("[doctor-auth] CRITICAL")) _origError(...args);
  };
  console.warn = (...args: unknown[]) => {
    const msg = String(args[0] ?? "");
    if (!msg.includes("allow-scripts")) _origWarn(...args);
  };
});
afterAll(() => {
  console.error = _origError;
  console.warn = _origWarn;
});
