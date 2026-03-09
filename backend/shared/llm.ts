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

  const countriesLabel = config.countries.length > 0
    ? config.countries.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")
    : "US";
  const langLabel = config.language === "zh" ? "Chinese" : "English";

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are a news digest writer. Given a date, a list of countries, and a language, produce a JSON array of 5–10 of the most hot/trending news items across ALL categories (politics, sports, economy, tech, world, etc.) that would be relevant for that day. Each object must have exactly: "title" (string), "summary" (1–2 sentences), "url" (string; use a real news URL if you know one, otherwise a placeholder like https://example.com), "source" (string; publication or site name). Use your knowledge of notable recent events. Output only valid JSON: either a top-level array of objects, or an object with an "items" key that is such an array. No other text.`,
        },
        {
          role: "user",
          content: `Date: ${date}. Countries: ${countriesLabel}. Language: ${langLabel}. Produce the digest in ${langLabel}. Include the hottest topics from all categories.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return getMockDigestItems(config, date);

    const parsed = JSON.parse(text) as { items?: NewsItem[] } | NewsItem[];
    const items = Array.isArray(parsed) ? parsed : parsed.items ?? [];
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
