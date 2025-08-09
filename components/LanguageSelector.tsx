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
];

const TRANSLATIONS_CACHE_KEY = '@cached_translations';

// --- Helper function to add a delay ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- API Fetching Logic with Chunking and Fallback ---
const fetchWithMyMemory = async (text: string, langPair: string): Promise<string> => {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MyMemory API Error: Status ${res.status}`);
    const data = await res.json();
    if (data.responseStatus !== 200) throw new Error(`MyMemory API Error: ${data.responseDetails}`);
    return data.responseData.translatedText;
};

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ isVisible, onClose }) => {
  const { i18n, t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);

  const fetchTranslationsInChunks = async (targetLanguage: string): Promise<Record<string, string> | null> => {
    try {
      const cached = await AsyncStorage.getItem(TRANSLATIONS_CACHE_KEY);
      const cachedTranslations = cached ? JSON.parse(cached) : {};
      if (cachedTranslations[targetLanguage]) {
        console.log(`Loading ${targetLanguage} translations from cache.`);
        return cachedTranslations[targetLanguage];
      }

      console.log(`Fetching ${targetLanguage} translations in chunks...`);
      
      const keys = Object.keys(enTranslations);
      const values = Object.values(enTranslations);
      const newTranslations: Record<string, string> = {};
      const chunkSize = 5; // Translate 5 words at a time

      for (let i = 0; i < values.length; i += chunkSize) {
        const chunk = values.slice(i, i + chunkSize);
        const chunkKeys = keys.slice(i, i + chunkSize);
        
        const stringToTranslate = chunk.join('\n');
        
        console.log(`Translating chunk ${i / chunkSize + 1}...`);
        const translatedChunkText = await fetchWithMyMemory(stringToTranslate, `en|${targetLanguage}`);
        const translatedValues = translatedChunkText.split('\n');

        translatedValues.forEach((translatedValue, index) => {
          const originalKey = chunkKeys[index];
          if (originalKey) {
            newTranslations[originalKey] = translatedValue.trim() || chunk[index]; // Fallback to original
          }
        });

        await sleep(500); // Wait for 500ms to avoid rate-limiting
      }

      cachedTranslations[targetLanguage] = newTranslations;
      await AsyncStorage.setItem(TRANSLATIONS_CACHE_KEY, JSON.stringify(cachedTranslations));

      return newTranslations;

    } catch (error) {
      console.error("Failed to fetch translations:", error);
      Alert.alert('Translation Error', 'Could not load translations. The service may be temporarily unavailable. Please try again later.');
      return null;
    }
  };

  const handleLanguageChange = async (lang: Language) => {
    setLoading(true);
    
    if (lang.code === 'en') {
      i18n.addResourceBundle('en', 'translation', enTranslations, true, true);
    } else {
      const translations = await fetchTranslationsInChunks(lang.code);
      if (!translations) {
        setLoading(false);
        return;
      }
      i18n.addResourceBundle(lang.code, 'translation', translations, true, true);
    }

    await i18n.changeLanguage(lang.code);

    const currentIsRTL = I18nManager.isRTL;
    if (currentIsRTL !== lang.isRTL) {
      I18nManager.forceRTL(lang.isRTL);
      await Updates.reloadAsync();
    } else {
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
