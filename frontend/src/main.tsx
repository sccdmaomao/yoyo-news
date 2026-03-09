import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./ThemeContext";
import { ReadingLanguageProvider } from "./ReadingLanguageContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ReadingLanguageProvider>
          <App />
        </ReadingLanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
