import Sidebar from '@/components/SideBar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useProgress } from '@/contexts/useProgress';
import { Ionicons } from '@expo/vector-icons';
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
  const progress = useProgress();
  const { isAuthenticated, user } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const colorScheme = useColorScheme();
  const badgeData = useMemo(() => {
    const quizStats = progress.getAllQuizStats();

    const definitions = [
      // Core Preparedness Milestones
      {
        id: 1,
        name: 'First Aid Hero',
        description: 'Complete 50% of first aid tasks',
        icon: 'medical',
        colors: ['#F44336', '#D32F2F'],
        category: 'core',
        earned: progress.getProgressForCategory('firstaid') >= 50
      },
      {
        id: 2,
        name: 'Emergency Ready',
        description: 'Complete 100% of emergency essentials',
        icon: 'shield-checkmark',
        colors: ['#4CAF50', '#388E3C'],
        category: 'core',
        earned: progress.getProgressForCategory('essentials') === 100
      },
      {
        id: 3,
        name: 'Water Wizard',
        description: 'Secure your 3-day water supply',
        icon: 'water',
        colors: ['#03A9F4', '#0288D1'],
        category: 'core',
        earned: !!progress.checklist.find(i => i.id === '1')?.completed
      },
      {
        id: 4,
        name: 'Planner Pro',
        description: 'Complete 50% of evacuation planning',
        icon: 'map',
        colors: ['#9C27B0', '#7B1FA2'],
        category: 'core',
        earned: progress.getProgressForCategory('evacuation') >= 50
      },
      {
        id: 5,
        name: 'Communication Expert',
        description: 'Complete 75% of communication tasks',
        icon: 'wifi',
        colors: ['#00BCD4', '#0097A7'],
        category: 'core',
        earned: progress.getProgressForCategory('communication') >= 75
      },

      // General Quiz Achievement Badges
      {
        id: 6,
        name: 'Quiz Novice',
        description: 'Score 70%+ on your first quiz',
        icon: 'school',
        colors: ['#FFC107', '#FFA000'],
        category: 'quiz-general',
        earned: progress.quizScores.length > 0 && progress.quizScores[0] >= 70
      },
      {
        id: 7,
        name: 'Perfect Score',
        description: 'Achieve a 100% score on any quiz',
        icon: 'star',
        colors: ['#FFD700', '#FFB300'],
        category: 'quiz-general',
        earned: quizStats.perfectScores > 0
      },
      {
        id: 8,
        name: 'Quiz Master',
        description: 'Take 10 quizzes across all topics',
        icon: 'trophy',
        colors: ['#FF9800', '#F57C00'],
        category: 'quiz-general',
        earned: quizStats.totalQuizzesTaken >= 10
      },
      {
        id: 9,
        name: 'Knowledge Seeker',
        description: 'Maintain 80%+ average score',
        icon: 'library',
        colors: ['#8BC34A', '#689F38'],
        category: 'quiz-general',
        earned: quizStats.averageScore >= 80 && quizStats.totalQuizzesTaken >= 3
      },
      {
        id: 10,
        name: 'Perfect Storm',
        description: 'Get 100% on 3 different quizzes',
        icon: 'flash',
        colors: ['#9C27B0', '#7B1FA2'],
        category: 'quiz-general',
        earned: quizStats.perfectScores >= 3
      },

      // Topic-Specific Quiz Badges
      {
        id: 11,
        name: 'Disaster Preparedness Expert',
        description: 'Score 90%+ on disaster preparedness quiz',
        icon: 'shield-checkmark',
        colors: ['#FF6B35', '#E55A2B'],
        category: 'quiz-topic',
        earned: (progress.getQuizScoreForTopic('disaster-prep') || 0) >= 90
      },
      {
        id: 12,
        name: 'First Aid Specialist',
        description: 'Score 90%+ on first aid quiz',
        icon: 'medical',
        colors: ['#E74C3C', '#C0392B'],
        category: 'quiz-topic',
        earned: (progress.getQuizScoreForTopic('first-aid') || 0) >= 90
      },
      {
        id: 13,
        name: 'Fire Safety Champion',
        description: 'Score 90%+ on fire safety quiz',
        icon: 'flame',
        colors: ['#FF4444', '#CC3333'],
        category: 'quiz-topic',
        earned: (progress.getQuizScoreForTopic('fire-safety') || 0) >= 90
      },
      {
        id: 14,
        name: 'Weather Warrior',
        description: 'Score 90%+ on severe weather quiz',
        icon: 'thunderstorm',
        colors: ['#3498DB', '#2980B9'],
        category: 'quiz-topic',
        earned: (progress.getQuizScoreForTopic('severe-weather') || 0) >= 90
      },
      {
        id: 15,
        name: 'Security Guardian',
        description: 'Score 90%+ on home security quiz',
        icon: 'home',
        colors: ['#9B59B6', '#8E44AD'],
        category: 'quiz-topic',
        earned: (progress.getQuizScoreForTopic('home-security') || 0) >= 90
      },
      {
        id: 16,
        name: 'Travel Safety Pro',
        description: 'Score 90%+ on travel safety quiz',
        icon: 'airplane',
        colors: ['#F39C12', '#E67E22'],
        category: 'quiz-topic',
        earned: (progress.getQuizScoreForTopic('travel-safety') || 0) >= 90
      },

      // Advanced Topic Mastery Badges
      {
        id: 17,
        name: 'Topic Explorer',
        description: 'Take quizzes in all 6 different topics',
        icon: 'compass',
        colors: ['#1ABC9C', '#16A085'],
        category: 'quiz-mastery',
        earned: Object.keys(progress.topicQuizScores).length >= 6
      },
      {
        id: 18,
        name: 'Consistent Learner',
        description: 'Take 3+ quizzes in any single topic',
        icon: 'refresh',
        colors: ['#34495E', '#2C3E50'],
        category: 'quiz-mastery',
        earned: Object.values(progress.topicQuizScores).some(scores => scores.length >= 3)
      },
      {
        id: 19,
        name: 'Safety Scholar',
        description: 'Achieve 85%+ average in 3+ topics',
        icon: 'book',
        colors: ['#8E44AD', '#7D3C98'],
        category: 'quiz-mastery',
        earned: Object.values(quizStats.topicStats).filter(stat => stat.average >= 85).length >= 3
      },
      {
        id: 20,
        name: 'Ultimate Safety Expert',
        description: 'Score 95%+ in all 6 topics',
        icon: 'medal',
        colors: ['#FFD700', '#FFA500'],
        category: 'quiz-mastery',
        earned: Object.keys(progress.topicQuizScores).length >= 6 &&
          Object.values(quizStats.topicStats).every(stat => stat.best >= 95)
      },

      // Community & Engagement (Static examples for now)
      {
        id: 21,
        name: 'Community Helper',
        description: 'Participate in a local safety campaign',
        icon: 'people',
        colors: ['#00BCD4', '#0097A7'],
        category: 'community',
        earned: true
      },
      {
        id: 22,
        name: 'Mentor Badge',
        description: 'Help 5 new users get started',
        icon: 'hand-left',
        colors: ['#673AB7', '#512DA8'],
        category: 'community',
        earned: false
      }
    ];

    return {
      corePreparednessMilestones: definitions.filter(b => b.category === 'core'),
      quizGeneral: definitions.filter(b => b.category === 'quiz-general'),
      quizTopic: definitions.filter(b => b.category === 'quiz-topic'),
      quizMastery: definitions.filter(b => b.category === 'quiz-mastery'),
      communityOutreach: definitions.filter(b => b.category === 'community'),
      allBadges: definitions
    };
  }, [progress]);

  const totalEarned = badgeData.allBadges.filter(b => b.earned).length;

  const BadgeItem = ({ badge }: { badge: any }) => (
    <ThemedView style={[styles.badgeContainer, { width: (width - 60) / 2 }]}>
      <LinearGradient
        colors={badge.earned ? badge.colors : ['#F0F0F0', '#E0E0E0']}
        style={styles.badgeCircle}
      >
        <Ionicons
          name={badge.icon as any}
          size={32}
          color={badge.earned ? '#FFFFFF' : '#BDBDBD'}
        />
      </LinearGradient>
      <ThemedText
        type="defaultSemiBold"
        style={[styles.badgeName, !badge.earned && styles.disabledText]}
      >
        {badge.name}
      </ThemedText>
      <ThemedText
        style={[styles.badgeDescription, !badge.earned && styles.disabledText]}
      >
        {badge.description}
      </ThemedText>
    </ThemedView>
  );


  const SectionHeader = ({ title, count }: { title: string; count?: number }) => (
    <ThemedView style={styles.sectionHeader}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {count !== undefined && (
        <ThemedText style={styles.sectionCount}>
          {count} earned
        </ThemedText>
      )}
    </ThemedView>
  );

  const AuthOverlay = () => (
    <ThemedView style={[styles.authOverlay, { backgroundColor: themeColors.overlay }]}>
      <ThemedView style={[styles.authCard, { backgroundColor: themeColors.cardBackground }]}>
        <Ionicons name="shield-checkmark" size={60} color="#4ECDC4" />
        <ThemedText style={styles.authTitle}>Sign In Required</ThemedText>
        <ThemedText style={[styles.authSubtitle, { color: themeColors.mutedText }]} >
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
  const getThemeColors = () => {
    const isDark = colorScheme === 'dark';
    return {
      iconColor: isDark ? '#FFFFFF' : '#333333',
      selectedOption: isDark ? '#E0E0E0' : '#E0F7FA',
      cardBackground: isDark ? '#2A2A2A' : '#FFFFFF',
      borderColor: isDark ? '#444444' : '#E0E0E0',
      mutedText: isDark ? '#AAAAAA' : '#666666',
      overlay: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
    };
  };
  const themeColors = getThemeColors();

  const getUserDisplayName = () => {
    if (!user) return 'A';
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'A';
  };

  const renderHeader = () => (
    <ThemedView style={styles.header}>
      <ThemedText type="title">My Badges</ThemedText>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={{ marginRight: 15 }}
          onPress={() => {/* Handle notifications */ }}
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
      <ThemedView style={styles.achievementsCard}>
        <ThemedText type="subtitle">Your Achievements</ThemedText>
        <ThemedText style={styles.achievementsSubtitle}>
          Total: {totalEarned} of {badgeData.allBadges.length} Badges Earned
        </ThemedText>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(totalEarned / badgeData.allBadges.length) * 100}%` }
              ]}
            />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.progressText}>
            {Math.round((totalEarned / badgeData.allBadges.length) * 100)}%
          </ThemedText>
        </View>
      </ThemedView>
    </ThemedView>
  );

  const renderContent = () => (
    <>
      {renderHeader()}
      {renderAchievementsHeader()}

      <SectionHeader
        title="Core Preparedness Milestones"
        count={badgeData.corePreparednessMilestones.filter(b => b.earned).length}
      />
      <View style={styles.badgeGrid}>
        {badgeData.corePreparednessMilestones.map(b => <BadgeItem key={b.id} badge={b} />)}
      </View>

      <SectionHeader
        title="Quiz Achievement Badges"
        count={badgeData.quizGeneral.filter(b => b.earned).length}
      />
      <View style={styles.badgeGrid}>
        {badgeData.quizGeneral.map(b => <BadgeItem key={b.id} badge={b} />)}
      </View>

      <SectionHeader
        title="Topic Specialist Badges"
        count={badgeData.quizTopic.filter(b => b.earned).length}
      />
      <View style={styles.badgeGrid}>
        {badgeData.quizTopic.map(b => <BadgeItem key={b.id} badge={b} />)}
      </View>

      <SectionHeader
        title="Quiz Mastery Badges"
        count={badgeData.quizMastery.filter(b => b.earned).length}
      />
      <View style={styles.badgeGrid}>
        {badgeData.quizMastery.map(b => <BadgeItem key={b.id} badge={b} />)}
      </View>

      <SectionHeader
        title="Community & Outreach"
        count={badgeData.communityOutreach.filter(b => b.earned).length}
      />
      <View style={styles.badgeGrid}>
        {badgeData.communityOutreach.map(b => <BadgeItem key={b.id} badge={b} />)}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

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
    borderBottomColor: '#E0E0E0'
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
  achievementsSection: {
    padding: 20,
    backgroundColor: 'transparent'
  },
  achievementsCard: {
    borderRadius: 15,
    padding: 20,
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
    backgroundColor: '#E0E0E0',
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
    color: '#666',
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
  badgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
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
  disabledText: {
    opacity: 0.6
  },
  authOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  authCard: {
    backgroundColor: '#FFFFFF',
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