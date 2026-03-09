import { Link } from "react-router-dom";
import { useTheme } from "./ThemeContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="container">
      <header className="page-header">
        <Link to="/" className="brand" style={{ fontWeight: 700 }}>
          yoyo-news
        </Link>
        <nav>
          <Link to="/">Today</Link>
          <Link to="/digests">Past digests</Link>
          <Link to="/settings">Settings</Link>
          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          >
            {theme === "light" ? "Dark" : "Light"}
          </button>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
