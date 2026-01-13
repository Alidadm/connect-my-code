import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initI18n } from "./lib/i18n";

// Initialize i18n before rendering
initI18n().then(() => {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <App />
      </Suspense>
    </React.StrictMode>
  );
});
