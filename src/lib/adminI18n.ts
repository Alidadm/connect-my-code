import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";

// Create a completely separate i18n instance for admin area that stays in English.
// This avoids cloning the main instance (which may not be initialized yet).
const adminI18n = i18n.createInstance();

adminI18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    lng: "en",
    fallbackLng: "en",
    debug: false,
    load: "languageOnly",
    backend: {
      loadPath: "/locales/{{lng}}/translation.json",
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export { adminI18n };
export default adminI18n;
