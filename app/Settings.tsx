import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useColorScheme, I18nManager } from "react-native";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";

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

  const handleSettingToggle = (key: keyof SettingsState, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
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
            onPress={() => {
              Alert.alert(
                t("clearStorage"),
                t("clearStorageConfirm"),
                [
                  { text: t("cancel"), style: "cancel" },
                  { text: t("confirm"), onPress: () => {} }
                ]
              );
            }}
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
            onPress={() => {}}
          />
          <SettingItem
            icon="shield-outline"
            title={<ThemedText>{t("privacyPolicy")}</ThemedText>}
            showToggle={false}
            onPress={() => {}}
          />
        </ThemedView>

        <ThemedView style={styles.section}>
          <SectionHeader title={t("dangerZone")} />
          <SettingItem
            icon="refresh-outline"
            title={<ThemedText>{t("resetSettings")}</ThemedText>}
            description={t("resetSettingsDesc")}
            showToggle={false}
            onPress={() => {
              Alert.alert(
                t("resetSettings"),
                t("resetSettingsConfirm"),
                [
                  { text: t("cancel"), style: "cancel" },
                  { text: t("reset"), style: "destructive", onPress: () => {} }
                ]
              );
            }}
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