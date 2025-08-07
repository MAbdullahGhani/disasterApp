import NotificationDrawer from '@/components/NotificationSidebar';
import Sidebar from '@/components/SideBar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useProgress } from '@/contexts/useProgress';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from 'expo-router/build/useNavigation';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function BadgesScreen() {
  const navigation = useNavigation();
  const { isAuthenticated, user } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const colorScheme = useColorScheme();
    const [notiSidebarVisible, setNotiSidebarVisible] = useState(false);
  
  const {
    badges,
    earnedBadges,
    getBadgeProgress,
    progressStats,
    getAllQuizStats
  } = useProgress();

  const getThemeColors = () => {
    const isDark = colorScheme === 'dark';
    return {
      iconColor: isDark ? '#FFFFFF' : '#333333',
      cardBackground: isDark ? '#2A2A2A' : '#FFFFFF',
      borderColor: isDark ? '#444444' : '#E0E0E0',
      mutedText: isDark ? '#AAAAAA' : '#666666',
      overlay: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
      progressBg: isDark ? '#444444' : '#E0E0E0',
    };
  };

  const themeColors = getThemeColors();

  // Organize badges by category
  const badgesByCategory = useMemo(() => {
    const categorized = {
      progress: badges.filter(b => b.category === 'progress'),
      quiz: badges.filter(b => b.category === 'quiz'),
      streak: badges.filter(b => b.category === 'streak'),
      special: badges.filter(b => b.category === 'special')
    };

    return categorized;
  }, [badges]);

  const totalEarned = earnedBadges.length;
  const totalBadges = badges.length;

  const getUserDisplayName = () => {
    if (!user) return 'A';
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'A';
  };

  const getBadgeColors = (badge: any) => {
    if (badge.earned) {
      return [badge.color, badge.color];
    }
    return ['#F0F0F0', '#E0E0E0'];
  };

  const BadgeItem = ({ badge }: { badge: any }) => {
    const progress = getBadgeProgress(badge.id);
    const isEarned = badge.earned;
    
    return (
      <ThemedView style={[styles.badgeContainer, { width: (width - 60) / 2 }]}>
        <View style={styles.badgeWrapper}>
            <LinearGradient
            colors={getBadgeColors(badge)}
            style={styles.badgeCircle}
            >
            {badge.iconLibrary === 'MaterialIcons' ? (
              <MaterialIcons
              // fallback to Ionicons if MaterialIcons is not available
              name="help-circle-outline"
              size={32}
              color={isEarned ? '#FFFFFF' : '#BDBDBD'}
              />
            ) : (
              <Ionicons
              name={badge.icon as any}
              size={32}
              color={isEarned ? '#FFFFFF' : '#BDBDBD'}
              />
            )}
            </LinearGradient>
          
          {/* Progress indicator for unearned badges */}
          {!isEarned && progress < 100 && (
            <View style={styles.progressRing}>
              <ThemedText style={styles.progressText}>{progress}%</ThemedText>
            </View>
          )}
          
          {/* Earned indicator */}
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
        
        {/* Show earned date if available */}
        {isEarned && badge.earnedAt && (
          <ThemedText style={styles.earnedDate}>
            Earned {new Date(badge.earnedAt).toLocaleDateString()}
          </ThemedText>
        )}
      </ThemedView>
    );
  };

  const SectionHeader = ({ title, badges: sectionBadges }: { title: string; badges: any[] }) => {
    const earnedCount = sectionBadges.filter(b => b.earned).length;
    
    return (
      <ThemedView style={styles.sectionHeader}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText style={[styles.sectionCount, { color: themeColors.mutedText }]}>
          {earnedCount} of {sectionBadges.length} earned
        </ThemedText>
      </ThemedView>
    );
  };

  const StatsCard = () => {
    const quizStats = getAllQuizStats();
    
    return (
      <ThemedView style={[styles.statsCard, { backgroundColor: themeColors.cardBackground }]}>
        <ThemedText type="defaultSemiBold" style={styles.statsTitle}>Quick Stats</ThemedText>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{progressStats.checklistProgress}%</ThemedText>
            <ThemedText style={[styles.statLabel, { color: themeColors.mutedText }]}>Tasks</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{progressStats.quizPerformance}%</ThemedText>
            <ThemedText style={[styles.statLabel, { color: themeColors.mutedText }]}>Quizzes</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{quizStats.perfectScores}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: themeColors.mutedText }]}>Perfect</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{totalEarned}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: themeColors.mutedText }]}>Badges</ThemedText>
          </View>
        </View>
      </ThemedView>
    );
  };

  const AuthOverlay = () => (
    <ThemedView style={[styles.authOverlay, { backgroundColor: themeColors.overlay }]}>
      <ThemedView style={[styles.authCard, { backgroundColor: themeColors.cardBackground }]}>
        <Ionicons name="shield-checkmark" size={60} color="#4ECDC4" />
        <ThemedText style={styles.authTitle}>Sign In Required</ThemedText>
        <ThemedText style={[styles.authSubtitle, { color: themeColors.mutedText }]}>
          Sign in to view your badges and track your progress
        </ThemedText>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => navigation.navigate('AuthScreen')}
        >
          <ThemedText style={styles.signInButtonText}>Sign In</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );

  const renderHeader = () => (
    <ThemedView style={[styles.header, { borderBottomColor: themeColors.borderColor }]}>
      <ThemedText type="title">My Badges</ThemedText>
      <View style={styles.headerRight}>
            <TouchableOpacity style={{ marginLeft: 15 }}  onPress={() => setNotiSidebarVisible(true)}><Ionicons name="notifications-outline" size={24} color="#333" /></TouchableOpacity>

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
      <ThemedView style={[styles.achievementsCard, { backgroundColor: themeColors.cardBackground }]}>
        <ThemedText type="subtitle">Your Achievements</ThemedText>
        <ThemedText style={styles.achievementsSubtitle}>
          Total: {totalEarned} of {totalBadges} Badges Earned
        </ThemedText>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBackground, { backgroundColor: themeColors.progressBg }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(totalEarned / totalBadges) * 100}%` }
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
      
      {/* Stats Card */}
      <View style={styles.section}>
        <StatsCard />
      </View>

      {/* Progress Badges */}
      {badgesByCategory.progress.length > 0 && (
        <>
          <SectionHeader title="Progress Milestones" badges={badgesByCategory.progress} />
          <View style={styles.badgeGrid}>
            {badgesByCategory.progress.map(badge => (
              <BadgeItem key={badge.id} badge={badge} />
            ))}
          </View>
        </>
      )}

      {/* Quiz Badges */}
      {badgesByCategory.quiz.length > 0 && (
        <>
          <SectionHeader title="Quiz Achievements" badges={badgesByCategory.quiz} />
          <View style={styles.badgeGrid}>
            {badgesByCategory.quiz.map(badge => (
              <BadgeItem key={badge.id} badge={badge} />
            ))}
          </View>
        </>
      )}

      {/* Streak Badges */}
      {badgesByCategory.streak.length > 0 && (
        <>
          <SectionHeader title="Consistency Streaks" badges={badgesByCategory.streak} />
          <View style={styles.badgeGrid}>
            {badgesByCategory.streak.map(badge => (
              <BadgeItem key={badge.id} badge={badge} />
            ))}
          </View>
        </>
      )}

      {/* Special Badges */}
      {badgesByCategory.special.length > 0 && (
        <>
          <SectionHeader title="Special Achievements" badges={badgesByCategory.special} />
          <View style={styles.badgeGrid}>
            {badgesByCategory.special.map(badge => (
              <BadgeItem key={badge.id} badge={badge} />
            ))}
          </View>
        </>
      )}

      {/* Empty state if no badges */}
      {totalBadges === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={64} color={themeColors.mutedText} />
          <ThemedText style={[styles.emptyStateText, { color: themeColors.mutedText }]}>
            Complete tasks and take quizzes to start earning badges!
          </ThemedText>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Main Content with conditional blur/opacity */}
      <View style={[styles.contentContainer, !isAuthenticated && styles.blurredContent]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={isAuthenticated}
        >
          {renderContent()}
        </ScrollView>
      </View>

      {/* Auth Overlay - only show when not authenticated */}
      {!isAuthenticated && <AuthOverlay />}

      {/* Sidebar Menu */}
              <NotificationDrawer visible={notiSidebarVisible} onClose={() => setNotiSidebarVisible(false)} />
      
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16
  },
  scrollContent: {
    paddingBottom: 50,
  },
  section: {
    padding: 20,
  },
  achievementsSection: {
    padding: 20,
    backgroundColor: 'transparent'
  },
  achievementsCard: {
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  achievementsSubtitle: {
    fontSize: 14,
    color: '#4ECDC4',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 12
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginRight: 15,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 4,
  },
  progressText: {
    minWidth: 40,
    fontSize: 14,
  },
  statsCard: {
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statsTitle: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: 'transparent'
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: 'transparent'
  },
  badgeWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  badgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  progressRing: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  earnedIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
  badgeName: {
    textAlign: 'center',
    marginBottom: 5,
    fontSize: 12,
    lineHeight: 16
  },
  badgeDescription: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    color: '#666'
  },
  earnedDate: {
    fontSize: 8,
    textAlign: 'center',
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: '500',
  },
  disabledText: {
    opacity: 0.6
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  authOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  authCard: {
    borderRadius: 20,
    padding: 30,
    marginHorizontal: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    maxWidth: 320,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  signInButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});