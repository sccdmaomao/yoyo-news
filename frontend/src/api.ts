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
}

export interface Digest {
  id: string;
  date: string;
  createdAt: string;
  items: NewsItem[];
}

export async function listDigests(from?: string, to?: string): Promise<DigestSummary[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const url = `${API_BASE}/digests${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch digests");
  const data = (await res.json()) as { digests: DigestSummary[] };
  return data.digests;
}

export async function getDigest(id: string): Promise<Digest | null> {
  const res = await fetch(`${API_BASE}/digests/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch digest");
  return (await res.json()) as Digest;
}
