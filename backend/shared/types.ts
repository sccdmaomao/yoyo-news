/** News item in a digest (from LLM summary). Bilingual: title/summary in English and Chinese. Legacy records may only have title/summary. */
export interface NewsItem {
  id?: string;
  /** Legacy: single title (used when titleEn/titleZh missing). */
  title?: string;
  /** Legacy: single summary (used when summaryEn/summaryZh missing). */
  summary?: string;
  /** English title. */
  titleEn?: string;
  /** Chinese title. */
  titleZh?: string;
  /** English summary. */
  summaryEn?: string;
  /** Chinese summary. */
  summaryZh?: string;
  url: string;
  source: string;
  publishedAt?: string;
  /** Set when digest is generated for multiple countries (one column per country). */
  country?: string;
}

/** Full digest stored in DynamoDB (Option A: one per day). */
export interface DigestRecord {
  pk: string;
  sk: string;
  date: string; // YYYY-MM-DD
  items: NewsItem[];
  createdAt: string; // ISO8601
}

/** Digest summary returned by GET /digests. */
export interface DigestSummary {
  id: string; // date
  date: string;
  createdAt: string;
}

/** User config (frontend localStorage). Language for digest generation removed; reading language is UI-only. */
export interface UserConfig {
  countries: string[];
}

/** Default config for the daily job when no per-user config exists. */
export const DEFAULT_JOB_CONFIG: UserConfig = {
  countries: ["us"],
};
