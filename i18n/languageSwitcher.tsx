import * as Updates from "expo-updates";
import { useTranslation } from "react-i18next";
import { Alert, I18nManager, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const RTL_LANGUAGES = ['ur', 'ar', 'he', 'fa'];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguageAndLayout = async (lng: string) => {
    try {
      const currentLanguage = i18n.language;
      
      // Don't do anything if same language is selected
      if (currentLanguage === lng) return;

      // 1. Change the language in the i18next instance.
      await i18n.changeLanguage(lng);

      // 2. Determine RTL status for both languages
      const newIsRTL = RTL_LANGUAGES.includes(lng);
      const currentIsRTL = RTL_LANGUAGES.includes(currentLanguage);

      // 3. Enable RTL support
      I18nManager.allowRTL(true);

      // 4. Force reload if switching between different layout directions
      if (newIsRTL !== currentIsRTL) {
        // Set the new layout direction
        I18nManager.forceRTL(newIsRTL);

        const languageNames = {
          en: 'English',
          ur: 'اردو'
        };

        const selectedLanguageName = languageNames[lng] || lng;
        
        Alert.alert(
          "Restart Required",
          `Switching to ${selectedLanguageName} requires an app restart to apply the correct text direction.`,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                // Revert language change if user cancels
                i18n.changeLanguage(currentLanguage);
              }
            },
            {
              text: "Restart Now",
              onPress: async () => {
                try {
                  // Small delay to ensure language is saved
                  setTimeout(async () => {
                    await Updates.reloadAsync();
                  }, 100);
                } catch (error) {
                  console.error('Error restarting app:', error);
                  Alert.alert(
                    "Manual Restart Required",
                    "Please manually close and reopen the app to apply the language changes.",
                    [{ text: "OK" }]
                  );
                }
              },
            },
          ],
          { cancelable: false }
        );
      } else {
        // Same layout direction, no restart needed
        console.log(`Language changed to ${lng} without restart`);
      }
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(
        "Error", 
        "Failed to change language. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <View style={[
      styles.container,
      { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }
    ]}>
      <TouchableOpacity 
        style={[styles.button, i18n.language === 'en' && styles.activeButton]} 
        onPress={() => changeLanguageAndLayout("en")}
      >
        <Text style={[
          styles.buttonText, 
          i18n.language === 'en' && styles.activeButtonText,
          { textAlign: 'center' }
        ]}>
          English
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.button, i18n.language === 'ur' && styles.activeButton]} 
        onPress={() => changeLanguageAndLayout("ur")}
      >
        <Text style={[
          styles.buttonText, 
          i18n.language === 'ur' && styles.activeButtonText,
          { textAlign: 'center' }
        ]}>
          اردو
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    marginVertical: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  activeButton: {
    backgroundColor: '#4ECDC4',
  },
  buttonText: {
    fontSize: 16,
    color: '#333',
  },
  activeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});

export default LanguageSwitcher;