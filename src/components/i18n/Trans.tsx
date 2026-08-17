"use client";

import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

interface TransProps {
  children: string;
}

/**
 * Translation component that auto-subscribes to language changes.
 * Use this for translating text in components.
 *
 * Example: <Trans>Hello</Trans> → "Xin chào" (in Vietnamese)
 */
export default function Trans({ children }: TransProps) {
  const language = useLanguageStore((state) => state.language);
  return <>{t(children, language)}</>;
}
