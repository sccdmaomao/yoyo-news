import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDigest, refreshTodayDigest, type Digest } from "./api";
import { loadConfig } from "./config";
import DigestBody from "./DigestBody";

export default function Home() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const loadToday = () => {
    setLoading(true);
    setError(null);
    getDigest(today)
      .then(setDigest)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadToday();
  }, []);

  const handleGenerate = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const config = loadConfig();
      await refreshTodayDigest({ countries: config.countries });
      loadToday();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh digest");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <p>Loading today&apos;s digest…</p>;

  return (
    <div>
      <div className="digest-action" style={{ marginBottom: "1.5rem" }}>
        <button onClick={handleGenerate} disabled={refreshing}>
          {refreshing ? "Generating…" : "Generate today's digest"}
        </button>
        <span className="hint">Create or refresh today&apos;s digest</span>
        <span style={{ marginLeft: "auto" }}>
          <Link to="/digests">View past digests →</Link>
        </span>
      </div>
      {error && <p style={{ color: "var(--error)", marginBottom: "1rem" }}>{error}</p>}
      {!digest && !refreshing && (
        <p style={{ color: "var(--muted)" }}>
          No digest for today yet. Click &quot;Generate today&apos;s digest&quot; above or{" "}
          <Link to="/digests">browse past digests</Link>.
        </p>
      )}
      {digest && <DigestBody digest={digest} />}
    </div>
  );
}
