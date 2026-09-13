"use client";

import { useEffect } from "react";

// Registers the service worker for PWA offline support.
// Client component — runs only in browser.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[ArogyaKiosk] Service worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[ArogyaKiosk] Service worker registration failed:", err);
        });
    }
  }, []);

  return null; // renders nothing
}
