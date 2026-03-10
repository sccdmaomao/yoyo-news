import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
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

  if (loading) {
    return (
      <p className="loading-state" aria-live="polite" aria-busy="true">
        Loading today&apos;s roundup…
      </p>
    );
  }

  return (
    <div>
      <div className="page-title-row" style={{ marginBottom: "1rem" }}>
        <h1 className="page-title" style={{ marginBottom: 0, marginTop: "0" }}>
          {today}
        </h1>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={refreshing}
          aria-busy={refreshing}
          aria-label={refreshing ? "Refreshing roundup" : "Refresh today's roundup"}
          title={refreshing ? "Refreshing…" : "Pull in today's headlines"}
          className="nav-icon-btn title-refresh-btn"
        >
          <RefreshCw size={18} aria-hidden className={refreshing ? "spin" : ""} />
        </button>
        <span style={{ marginLeft: "auto" }}>
          <Link to="/digests">Past roundups →</Link>
        </span>
      </div>
      {error && (
        <p
          role="alert"
          aria-live="polite"
          style={{ color: "var(--error)", marginBottom: "1rem" }}
        >
          {error}
        </p>
      )}
      {!digest && !refreshing && (
        <p style={{ color: "var(--muted)" }}>
          Nothing for today yet. Click refresh above or{" "}
          <Link to="/digests">check past roundups</Link>.
        </p>
      )}
      {digest && <DigestBody digest={digest} showDate={false} />}
    </div>
  );
}
