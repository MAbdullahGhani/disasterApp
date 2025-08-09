import i18next, { LanguageDetectorAsyncModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../i18n/en.json';

// Constants for storage keys
const LANGUAGE_STORAGE_KEY = '@app_language';
const TRANSLATIONS_CACHE_KEY = '@cached_translations';

// This custom language detector now also loads cached translations on startup
const languageDetector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  init: () => {},
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      const lang = savedLanguage || 'en';

      // If a non-english language is saved, try to load its translations from cache
      if (lang !== 'en') {
        const cached = await AsyncStorage.getItem(TRANSLATIONS_CACHE_KEY);
        const cachedTranslations = cached ? JSON.parse(cached) : {};
        
        // If we have cached translations for the saved language, add them to i18next
        if (cachedTranslations[lang]) {
          i18next.addResourceBundle(lang, 'translation', cachedTranslations[lang]);
          console.log(`Successfully loaded cached translations for "${lang}" on startup.`);
        } else {
          console.warn(`No cached translations found for "${lang}". App will use fallback.`);
        }
      }
      
      callback(lang);
    } catch (error) {
      console.error('Failed to get language from storage', error);
      callback('en'); // Fallback to English on error
    }
  },
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.error('Failed to cache language', error);
    }
  },
};

i18next
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    // Add the initial English resources
    resources: {
      en: {
        translation: en,
      },
    },
    fallbackLng: 'en',
    debug: __DEV__, // Only enable debug logs in development mode
    interpolation: {
      escapeValue: false, // React already protects from XSS
    },
    react: {
      useSuspense: false, // Recommended for React Native
    }
  });

export default i18next;
