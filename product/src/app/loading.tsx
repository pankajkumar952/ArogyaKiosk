// src/app/loading.tsx
// Next.js App Router built-in loading UI —
// shown automatically as a Suspense fallback during page transitions.

import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white gap-6">
      {/* Logo */}
      <div className="relative">
        <Image
          src="/logo.png"
          alt="ArogyaKiosk"
          width={96}
          height={96}
          className="rounded-full border-2 border-blue-100 shadow-sm"
          priority
        />
        {/* Spinning ring around logo */}
        <span
          className="absolute inset-0 rounded-full border-4 border-transparent
                     border-t-blue-600 border-r-orange-400 animate-spin"
          style={{ animationDuration: "900ms" }}
        />
      </div>

      {/* Wordmark */}
      <div className="text-center">
        <p className="text-2xl font-extrabold">
          <span className="text-blue-700">Medi</span>
          <span className="text-orange-500">Kiosk</span>
        </p>
        <p className="text-sm text-neutral-400 mt-1">AI Clinical History Platform</p>
      </div>

      {/* Dot-pulse loader */}
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-bounce"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: "700ms" }}
          />
        ))}
      </div>
    </div>
  );
}
