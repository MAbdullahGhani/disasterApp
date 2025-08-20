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
      console.log(`Detected language: ${detectedLanguage}, isRTL: ${isRTL}, current isRTL: ${I18nManager.isRTL}`);
      
      // Always allow RTL
      I18nManager.allowRTL(true);
      
      // Only force RTL if there's a difference
      if (isRTL !== I18nManager.isRTL) {
        console.log(`Setting RTL to: ${isRTL}`);
        I18nManager.forceRTL(isRTL);
      }
      
      callback(detectedLanguage);
    } catch (error) {
      console.error('Error detecting language from storage:', error);
      // Default to English and LTR
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(false);
      callback('en');
    }
  },
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      console.log(`Cached language: ${language}`);
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
    debug: __DEV__, // Enable debug logs in development
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

// Add event listener to save language changes
i18next.on('languageChanged', (lng) => {
  console.log(`Language changed to: ${lng}`);
  AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng).catch(error => {
    console.error('Error saving language to storage:', error);
  });
});

export default i18next;