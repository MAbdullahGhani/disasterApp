import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Dimensions,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from "react-native";

const { width } = Dimensions.get("window");

// Optimized InfoCard with better input handling
const InfoCard = React.memo(({
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
}) => {
  // Local state for immediate input response
  const [localValue, setLocalValue] = useState(value);
  
  // Update local value when prop value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChangeText = useCallback((text: string) => {
    setLocalValue(text); // Update local state immediately
    onInputChange(field, text); // Update parent state
  }, [onInputChange, field]);

  return (
    <ThemedView style={styles.card} lightColor="#FFFFFF" darkColor="#1C1C1E">
      <ThemedView style={styles.infoHeader}>
        <Ionicons name={icon} size={20} color="#4ECDC4" />
        <ThemedText style={styles.infoTitle}>{title}</ThemedText>
      </ThemedView>
      {isEditing && editable ? (
        <ThemedInput
          style={styles.input}
          value={localValue}
          onChangeText={handleChangeText}
          placeholder={t("enterPlaceholder", { title: title.toLowerCase() })}
          placeholderTextColor="#999"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          blurOnSubmit={false}
          multiline={false}
          numberOfLines={1}
        />
      ) : (
        <ThemedText style={styles.infoValue}>
          {value || t("notProvided")}
        </ThemedText>
      )}
    </ThemedView>
  );
});

