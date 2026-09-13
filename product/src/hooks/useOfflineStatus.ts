// src/hooks/useOfflineStatus.ts
// Real offline detection hook.
// Uses navigator.onLine + online/offline events + periodic fetch probe.
// Probe-based detection catches cases where navigator.onLine is true
// but the network gateway/ABDM/Gemini is unreachable.

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface OfflineStatus {
  isOnline: boolean;
  /** True when we've done at least one probe check */
  checked: boolean;
  /** Last time a successful probe was made */
  lastSeenOnlineAt: number | null;
}

const PROBE_URL = "/api/health"; // lightweight endpoint we'll also create
const PROBE_INTERVAL_MS = 30_000; // check every 30s when online
const PROBE_RETRY_MS = 5_000;    // retry every 5s when offline

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [checked, setChecked] = useState(false);
  const [lastSeenOnlineAt, setLastSeenOnlineAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const probe = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(PROBE_URL, {
        method: "HEAD",
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const scheduleProbe = useCallback(
    (currentlyOnline: boolean) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const ok = await probe();
        if (ok !== currentlyOnline) {
          setIsOnline(ok);
          if (ok) setLastSeenOnlineAt(Date.now());
        }
        setChecked(true);
        scheduleProbe(ok);
      }, currentlyOnline ? PROBE_INTERVAL_MS : PROBE_RETRY_MS);
    },
    [probe]
  );

  useEffect(() => {
    // Run an immediate probe on mount
    probe().then((ok) => {
      setIsOnline(ok);
      setChecked(true);
      if (ok) setLastSeenOnlineAt(Date.now());
      scheduleProbe(ok);
    });

    const handleOnline = () => {
      probe().then((ok) => {
        setIsOnline(ok);
        if (ok) setLastSeenOnlineAt(Date.now());
        scheduleProbe(ok);
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      scheduleProbe(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [probe, scheduleProbe]);

  return { isOnline, checked, lastSeenOnlineAt };
}
