import * as Updates from "expo-updates";
import { useTranslation } from "react-i18next";
import {
  Alert,
  I18nManager,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import your translation files
import enTranslations from "../i18n/en.json";
import urTranslations from "../i18n/ur.json";

const RTL_LANGUAGES = ["ur", "ar", "he", "fa"];
const LANGUAGE_STORAGE_KEY = "@app_language";

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguageAndLayout = async (lng: string) => {
    try {
      const currentLanguage = i18n.language;

      // Don't do anything if same language is selected
      if (currentLanguage === lng) return;

      // Add the appropriate resource bundle
      if (lng === "en") {
        i18n.addResourceBundle("en", "translation", enTranslations, true, true);
      } else if (lng === "ur") {
        i18n.addResourceBundle("ur", "translation", urTranslations, true, true);
      }

      // 1. Change the language in the i18next instance.
      await i18n.changeLanguage(lng);

      // 2. Save language to storage
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);

      // 3. Determine RTL status for both languages
      const newIsRTL = RTL_LANGUAGES.includes(lng);
      const currentIsRTL = RTL_LANGUAGES.includes(currentLanguage);

      // 4. Enable RTL support
      I18nManager.allowRTL(true);

      // 5. Always reload if switching between different layout directions
      if (newIsRTL !== currentIsRTL) {
        // Set the new layout direction
        I18nManager.forceRTL(newIsRTL);

        const languageNames = {
          en: "English",
          ur: "اردو",
        };

        const selectedLanguageName = languageNames[lng] || lng;

        setTimeout(async () => {
          await Updates.reloadAsync();
        }, 100);
      } else {
        // Same layout direction, no restart needed (this shouldn't happen with en/ur but kept for safety)
        console.log(`Language changed to ${lng} without restart`);
      }
    } catch (error) {
      console.error("Error changing language:", error);
      Alert.alert("Error", "Failed to change language. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { flexDirection: I18nManager.isRTL ? "row-reverse" : "row" },
      ]}
    >
      <TouchableOpacity
        style={[styles.button, i18n.language === "en" && styles.activeButton]}
        onPress={() => changeLanguageAndLayout("en")}
      >
        <Text
          style={[
            styles.buttonText,
            i18n.language === "en" && styles.activeButtonText,
            { textAlign: "center" },
          ]}
        >
          English
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, i18n.language === "ur" && styles.activeButton]}
        onPress={() => changeLanguageAndLayout("ur")}
      >
        <Text
          style={[
            styles.buttonText,
            i18n.language === "ur" && styles.activeButtonText,
            { textAlign: "center" },
          ]}
        >
          اردو
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    marginVertical: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  activeButton: {
    backgroundColor: "#4ECDC4",
  },
  buttonText: {
    fontSize: 16,
    color: "#333",
  },
  activeButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default LanguageSwitcher;
