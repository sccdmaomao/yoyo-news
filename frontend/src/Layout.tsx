import { Link } from "react-router-dom";
import { Sun, Moon, Type, Languages } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { useReadingLanguage, type ReadingLang } from "./ReadingLanguageContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { readingLang, setReadingLang } = useReadingLanguage();

  return (
    <div className="container">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="page-header">
        <Link to="/" className="brand" style={{ fontWeight: 700 }}>
          yoyo-news
        </Link>
        <nav aria-label="Main">
          <Link to="/">Today</Link>
          <Link to="/digests">Past roundups</Link>
          <Link to="/settings">Preferences</Link>
          <span className="nav-toolbar" role="group" aria-label="Reading language and theme">
            <button
              type="button"
              onClick={() => setReadingLang("en" as ReadingLang)}
              title="Read in English"
              aria-label="Read in English"
              aria-pressed={readingLang === "en"}
              className={`nav-icon-btn ${readingLang === "en" ? "active" : ""}`}
            >
              <Type size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setReadingLang("zh" as ReadingLang)}
              title="Read in 中文"
              aria-label="Read in 中文"
              aria-pressed={readingLang === "zh"}
              className={`nav-icon-btn ${readingLang === "zh" ? "active" : ""}`}
            >
              <Languages size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title={theme === "light" ? "Use dark mode" : "Use light mode"}
              aria-label={theme === "light" ? "Use dark mode" : "Use light mode"}
              className="nav-icon-btn"
            >
              {theme === "light" ? (
                <Moon size={18} aria-hidden />
              ) : (
                <Sun size={18} aria-hidden />
              )}
            </button>
          </span>
        </nav>
      </header>
      <main id="main-content">{children}</main>
    </div>
  );
}
