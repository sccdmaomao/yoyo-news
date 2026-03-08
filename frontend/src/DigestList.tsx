import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listDigests, type DigestSummary } from "./api";

export default function DigestList() {
  const [digests, setDigests] = useState<DigestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    listDigests(from, to)
      .then(setDigests)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading digests…</p>;
  if (error) return <p style={{ color: "#f87171" }}>{error}</p>;
  if (digests.length === 0) return <p>No digests yet. The daily job will populate history.</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}>Daily digests</h1>
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
