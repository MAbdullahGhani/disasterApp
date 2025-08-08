import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useNavigation } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

interface SidebarMenuProps {
  visible: boolean;
  onClose: () => void;
  navigation?: any;
}

export default function SidebarMenu({ visible, onClose }: SidebarMenuProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const navigation = useNavigation();
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -width,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          const result = await logout();
          if (result.success) {
            onClose();
          } else {
            Alert.alert("Error", "Failed to sign out");
          }
        },
      },
    ]);
  };

  const handleMenuItemPress = (screen: string) => {
    console.log("Navigating to:", screen);
    onClose(); // Close the sidebar first
    setTimeout(() => {
      if (screen) {
        router.push(screen);
      }
    }, 150); // A short delay to prevent race conditions
  };

  const MenuItemButton = ({
    icon,
    title,
    onPress,
    iconColor = "#4ECDC4",
  }: {
    icon: any;
    title: string;
    onPress: () => void;
    iconColor?: string;
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemIcon}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <ThemedText style={styles.menuItemText}>{title}</ThemedText>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  const getUserDisplayName = () => {
    if (!user) return "Guest User";
    return user.displayName || user.email || "Anonymous User";
  };

  const getUserEmail = () => {
    if (!user) return "Not signed in";
    if (user.isAnonymous) return "Guest Account";
    return user.email || "No email";
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} />

        <Animated.View
          style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}
        >
          <LinearGradient colors={["#4ECDC4", "#44A08D"]} style={styles.header}>
            <View style={styles.profileSection}>
              <View style={styles.profileAvatar}>
                <ThemedText style={styles.profileAvatarText}>
                  {getUserDisplayName().charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.profileInfo}>
                <ThemedText style={styles.profileName}>
                  {getUserDisplayName()}
                </ThemedText>
                <ThemedText style={styles.profileEmail}>
                  {getUserEmail()}
                </ThemedText>
              </View>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>

          <ThemedView style={styles.menuContent}>
            {!isAuthenticated ? (
              <>
                <MenuItemButton
                  icon="log-in-outline"
                  title={<ThemedText>Sign In</ThemedText>}
                  onPress={() => handleMenuItemPress("AuthScreen")}
                />
                <MenuItemButton
                  icon="person-add-outline"
                  title={<ThemedText>Sign Up</ThemedText>}
                  onPress={() => handleMenuItemPress("AuthScreen")}
                />
                <MenuItemButton
                  icon="person-add-outline"
                  title={<ThemedText>Emergency Contacts</ThemedText>}
                  onPress={() => handleMenuItemPress("Emergency")}
                />
              </>
            ) : (
              <>
                <MenuItemButton
                  icon="person-outline"
                  title={<ThemedText>Profile</ThemedText>}
                  onPress={() => handleMenuItemPress("Profile")}
                />
                <MenuItemButton
                  icon="settings-outline"
                  title={<ThemedText>Settings</ThemedText>}
                  onPress={() => handleMenuItemPress("Settings")}
                />
                {/* <MenuItemButton
                  icon="help-circle-outline"
                  title={<ThemedText>Help & Support</ThemedText>}
                  onPress={() => handleMenuItemPress("Help")}
                /> */}
                <MenuItemButton
                  icon="person-add-outline"
                  title={<ThemedText>Emergency Contacts</ThemedText>}
                  onPress={() => handleMenuItemPress("Emergency")}
                />

                <MenuItemButton
                  icon="log-out-outline"
                  title={<ThemedText>Sign Out</ThemedText>}
                  onPress={handleLogout}
                  iconColor="#FF6B6B"
                />
              </>
            )}
          </ThemedView>

          <ThemedView style={styles.footer}>
            <ThemedText style={styles.footerText}>
              © Pakistan Disaster Ready v1.0
            </ThemedText>
          </ThemedView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flexDirection: "row",
  },
  overlayTouch: {
    flex: 1,
  },
  sidebar: {
    width: width * 0.85,
    maxWidth: 320,
    height: height,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.8,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    padding: 5,
  },
  menuContent: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuItemIcon: {
    width: 40,
    alignItems: "center",
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 15,
    color: "#333",
  },
  menuDivider: {
    height: 8,
    backgroundColor: "#F5F5F5",
    marginVertical: 10,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    alignItems: "center",
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: "#999",
  },
});
