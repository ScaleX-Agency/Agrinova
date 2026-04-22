// lib/formatters.ts
// Shared number + date formatters used across the dashboard.

/** Format LKR amounts: 1,234,567 → "LKR 1.2M", 45000 → "LKR 45K" */
export function formatLKR(value: number): string {
  if (value >= 1_000_000) return `LKR ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `LKR ${Math.round(value / 1_000)}K`;
  return `LKR ${Math.round(value).toLocaleString()}`;
}

/** Format LKR full with commas: 1234567 → "LKR 1,234,567.00" */
export function formatLKRFull(value: number): string {
  return `LKR ${value.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Short date: "2026-04-09" → "09 Apr" */
export function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

/** Medium date: "2026-04-09" → "09 Apr 2026" */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Percentage: 0.725 → "72.5%" */
export function fmtPct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}
