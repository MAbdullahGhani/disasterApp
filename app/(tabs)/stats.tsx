import Sidebar from '@/components/SideBar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useProgress } from '@/contexts/useProgress';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router/build/useNavigation';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Circle, G, Path, Svg, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function StatsScreen() {
    const navigation = useNavigation();
    const colorScheme = useColorScheme();
    const { isAuthenticated, user } = useAuth();
    const [sidebarVisible, setSidebarVisible] = useState(false);

    const {
        checklist,
        overallProgress,
        categories,
        quizScores,
        getProgressForCategory,
        getAllQuizStats,
        topicQuizScores,
        getTopicAverageScore,
        getTopicQuizCount
    } = useProgress();

    // Get dynamic colors based on theme
    const getThemeColors = () => {
        const isDark = colorScheme === 'dark';
        return {
            iconColor: isDark ? '#FFFFFF' : '#333333',
            cardBackground: isDark ? '#2A2A2A' : '#FFFFFF',
            borderColor: isDark ? '#444444' : '#E0E0E0',
            mutedText: isDark ? '#AAAAAA' : '#666666',
            overlay: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
            svgText: isDark ? '#FFFFFF' : '#333333',
            progressBg: isDark ? '#444444' : '#F0F0F0',
        };
    };

    // --- Calculate Dynamic Values ---
    const progressDecimal = overallProgress / 100;
    const circumference = 2 * Math.PI * 50;
    const strokeDashoffset = circumference * (1 - progressDecimal);

    const completedItems = checklist.filter(item => item.completed).length;
    const totalItems = checklist.length;

    const quizStats = getAllQuizStats();
    const activePlans = checklist.filter(item => item.category === 'evacuation' && item.completed).length;

    const pieData = categories.filter(cat => cat.percentage > 0).map(cat => ({
        key: cat.id,
        value: cat.percentage,
        color: cat.color,
        label: cat.name
    }));

    // Topic quiz data for detailed stats
    const topicQuizData = [
        { id: 'disaster-prep', name: 'Disaster Prep', icon: 'shield-checkmark', color: '#FF6B35' },
        { id: 'first-aid', name: 'First Aid', icon: 'medical', color: '#E74C3C' },
        { id: 'fire-safety', name: 'Fire Safety', icon: 'flame', color: '#FF4444' },
        { id: 'severe-weather', name: 'Weather', icon: 'thunderstorm', color: '#3498DB' },
        { id: 'home-security', name: 'Security', icon: 'home', color: '#9B59B6' },
        { id: 'travel-safety', name: 'Travel', icon: 'airplane', color: '#F39C12' }
    ].map(topic => ({
        ...topic,
        count: getTopicQuizCount(topic.id),
        average: getTopicAverageScore(topic.id),
        taken: getTopicQuizCount(topic.id) > 0
    }));

    const getUserDisplayName = () => {
        if (!user) return 'A';
        if (user.displayName) return user.displayName.charAt(0).toUpperCase();
        if (user.email) return user.email.charAt(0).toUpperCase();
        return 'A';
    };

    const StatCard = ({ icon, title, value, color, subtitle }: any) => {
        const themeColors = getThemeColors();
        return (
            <ThemedView style={[styles.statCard, { backgroundColor: themeColors.cardBackground }]}>
                <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
                    <Ionicons name={icon} size={24} color={color} />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.statValue}>{value}</ThemedText>
                <ThemedText style={[styles.statTitle, { color: themeColors.mutedText }]}>{title}</ThemedText>
                {subtitle && <ThemedText style={[styles.statSubtitle, { color: themeColors.mutedText }]}>{subtitle}</ThemedText>}
            </ThemedView>
        );
    };

    const TopicQuizCard = ({ topic }: { topic: any }) => {
        const themeColors = getThemeColors();
        return (
            <ThemedView style={[styles.topicQuizCard, { borderLeftColor: topic.color, backgroundColor: themeColors.cardBackground }]}>
                <View style={styles.topicQuizHeader}>
                    <View style={[styles.topicQuizIcon, { backgroundColor: `${topic.color}20` }]}>
                        <Ionicons name={topic.icon} size={18} color={topic.color} />
                    </View>
                    <View style={styles.topicQuizInfo}>
                        <ThemedText type="defaultSemiBold" style={styles.topicQuizName}>
                            {topic.name}
                        </ThemedText>
                        <ThemedText style={[styles.topicQuizStats, { color: themeColors.mutedText }]}>
                            {topic.taken ? (
                                `${topic.count} taken • ${topic.average}% avg`
                            ) : (
                                'Not attempted'
                            )}
                        </ThemedText>
                    </View>
                </View>
                {topic.taken && (
                    <View style={styles.topicProgress}>
                        <View style={[styles.topicProgressBar, { backgroundColor: themeColors.progressBg }]}>
                            <View
                                style={[
                                    styles.topicProgressFill,
                                    {
                                        width: `${topic.average}%`,
                                        backgroundColor: topic.color
                                    }
                                ]}
                            />
                        </View>
                    </View>
                )}
            </ThemedView>
        );
    };

    const PieChart = ({ data, size = 160 }: { data: typeof pieData, size?: number }) => {
        const radius = size / 2 - 40;
        const cx = size / 2;
        const cy = size / 2;
        const total = data.reduce((sum, item) => sum + item.value, 0);
        const themeColors = getThemeColors();

        let currentAngle = 0;

        const createPath = (startAngle: number, endAngle: number, radius: number) => {
            const x1 = cx + radius * Math.cos(startAngle);
            const y1 = cy + radius * Math.sin(startAngle);
            const x2 = cx + radius * Math.cos(endAngle);
            const y2 = cy + radius * Math.sin(endAngle);

            const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

            return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
        };

        const paths = data.map((item, index) => {
            const angle = (item.value / total) * 2 * Math.PI;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            return (
                <Path
                    key={item.key}
                    d={createPath(startAngle, endAngle, radius)}
                    fill={item.color}
                    stroke={themeColors.cardBackground}
                    strokeWidth="2"
                />
            );
        });

        return (
            <Svg height={size} width={size}>
                {paths}
            </Svg>
        );
    };

    const AuthOverlay = () => {
        const themeColors = getThemeColors();
        return (
            <ThemedView style={[styles.authOverlay, { backgroundColor: themeColors.overlay }]}>
                <ThemedView style={[styles.authCard, { backgroundColor: themeColors.cardBackground }]}>
                    <Ionicons name="stats-chart" size={60} color="#4ECDC4" />
                    <ThemedText style={styles.authTitle}>Sign In Required</ThemedText>
                    <ThemedText style={[styles.authSubtitle, { color: themeColors.mutedText }]}>
                        Sign in to view your personalized stats and track your progress
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
    };

    const renderContent = () => {
        const themeColors = getThemeColors();
        
        return (
            <>
                <ThemedView style={[styles.header, { borderBottomColor: themeColors.borderColor }]}>
                    <ThemedText type="title">Stats Dashboard</ThemedText>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={{ marginRight: 15 }}
                            onPress={() => {/* Handle notifications */ }}
                        >
                            <Ionicons name="notifications-outline" size={24} color={themeColors.iconColor} />
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

                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Your Preparedness Score</ThemedText>
                    <View style={styles.progressCircle}>
                        <Svg height="120" width="120" viewBox="0 0 120 120">
                            <G rotation="-90" origin="60, 60">
                                <Circle cx="60" cy="60" r="50" stroke={themeColors.progressBg} strokeWidth="10" fill="transparent" />
                                <Circle cx="60" cy="60" r="50" stroke="#FF6B35" strokeWidth="10" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
                            </G>
                            <SvgText x="60" y="65" textAnchor="middle" fontSize="24" fontWeight="bold" fill={themeColors.svgText}>{overallProgress}%</SvgText>
                        </Svg>
                    </View>
                </ThemedView>

                <View style={styles.statsGrid}>
                    <StatCard
                        icon="checkmark-circle"
                        title="Tasks Completed"
                        value={`${completedItems}/${totalItems}`}
                        color="#FF6B35"
                    />
                    <StatCard
                        icon="trophy"
                        title="Quiz Average"
                        value={quizStats.totalQuizzesTaken > 0 ? `${quizStats.averageScore}%` : 'N/A'}
                        color="#FFD700"
                        subtitle={quizStats.totalQuizzesTaken > 0 ? `${quizStats.totalQuizzesTaken} taken` : undefined}
                    />
                    <StatCard
                        icon="star"
                        title="Perfect Scores"
                        value={quizStats.perfectScores}
                        color="#4ECDC4"
                    />
                    <StatCard
                        icon="shield-checkmark"
                        title="Active Plans"
                        value={activePlans}
                        color="#8B5CF6"
                    />
                </View>

                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Quiz Performance by Topic</ThemedText>
                    <View style={styles.topicQuizContainer}>
                        {topicQuizData.map(topic => (
                            <TopicQuizCard key={topic.id} topic={topic} />
                        ))}
                    </View>
                </ThemedView>

                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Task Category Breakdown</ThemedText>
                    <ThemedView style={[styles.pieContainer, { backgroundColor: themeColors.cardBackground }]}>
                        <PieChart data={pieData} size={200} />
                        <View style={styles.legendContainer}>
                            {pieData.map(item => (
                                <View key={item.key} style={styles.legendItem}>
                                    <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                                    <ThemedText style={styles.legendText}>{item.label}</ThemedText>
                                    <ThemedText style={[styles.legendPercentage, { color: themeColors.mutedText }]}>{item.value}%</ThemedText>
                                </View>
                            ))}
                        </View>
                    </ThemedView>
                </ThemedView>

                {quizStats.totalQuizzesTaken > 0 && (
                    <ThemedView style={styles.section}>
                        <ThemedText type="subtitle" style={styles.sectionTitle}>Quiz Insights</ThemedText>
                        <View style={styles.insightsContainer}>
                            <ThemedView style={[styles.insightCard, { backgroundColor: themeColors.cardBackground }]}>
                                <ThemedText style={styles.insightValue}>
                                    {Object.keys(topicQuizScores).length}
                                </ThemedText>
                                <ThemedText style={[styles.insightLabel, { color: themeColors.mutedText }]}>Topics Explored</ThemedText>
                            </ThemedView>
                            <ThemedView style={[styles.insightCard, { backgroundColor: themeColors.cardBackground }]}>
                                <ThemedText style={styles.insightValue}>
                                    {Math.max(...Object.values(topicQuizScores).map(scores => scores.length), 0)}
                                </ThemedText>
                                <ThemedText style={[styles.insightLabel, { color: themeColors.mutedText }]}>Most Practiced Topic</ThemedText>
                            </ThemedView>
                            <ThemedView style={[styles.insightCard, { backgroundColor: themeColors.cardBackground }]}>
                                <ThemedText style={styles.insightValue}>
                                    {Object.values(quizStats.topicStats).filter(stat => stat.best >= 90).length}
                                </ThemedText>
                                <ThemedText style={[styles.insightLabel, { color: themeColors.mutedText }]}>Expert Level Topics</ThemedText>
                            </ThemedView>
                        </View>
                    </ThemedView>
                )}
            </>
        );
    };

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
    scrollContent: {
        paddingBottom: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    profileIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#4ECDC4',
        justifyContent: 'center',
        alignItems: 'center'
    },
    profileText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    section: {
        padding: 20,
    },
    sectionTitle: {
        marginBottom: 20,
        textAlign: 'center'
    },
    progressCircle: {
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 15
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20
    },
    statCard: {
        width: (width - 60) / 2,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    statIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12
    },
    statValue: { fontSize: 22, marginBottom: 4 },
    statTitle: { fontSize: 13, textAlign: 'center' },
    statSubtitle: { fontSize: 10, textAlign: 'center', marginTop: 2 },
    topicQuizContainer: { marginTop: 10 },
    topicQuizCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    topicQuizHeader: { flexDirection: 'row', alignItems: 'center' },
    topicQuizIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    topicQuizInfo: { flex: 1 },
    topicQuizName: { fontSize: 14, marginBottom: 2 },
    topicQuizStats: { fontSize: 12 },
    topicProgress: { marginTop: 8 },
    topicProgressBar: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    topicProgressFill: {
        height: '100%',
        borderRadius: 2,
    },
    pieContainer: {
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        paddingTop: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    legendContainer: { width: '100%', marginTop: 20 },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        justifyContent: 'space-between'
    },
    legendColor: { width: 16, height: 16, borderRadius: 8, marginRight: 10 },
    legendText: { fontSize: 14, flex: 1 },
    legendPercentage: { fontSize: 14, fontWeight: '600' },
    insightsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    insightCard: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginHorizontal: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    insightValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF6B35',
        marginBottom: 4,
    },
    insightLabel: {
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 14,
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