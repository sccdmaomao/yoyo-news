import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getDigest, type Digest } from "./api";

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
    </div>
  );
}
