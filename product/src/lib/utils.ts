import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format 14-digit ABHA number as XX-XXXX-XXXX-XXXX */
export function formatABHA(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  if (digits.length <= 10)
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}-${digits.slice(10)}`;
}

/** Mask ABHA number for display: XX-XXXX-XXXX-1234 */
export function maskABHA(abha: string): string {
  const clean = abha.replace(/-/g, "");
  return `XX-XXXX-XXXX-${clean.slice(-4)}`;
}

/** Convert seconds to mm:ss */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Simple delay helper */
export const delay = (ms: number) =>
  new Promise<void>((res) => setTimeout(res, ms));
