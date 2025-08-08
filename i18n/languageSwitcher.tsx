import { useTranslation } from "react-i18next";
import { View, TouchableOpacity, Text } from "react-native";
import { I18nManager } from "react-native";
import * as Updates from "expo-updates";

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguageAndLayout = async (lng: string) => {
    // Change the language with i18next
    await i18n.changeLanguage(lng);

    // Determine if the new language is RTL
    const isRTL = lng === "ur";

    // Check if the layout direction needs to change
    if (isRTL !== I18nManager.isRTL) {
      // Set the new layout direction
      I18nManager.forceRTL(isRTL);
      // Reload the app for the change to take effect
      await Updates.reloadAsync();
    }
  };

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <TouchableOpacity onPress={() => changeLanguageAndLayout("en")}>
        <Text>English</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => changeLanguageAndLayout("ur")}>
        <Text>اردو</Text>
      </TouchableOpacity>
    </View>
  );
};
