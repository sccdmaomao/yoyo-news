/** News item in a digest (from LLM summary). */
export interface NewsItem {
  id?: string;
  title: string;
  summary: string;
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

/** User config (frontend localStorage). */
export interface UserConfig {
  countries: string[];
  language: string;
}

/** Default config for the daily job when no per-user config exists. */
export const DEFAULT_JOB_CONFIG: UserConfig = {
  countries: ["us"],
  language: "en",
};
