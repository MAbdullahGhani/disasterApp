import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Dimensions,
  I18nManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { ThemedInput } from "@/components/ThemedInput";
import { useNavigation } from "expo-router";

const { width } = Dimensions.get("window");

// Memoized InfoCard component
const InfoCard = React.memo(
  ({
    icon,
    title,
    value,
    field,
    isEditing,
    onInputChange,
    editable = true,
    t,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    value: string;
    field: string;
    isEditing: boolean;
    onInputChange: (field: string, value: string) => void;
    editable?: boolean;
    t: (key: string, options?: any) => string;
  }) => (
    <ThemedView style={styles.card} lightColor="#FFFFFF" darkColor="#1C1C1E">
      <ThemedView style={[styles.infoHeader, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name={icon} size={20} color="#4ECDC4" />
        <ThemedText style={[styles.infoTitle, I18nManager.isRTL ? { marginRight: 8 } : { marginLeft: 8 }]}>{title}</ThemedText>
      </ThemedView>
      {isEditing && editable ? (
        <ThemedInput
          style={[styles.input, { textAlign: I18nManager.isRTL ? 'right' : 'left' }]}
          value={value}
          onChangeText={(text) => onInputChange(field, text)}
          placeholder={t("enterPlaceholder", { title: title.toLowerCase() })}
          placeholderTextColor="#999"
          autoCorrect={false}
          returnKeyType="done"
          blurOnSubmit={false}
        />
      ) : (
        <ThemedText style={[styles.infoValue, { textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>
          {value || t("notProvided")}
        </ThemedText>
      )}
    </ThemedView>
  )
);

export default function ProfileScreen() {
  const { user, updateUserProfile, fetchUserProfile } = useAuth();
  const { t, i18n } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    phone: "",
    location: "",
    emergencyContact: "",
    profilePicture: user?.photoURL || "",
  });
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = useCallback(async () => {
    try {
      const profileData = await fetchUserProfile();
      if (profileData) {
        setFormData((prev) => ({
          ...prev,
          displayName: user?.displayName || profileData.displayName || "",
          email: user?.email || "",
          phone: profileData.phone || "",
          location: profileData.location || "",
          emergencyContact: profileData.emergencyContact || "",
        }));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }, [user, fetchUserProfile]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setLoading(true);
      const result = await updateUserProfile(formData);
      if (result.success) {
        setIsEditing(false);
        Alert.alert(t("success"), t("profileUpdated"));
      } else {
        Alert.alert(t("error"), result.error || t("profileUpdateFailed"));
      }
    } catch (error) {
      Alert.alert(t("error"), t("profileUpdateError"));
    } finally {
      setLoading(false);
    }
  }, [formData, updateUserProfile, t]);

  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      handleSave();
    } else {
      setIsEditing(true);
    }
  }, [isEditing, handleSave]);

  const handleGoBack = useCallback(() => {
    if (typeof navigation !== "undefined" && navigation.goBack) {
      navigation.goBack();
    }
  }, [navigation]);

  const userDisplayName = useMemo(() => {
    return (
      user?.displayName ||
      formData.displayName ||
      user?.email ||
      t("anonymousUser")
    );
  }, [user?.displayName, formData.displayName, user?.email, t]);

  const profileImage = useMemo(
    () => (
      <ThemedText style={styles.profileAvatarText}>
        {userDisplayName.charAt(0).toUpperCase()}
      </ThemedText>
    ),
    [userDisplayName]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ThemedView style={styles.container}>
          <ThemedView style={[styles.header, { flexDirection: I18nManager.isRTL ? "row-reverse" : "row" }]}>
            <TouchableOpacity style={[styles.headerButton, I18nManager.isRTL ? styles.headerButtonRTL : styles.headerButtonLTR]} onPress={handleGoBack}>
              <Ionicons name={I18nManager.isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#aaa" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileAvatar} disabled>
              {profileImage}
            </TouchableOpacity>
            <ThemedView style={[styles.profileInfo, { alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start' }]}>
              <ThemedText style={styles.profileName}>
                {userDisplayName}
              </ThemedText>
              <ThemedText style={styles.profileStatus}>
                {user?.isAnonymous ? t("guestAccount") : t("verifiedUser")}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <TouchableOpacity
            style={[styles.editButton, I18nManager.isRTL ? styles.editButtonRTL : styles.editButtonLTR]}
            onPress={handleEditToggle}
            disabled={loading}
          >
            <Ionicons name={isEditing ? "checkmark" : "pencil"} size={20} color="#fff"/>
          </TouchableOpacity>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <ThemedView style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>
                {t("personalInfo")}
              </ThemedText>
              <InfoCard icon="person-outline" title={t("displayName")} value={formData.displayName} field="displayName" isEditing={isEditing} onInputChange={handleInputChange} t={t} />
              <InfoCard icon="mail-outline" title={t("email")} value={formData.email} field="email" isEditing={isEditing} onInputChange={handleInputChange} editable={!user?.isAnonymous} t={t} />
              <InfoCard icon="call-outline" title={t("phone")} value={formData.phone} field="phone" isEditing={isEditing} onInputChange={handleInputChange} t={t} />
              <InfoCard icon="location-outline" title={t("location")} value={formData.location} field="location" isEditing={isEditing} onInputChange={handleInputChange} t={t} />
            </ThemedView>

            <ThemedView style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>
                {t("emergencyInfo")}
              </ThemedText>
              <InfoCard icon="medical-outline" title={t("emergencyContact")} value={formData.emergencyContact} field="emergencyContact" isEditing={isEditing} onInputChange={handleInputChange} t={t} />
            </ThemedView>

            <ThemedView style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>
                {t("accountStats")}
              </ThemedText>
              <ThemedView style={[styles.statsContainer, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }]}>
                <ThemedView style={styles.statCard}>
                  <Ionicons name="shield-checkmark" size={24} color="#4ECDC4" />
                  <ThemedText style={styles.statNumber}>15</ThemedText>
                  <ThemedText style={styles.statLabel}>{t("alertsReceived")}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.statCard}>
                  <Ionicons name="location" size={24} color="#4ECDC4" />
                  <ThemedText style={styles.statNumber}>8</ThemedText>
                  <ThemedText style={styles.statLabel}>{t("areasMonitored")}</ThemedText>
                </ThemedView>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.section}>
              <TouchableOpacity style={[styles.actionButton, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="download-outline" size={20} color="#4ECDC4" />
                <ThemedText style={[styles.actionText, { textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>{t("downloadMyData")}</ThemedText>
                <Ionicons name={I18nManager.isRTL ? "chevron-back" : "chevron-forward"} size={16} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                <ThemedText style={[styles.actionText, { color: "#FF6B6B", textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>{t("deleteAccount")}</ThemedText>
                <Ionicons name={I18nManager.isRTL ? "chevron-back" : "chevron-forward"} size={16} color="#999" />
              </TouchableOpacity>
            </ThemedView>
          </ScrollView>
        </ThemedView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
    position: 'relative',
  },
  headerButton: {
    position: 'absolute',
    top: 70,
    zIndex: 10,
  },
  headerButtonLTR: {
    left: 20,
    top: 40,
  },
  headerButtonRTL: {
    right: 20,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(78, 205, 196, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 15,
    borderWidth: 2,
    borderColor: "#4ECDC4",
  },
  profileAvatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
  },
  input: {
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4ECDC4",
    marginTop: 6,
  },
  editButton: {
    position: "absolute",
    top: 60,
    backgroundColor: "#4ECDC4",
    borderRadius: 20,
    padding: 10,
    zIndex: 10,
  },
  editButtonLTR: {
    right: 20,
  },
  editButtonRTL: {
    left: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  card: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 3,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  profileStatus: {
    fontSize: 14,
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  infoValue: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4ECDC4",
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    marginHorizontal: 12,
  },
});
