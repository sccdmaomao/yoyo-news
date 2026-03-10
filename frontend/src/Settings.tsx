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
      <h1 className="page-title" style={{ marginBottom: "1rem" }}>Preferences</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        Stored on this device. We use these when building your daily roundup.
      </p>
      <div className="card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          aria-label="Preferences form"
        >
          <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
            <legend style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
              Countries
            </legend>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1.5rem" }}>
              {COUNTRIES.map((o) => (
                <label
                  key={o.value}
                  style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    name="countries"
                    value={o.value}
                    checked={config.countries.includes(o.value)}
                    onChange={() =>
                      setConfig((c) => ({ ...c, countries: toggleCountry(c.countries, o.value) }))
                    }
                    aria-label={`Include ${o.label} in digest`}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
            <button type="submit">Done</button>
            <span
              aria-live="polite"
              aria-atomic="true"
              style={{ marginLeft: 0, color: "var(--muted)" }}
            >
              {saved ? "All set." : ""}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
