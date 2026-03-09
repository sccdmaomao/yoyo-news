import { createContext, useContext, useEffect, useState } from "react";
import type { NewsItem } from "./api";

export type ReadingLang = "en" | "zh";

const STORAGE_KEY = "yoyo-news-reading-lang";

function getStored(): ReadingLang {
  if (typeof window === "undefined") return "en";
  const s = localStorage.getItem(STORAGE_KEY);
  return s === "zh" ? "zh" : "en";
}

type ReadingLanguageContextValue = {
  readingLang: ReadingLang;
  setReadingLang: (lang: ReadingLang) => void;
};

const ReadingLanguageContext = createContext<ReadingLanguageContextValue | null>(null);

export function ReadingLanguageProvider({ children }: { children: React.ReactNode }) {
  const [readingLang, setReadingLangState] = useState<ReadingLang>(getStored);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, readingLang);
  }, [readingLang]);

  const setReadingLang = (lang: ReadingLang) => setReadingLangState(lang);

  return (
    <ReadingLanguageContext.Provider value={{ readingLang, setReadingLang }}>
      {children}
    </ReadingLanguageContext.Provider>
  );
}

export function useReadingLanguage() {
  const ctx = useContext(ReadingLanguageContext);
  if (!ctx) throw new Error("useReadingLanguage must be used within ReadingLanguageProvider");
  return ctx;
}

export function getDisplayTitle(item: NewsItem, lang: ReadingLang): string {
  const en = item.titleEn ?? item.title ?? "Untitled";
  const zh = item.titleZh ?? item.title ?? en;
  return lang === "zh" ? zh : en;
}

export function getDisplaySummary(item: NewsItem, lang: ReadingLang): string {
  const en = item.summaryEn ?? item.summary ?? "";
  const zh = item.summaryZh ?? item.summary ?? en;
  return lang === "zh" ? zh : en;
}
