import i18next, { LanguageDetectorModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../i18n/en.json';

// Constant for the storage key
const LANGUAGE_STORAGE_KEY = '@app_language';

// Type definition for the language detector
const languageDetector: LanguageDetectorModule = {
  type: 'languageDetector',
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      // If a language is saved, use it. Otherwise, default to English.
      const lang = savedLanguage || 'en';
      callback(lang);
    } catch (error) {
      console.error('Failed to get language from storage', error);
      callback('en'); // Fallback to English on error
    }
  },
  init: () => {},
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
    fallbackLng: 'en',
    debug: __DEV__, // Use __DEV__ to only enable debug mode in development
    resources: {
      en: {
        translation: en,
      },
    },
    interpolation: {
      escapeValue: false, // React already protects from XSS
    },
    react: {
      useSuspense: false, // Recommended for React Native
    }
  });

export default i18next;
