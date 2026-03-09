import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getDigest, type Digest } from "./api";
import DigestBody from "./DigestBody";

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
  if (error) return <p style={{ color: "var(--error)" }}>{error}</p>;
  if (!digest) return <p>Digest not found.</p>;

  return (
    <div>
      <p>
        <Link to="/digests">← Back to past digests</Link>
      </p>
      <DigestBody digest={digest} />
    </div>
  );
}
