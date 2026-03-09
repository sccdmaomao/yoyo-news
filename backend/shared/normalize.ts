import type { NewsItem } from "./types.js";

/**
 * Ensure every digest item has titleEn, titleZh, summaryEn, summaryZh
 * so the frontend can toggle languages. Fills from legacy title/summary when missing.
 */
export function normalizeDigestItems(items: NewsItem[]): NewsItem[] {
  return items.map((item) => {
    const titleEn = item.titleEn ?? item.title ?? "Untitled";
    const titleZh = item.titleZh ?? item.title ?? titleEn;
    const summaryEn = item.summaryEn ?? item.summary ?? "";
    const summaryZh = item.summaryZh ?? item.summary ?? summaryEn;
    return {
      ...item,
      titleEn,
      titleZh,
      summaryEn,
      summaryZh,
    };
  });
}
