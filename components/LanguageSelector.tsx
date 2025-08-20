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

// Import your translation files
import enTranslations from "../i18n/en.json";
import urTranslations from "../i18n/ur.json";

const LANGUAGE_STORAGE_KEY = "@app_language";
const RTL_LANGUAGES = ["ur", "ar", "he", "fa"];

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
  { code: "en", label: "English", isRTL: false },
  { code: "ur", label: "Urdu (اردو)", isRTL: true },
];

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
      if (lang.code === "en") {
        i18n.addResourceBundle("en", "translation", enTranslations, true, true);
      } else if (lang.code === "ur") {
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

      // Always reload if switching between different layout directions
      if (newIsRTL !== currentIsRTL) {
        // Set the new layout direction
        I18nManager.forceRTL(newIsRTL);

        const languageNames = {
          en: "English",
          ur: "اردو",
        };

        const selectedLanguageName = languageNames[lang.code] || lang.label;
        setTimeout(async () => {
          await Updates.reloadAsync();
        }, 100);
        // Alert.alert(
        //   "Restart Required",
        //   `Switching to ${selectedLanguageName} requires an app restart to apply the correct text direction.`,
        //   [
        //     {
        //       text: "Cancel",
        //       style: "cancel",
        //       onPress: async () => {
        //         // Revert language change if user cancels
        //         await i18n.changeLanguage(currentLanguage);
        //         await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
        //         setLoading(false);
        //       }
        //     },
        //     {
        //       text: "Restart Now",
        //       onPress: async () => {
        //         try {
        //           // Small delay to ensure language is saved
        //           setTimeout(async () => {
        //             await Updates.reloadAsync();
        //           }, 100);
        //         } catch (error) {
        //           console.error('Error restarting app:', error);
        //           Alert.alert(
        //             "Manual Restart Required",
        //             "Please manually close and reopen the app to apply the language changes.",
        //             [{ text: "OK" }]
        //           );
        //         }
        //       },
        //     },
        //   ],
        //   { cancelable: false }
        // );
      } else {
        // Same layout direction, no restart needed
        console.log(`Language changed to ${lang.code} without restart`);
        onClose();
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to change language:", error);
      Alert.alert(
        "Language Change Error",
        "Could not change language. Please try again."
      );
      setLoading(false);
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
            <ActivityIndicator size="large" color="#4ECDC4" />
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
