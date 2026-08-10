/**
 * Format Utilities (Sprint 4.1 - Dashboard Foundation)
 * Updated for Sprint Settings — Exchange Rate / Currency = MNT (Tugrik)
 *
 * All public currency formatters display Mongolian Tugrik (₮ / MNT).
 * Do not duplicate formatting logic in components — import these helpers.
 */

/** Currency code used across the system. */
export const SYSTEM_CURRENCY_CODE = "MNT";

/** Display symbol. */
export const SYSTEM_CURRENCY_SYMBOL = "₮";

/** Human readable name. */
export const SYSTEM_CURRENCY_NAME = "Mongolian Tugrik";

/**
 * Format a number as Mongolian Tugrik (₮).
 * Uses Mongolian locale grouping (1,000 / 10,000).
 *
 * @example
 *   formatCurrency(350000) // "350,000 ₮"
 */
export function formatCurrency(value: number): string {
  const safeNumber = Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat("mn-MN", {
    maximumFractionDigits: 0,
  }).format(safeNumber);
  return `${formatted} ${SYSTEM_CURRENCY_SYMBOL}`;
}

/** Alias retained for clarity at call-sites. */
export const formatMNT = formatCurrency;

/**
 * Format a number with thousands separator (Mongolian style).
 */
export function formatNumber(value: number): string {
  const safeNumber = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("mn-MN").format(safeNumber);
}

/**
 * Compact format for large numbers (e.g., 1.2M, 500K).
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format an ISO date string as a relative time (e.g., "5 phút trước").
 */
export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  if (Number.isNaN(diffMs)) {
    return "";
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return "Vừa xong";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} phút trước`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} giờ trước`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} ngày trước`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} tháng trước`;
  }

  const years = Math.floor(months / 12);
  return `${years} năm trước`;
}
