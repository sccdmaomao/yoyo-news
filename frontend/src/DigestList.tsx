import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listDigests, refreshTodayDigest, type DigestSummary } from "./api";
import { loadConfig } from "./config";

export default function DigestList() {
  const navigate = useNavigate();
  const [digests, setDigests] = useState<DigestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    listDigests(from, to)
      .then(setDigests)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDigest = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const config = loadConfig();
      await refreshTodayDigest({ countries: config.countries, language: config.language });
      load();
      const today = new Date().toISOString().slice(0, 10);
      navigate(`/digests/${today}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh digest");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <p>Loading digests…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}>Daily digests</h1>
      <p style={{ marginBottom: "1rem" }}>
        <button onClick={handleDigest} disabled={refreshing}>
          {refreshing ? "Generating…" : "Digest"}
        </button>
        <span style={{ marginLeft: "0.5rem", color: "var(--muted)", fontSize: "0.9rem" }}>
          Generate today&apos;s digest now
        </span>
      </p>
      {error && <p style={{ color: "#f87171", marginBottom: "1rem" }}>{error}</p>}
      {digests.length === 0 && !refreshing && (
        <p style={{ color: "var(--muted)" }}>No digests yet. Use &quot;Digest&quot; above or wait for the daily job.</p>
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
