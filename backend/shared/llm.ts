import type { NewsItem } from "./types.js";
import type { UserConfig } from "./types.js";
import OpenAI from "openai";

type BilingualItem = Record<string, unknown>;

function normalizeBilingualItem(
  item: Record<string, unknown>,
  id: string,
  country?: string
): NewsItem {
  const titleEn = String(item?.titleEn ?? item?.title ?? "").trim() || "Untitled";
  const titleZh = String(
    item?.titleZh ?? item?.title_zh ?? ""
  ).trim() || titleEn;
  const summaryEn = String(item?.summaryEn ?? item?.summary ?? "").trim() || "No summary.";
  const summaryZh = String(
    item?.summaryZh ?? item?.summary_zh ?? ""
  ).trim() || summaryEn;
  return {
    id,
    titleEn,
    titleZh,
    summaryEn,
    summaryZh,
    url: String(item?.url ?? "").trim() || "https://example.com",
    source: String(item?.source ?? "").trim() || "Unknown",
    ...(country ? { country } : {}),
  };
}

// Groq is OpenAI-compatible; we use the same SDK with Groq's base URL.
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

/**
 * Generate the daily digest using the LLM (Groq by default).
 * API key: GROQ_API_KEY or GROK_API_KEY. Model: GROQ_MODEL (default llama-3.1-8b-instant).
 */
export async function generateDigestWithLlm(
  config: UserConfig,
  date: string
): Promise<NewsItem[]> {
  const apiKey = process.env.GROQ_API_KEY ?? process.env.GROK_API_KEY;
  if (apiKey) {
    return generateDigestWithGroq(apiKey, config, date);
  }
  return getMockDigestItems(config, date);
}

async function generateDigestWithGroq(
  apiKey: string,
  config: UserConfig,
  date: string
): Promise<NewsItem[]> {
  const client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
  const model = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";

  const countries = config.countries.length > 0 ? config.countries : ["us"];
  const multiCountry = countries.length > 1;
  const countriesLabel = countries.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ");

  const zhQuality =
    "For each item, titleZh and summaryZh must describe the SAME story as titleEn and summaryEn. Write in natural, fluent Chinese (自然流利的中文) as a professional Chinese news editor would—clear headlines and 1–2 sentence summaries that make sense to a Chinese reader. Do not literally translate word-for-word; adapt for natural Chinese. Ensure the Chinese is coherent and factually matches the English.";

  const systemPrompt = multiCountry
    ? `You are a bilingual news digest writer. Given a date and a list of countries, produce a JSON object with one key per country (use lowercase: ${countries.map((c) => `"${c}"`).join(", ")}). Each key's value is an array of exactly 10 hot/trending news items for THAT country for that day. Each item must have: "titleEn" (English headline), "titleZh" (same story, Chinese headline in 中文), "summaryEn" (1–2 sentences in English), "summaryZh" (same story, 1–2 sentences in natural Chinese 中文), "url" (string), "source" (string). ${zhQuality} Use your knowledge of notable recent events. Output only valid JSON: an object like { "us": [ {...}, ... ], "canada": [ {...}, ... ] }. No other text.`
    : `You are a bilingual news digest writer. Given a date and countries, produce a JSON array of 5–10 hot/trending news items across all categories for that day. Each item must have: "titleEn", "titleZh" (same story in 中文), "summaryEn", "summaryZh" (same story in natural Chinese 中文), "url", "source". ${zhQuality} Use your knowledge of notable recent events. Output only valid JSON: either a top-level array of objects, or an object with an "items" key that is such an array. No other text.`;

  const userPrompt = multiCountry
    ? `Date: ${date}. Countries: ${countriesLabel}. Produce exactly 10 items per country. For each item: titleEn and titleZh are the same news story in English and Chinese; summaryEn and summaryZh are the same summary in both languages. Write Chinese (titleZh, summaryZh) in natural, readable 中文—like a real Chinese news digest—not awkward or literal translation.`
    : `Date: ${date}. Countries: ${countriesLabel}. Produce the digest. For every item, titleZh/summaryZh must be the same story as titleEn/summaryEn, written in natural Chinese (自然中文) that reads well. Include the hottest topics from all categories.`;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return getMockDigestItems(config, date);

    const parsed = JSON.parse(text) as { items?: BilingualItem[] } | BilingualItem[] | Record<string, BilingualItem[]>;

    if (multiCountry && !Array.isArray(parsed) && parsed !== null && typeof parsed === "object" && !("items" in parsed)) {
      const itemsByCountry = parsed as Record<string, unknown>;
      const items: NewsItem[] = [];
      for (const origKey of Object.keys(itemsByCountry)) {
        const normalized = countries.find((c) => c.toLowerCase() === origKey.toLowerCase()) ?? origKey.toLowerCase();
        const arr = Array.isArray(itemsByCountry[origKey]) ? (itemsByCountry[origKey] as BilingualItem[]) : [];
        for (let i = 0; i < Math.min(arr.length, 10); i++) {
          items.push(normalizeBilingualItem(arr[i] as Record<string, unknown>, `item-${normalized}-${i + 1}`, normalized));
        }
      }
      return items;
    }

    const rawItems = Array.isArray(parsed) ? parsed : (parsed as { items?: BilingualItem[] }).items ?? [];
    return rawItems.slice(0, 15).map((item, i) =>
      normalizeBilingualItem(item as Record<string, unknown>, `item-${i + 1}`)
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const is429 = msg.includes("429") || (err as { status?: number })?.status === 429;
    console.error("Groq API error:", msg);
    return getQuotaErrorDigestItems(config, date, is429);
  }
}

function getQuotaErrorDigestItems(
  config: UserConfig,
  date: string,
  isQuota: boolean
): NewsItem[] {
  const countriesLabel = config.countries.length > 0
    ? config.countries.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")
    : "US";
  const msgEn = isQuota
    ? "API quota exceeded. Check your Groq plan at console.groq.com, then try again later."
    : "Could not generate digest (API error). Check Lambda logs and try again.";
  const msgZh = isQuota ? "API 配额已用尽。请到 console.groq.com 查看方案后重试。" : "无法生成摘要（API 错误）。请查看 Lambda 日志后重试。";
  return [
    {
      id: "error-1",
      titleEn: `Digest for ${date} (${countriesLabel})`,
      titleZh: `${date} 摘要 (${countriesLabel})`,
      summaryEn: msgEn,
      summaryZh: msgZh,
      url: "https://console.groq.com/docs",
      source: "yoyo-news",
    },
  ];
}

function getMockDigestItems(config: UserConfig, date: string): NewsItem[] {
  const countriesLabel = config.countries.length > 0
    ? config.countries.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")
    : "US";
  return [
    {
      id: "mock-1",
      titleEn: `Top stories for ${countriesLabel} (${date})`,
      titleZh: `${countriesLabel} 要闻 (${date})`,
      summaryEn: "Add GROQ_API_KEY (or GROK_API_KEY) to the DailyJob Lambda environment to get real digests.",
      summaryZh: "在 DailyJob Lambda 环境中配置 GROQ_API_KEY（或 GROK_API_KEY）以获取真实摘要。",
      url: "https://example.com",
      source: "yoyo-news",
    },
  ];
}
