import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listDigests, type DigestSummary } from "./api";

export default function DigestList() {
  const [digests, setDigests] = useState<DigestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    listDigests(from, to)
      .then((list) => {
        setDigests([...list].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0)));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading past digests…</p>;

  return (
    <div>
      <p style={{ marginBottom: "1rem" }}>
        <Link to="/">← Back to today</Link>
      </p>
      <h1 className="page-title" style={{ marginBottom: "1rem" }}>
        Past digests
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
        Last 90 days (newest first). Click a date to read that day&apos;s digest.
      </p>
      {error && <p style={{ color: "var(--error)", marginBottom: "1rem" }}>{error}</p>}
      {digests.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No past digests. Today&apos;s digest appears on the home page.</p>
      )}
      {digests.map((d) => (
        <Link to={`/digests/${d.id}`} key={d.id} style={{ display: "block", color: "inherit" }}>
          <div className="card" style={{ cursor: "pointer" }}>
            <h2>{d.date}</h2>
            <p>Created {new Date(d.createdAt).toLocaleString()}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
