import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useProgress } from "@/contexts/useProgress";
import { MaterialIcons as Icon, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Sidebar from "@/components/SideBar";
import { useAuth } from "@/contexts/AuthContext";
import NotificationDrawer from "@/components/NotificationSidebar";

export default function ProgressScreen() {
  const { categories, overallProgress, checklist } = useProgress();
  const { isAuthenticated, user } = useAuth();
  const [notiSidebarVisible, setNotiSidebarVisible] = useState(false);

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const getUserDisplayName = () => {
    if (!user) return "G";
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return "G";
  };
  const renderHeader = () => (
    <ThemedView style={styles.header}>
      <ThemedText type="title">Progress Overview</ThemedText>
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

  const renderOverallProgress = () => (
    <ThemedView style={styles.section}>
      <ThemedView style={styles.progressCard}>
        <ThemedText type="subtitle" style={styles.progressTitle}>
          Overall Preparedness
        </ThemedText>
        <ThemedText style={styles.progressSubtitle}>
          {overallProgress > 80
            ? "Excellent work! You're well on your way to being prepared."
            : overallProgress > 50
            ? "Great progress! Keep building your resilience."
            : `Every step counts. Let's get you prepared!`}
        </ThemedText>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${overallProgress}%`,
                  backgroundColor:
                    overallProgress > 75
                      ? "#4CAF50"
                      : overallProgress > 50
                      ? "#FF9800"
                      : "#FF5722",
                },
              ]}
            />
          </View>
          <ThemedText
            type="defaultSemiBold"
            style={[
              styles.progressText,
              {
                color:
                  overallProgress > 75
                    ? "#4CAF50"
                    : overallProgress > 50
                    ? "#FF9800"
                    : "#FF5722",
              },
            ]}
          >
            {overallProgress}%
          </ThemedText>
        </View>
      </ThemedView>
    </ThemedView>
  );

  const renderCategoryProgress = () => (
    <ThemedView style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Category Progress
      </ThemedText>
      {categories.map((category) => {
        const categoryItems = checklist.filter(
          (item) => item.category === category.categoryKey
        );
        const completedCategoryItems = categoryItems.filter(
          (item) => item.completed
        ).length;
        const categoryColor =
          category.percentage > 75
            ? "#4CAF50"
            : category.percentage > 50
            ? "#FF9800"
            : "#FF5722";

        return (
          <TouchableOpacity key={category.id}>
            <ThemedView style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIcon}>
                  <Icon
                    name={category.icon as any}
                    size={24}
                    color={categoryColor}
                  />
                </View>
                <View style={styles.categoryInfo}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={styles.categoryName}
                  >
                    {category.name}
                  </ThemedText>
                  <ThemedText style={styles.categoryDescription}>
                    {completedCategoryItems} of {categoryItems.length} items
                    completed
                  </ThemedText>
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${category.percentage}%`,
                        backgroundColor: categoryColor,
                      },
                    ]}
                  />
                </View>
                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.progressText, { color: categoryColor }]}
                >
                  {category.percentage}%
                </ThemedText>
              </View>
            </ThemedView>
          </TouchableOpacity>
        );
      })}
    </ThemedView>
  );

  const renderActionButton = () => {
    const firstAidProgress =
      categories.find((cat) => cat.categoryKey === "firstaid")?.percentage || 0;
    const isComplete = overallProgress === 100;

    const buttonText = isComplete
      ? "You are Fully Prepared!"
      : firstAidProgress > 75
      ? "Take Advanced First Aid Quiz"
      : firstAidProgress > 25
      ? "Continue First Aid Learning"
      : "Start First Aid Basics";

    const buttonSubtitle = isComplete
      ? "Congratulations on achieving 100% readiness! 🎉"
      : "Take the next step to improve your score.";

    return (
      <ThemedView style={styles.actionSection}>
        <TouchableOpacity>
          <LinearGradient
            colors={
              isComplete ? ["#4CAF50", "#66BB6A"] : ["#00BCD4", "#0097A7"]
            }
            style={styles.actionButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Icon
              name={isComplete ? "celebration" : "quiz"}
              size={24}
              color="#FFFFFF"
            />
            <View style={styles.actionButtonTextContainer}>
              <ThemedText style={styles.actionButtonText}>
                {buttonText}
              </ThemedText>
              <ThemedText style={styles.actionButtonSubtitle}>
                {buttonSubtitle}
              </ThemedText>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ThemedView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderHeader()}
        {renderOverallProgress()}
        {renderCategoryProgress()}
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
    marginLeft: 15,
    alignItems: "center",
  },
  profileText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: "transparent",
  },
  sectionTitle: {
    marginBottom: 15,
  },
  progressCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  categoryCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  progressTitle: {
    marginBottom: 5,
  },
  progressSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    color: "#666",
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
    borderRadius: 4,
  },
  progressText: {
    minWidth: 40,
    fontSize: 14,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  categoryIcon: {
    width: 40,
    alignItems: "center",
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 15,
  },
  categoryName: {
    fontSize: 16,
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  actionSection: {
    padding: 20,
    backgroundColor: "transparent",
  },
  actionButton: {
    borderRadius: 15,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.9,
    lineHeight: 16,
  },
});
