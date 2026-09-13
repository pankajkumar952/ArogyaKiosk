"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PRIMARY_LANGUAGES, LANGUAGES, type Language } from "@/lib/constants";

export default function LanguageSelectionPage() {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

  const displayLanguages = showAll ? LANGUAGES : PRIMARY_LANGUAGES;

  function handleSelect(lang: Language) {
    sessionStorage.setItem("mk_lang", lang.code);
    sessionStorage.setItem("mk_lang_name", lang.nameEn);
    router.push("/login");
  }

  return (
    <main className="min-h-dvh bg-white flex flex-col">
      {/* Logo + Hero */}
      <div className="flex flex-col items-center pt-10 pb-4 px-6">
        <Image
          src="/logo.png"
          alt="ArogyaKiosk Logo"
          width={96}
          height={96}
          className="rounded-full border-2 border-brand-100 shadow-sm"
          priority
        />
        <div className="mt-3 text-center">
          <span className="text-2xl font-extrabold text-brand-700">Medi</span>
          <span className="text-2xl font-extrabold text-secondary-500">Kiosk</span>
        </div>
        <p className="mt-1 text-neutral-400 text-sm">AI Clinical History Platform</p>
      </div>

      {/* Heading */}
      <div className="text-center px-6 mb-5">
        <h2 className="text-2xl font-bold text-neutral-900">अपनी भाषा चुनें</h2>
        <p className="text-neutral-400 mt-0.5 text-sm">Choose Your Language</p>
      </div>

      {/* Grid */}
      <div className="flex-1 px-5 pb-6 max-w-lg w-full mx-auto">
        <div className="grid grid-cols-3 gap-2.5">
          {displayLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang)}
              dir={lang.rtl ? "rtl" : "ltr"}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "rounded-2xl border-2 border-neutral-200 bg-white p-3.5",
                "min-h-[82px] cursor-pointer select-none",
                "hover:border-brand-400 hover:bg-brand-50 hover:shadow-sm",
                "active:scale-95 transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              )}
            >
              <span
                className={cn(
                  "font-bold text-neutral-900 leading-tight",
                  lang.code === "en" ? "text-base" : "text-lg"
                )}
              >
                {lang.name}
              </span>
              <span className="text-[11px] text-neutral-400">{lang.nameEn}</span>
              {lang.tier === 2 && (
                <span className="text-[9px] text-neutral-300 uppercase tracking-wide">beta</span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full mt-4 py-2.5 rounded-xl border border-neutral-200
                     text-brand-600 font-semibold text-sm
                     hover:bg-brand-50 hover:border-brand-300 transition-colors"
        >
          {showAll
            ? "↑ प्रमुख भाषाएं / Show Main Languages"
            : "+ सभी 22 भाषाएं / All 22 Languages"}
        </button>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-100 py-3 px-6 flex items-center
                      justify-center gap-5 text-xs text-neutral-300">
        <span>🔒 ABDM Certified</span>
        <span>·</span>
        <span>🇮🇳 Govt. of India</span>
        <span>·</span>
        <span>DPDP 2023</span>
      </div>
    </main>
  );
}
