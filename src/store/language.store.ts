import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "vi" | "en" | "mn";

export const LANGUAGE_LABELS: Record<Language, string> = {
  vi: "VN",
  en: "EN",
  mn: "MN",
};

export const LANGUAGE_NAMES: Record<Language, string> = {
  vi: "Tiếng Việt",
  en: "English",
  mn: "Монгол хэл",
};

export const DEFAULT_LANGUAGE: Language = "vi";

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE,
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: "language-storage",
    }
  )
);
