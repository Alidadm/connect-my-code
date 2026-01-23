import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initI18n } from "./lib/i18n";

// Initialize i18n before rendering
initI18n().then((i18nInstance) => {
  // Set document language attributes
  const currentLang = i18nInstance.language || 'en';
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <App />
      </Suspense>
    </React.StrictMode>
  );
});
