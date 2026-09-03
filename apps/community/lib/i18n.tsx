"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readString, storageKeys, writeString } from "@/lib/storage";
import { MESSAGES, type MessageKey } from "@/lib/messages";

export type LocaleId = "en" | "sw" | "mix" | "sheng" | "kik" | "luo" | "kam" | "luy" | "nubi";

export type LocaleMeta = {
  id: LocaleId;
  native: string;
  english: string;
  group: "everyday" | "indigenous";
  htmlLang: string;
};

export const LOCALES: LocaleMeta[] = [
  { id: "en", native: "English", english: "English", group: "everyday", htmlLang: "en" },
  { id: "sw", native: "Kiswahili", english: "Swahili", group: "everyday", htmlLang: "sw" },
  { id: "mix", native: "English + Kiswahili", english: "Mixed", group: "everyday", htmlLang: "sw" },
  { id: "sheng", native: "Sheng", english: "Sheng", group: "everyday", htmlLang: "sw" },
  { id: "kik", native: "Gĩkũyũ", english: "Kikuyu", group: "indigenous", htmlLang: "ki" },
  { id: "luo", native: "Dholuo", english: "Luo", group: "indigenous", htmlLang: "luo" },
  { id: "kam", native: "Kĩkamba", english: "Kamba", group: "indigenous", htmlLang: "kam" },
  { id: "luy", native: "Luhya", english: "Luhya", group: "indigenous", htmlLang: "luy" },
  { id: "nubi", native: "Kinubi", english: "Nubi", group: "indigenous", htmlLang: "ar" },
];

const FALLBACK: LocaleId[] = ["sw", "en"];

function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

function lookup(locale: LocaleId, key: MessageKey): string {
  const own = MESSAGES[locale]?.[key];
  if (own) return own;
  for (const next of FALLBACK) {
    const row = MESSAGES[next]?.[key];
    if (row) return row;
  }
  return key;
}

type I18nCtx = {
  locale: LocaleId;
  setLocale: (id: LocaleId) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  meta: LocaleMeta;
};

const I18nContext = createContext<I18nCtx>({
  locale: "sw",
  setLocale: () => undefined,
  t: (key) => key,
  meta: LOCALES[1],
});

function isLocale(value: string): value is LocaleId {
  return LOCALES.some((row) => row.id === value);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleId>("sw");

  useEffect(() => {
    const saved = readString(storageKeys.locale);
    if (isLocale(saved)) {
      setLocaleState(saved);
      document.documentElement.lang = LOCALES.find((row) => row.id === saved)?.htmlLang ?? "sw";
    } else {
      document.documentElement.lang = "sw";
    }
  }, []);

  const value = useMemo<I18nCtx>(() => {
    const meta = LOCALES.find((row) => row.id === locale) ?? LOCALES[1];
    return {
      locale,
      meta,
      setLocale: (id) => {
        setLocaleState(id);
        writeString(storageKeys.locale, id);
        const next = LOCALES.find((row) => row.id === id);
        document.documentElement.lang = next?.htmlLang ?? "sw";
      },
      t: (key, vars) => fill(lookup(locale, key), vars),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
