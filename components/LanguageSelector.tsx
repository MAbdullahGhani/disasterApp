import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  I18nManager,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base English translations, which we will send to the API
import enTranslations from '../i18n/en.json';

// Define the shape of a language object
interface Language {
  code: string;
  label: string;
  isRTL: boolean;
}

// Define the component's props
interface LanguageSelectorProps {
  isVisible: boolean;
  onClose: () => void;
}

const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', isRTL: false },
  { code: 'ur', label: 'Urdu (اردو)', isRTL: true },
  { code: 'es', label: 'Spanish (Español)', isRTL: false },
  // Add more languages here
];

// Key to store cached translations
const TRANSLATIONS_CACHE_KEY = '@cached_translations';

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ isVisible, onClose }) => {
  const { i18n, t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);

  // Function to fetch translations from LibreTranslate API
  const fetchTranslations = async (targetLanguage: string): Promise<Record<string, string> | null> => {
    try {
      // Check cache first
      const cached = await AsyncStorage.getItem(TRANSLATIONS_CACHE_KEY);
      const cachedTranslations = cached ? JSON.parse(cached) : {};
      if (cachedTranslations[targetLanguage]) {
        console.log(`Loading ${targetLanguage} translations from cache.`);
        return cachedTranslations[targetLanguage];
      }

      console.log(`Fetching ${targetLanguage} translations from API...`);
      // The API expects a single string with newlines for batch translation
      const stringToTranslate = Object.values(enTranslations).join('\n');
      
      // Reverting to the libretranslate.de endpoint with robust error handling
      const res = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        body: JSON.stringify({
          q: stringToTranslate,
          source: 'en',
          target: targetLanguage,
          format: 'text',
        }),
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      // Robust check to ensure the response is valid JSON
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType || !contentType.includes('application/json')) {
        const errorText = await res.text(); // Read the response as text to see what it is (e.g., HTML error page)
        console.error('API did not return JSON. Status:', res.status, 'Response:', errorText);
        throw new Error(`API Error: Server returned a non-JSON response.`);
      }
      
      const data = await res.json();
      const translatedText = data.translatedText;

      if (!translatedText || typeof translatedText !== 'string') {
        console.error('Invalid translatedText format received from API:', data);
        throw new Error('Invalid data format from translation API.');
      }

      const translatedValues = translatedText.split('\n');
      const keys = Object.keys(enTranslations);
      
      const newTranslations: Record<string, string> = {};
      keys.forEach((key, index) => {
        newTranslations[key] = translatedValues[index] || enTranslations[key as keyof typeof enTranslations]; // Fallback to English if translation fails
      });

      // Update cache
      cachedTranslations[targetLanguage] = newTranslations;
      await AsyncStorage.setItem(TRANSLATIONS_CACHE_KEY, JSON.stringify(cachedTranslations));

      return newTranslations;

    } catch (error) {
      console.error('Failed to fetch translations:', error);
      Alert.alert('Error', 'Could not load translations. Please check your internet connection and try again.');
      return null;
    }
  };

  const handleLanguageChange = async (lang: Language) => {
    setLoading(true);
    
    // If English is selected, no need to fetch
    if (lang.code === 'en') {
      i18n.addResourceBundle('en', 'translation', enTranslations, true, true);
    } else {
      const translations = await fetchTranslations(lang.code);
      if (!translations) {
        setLoading(false);
        return; // Stop if fetching failed
      }
      // Add the new translations to i18next
      i18n.addResourceBundle(lang.code, 'translation', translations, true, true);
    }

    // Change the language
    await i18n.changeLanguage(lang.code);

    // Handle RTL layout
    const currentIsRTL = I18nManager.isRTL;
    if (currentIsRTL !== lang.isRTL) {
      I18nManager.forceRTL(lang.isRTL);
      // Reload the app for RTL changes to take effect
      await Updates.reloadAsync();
    } else {
      // If RTL state doesn't change, no need to reload the whole app
      onClose();
    }
    
    setLoading(false);
  };

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{t('selectLanguage')}</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#4ECDC4" />
          ) : (
            LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={styles.languageButton}
                onPress={() => handleLanguageChange(lang)}
              >
                <Text style={styles.languageText}>{lang.label}</Text>
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  languageButton: {
    width: '100%',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  languageText: {
    fontSize: 16,
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#FF6B6B',
  },
});

export default LanguageSelector;
