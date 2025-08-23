import NotificationDrawer from "@/components/NotificationSidebar";
import Sidebar from "@/components/SideBar";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useProgress } from "@/contexts/useProgress";
import { MaterialIcons as Icon, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabTwoScreen() {
  const { checklist, overallProgress, toggleChecklistItem } = useProgress();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const [notiSidebarVisible, setNotiSidebarVisible] = useState(false);

  const getUserDisplayName = () => {
    if (!user) return "G";
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return "G";
  };
  const renderHeader = () => (
    <ThemedView style={styles.header}>
      <ThemedText type="title">{t("title")}</ThemedText>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={{ marginLeft: 15 }}
          onPress={() => setNotiSidebarVisible(true)}
        >
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profileIcon}
          onPress={() => setSidebarVisible(true)}
        >
          <ThemedText style={styles.profileText}>
            {getUserDisplayName()}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

  const renderProgressSection = () => (
    <ThemedView style={styles.progressSection}>
      <ThemedView style={styles.progressCard}>
        <ThemedText type="subtitle" style={styles.progressTitle}>
          {t("overallProgress")}
        </ThemedText>
        <ThemedText style={styles.progressSubtitle}>
          {overallProgress > 80
            ? t("progressMessageHigh")
            : overallProgress > 50
            ? t("progressMessageMedium")
            : t("progressMessageLow")}
        </ThemedText>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[styles.progressBar, { width: `${overallProgress}%` }]}
            />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.progressText}>
            {overallProgress}%
          </ThemedText>
        </View>
      </ThemedView>
    </ThemedView>
  );

  const renderChecklistSection = (
    category: "essentials" | "evacuation" | "communication" | "firstaid"
  ) => {
    const items = checklist.filter((item) => item.category === category);
    if (items.length === 0) return null;

    const categoryTitles = {
      essentials: t("categoryEssentials"),
      evacuation: t("categoryEvacuation"),
      communication: t("categoryCommunication"),
      firstaid: t("categoryFirstAid"),
    };

    const categoryTitle = categoryTitles[category];

    return (
      <ThemedView style={styles.checklistSection} key={category}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {categoryTitle}
        </ThemedText>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => toggleChecklistItem(item.id)}
          >
            <ThemedView style={styles.checklistItem}>
              <View style={styles.checklistIcon}>
                <Icon
                  name={item.icon as any}
                  size={24}
                  color={item.completed ? "#4CAF50" : "#00BCD4"}
                />
              </View>
              <View style={styles.checklistContent}>
                <ThemedText
                  type="defaultSemiBold"
                  style={[
                    item.completed ? { color: "#999" } : {},
                    {
                      textDecorationLine: item.completed
                        ? "line-through"
                        : "none",
                    },
                  ]}
                >
                  {item.title}
                </ThemedText>
                <ThemedText style={styles.checklistDescription}>
                  {item.description}
                </ThemedText>
              </View>
              <View style={styles.checkbox}>
                <Icon
                  name={
                    item.completed ? "check-box" : "check-box-outline-blank"
                  }
                  size={24}
                  color={item.completed ? "#4CAF50" : "#E0E0E0"}
                />
              </View>
            </ThemedView>
          </TouchableOpacity>
        ))}
      </ThemedView>
    );
  };

  const renderActionButton = () => {
    const completedItems = checklist.filter((item) => item.completed).length;
    const totalItems = checklist.length;

    return (
      <ThemedView style={styles.actionSection}>
        <TouchableOpacity>
          <LinearGradient
            colors={["#00BCD4", "#4CAF50"]}
            style={styles.actionButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Icon name="menu-book" size={24} color="#FFFFFF" />
            <View style={styles.actionButtonText}>
              <ThemedText type="subtitle" style={{ color: "#FFFFFF" }}>
                {overallProgress === 100
                  ? t("actionButtonFullyPrepared")
                  : t("actionButtonKeepBuilding")}
              </ThemedText>
              <ThemedText style={styles.actionButtonSubtitle}>
                {t("actionButtonSubtitle", { completedItems, totalItems })}
              </ThemedText>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ThemedView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderProgressSection()}
        {renderChecklistSection("essentials")}
        {renderChecklistSection("evacuation")}
        {renderChecklistSection("communication")}
        {renderChecklistSection("firstaid")}
        {renderActionButton()}
      </ScrollView>
      <NotificationDrawer
        visible={notiSidebarVisible}
        onClose={() => setNotiSidebarVisible(false)}
      />

      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... your existing styles remain unchanged
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4ECDC4",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 15,
  },
  profileText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  progressSection: {
    padding: 20,
    backgroundColor: "transparent",
  },
  progressCard: {
    borderRadius: 15,
    padding: 20,
  },
  progressTitle: {
    marginBottom: 5,
  },
  progressSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginRight: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#FF9800",
    borderRadius: 4,
  },
  progressText: {
    minWidth: 40,
  },
  checklistSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "transparent",
  },
  sectionTitle: {
    marginBottom: 15,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  checklistIcon: {
    marginRight: 15,
    width: 40,
    alignItems: "center",
  },
  checklistContent: {
    flex: 1,
  },
  checklistDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
  },
  checkbox: {
    marginLeft: 10,
  },
  actionSection: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "transparent",
  },
  actionButton: {
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  actionButtonText: {
    flex: 1,
    marginLeft: 15,
  },
  actionButtonSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    lineHeight: 20,
  },
  advancedButton: {
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  advancedButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