export default function ProfileScreen() {
  const { user, updateUserProfile, fetchUserProfile, deleteCurrentUser  } = useAuth();
  const { t } = useTranslation();
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
  const [profileLoaded, setProfileLoaded] = useState(false);
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);

  // Debounce profile loading to prevent multiple calls
  const loadUserProfile = useCallback(async () => {
    if (profileLoaded) return;
    
    try {
      // Use InteractionManager to defer heavy operations
      InteractionManager.runAfterInteractions(async () => {
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
        setProfileLoaded(true);
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfileLoaded(true);
    }
  }, [user, fetchUserProfile, profileLoaded]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // Direct input change without throttling for smooth typing
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      
      // Use InteractionManager for heavy operations
      const result = await new Promise<any>((resolve) => {
        InteractionManager.runAfterInteractions(async () => {
          const updateResult = await updateUserProfile(formData);
          resolve(updateResult);
        });
      });

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
  }, [formData, updateUserProfile, t, loading]);

  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      handleSave();
    } else {
      setIsEditing(true);
    }
  }, [isEditing, handleSave]);

  const handleGoBack = useCallback(() => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  }, [navigation]);

  // Add keyboard dismiss handler that doesn't interfere with scrolling
  const handleContainerPress = useCallback(() => {
    // Only dismiss keyboard if an input is focused
    if (isEditing) {
      Keyboard.dismiss();
    }
  }, [isEditing]);

  // Memoize only essential computed values
  const userDisplayName = useMemo(() => {
    return user?.displayName || formData.displayName || user?.email || t("anonymousUser");
  }, [user?.displayName, formData.displayName, user?.email, t]);

    const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      t("deleteAccountConfirmation.title"),
      t("deleteAccountConfirmation.message"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const result = await deleteCurrentUser();
              if (result.success) {
                Alert.alert(t("success"), t("accountDeletedSuccess"));
                // The AuthContext listener will handle navigating the user away.
              } else {
                Alert.alert(t("error"), result.error || t("accountDeleteFailed"));
              }
            } catch (err) {
              console.error("Deletion process failed:", err);
              Alert.alert(t("error"), t("accountDeleteError"));
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [deleteCurrentUser, t]);

  const profileImage = useMemo(
    () => (
      <ThemedText style={styles.profileAvatarText}>
        {userDisplayName.charAt(0).toUpperCase()}
      </ThemedText>
    ),
    [userDisplayName]
  );

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
          <ThemedView style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={24} color="#aaa" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileAvatar} disabled>
              {profileImage}
            </TouchableOpacity>
            <ThemedView style={styles.profileInfo}>
              <ThemedText style={styles.profileName}>
                {userDisplayName}
              </ThemedText>
              <ThemedText style={styles.profileStatus}>
                {user?.isAnonymous ? t("guestAccount") : t("verifiedUser")}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditToggle}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons name={isEditing ? "checkmark" : "pencil"} size={20} color="#fff"/>
          </TouchableOpacity>

          {/* Optimized ScrollView */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="never"
            keyboardDismissMode="on-drag"
            // Critical touch handling props
            scrollEnabled={true}
            scrollEventThrottle={1}
            decelerationRate="fast"
            bounces={Platform.OS === 'ios'}
            bouncesZoom={false}
            alwaysBounceVertical={Platform.OS === 'ios'}
            // Touch response fixes
            directionalLockEnabled={false}
            canCancelContentTouches={true}
            // Performance props
            removeClippedSubviews={false}
            nestedScrollEnabled={false}
            persistentScrollbar={false}
          >
            {/* Personal Info Section */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                {t("personalInfo")}
              </ThemedText>
              <InfoCard 
                icon="person-outline" 
                title={t("displayName")} 
                value={formData.displayName} 
                field="displayName" 
                isEditing={isEditing} 
                onInputChange={handleInputChange} 
                t={t} 
              />
              <InfoCard 
                icon="mail-outline" 
                title={t("email")} 
                value={formData.email} 
                field="email" 
                isEditing={isEditing} 
                onInputChange={handleInputChange} 
                editable={!user?.isAnonymous} 
                t={t} 
              />
              <InfoCard 
                icon="call-outline" 
                title={t("phone")} 
                value={formData.phone} 
                field="phone" 
                isEditing={isEditing} 
                onInputChange={handleInputChange} 
                t={t} 
              />
              <InfoCard 
                icon="location-outline" 
                title={t("location")} 
                value={formData.location} 
                field="location" 
                isEditing={isEditing} 
                onInputChange={handleInputChange} 
                t={t} 
              />
            </ThemedView>

            {/* Emergency Info Section */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                {t("emergencyInfo")}
              </ThemedText>
              <InfoCard 
                icon="medical-outline" 
                title={t("emergencyContact")} 
                value={formData.emergencyContact} 
                field="emergencyContact" 
                isEditing={isEditing} 
                onInputChange={handleInputChange} 
                t={t} 
              />
            </ThemedView>

            {/* Account Stats Section */}
            {/* <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                {t("accountStats")}
              </ThemedText>
              <ThemedView style={styles.statsContainer}>
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
            </ThemedView> */}

            {/* Action Buttons Section */}
            <TouchableOpacity
                style={styles.deleteSection}
              activeOpacity={0.7}
              // delayPressIn={0}
              onPress={handleDeleteAccount}
            >
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              <ThemedText style={[styles.actionText, { color: "#FF6B6B" }]}>
                {t("deleteAccount")}
              </ThemedText>
            </TouchableOpacity>
            {/* Add padding at bottom for better scrolling */}
            <ThemedView style={styles.bottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 50,
  },
  bottomPadding: {
    height: 50,
  },
  header: {
    flexDirection: "row",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    position: 'relative',
  },
  headerButton: {
    position: 'absolute',
    left: 20,
    top: 40,
    zIndex: 10,
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
    alignItems: "flex-start",
  },
  input: {
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4ECDC4",
    marginTop: 6,
    textAlign: "left",
  },
  editButton: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "#4ECDC4",
    borderRadius: 20,
    padding: 10,
    zIndex: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 25,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
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
  deleteSection: {
    borderRadius: 15,
    marginTop: 3,
    borderWidth: 1,
    margin: 20,
    borderColor: 'rgba(255, 0, 0, 1)'  ,
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "left",
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
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 16,
    textAlign: "left",
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
    textAlign: "left",
  },
});