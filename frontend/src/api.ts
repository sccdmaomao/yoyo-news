// Always use the deployed read API (same URL for local dev and production).
const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface DigestSummary {
  id: string;
  date: string;
  createdAt: string;
}

export interface NewsItem {
  id?: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt?: string;
  /** Set when digest is multi-country (one column per country). */
  country?: string;
}

export interface Digest {
  id: string;
  date: string;
  createdAt: string;
  items: NewsItem[];
}

function apiError(res: Response, fallback: string): Promise<never> {
  return res
    .text()
    .then((text) => {
      let body: { error?: string; detail?: string } = {};
      try {
        body = text ? (JSON.parse(text) as { error?: string; detail?: string }) : {};
      } catch {
        /* response was not JSON (e.g. 502 gateway error) */
      }
      const msg = body.detail
        ? `${body.error ?? "Error"}: ${body.detail}`
        : body.error ?? fallback;
      throw new Error(msg || `${fallback} (${res.status})`);
    });
}

export async function listDigests(from?: string, to?: string): Promise<DigestSummary[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const url = `${API_BASE}/digests${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) return apiError(res, "Failed to fetch digests");
  const data = (await res.json()) as { digests: DigestSummary[] };
  return data.digests;
}

export async function getDigest(id: string): Promise<Digest | null> {
  const res = await fetch(`${API_BASE}/digests/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) return apiError(res, "Failed to fetch digest");
  return (await res.json()) as Digest;
}

/** Trigger manual generation of today's digest, then return it. Pass config for countries/language (e.g. from Settings). */
export async function refreshTodayDigest(config?: { countries?: string[]; language?: string }): Promise<Digest> {
  const res = await fetch(`${API_BASE}/digests/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: config ? JSON.stringify(config) : undefined,
  });
  if (!res.ok) return apiError(res, "Failed to refresh digest");
  return (await res.json()) as Digest;
}
