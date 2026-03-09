import { useState } from "react";
import { loadConfig, saveConfig, COUNTRIES, type UserConfig } from "./config";

function toggleCountry(countries: string[], value: string): string[] {
  if (countries.includes(value)) {
    return countries.filter((c) => c !== value);
  }
  return [...countries, value];
}

export default function Settings() {
  const [config, setConfig] = useState<UserConfig>(loadConfig());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: "1rem" }}>Settings</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        Your preferences are stored locally. The daily digest uses system defaults; this config is for display and future use.
      </p>
      <div className="card">
        <div className="form-row">
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Countries</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1.5rem" }}>
            {COUNTRIES.map((o) => (
              <label key={o.value} style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={config.countries.includes(o.value)}
                  onChange={() =>
                    setConfig((c) => ({ ...c, countries: toggleCountry(c.countries, o.value) }))
                  }
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </div>
        <button onClick={handleSave}>Save</button>
        {saved && <span style={{ marginLeft: "1rem", color: "var(--muted)" }}>Saved.</span>}
      </div>
    </div>
  );
}
