import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./Home";
import DigestList from "./DigestList";
import DigestDetail from "./DigestDetail";
import Settings from "./Settings";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/digests" element={<DigestList />} />
        <Route path="/digests/:date" element={<DigestDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}
