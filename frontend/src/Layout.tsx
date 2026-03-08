import { Link } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <Link to="/" style={{ fontSize: "1.25rem", fontWeight: 700 }}>
          yoyo-news
        </Link>
        <nav>
          <Link to="/" style={{ marginRight: "1rem" }}>Digests</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
