import { useMemo } from "react";
import type { Digest, NewsItem } from "./api";
import { COUNTRIES } from "./config";
import {
  useReadingLanguage,
  getDisplayTitle,
  getDisplaySummary,
  type ReadingLang,
} from "./ReadingLanguageContext";

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

interface DigestBodyProps {
  digest: Digest;
}

/** Renders a single digest's content (date, lang toggle, items). Used on home (today) and digest detail (any date). */
export default function DigestBody({ digest }: DigestBodyProps) {
  const { readingLang, setReadingLang } = useReadingLanguage();
  const byCountry = useMemo(
    () => (digest ? groupByCountry(digest.items) : new Map<string, NewsItem[]>()),
    [digest]
  );
  const hasCountryLabels = digest.items.some((i) => i.country);
  const multiCountry =
    hasCountryLabels && (byCountry.size > 1 || (byCountry.size === 1 && !byCountry.has("")));

  const toggleLang = (next: ReadingLang) => () => setReadingLang(next);

  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.75rem 1.5rem",
          marginBottom: "1rem",
        }}
      >
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          {digest.date}
        </h1>
        <span className="reading-lang-toggle">
          Read in:{" "}
          <button
            type="button"
            className={`reading-lang-btn ${readingLang === "en" ? "active" : ""}`}
            onClick={toggleLang("en")}
            aria-pressed={readingLang === "en"}
          >
            English
          </button>
          <button
            type="button"
            className={`reading-lang-btn ${readingLang === "zh" ? "active" : ""}`}
            onClick={toggleLang("zh")}
            aria-pressed={readingLang === "zh"}
          >
            中文
          </button>
        </span>
      </div>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        {new Date(digest.createdAt).toLocaleString()}
      </p>
      {multiCountry ? (
        <div
          className="digest-columns"
          style={{ gridTemplateColumns: `repeat(${byCountry.size}, minmax(0, 1fr))` }}
        >
          {Array.from(byCountry.entries())
            .filter(([code]) => code !== "")
            .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
            .map(([countryCode, items]) => (
              <div key={countryCode} className="card" style={{ minWidth: 0 }}>
                <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>
                  {getCountryLabel(countryCode)}
                </h2>
                {items.map((item, i) => (
                  <div className="news-item" key={item.id ?? i}>
                    <div className="title">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        {getDisplayTitle(item, readingLang)}
                      </a>
                    </div>
                    <div className="summary">{getDisplaySummary(item, readingLang)}</div>
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
                  {getDisplayTitle(item, readingLang)}
                </a>
              </div>
              <div className="summary">{getDisplaySummary(item, readingLang)}</div>
              <div className="source">{item.source}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
