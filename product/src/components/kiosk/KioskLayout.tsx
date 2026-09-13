"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

// ─── KioskHeader ────────────────────────────────────────────────
interface KioskHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  progress?: number;          // 0-100
  stepLabel?: string;         // e.g. "Step 2 of 6"
  rightSlot?: React.ReactNode;
  className?: string;
}

export function KioskHeader({
  title,
  subtitle,
  onBack,
  progress,
  stepLabel,
  rightSlot,
  className,
}: KioskHeaderProps) {
  return (
    <header
      className={cn(
        "w-full bg-white/95 backdrop-blur border-b border-neutral-100 px-6 py-4",
        className
      )}
    >
      <div className="max-w-2xl mx-auto">
        {/* Top row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Go back"
                className="flex items-center justify-center h-10 w-10 rounded-xl text-neutral-500
                           hover:bg-neutral-100 hover:text-neutral-800 transition-colors"
              >
                <svg
                  width="20" height="20" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              {title && (
                <h1 className="text-lg font-bold text-neutral-900 leading-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-neutral-500 leading-tight">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stepLabel && (
              <span className="text-sm text-neutral-400 font-medium">
                {stepLabel}
              </span>
            )}
            {rightSlot}
          </div>
        </div>

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="mt-3 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        )}
      </div>
    </header>
  );
}

// ─── KioskScreen — Full-page wrapper ────────────────────────────
interface KioskScreenProps {
  children: React.ReactNode;
  className?: string;
  centered?: boolean;
}

export function KioskScreen({
  children,
  className,
  centered,
}: KioskScreenProps) {
  const { isOnline, checked } = useOfflineStatus();

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "min-h-dvh bg-white flex flex-col",
        centered && "items-center justify-center",
        className
      )}
    >
      {/* Offline banner — shown only when probe confirms no connectivity */}
      {checked && !isOnline && (
        <div
          role="alert"
          aria-live="assertive"
          className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-sm text-amber-800"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M1 6s4-4 11-4 11 4 11 4" /><path d="M5 10s2.5-2 7-2 7 2 7 2" /><line x1="12" y1="20" x2="12.01" y2="20" /><line x1="1" y1="1" x2="23" y2="23" />
          </svg>
          <span>
            <strong>ऑफ़लाइन / Offline</strong> — आवाज़ सुविधा बंद है। टच करके जवाब दें।
            &nbsp;/&nbsp;Voice unavailable. Please use touch to answer.
          </span>
        </div>
      )}
      {children}
    </motion.main>
  );
}


// ─── KioskBody — Scrollable content area ────────────────────────
export function KioskBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto px-6 py-6",
        "max-w-2xl w-full mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── KioskFooter — Sticky action bar ─────────────────────────────
export function KioskFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <footer
      className={cn(
        "sticky bottom-0 bg-white/95 backdrop-blur border-t border-neutral-100",
        "px-6 py-4 safe-bottom",
        className
      )}
    >
      <div className="max-w-2xl mx-auto">{children}</div>
    </footer>
  );
}

// ─── ArogyaKioskLogo ───────────────────────────────────────────────
export function ArogyaKioskLogo({
  size = "md",
  className,
  showText = true,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}) {
  const imgSizes = { sm: 36, md: 48, lg: 72 };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/logo.png"
        alt="ArogyaKiosk"
        width={imgSizes[size]}
        height={imgSizes[size]}
        className="rounded-full border border-brand-100 shadow-sm"
      />
      {showText && (
        <div className="leading-none">
          <span className={cn("font-extrabold text-brand-700", textSizes[size])}>
            Medi
          </span>
          <span className={cn("font-extrabold text-secondary-500", textSizes[size])}>
            Kiosk
          </span>
        </div>
      )}
    </div>
  );
}

// ─── AudioWave — animated wave visualiser ───────────────────────
export function AudioWave({
  active,
  bars = 5,
  className,
}: {
  active: boolean;
  bars?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 h-8", className)}>
      {Array.from({ length: bars }, (_, i) => i + 1).map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-brand-600"
          animate={
            active
              ? {
                  height: ["8px", "28px", "8px"],
                  opacity: [0.4, 1, 0.4],
                }
              : { height: "8px", opacity: 0.3 }
          }
          transition={
            active
              ? {
                  duration: 1.2,
                  delay: i * 0.15,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
      <span className="text-5xl">{icon}</span>
      <div>
        <h3 className="text-lg font-semibold text-neutral-800">{title}</h3>
        {description && (
          <p className="text-neutral-500 text-sm mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
