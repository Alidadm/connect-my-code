import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initI18n } from "./lib/i18n";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";

if (Capacitor.isNativePlatform()) {
  // Show a neutral splash overlay until we confirm connectivity,
  // preventing the Android WebView "no internet" flash
  const splash = document.createElement("div");
  splash.id = "native-splash";
  splash.style.cssText =
    "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#0f172a;";
  splash.innerHTML =
    '<img src="/images/dolphysn-logo.png" alt="DolphySN" style="width:120px;height:auto;animation:pulse 1.5s ease-in-out infinite" />' +
    '<style>@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}</style>';
  document.body.prepend(splash);

  const removeSplash = () => {
    const el = document.getElementById("native-splash");
    if (el) {
      el.style.transition = "opacity .3s";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 300);
    }
  };

  // Wait for real connectivity before removing splash (max 5s fallback)
  const splashTimeout = setTimeout(removeSplash, 5000);
  Network.getStatus().then((status) => {
    if (status.connected) {
      clearTimeout(splashTimeout);
      // Give the page a moment to paint, then remove
      setTimeout(removeSplash, 800);
    }
  });

  // Force fresh load on app resume to prevent stale "page not found" errors
  CapApp.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
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
