// src/lib/abdm/gateway.ts
// ABDM Gateway session token management.
// All ABDM API calls require a bearer token obtained from
// POST /gateway/v3/sessions using client credentials.
// Token is cached for 23 minutes (expires at 24 min).

let _gatewayToken: string | null = null;
let _tokenFetchedAt = 0;
const TOKEN_TTL_MS = 23 * 60 * 1000; // 23 minutes

export interface GatewayTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
}

/**
 * Get a valid ABDM gateway access token.
 * Fetches a new one if the cached token is expired.
 * Requires ABDM_CLIENT_ID and ABDM_CLIENT_SECRET env vars.
 */
export async function getGatewayToken(): Promise<string> {
  const now = Date.now();
  if (_gatewayToken && now - _tokenFetchedAt < TOKEN_TTL_MS) {
    return _gatewayToken;
  }

  const clientId = process.env.ABDM_CLIENT_ID;
  const clientSecret = process.env.ABDM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "ABDM_CLIENT_ID and ABDM_CLIENT_SECRET are required for real ABDM integration. " +
      "Set ABDM_ENV=dev to use the mock adapter."
    );
  }

  const base = process.env.ABDM_BASE_URL ?? "https://dev.abdm.gov.in";
  const url = `${base}/gateway/v3/sessions`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId,
      clientSecret,
      grantType: "client_credentials",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ABDM gateway session failed: HTTP ${res.status} — ${body}`);
  }

  const data: GatewayTokenResponse = await res.json();
  _gatewayToken = data.accessToken;
  _tokenFetchedAt = now;
  return _gatewayToken;
}

/** Build standard ABDM request headers with bearer token */
export async function abdmHeaders(
  extraHeaders: Record<string, string> = {}
): Promise<Record<string, string>> {
  const token = await getGatewayToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-CM-ID": "sbx", // sandbox CM; use "abdm" in production
    ...extraHeaders,
  };
}

/** Invalidate cached token (call after a 401 response) */
export function invalidateGatewayToken(): void {
  _gatewayToken = null;
  _tokenFetchedAt = 0;
}

/** Whether real ABDM credentials are configured */
export function isABDMConfigured(): boolean {
  return Boolean(process.env.ABDM_CLIENT_ID && process.env.ABDM_CLIENT_SECRET);
}

/** Current ABDM environment */
export function abdmEnv(): "dev" | "sandbox" | "production" {
  const env = process.env.ABDM_ENV ?? "dev";
  if (env === "sandbox" || env === "production") return env;
  return "dev";
}
