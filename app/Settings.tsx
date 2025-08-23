import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useColorScheme, I18nManager, Appearance } from "react-native";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import LanguageSelector from "../components/LanguageSelector";

// Define the shape of the settings state
interface SettingsState {
  notifications: boolean;
  locationServices: boolean;
  emergencyAlerts: boolean;
  darkMode: boolean;
}

// Define props for the SettingItem component
interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: React.ReactNode;
  description?: string;
  value?: boolean;
  onToggle?: (value: boolean) => void;
  showToggle?: boolean;
  onPress?: () => void;
  iconColor?: string;
}

// Define props for the SectionHeader component
interface SectionHeaderProps {
  title: string;
}

// Storage keys for settings
const STORAGE_KEYS = {
  NOTIFICATIONS: 'settings_notifications',
  LOCATION_SERVICES: 'settings_location_services',
  EMERGENCY_ALERTS: 'settings_emergency_alerts',
  DARK_MODE: 'settings_dark_mode',
  ALL_SETTINGS: 'all_settings'
};

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();

  // Get current language display name
  const getCurrentLanguageDisplay = () => {
    const languageNames = {
      en: "English",
      ur: "اردو (Urdu)",
    };
    return languageNames[i18n.language] || "English";
  };

  const getThemeColors = () => {
    const isDark = colorScheme === "dark";
    return {
      iconColor: isDark ? "#FFFFFF" : "#333333",
    };
  };
  
  const themeColors = getThemeColors();

  const [settings, setSettings] = useState<SettingsState>({
    notifications: true,
    locationServices: true,
    emergencyAlerts: true,
    darkMode: colorScheme === "dark",
  });

  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);

  // Load settings from storage on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Save settings to storage whenever settings change
  useEffect(() => {
    saveSettings();
  }, [settings]);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(STORAGE_KEYS.ALL_SETTINGS);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleSettingToggle = async (key: keyof SettingsState, value: boolean) => {
    // Handle specific setting logic
    switch (key) {
      case 'notifications':
        await handleNotificationToggle(value);
        break;
      case 'locationServices':
        await handleLocationToggle(value);
        break;
      case 'emergencyAlerts':
        await handleEmergencyAlertsToggle(value);
        break;
      case 'darkMode':
        await handleDarkModeToggle(value);
        break;
    }
    
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        // Request notification permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          Alert.alert(
            t('permissionRequired'),
            t('notificationPermissionRequired'),
            [
              { text: t('cancel'), style: 'cancel' },
              { text: t('openSettings'), onPress: () => Linking.openSettings() }
            ]
          );
          return;
        }
        
        // Configure notification handler
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        
        Alert.alert(t('success'), t('notificationsEnabled'));
      } else {
        Alert.alert(t('success'), t('notificationsDisabled'));
      }
    } catch (error) {
      console.error('Error handling notifications:', error);
      Alert.alert(t('error'), t('notificationError'));
    }
  };

  const handleLocationToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        // Request location permissions
        let { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(
            t('permissionRequired'),
            t('locationPermissionRequired'),
            [
              { text: t('cancel'), style: 'cancel' },
              { text: t('openSettings'), onPress: () => Linking.openSettings() }
            ]
          );
          return;
        }
        
        Alert.alert(t('success'), t('locationServicesEnabled'));
      } else {
        Alert.alert(t('success'), t('locationServicesDisabled'));
      }
    } catch (error) {
      console.error('Error handling location services:', error);
      Alert.alert(t('error'), t('locationError'));
    }
  };

  const handleEmergencyAlertsToggle = async (enabled: boolean) => {
    if (enabled) {
      Alert.alert(t('success'), t('emergencyAlertsEnabled'));
    } else {
      Alert.alert(
        t('warning'),
        t('emergencyAlertsDisabledWarning'),
        [
          { text: t('cancel'), style: 'cancel' },
          { 
            text: t('disable'), 
            style: 'destructive',
            onPress: () => Alert.alert(t('success'), t('emergencyAlertsDisabled'))
          }
        ]
      );
    }
  };

  const handleDarkModeToggle = async (enabled: boolean) => {
    try {
      // Apply theme change
      Appearance.setColorScheme(enabled ? 'dark' : 'light');
      Alert.alert(t('success'), enabled ? t('darkModeEnabled') : t('lightModeEnabled'));
    } catch (error) {
      console.error('Error changing theme:', error);
      Alert.alert(t('error'), t('themeChangeError'));
    }
  };

  const handleClearStorage = () => {
    Alert.alert(
      t("clearStorage"),
      t("clearStorageConfirm"),
      [
        { text: t("cancel"), style: "cancel" },
        { 
          text: t("confirm"), 
          style: "destructive",
          onPress: async () => {
            try {
              // Clear app cache/storage
              await AsyncStorage.multiRemove([
                STORAGE_KEYS.ALL_SETTINGS,
                // Add other storage keys you want to clear
              ]);
              Alert.alert(t('success'), t('storageCleared'));
            } catch (error) {
              console.error('Error clearing storage:', error);
              Alert.alert(t('error'), t('storageClearError'));
            }
          }
        }
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      t("resetSettings"),
      t("resetSettingsConfirm"),
      [
        { text: t("cancel"), style: "cancel" },
        { 
          text: t("reset"), 
          style: "destructive", 
          onPress: async () => {
            try {
              // Reset to default settings
              const defaultSettings: SettingsState = {
                notifications: true,
                locationServices: true,
                emergencyAlerts: true,
                darkMode: false,
              };
              
              setSettings(defaultSettings);
              await AsyncStorage.setItem(STORAGE_KEYS.ALL_SETTINGS, JSON.stringify(defaultSettings));
              
              // Reset theme to light mode
              Appearance.setColorScheme('light');
              
              Alert.alert(t('success'), t('settingsReset'));
            } catch (error) {
              console.error('Error resetting settings:', error);
              Alert.alert(t('error'), t('resetError'));
            }
          }
        }
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      t('privacyPolicy'),
      t('privacyPolicyMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('openBrowser'), 
          onPress: () => {
            // Replace with your actual privacy policy URL
            Linking.openURL('https://yourapp.com/privacy-policy');
          }
        }
      ]
    );
  };

  const handleAppVersion = () => {
    Alert.alert(
      t('appInfo'),
      `${t('appVersion')}: 1.0.0\n${t('buildNumber')}: 001\n${t('lastUpdated')}: ${new Date().toLocaleDateString()}`,
      [{ text: t('ok'), style: 'default' }]
    );
  };

  const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    description,
    value,
    onToggle,
    showToggle = true,
    onPress,
    iconColor = "#4ECDC4",
  }) => (
    <TouchableOpacity
      style={[
        styles.settingItem,
        { flexDirection: I18nManager.isRTL ? "row-reverse" : "row" },
      ]}
      onPress={onPress}
      disabled={!onPress && showToggle}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View
        style={[
          styles.settingContent,
          {
            marginLeft: I18nManager.isRTL ? 0 : 12,
            marginRight: I18nManager.isRTL ? 12 : 0,
            alignItems: I18nManager.isRTL ? "flex-end" : "flex-start",
          },
        ]}
      >
        <ThemedText style={[
          styles.settingTitle,
          { textAlign: I18nManager.isRTL ? "right" : "left" }
        ]}>
          {title}
        </ThemedText>
        {description && (
          <ThemedText style={[
            styles.settingDescription,
            { textAlign: I18nManager.isRTL ? "right" : "left" }
          ]}>
            {description}
          </ThemedText>
        )}
      </View>
      {onPress && !showToggle ? (
        <Ionicons
          name={I18nManager.isRTL ? "chevron-back" : "chevron-forward"}
          size={16}
          color="#999"
        />
      ) : (
        showToggle && (
          <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{ false: "#E0E0E0", true: "#4ECDC4" }}
            thumbColor={"#FFFFFF"}
          />
        )
      )}
    </TouchableOpacity>
  );

  const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
    <ThemedText
      style={[
        styles.sectionHeader,
        { textAlign: I18nManager.isRTL ? "right" : "left" },
      ]}
    >
      {title}
    </ThemedText>
  );

  return (
    <ThemedView style={styles.container}>
      <LanguageSelector
        isVisible={isLanguageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />

      <ThemedView
        style={[
          styles.header,
          { flexDirection: I18nManager.isRTL ? "row-reverse" : "row" },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            { 
              left: I18nManager.isRTL ? undefined : 16,
              right: I18nManager.isRTL ? 16 : undefined 
            }
          ]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name={I18nManager.isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color="#aaa"
          />
        </TouchableOpacity>
        <Ionicons name="settings" size={24} color={themeColors.iconColor} />
        <ThemedText
          style={[
            styles.headerTitle,
            {
              marginLeft: I18nManager.isRTL ? 0 : 12,
              marginRight: I18nManager.isRTL ? 12 : 0,
            },
          ]}
        >
          {t("settings")}
        </ThemedText>
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.section}>
          <SectionHeader title={t("notifications")} />
          <SettingItem
            icon="notifications-outline"
            title={<ThemedText>{t("pushNotifications")}</ThemedText>}
            description={t("receiveAlerts")}
            value={settings.notifications}
            onToggle={(value) => handleSettingToggle("notifications", value)}
          />
          <SettingItem
            icon="warning-outline"
            title={<ThemedText>{t("emergencyAlerts")}</ThemedText>}
            description={t("criticalDisasterWarnings")}
            value={settings.emergencyAlerts}
            onToggle={(value) => handleSettingToggle("emergencyAlerts", value)}
            iconColor="#FF6B6B"
          />
        </ThemedView>

        <ThemedView style={styles.section}>
          <SectionHeader title={t("locationAndPrivacy")} />
          <SettingItem
            icon="location-outline"
            title={<ThemedText>{t("locationServices")}</ThemedText>}
            description={t("enableLocationBasedAlerts")}
            value={settings.locationServices}
            onToggle={(value) => handleSettingToggle("locationServices", value)}
          />
        </ThemedView>

        <ThemedView style={styles.section}>
          <SectionHeader title={t("dataAndStorage")} />
          <SettingItem
            icon="trash-outline"
            title={<ThemedText>{t("clearStorage")}</ThemedText>}
            description={t("freeUpStorage")}
            showToggle={false}
            onPress={handleClearStorage}
          />
        </ThemedView>

        <ThemedView style={styles.section}>
          <SectionHeader title={t("appearance")} />
          <SettingItem
            icon="moon-outline"
            title={<ThemedText>{t("darkMode")}</ThemedText>}
            description={t("useDarkTheme")}
            value={settings.darkMode}
            onToggle={(value) => handleSettingToggle("darkMode", value)}
          />
          <SettingItem
            icon="language-outline"
            title={<ThemedText>{t("language")}</ThemedText>}
            description={getCurrentLanguageDisplay()}
            showToggle={false}
            onPress={() => setLanguageModalVisible(true)}
          />
        </ThemedView>

        <ThemedView style={styles.section}>
          <SectionHeader title={t("about")} />
          <SettingItem
            icon="information-circle-outline"
            title={<ThemedText>{t("appVersion")}</ThemedText>}
            description="v1.0.0"
            showToggle={false}
            onPress={handleAppVersion}
          />
          <SettingItem
            icon="shield-outline"
            title={<ThemedText>{t("privacyPolicy")}</ThemedText>}
            showToggle={false}
            onPress={handlePrivacyPolicy}
          />
        </ThemedView>

        <ThemedView style={styles.section}>
          <SectionHeader title={t("dangerZone")} />
          <SettingItem
            icon="refresh-outline"
            title={<ThemedText>{t("resetSettings")}</ThemedText>}
            description={t("resetSettingsDesc")}
            showToggle={false}
            onPress={handleResetSettings}
            iconColor="#FF6B6B"
          />
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    position: "absolute",
    bottom: 60,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    paddingTop: 10,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4ECDC4",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  settingItem: {
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  settingIcon: {
    width: 40,
    alignItems: "center",
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
});