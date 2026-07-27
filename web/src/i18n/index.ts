import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import fa from './locales/fa.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fa: { translation: fa }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    }
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'fa' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

// Set initial direction
const initialLng = i18n.language || window.localStorage.i18nextLng || 'en';
document.documentElement.dir = initialLng.startsWith('fa') ? 'rtl' : 'ltr';

export default i18n;