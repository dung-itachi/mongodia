/**
 * Pure relative-time formatter for notifications.
 *
 * Mirrors the behaviour of `src/lib/format.ts` `formatRelativeTime` from
 * the dashboard widgets so users see consistent timestamps across the
 * app. We avoid pulling that helper here because we'd rather not couple
 * this lightweight component to its `dashboard-activity.ts` types.
 */

import type { Language } from "@/store/language.store";

const LABELS: Record<Language, { just: string; min: string; hour: string; day: string }> = {
  vi: { just: "Vừa xong", min: "phút trước", hour: "giờ trước", day: "ngày trước" },
  en: { just: "Just now", min: "min ago", hour: "hours ago", day: "days ago" },
  mn: { just: "Дөнгөж сая", min: "мин өмнө", hour: "цагийн өмнө", day: "өдрийн өмнө" },
};

export function formatRelativeTime(input: string | Date, lang: Language = "vi"): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const ms = Date.now() - date.getTime();
  if (Number.isNaN(ms)) return "";

  const l = LABELS[lang] ?? LABELS.vi;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return l.just;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${l.min}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${l.hour}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${l.day}`;
  return date.toLocaleDateString(lang === "vi" ? "vi-VN" : lang === "mn" ? "mn-MN" : "en-US");
}
