import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fa from './locales/fa.json';

const resources = {
  en: {
    translation: en,
  },
  fa: {
    translation: fa,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en', // Default to English or saved preference
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
  });

// Update the direction whenever language changes
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'fa' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
  localStorage.setItem('language', lng);
});

// Initial setup on load
document.documentElement.dir = i18n.language === 'fa' ? 'rtl' : 'ltr';
document.documentElement.lang = i18n.language;

export default i18n;