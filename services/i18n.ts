import AsyncStorage from '@react-native-async-storage/async-storage';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

// Import your translation files directly.
import en from '../i18n/en.json';
import ur from '../i18n/ur.json';

const LANGUAGE_STORAGE_KEY = '@app_language';

// RTL languages list
const RTL_LANGUAGES = ['ur', 'ar', 'he', 'fa'];

const languageDetector = {
  type: 'languageDetector' as 'languageDetector',
  async: true,
  init: () => {},
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      const detectedLanguage = savedLanguage || 'en';
      
      // Set RTL layout based on detected language
      const isRTL = RTL_LANGUAGES.includes(detectedLanguage);
      if (isRTL !== I18nManager.isRTL) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(isRTL);
      }
      
      callback(detectedLanguage);
    } catch (error) {
      console.error('Error detecting language from storage:', error);
      callback('en');
    }
  },
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.error('Error caching user language:', error);
    }
  },
};

i18next
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
      },
      ur: {
        translation: ur,
      },
    },
    fallbackLng: 'en',
    debug: __DEV__,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18next;