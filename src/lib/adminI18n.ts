import i18n from "@/lib/i18n";

// Admin area should always stay in English, regardless of the user's selected language.
// We use a dedicated i18n instance so we don't overwrite the user's preference
// (localStorage + database sync).
export const adminI18n = i18n.cloneInstance({
  lng: "en",
  fallbackLng: "en",
});

// Ensure it's locked to English.
void adminI18n.changeLanguage("en");

export default adminI18n;
