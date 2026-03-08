import { useState } from "react";
import {
  loadConfig,
  saveConfig,
  COUNTRIES,
  LANGUAGES,
  CATEGORIES,
  type UserConfig,
} from "./config";

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
      <h1 style={{ marginBottom: "1rem" }}>Settings</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        Your preferences are stored locally. The daily digest uses system defaults; this config is for display and future use.
      </p>
      <div className="card">
        <div className="form-row">
          <label>
            Country
            <select
              value={config.country}
              onChange={(e) => setConfig((c) => ({ ...c, country: e.target.value }))}
            >
              {COUNTRIES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Language
            <select
              value={config.language}
              onChange={(e) => setConfig((c) => ({ ...c, language: e.target.value }))}
            >
              {LANGUAGES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Category
            <select
              value={config.category}
              onChange={(e) => setConfig((c) => ({ ...c, category: e.target.value }))}
            >
              {CATEGORIES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button onClick={handleSave}>Save</button>
        {saved && <span style={{ marginLeft: "1rem", color: "var(--muted)" }}>Saved.</span>}
      </div>
    </div>
  );
}
