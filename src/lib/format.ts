/**
 * Format Utilities (Sprint 4.1 - Dashboard Foundation)
 *
 * Common formatting helpers for numbers and currency.
 */

/**
 * Format a number as Vietnamese Dong currency.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number with thousands separator.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
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
