// public/sw.js
// MediKiosk Progressive Web App Service Worker
// Strategy:
//   - Static assets (_next/static/*, images, fonts): Cache-First
//   - API routes (/api/*): Network-First with offline fallback JSON
//   - HTML pages: Network-First with offline page fallback
//
// NOTE on offline ASR/TTS:
//   Bhashini ASR/TTS requires network. When offline, the UI falls back to
//   touch-only mode and browser SpeechSynthesis (via useOfflineStatus hook).
//   Sherpa-onnx / CTranslate2 local inference requires native binaries in a
//   separate edge container — NOT implemented in this service worker.

const CACHE_NAME = "medikiosk-v2";
const OFFLINE_PAGE = "/offline.html";

const STATIC_PATTERNS = [
  /^\/_next\/static\//,
  /\.(?:woff2?|ttf|otf|eot)$/,
  /\.(?:png|jpg|jpeg|webp|avif|svg|ico)$/,
];

// These routes are never cached — always pass through to network
const NEVER_CACHE = [
  "/api/health",
  "/api/queue/list", // SSE stream
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(["/", "/manifest.json"]).catch(() => {})
    )
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((p) => url.pathname.startsWith(p))) return;

  // Static assets — Cache-First
  if (STATIC_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // API routes — Network-First, 503 JSON when offline
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstAPI(request));
    return;
  }

  // HTML pages — Network-First with offline fallback
  event.respondWith(networkFirstPage(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstAPI(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(
      JSON.stringify({ error: "offline", message: "No network connection" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match("/") ?? new Response("Offline", { status: 503 });
  }
}
