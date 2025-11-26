import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  I18nManager,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import * as Updates from "expo-updates";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Import your translation files
import enTranslations from "../i18n/en.json";
import urTranslations from "../i18n/ur.json";

const LANGUAGE_STORAGE_KEY = "@app_language";
const RTL_LANGUAGES = ["ur", "ar", "he", "fa"];

interface Language {
  code: string;
  label: string;
  isRTL: boolean;
}

interface LanguageSelectorProps {
  isVisible: boolean;
  onClose: () => void;
}

const LANGUAGES: Language[] = [
  { code: "en", label: "English", isRTL: false },
  { code: "ur", label: "Urdu (اردو)", isRTL: true },
];

// CORRECT way to detect build type
const isExpoGo = Constants.appOwnership === "expo";
const isStandaloneApp = Constants.appOwnership === "standalone";
const isDevelopmentBuild = Constants.appOwnership === "guest" || __DEV__;

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  isVisible,
  onClose,
}) => {
  const { i18n, t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);

  const handleLanguageChange = async (lang: Language) => {
    try {
      setLoading(true);

      const currentLanguage = i18n.language;

      // Don't do anything if same language is selected
      if (currentLanguage === lang.code) {
        setLoading(false);
        onClose();
        return;
      }

      // Add the appropriate resource bundle
      if (lang.code === "en" && !i18n.hasResourceBundle("en", "translation")) {
        i18n.addResourceBundle("en", "translation", enTranslations, true, true);
      } else if (lang.code === "ur" && !i18n.hasResourceBundle("ur", "translation")) {
        i18n.addResourceBundle("ur", "translation", urTranslations, true, true);
      }

      // Change the language
      await i18n.changeLanguage(lang.code);

      // Save language to storage
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang.code);

      // Determine RTL status for both languages
      const newIsRTL = RTL_LANGUAGES.includes(lang.code);
      const currentIsRTL = RTL_LANGUAGES.includes(currentLanguage);

      // Enable RTL support
      I18nManager.allowRTL(true);

      // Handle RTL changes based on build type
      if (newIsRTL !== currentIsRTL) {
        // Set the new layout direction
        I18nManager.forceRTL(newIsRTL);

        if (isExpoGo) {
          // In Expo Go, show manual restart alert
          Alert.alert(
            "Restart Required",
            "Please manually close and reopen the app to apply the language layout.",
            [{ 
              text: "OK", 
              onPress: () => {
                setLoading(false);
                onClose();
              }
            }]
          );
        } else {
          // In native builds (APK/development builds), try automatic reload
          console.log("Attempting automatic app reload for RTL change...");
          
          try {
            // Close modal immediately
            onClose();
            setLoading(false);

            // Check if Updates.reloadAsync is available
            if (Updates.reloadAsync) {
              // Small delay to ensure state is clean
              setTimeout(async () => {
                try {
                  await Updates.reloadAsync();
                } catch (reloadError) {
                  console.error("Updates.reloadAsync failed:", reloadError);
                  // Fallback to manual restart alert
                  Alert.alert(
                    "Restart Required",
                    "Please manually close and reopen the app to apply the language changes.",
                    [{ text: "OK" }]
                  );
                }
              }, 500);
            } else {
              // Updates not available, show manual restart
              Alert.alert(
                "Restart Required", 
                "Please manually close and reopen the app to apply the language changes.",
                [{ text: "OK" }]
              );
            }
          } catch (error) {
            console.error("Error during automatic reload:", error);
            Alert.alert(
              "Restart Required",
              "Please manually close and reopen the app to apply the language changes.",
              [{ text: "OK" }]
            );
          }
        }
      } else {
        // Same layout direction, no restart needed
        console.log(`Language changed to ${lang.code} without restart`);
        setLoading(false);
        onClose();
      }

    } catch (error) {
      console.error("Failed to change language:", error);
      setLoading(false);
      Alert.alert(
        "Language Change Error",
        "Could not change language. Please try again.",
        [{ text: "OK", onPress: onClose }]
      );
    }
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
          <Text style={styles.title}>{t("selectLanguage")}</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4ECDC4" />
              <Text style={styles.loadingText}>Switching language...</Text>
            </View>
          ) : (
            LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageButton,
                  i18n.language === lang.code && styles.activeLanguageButton,
                ]}
                onPress={() => handleLanguageChange(lang)}
              >
                <Text
                  style={[
                    styles.languageText,
                    i18n.language === lang.code && styles.activeLanguageText,
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{t("close") || "Close"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  languageButton: {
    width: "100%",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    borderRadius: 8,
    marginBottom: 5,
  },
  activeLanguageButton: {
    backgroundColor: "#4ECDC4",
    borderBottomColor: "#4ECDC4",
  },
  languageText: {
    fontSize: 16,
    textAlign: "center",
    color: "#333",
  },
  activeLanguageText: {
    color: "white",
    fontWeight: "bold",
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
  },
  closeButtonText: {
    fontSize: 16,
    color: "#FF6B6B",
  },
});

export default LanguageSelector;