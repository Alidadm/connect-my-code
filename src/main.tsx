import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initI18n } from "./lib/i18n";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

// Force fresh load on app resume to prevent stale "page not found" errors
if (Capacitor.isNativePlatform()) {
  CapApp.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      // Bust cache by appending a timestamp query param
      const url = new URL(window.location.href);
      url.searchParams.set("v", Date.now().toString());
      window.location.replace(url.toString());
    }
  });
}

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
