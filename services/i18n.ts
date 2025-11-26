import AsyncStorage from '@react-native-async-storage/async-storage';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import en from '../i18n/en.json';
import ur from '../i18n/ur.json';

const LANGUAGE_STORAGE_KEY = '@app_language';
const RTL_LANGUAGES = ['ur', 'ar', 'he', 'fa'];

const languageDetector = {
  type: 'languageDetector' as 'languageDetector',
  async: true,
  init: () => {},
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      const detectedLanguage = savedLanguage || 'en';
      
      console.log(`Detected language: ${detectedLanguage}`);
      
      // Always allow RTL
      I18nManager.allowRTL(true);
      
      // CRITICAL FIX: Force RTL based on detected language during initialization
      const shouldBeRTL = RTL_LANGUAGES.includes(detectedLanguage);
      console.log(`Should be RTL: ${shouldBeRTL}, Current RTL: ${I18nManager.isRTL}`);
      
      // Force RTL if needed during initialization
      if (shouldBeRTL !== I18nManager.isRTL) {
        console.log(`Setting RTL to: ${shouldBeRTL} for language: ${detectedLanguage}`);
        I18nManager.forceRTL(shouldBeRTL);
      }
      
      callback(detectedLanguage);
    } catch (error) {
      console.error('Error detecting language:', error);
      I18nManager.allowRTL(true);
      // Default to LTR for English
      I18nManager.forceRTL(false);
      callback('en');
    }
  },
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      console.log(`Language cached: ${language}`);
    } catch (error) {
      console.error('Error caching language:', error);
    }
  },
};

i18next
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ur: { translation: ur },
    },
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    compatibilityJSON: 'v3',
  });

i18next.on('languageChanged', (lng) => {
  console.log(`Language changed to: ${lng}`);
  
  // Handle RTL change when language changes
  const shouldBeRTL = RTL_LANGUAGES.includes(lng);
  const currentRTL = I18nManager.isRTL;
  
  console.log(`Language changed - Should be RTL: ${shouldBeRTL}, Current RTL: ${currentRTL}`);
  
  // Only force RTL change if it's different from current state
  if (shouldBeRTL !== currentRTL) {
    console.log(`Forcing RTL change to: ${shouldBeRTL}`);
    I18nManager.forceRTL(shouldBeRTL);
  }
  
  // Save language to storage
  AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng).catch(error => {
    console.error('Error saving language:', error);
  });
});

export default i18next;