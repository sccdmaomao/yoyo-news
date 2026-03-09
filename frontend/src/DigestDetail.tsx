import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getDigest, type Digest, type NewsItem } from "./api";
import { COUNTRIES } from "./config";

function getCountryLabel(code: string): string {
  return COUNTRIES.find((c) => c.value === code)?.label ?? code.charAt(0).toUpperCase() + code.slice(1);
}

/** Group items by country; returns Map of countryCode -> items. Items without country go under key "". */
function groupByCountry(items: NewsItem[]): Map<string, NewsItem[]> {
  const map = new Map<string, NewsItem[]>();
  for (const item of items) {
    const key = item.country ?? "";
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

export default function DigestDetail() {
  const { date } = useParams<{ date: string }>();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    getDigest(date)
      .then(setDigest)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [date]);

  const byCountry = useMemo(() => (digest ? groupByCountry(digest.items) : new Map<string, NewsItem[]>()), [digest]);
  const hasCountryLabels = digest != null && digest.items.some((i) => i.country);
  const multiCountry = hasCountryLabels && (byCountry.size > 1 || (byCountry.size === 1 && !byCountry.has("")));

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "#f87171" }}>{error}</p>;
  if (!digest) return <p>Digest not found.</p>;

  return (
    <div>
      <p><Link to="/">← Back to digests</Link></p>
      <h1 style={{ marginBottom: "0.5rem" }}>{digest.date}</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        {new Date(digest.createdAt).toLocaleString()}
      </p>
      {multiCountry ? (
        <div className="digest-columns" style={{ gridTemplateColumns: `repeat(${byCountry.size}, minmax(0, 1fr))` }}>
          {Array.from(byCountry.entries())
            .filter(([code]) => code !== "")
            .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
            .map(([countryCode, items]) => (
              <div key={countryCode} className="card" style={{ minWidth: 0 }}>
                <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>{getCountryLabel(countryCode)}</h2>
                {items.map((item, i) => (
                  <div className="news-item" key={item.id ?? i}>
                    <div className="title">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.title}
                      </a>
                    </div>
                    <div className="summary">{item.summary}</div>
                    <div className="source">{item.source}</div>
                  </div>
                ))}
              </div>
            ))}
        </div>
      ) : (
        <div className="card">
          {digest.items.map((item, i) => (
            <div className="news-item" key={item.id ?? i}>
              <div className="title">
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
              </div>
              <div className="summary">{item.summary}</div>
              <div className="source">{item.source}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
