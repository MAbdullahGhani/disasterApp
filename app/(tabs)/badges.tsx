import NotificationDrawer from "@/components/NotificationSidebar";
import Sidebar from "@/components/SideBar";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useProgress } from "@/contexts/useProgress";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function BadgesScreen() {
  const { t, i18n } = useTranslation(); // Use the translation hook
  const { isAuthenticated, user } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const colorScheme = useColorScheme();
  const [notiSidebarVisible, setNotiSidebarVisible] = useState(false);

  const {
    badges,
    earnedBadges,
    getBadgeProgress,
    progressStats,
    getAllQuizStats,
  } = useProgress();

  const getThemeColors = () => {
    const isDark = colorScheme === "dark";
    return {
      iconColor: isDark ? "#FFFFFF" : "#333333",
      cardBackground: isDark ? "#2A2A2A" : "#FFFFFF",
      borderColor: isDark ? "#444444" : "#E0E0E0",
      mutedText: isDark ? "#AAAAAA" : "#666666",
      overlay: isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.5)",
      progressBg: isDark ? "#444444" : "#E0E0E0",
    };
  };

  const themeColors = getThemeColors();

  // Organize badges by category
  const badgesByCategory = useMemo(() => {
    return {
      progress: badges.filter((b) => b.category === "progress"),
      quiz: badges.filter((b) => b.category === "quiz"),
      streak: badges.filter((b) => b.category === "streak"),
      special: badges.filter((b) => b.category === "special"),
    };
  }, [badges]);

  const totalEarned = earnedBadges.length;
  const totalBadges = badges.length;

  const getUserDisplayName = () => {
    if (!user) return t("badgesScreen.defaultUserInitial");
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return t("badgesScreen.defaultUserInitial");
  };

  const getBadgeColors = (badge) => {
    if (badge.earned) {
      return [badge.color, badge.color];
    }
    return ["#F0F0F0", "#E0E0E0"];
  };

  const BadgeItem = ({ badge }) => {
    const progress = getBadgeProgress(badge.id);
    const isEarned = badge.earned;

    return (
      <ThemedView style={[styles.badgeContainer, { width: (width - 60) / 2 }]}>
        <View style={styles.badgeWrapper}>
          <LinearGradient
            colors={getBadgeColors(badge)}
            style={styles.badgeCircle}
          >
            <Ionicons
              name={badge.icon}
              size={32}
              color={isEarned ? "#FFFFFF" : "#BDBDBD"}
            />
          </LinearGradient>

          {!isEarned && progress < 100 && (
            <View style={styles.progressRing}>
              <ThemedText style={styles.progressTextRing}>
                {progress}%
              </ThemedText>
            </View>
          )}

          {isEarned && (
            <View style={styles.earnedIndicator}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            </View>
          )}
        </View>

        <ThemedText
          type="defaultSemiBold"
          style={[styles.badgeName, !isEarned && styles.disabledText]}
        >
          {badge.name}
        </ThemedText>
        <ThemedText
          style={[styles.badgeDescription, !isEarned && styles.disabledText]}
        >
          {badge.description}
        </ThemedText>

        {isEarned && badge.earnedAt && (
          <ThemedText style={styles.earnedDate}>
            {t("badgesScreen.earnedDate", {
              date: new Date(badge.earnedAt).toLocaleDateString(),
            })}
          </ThemedText>
        )}
      </ThemedView>
    );
  };

  const SectionHeader = ({ title, badges: sectionBadges }) => {
    const earnedCount = sectionBadges.filter((b) => b.earned).length;

    return (
      <ThemedView style={styles.sectionHeader}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText
          style={[styles.sectionCount, { color: themeColors.mutedText }]}
        >
          {t("badgesScreen.earnedCount", {
            earnedCount,
            totalCount: sectionBadges.length,
          })}
        </ThemedText>
      </ThemedView>
    );
  };

  const StatsCard = () => {
    const quizStats = getAllQuizStats();

    return (
      <ThemedView
        style={[
          styles.statsCard,
          { backgroundColor: themeColors.cardBackground },
        ]}
      >
        <ThemedText type="defaultSemiBold" style={styles.statsTitle}>
          {t("badgesScreen.quickStats")}
        </ThemedText>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>
              {progressStats.checklistProgress}%
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: themeColors.mutedText }]}
            >
              {t("badgesScreen.statsTasks")}
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>
              {progressStats.quizPerformance}%
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: themeColors.mutedText }]}
            >
              {t("badgesScreen.statsQuizzes")}
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>
              {quizStats.perfectScores}
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: themeColors.mutedText }]}
            >
              {t("badgesScreen.statsPerfect")}
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{totalEarned}</ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: themeColors.mutedText }]}
            >
              {t("badgesScreen.statsBadges")}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    );
  };

  const AuthOverlay = () => (
    <ThemedView
      style={[styles.authOverlay, { backgroundColor: themeColors.overlay }]}
    >
      <ThemedView
        style={[
          styles.authCard,
          { backgroundColor: themeColors.cardBackground },
        ]}
      >
        <Ionicons name="shield-checkmark" size={60} color="#4ECDC4" />
        <ThemedText style={styles.authTitle}>
          {t("badgesScreen.signInRequired")}
        </ThemedText>
        <ThemedText
          style={[styles.authSubtitle, { color: themeColors.mutedText }]}
        >
          {t("badgesScreen.signInSubtitle")}
        </ThemedText>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push("AuthScreen")}
        >
          <ThemedText style={styles.signInButtonText}>
            {t("badgesScreen.signInButton")}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );

  const renderHeader = () => (
    <ThemedView
      style={[styles.header, { borderBottomColor: themeColors.borderColor }]}
    >
      <ThemedText type="title">{t("badgesScreen.title")}</ThemedText>
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

  const renderAchievementsHeader = () => (
    <ThemedView style={styles.achievementsSection}>
      <ThemedView
        style={[
          styles.achievementsCard,
          { backgroundColor: themeColors.cardBackground },
        ]}
      >
        <ThemedText type="subtitle">
          {t("badgesScreen.yourAchievements")}
        </ThemedText>
        <ThemedText style={styles.achievementsSubtitle}>
          {t("badgesScreen.achievementsSummary", { totalEarned, totalBadges })}
        </ThemedText>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarBackground,
              { backgroundColor: themeColors.progressBg },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                { width: `${(totalEarned / totalBadges) * 100}%` },
              ]}
            />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.progressText}>
            {Math.round((totalEarned / totalBadges) * 100)}%
          </ThemedText>
        </View>
      </ThemedView>
    </ThemedView>
  );

  const renderContent = () => (
    <>
      {renderHeader()}
      {renderAchievementsHeader()}

      <View style={styles.section}>
        <StatsCard />
      </View>

      {badgesByCategory.progress.length > 0 && (
        <>
          <SectionHeader
            title={t("badgesScreen.progressMilestones")}
            badges={badgesByCategory.progress}
          />
          <View style={styles.badgeGrid}>
            {badgesByCategory.progress.map((badge) => (
              <BadgeItem key={badge.id} badge={badge} />
            ))}
          </View>
        </>
      )}

      {badgesByCategory.quiz.length > 0 && (
        <>
          <SectionHeader
            title={t("badgesScreen.quizAchievements")}
            badges={badgesByCategory.quiz}
          />
          <View style={styles.badgeGrid}>
            {badgesByCategory.quiz.map((badge) => (
              <BadgeItem key={badge.id} badge={badge} />
            ))}
          </View>
        </>
      )}

      {badgesByCategory.streak.length > 0 && (
        <>
          <SectionHeader
            title={t("badgesScreen.consistencyStreaks")}
            badges={badgesByCategory.streak}
          />
          <View style={styles.badgeGrid}>
            {badgesByCategory.streak.map((badge) => (
              <BadgeItem key={badge.id} badge={badge} />
            ))}
          </View>
        </>
      )}

      {badgesByCategory.special.length > 0 && (
        <>
          <SectionHeader
            title={t("badgesScreen.specialAchievements")}
            badges={badgesByCategory.special}
          />
          <View style={styles.badgeGrid}>
            {badgesByCategory.special.map((badge) => (
              <BadgeItem key={badge.id} badge={badge} />
            ))}
          </View>
        </>
      )}

      {totalBadges === 0 && (
        <View style={styles.emptyState}>
          <Ionicons
            name="trophy-outline"
            size={64}
            color={themeColors.mutedText}
          />
          <ThemedText
            style={[styles.emptyStateText, { color: themeColors.mutedText }]}
          >
            {t("badgesScreen.emptyState")}
          </ThemedText>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container} key={i18n.language}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      <View
        style={[
          styles.contentContainer,
          !isAuthenticated && styles.blurredContent,
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={isAuthenticated}
        >
          {renderContent()}
        </ScrollView>
      </View>

      {!isAuthenticated && <AuthOverlay />}

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
  contentContainer: {
    flex: 1,
  },
  blurredContent: {
    opacity: 0.1,
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
  scrollContent: {
    paddingBottom: 50,
  },
  section: {
    padding: 20,
  },
  achievementsSection: {
    padding: 20,
    backgroundColor: "transparent",
  },
  achievementsCard: {
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  achievementsSubtitle: {
    fontSize: 14,
    color: "#4ECDC4",
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 12,
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginRight: 15,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4ECDC4",
    borderRadius: 4,
  },
  progressText: {
    minWidth: 40,
    fontSize: 15,
  },
  statsCard: {
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statsTitle: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4ECDC4",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "transparent",
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  badgeContainer: {
    alignItems: "center",
    marginBottom: 25,
    backgroundColor: "transparent",
  },
  badgeWrapper: {
    position: "relative",
    marginBottom: 10,
  },
  badgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  progressRing: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF9800",
    justifyContent: "center",
    alignItems: "center",
  },
  progressTextRing: {
    fontSize: 8,
    fontWeight: "bold",
  },
  earnedIndicator: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 2,
  },
  badgeName: {
    textAlign: "center",
    marginBottom: 5,
    fontSize: 12,
    lineHeight: 16,
  },
  badgeDescription: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
    color: "#666",
  },
  earnedDate: {
    fontSize: 8,
    textAlign: "center",
    color: "#4CAF50",
    marginTop: 2,
    fontWeight: "500",
  },
  disabledText: {
    opacity: 0.6,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 22,
  },
  authOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  authCard: {
    borderRadius: 20,
    padding: 30,
    marginHorizontal: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    maxWidth: 320,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 8,
    textAlign: "center",
  },
  authSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 25,
  },
  signInButton: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
