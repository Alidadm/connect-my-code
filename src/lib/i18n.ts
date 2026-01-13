import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Supported languages with their display names and native names
export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: 'us' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: 'es' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: 'fr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: 'br' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: 'de' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: 'cn' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: 'sa' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: 'in' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: 'jp' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: 'kr' },
] as const;

export type LanguageCode = typeof supportedLanguages[number]['code'];

// Initialize function to be called after React is ready
export const initI18n = () => {
  if (i18n.isInitialized) return Promise.resolve(i18n);
  
  return i18n
    // Load translations from /public/locales
    .use(Backend)
    // Detect user language
    .use(LanguageDetector)
    // Pass the i18n instance to react-i18next
    .use(initReactI18next)
    // Initialize i18n
    .init({
      fallbackLng: 'en',
      debug: false,
      
      // Lazy load only the active language
      load: 'languageOnly',
      
      // Detection options
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        lookupLocalStorage: 'i18nextLng',
        caches: ['localStorage'],
      },
      
      // Backend options for loading translation files
      backend: {
        loadPath: '/locales/{{lng}}/translation.json',
      },
      
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      
      // React options
      react: {
        useSuspense: true,
      },
    });
};

export default i18n;
