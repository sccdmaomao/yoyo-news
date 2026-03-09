import type { NewsItem } from "./types.js";
import type { UserConfig } from "./types.js";
import OpenAI from "openai";

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
  const langLabel = config.language === "zh" ? "Chinese" : "English";

  const systemPrompt = multiCountry
    ? `You are a news digest writer. Given a date, a list of countries, and a language, produce a JSON object with one key per country (use lowercase: ${countries.map((c) => `"${c}"`).join(", ")}). Each key's value is an array of exactly 10 of the most hot/trending news items for THAT country (politics, sports, economy, tech, world, etc.) for that day. Each item must have: "title", "summary" (1–2 sentences), "url" (real or placeholder https://example.com), "source". Use your knowledge of notable recent events. Output only valid JSON: an object like { "us": [ {...}, ... ], "canada": [ {...}, ... ] }. No other text.`
    : `You are a news digest writer. Given a date, a list of countries, and a language, produce a JSON array of 5–10 of the most hot/trending news items across ALL categories (politics, sports, economy, tech, world, etc.) that would be relevant for that day. Each object must have exactly: "title" (string), "summary" (1–2 sentences), "url" (string; use a real news URL if you know one, otherwise a placeholder like https://example.com), "source" (string; publication or site name). Use your knowledge of notable recent events. Output only valid JSON: either a top-level array of objects, or an object with an "items" key that is such an array. No other text.`;

  const userPrompt = multiCountry
    ? `Date: ${date}. Countries: ${countriesLabel}. Language: ${langLabel}. Produce exactly 10 items per country. Output a JSON object with keys ${countries.map((c) => `"${c}"`).join(", ")} and each value an array of 10 items. Use ${langLabel}.`
    : `Date: ${date}. Countries: ${countriesLabel}. Language: ${langLabel}. Produce the digest in ${langLabel}. Include the hottest topics from all categories.`;

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

    const parsed = JSON.parse(text) as { items?: NewsItem[] } | NewsItem[] | Record<string, NewsItem[]>;

    if (multiCountry && !Array.isArray(parsed) && parsed !== null && typeof parsed === "object" && !("items" in parsed)) {
      const itemsByCountry = parsed as Record<string, unknown>;
      const items: NewsItem[] = [];
      for (const origKey of Object.keys(itemsByCountry)) {
        const normalized = countries.find((c) => c.toLowerCase() === origKey.toLowerCase()) ?? origKey.toLowerCase();
        const arr = Array.isArray(itemsByCountry[origKey]) ? (itemsByCountry[origKey] as NewsItem[]) : [];
        for (let i = 0; i < Math.min(arr.length, 10); i++) {
          const item = arr[i] as Record<string, unknown>;
          items.push({
            id: `item-${normalized}-${i + 1}`,
            title: String(item?.title ?? "").trim() || "Untitled",
            summary: String(item?.summary ?? "").trim() || "No summary.",
            url: String(item?.url ?? "").trim() || "https://example.com",
            source: String(item?.source ?? "").trim() || "Unknown",
            country: normalized,
          });
        }
      }
      return items;
    }

    const items = Array.isArray(parsed) ? parsed : (parsed as { items?: NewsItem[] }).items ?? [];
    return items.slice(0, 15).map((item, i) => ({
      id: `item-${i + 1}`,
      title: String(item.title ?? "").trim() || "Untitled",
      summary: String(item.summary ?? "").trim() || "No summary.",
      url: String(item.url ?? "").trim() || "https://example.com",
      source: String(item.source ?? "").trim() || "Unknown",
    }));
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
  return [
    {
      id: "error-1",
      title: `Digest for ${date} (${countriesLabel})`,
      summary: isQuota
        ? "API quota exceeded. Check your Groq plan at console.groq.com, then try again later."
        : "Could not generate digest (API error). Check Lambda logs and try again.",
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
      title: `Top stories for ${countriesLabel} (${date})`,
      summary: "Add GROQ_API_KEY (or GROK_API_KEY) to the DailyJob Lambda environment to get real digests.",
      url: "https://example.com",
      source: "yoyo-news",
    },
  ];
}
