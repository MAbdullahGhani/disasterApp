import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
    RefreshControl,
} from 'react-native';
import NotificationService, { NotificationData } from '@/services/notificationService';
import { useTranslation } from 'react-i18next'; // Import the hook

const { width, height } = Dimensions.get('window');

interface NotificationDrawerProps {
    visible: boolean;
    onClose: () => void;
}

export default function NotificationDrawer({ visible, onClose }: NotificationDrawerProps) {
    const { t } = useTranslation(); // Initialize the translation function
    const slideAnim = useRef(new Animated.Value(width)).current;
    const [filter, setFilter] = useState<'all' | 'unread' | 'emergency'>('all');
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: visible ? 0 : width,
            useNativeDriver: true,
        }).start();

        if (visible) {
            loadNotifications();
        }
    }, [visible]);

    const loadNotifications = async () => {
        try {
            const storedNotifications = await NotificationService.getStoredNotifications();
            setNotifications(storedNotifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const getFilteredNotifications = () => {
        switch (filter) {
            case 'unread':
                return notifications.filter(n => !n.read);
            case 'emergency':
                return notifications.filter(n =>
                    n.type === 'emergency' ||
                    n.type === 'evacuation' ||
                    n.priority === 'critical' ||
                    n.priority === 'high'
                );
            default:
                return notifications;
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await NotificationService.markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await NotificationService.markAllNotificationsAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await NotificationService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        const icons: { [key: string]: any } = {
            emergency: 'warning',
            weather: 'rainy',
            seismic: 'pulse',
            flood: 'water',
            evacuation: 'exit',
            warning: 'alert-circle',
            info: 'information-circle',
            success: 'checkmark-circle',
        };
        return icons[type] || 'notifications';
    };

    const getNotificationColor = (type: string, priority: string) => {
        if (priority === 'critical') return '#FF0000';
        if (priority === 'high') return '#FF4444';
        
        const colors: { [key: string]: string } = {
            emergency: '#FF4444',
            weather: '#FF9500',
            seismic: '#9C27B0',
            flood: '#2196F3',
            evacuation: '#FF0000',
            warning: '#FF9500',
            info: '#4ECDC4',
            success: '#4CAF50',
        };
        return colors[type] || '#4ECDC4';
    };

    const getPriorityBadge = (priority: string) => {
        const badges: { [key: string]: { text: string, color: string } } = {
            critical: { text: t('notifications.priority.critical'), color: '#FF0000' },
            high: { text: t('notifications.priority.high'), color: '#FF4444' },
            medium: { text: t('notifications.priority.medium'), color: '#FF9500' },
            low: { text: t('notifications.priority.low'), color: '#4CAF50' },
        };
        return badges[priority] || badges.medium;
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        
        if (diffInMinutes < 1) return t('notifications.time.now');
        if (diffInMinutes < 60) return t('notifications.time.minutesAgo', { count: diffInMinutes });
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return t('notifications.time.hoursAgo', { count: diffInHours });
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return t('notifications.time.daysAgo', { count: diffInDays });
        
        return date.toLocaleDateString();
    };

    const FilterButton = ({ title, value, active }: { title: string; value: any; active: boolean }) => (
        <TouchableOpacity
            style={[styles.filterButton, active && styles.filterButtonActive]}
            onPress={() => setFilter(value)}
        >
            <ThemedText style={[styles.filterText, active && styles.filterTextActive]}>
                {title}
            </ThemedText>
        </TouchableOpacity>
    );

    const NotificationItem = ({ item }: { item: NotificationData }) => {
        const priorityBadge = getPriorityBadge(item.priority);
        
        return (
            <TouchableOpacity
                style={[styles.notificationItem, !item.read && styles.unreadNotification]}
                onPress={() => markAsRead(item.id)}
                activeOpacity={0.7}
            >
                <ThemedView style={styles.notificationHeader}>
                    <ThemedView style={[
                        styles.notificationIconContainer,
                        { backgroundColor: getNotificationColor(item.type, item.priority) + '20' }
                    ]}>
                        <Ionicons
                            name={getNotificationIcon(item.type)}
                            size={20}
                            color={getNotificationColor(item.type, item.priority)}
                        />
                    </ThemedView>
                    
                    <ThemedView style={styles.notificationContent}>
                        <ThemedView style={styles.notificationTitleRow}>
                            <ThemedText style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
                                {item.title}
                            </ThemedText>
                            {!item.read && <ThemedView style={styles.unreadDot} />}
                            {(item.priority === 'critical' || item.priority === 'high') && (
                                <ThemedView style={[styles.priorityBadge, { backgroundColor: priorityBadge.color }]}>
                                    <ThemedText style={styles.priorityText}>{priorityBadge.text}</ThemedText>
                                </ThemedView>
                            )}
                        </ThemedView>
                        
                        <ThemedText style={styles.notificationMessage} numberOfLines={2}>
                            {item.message}
                        </ThemedText>
                        
                        <ThemedView style={styles.notificationMeta}>
                            <ThemedText style={styles.notificationTime}>
                                {formatTimestamp(item.timestamp)}
                            </ThemedText>
                            {item.location && (
                                <>
                                    <ThemedText style={styles.metaSeparator}> • </ThemedText>
                                    <ThemedText style={styles.notificationLocation}>{item.location}</ThemedText>
                                </>
                            )}
                            {item.source === 'location' && (
                                <>
                                    <ThemedText style={styles.metaSeparator}> • </ThemedText>
                                    <Ionicons name="location" size={12} color="#4ECDC4" />
                                </>
                            )}
                        </ThemedView>
                    </ThemedView>
                    
                    <TouchableOpacity 
                        style={styles.deleteButton} 
                        onPress={() => deleteNotification(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={16} color="#999" />
                    </TouchableOpacity>
                </ThemedView>
                
                {item.priority === 'critical' && (
                    <ThemedView style={styles.emergencyIndicator} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal animationType="none" transparent visible={visible} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.overlayTouch} onPress={onClose} />
                <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
                    <LinearGradient colors={['#4ECDC4', '#44A08D']} style={styles.header}>
                        <View style={styles.headerContent}>
                            <View style={styles.headerLeft}>
                                <Ionicons name="notifications" size={22} color="#FFF" />
                                <ThemedText style={styles.headerTitle}>{t('notifications.headerTitle')}</ThemedText>
                                {unreadCount > 0 && (
                                    <View style={styles.badge}>
                                        <ThemedText style={styles.badgeText}>{unreadCount}</ThemedText>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filtersContainer}>
                            <FilterButton title={t('notifications.filterAll')} value="all" active={filter === 'all'} />
                            <FilterButton title={t('notifications.filterUnread')} value="unread" active={filter === 'unread'} />
                            <FilterButton title={t('notifications.filterCritical')} value="emergency" active={filter === 'emergency'} />
                        </View>

                        {unreadCount > 0 && (
                            <View style={styles.actionsBar}>
                                <TouchableOpacity style={styles.actionButton} onPress={markAllAsRead}>
                                    <Ionicons name="checkmark-done" size={16} color="#FFF" />
                                    <ThemedText style={styles.actionText}>{t('notifications.markAllRead')}</ThemedText>
                                </TouchableOpacity>
                            </View>
                        )}
                    </LinearGradient>

                    <ThemedView style={styles.content}>
                        {getFilteredNotifications().length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons 
                                    name={filter === 'emergency' ? 'shield-checkmark' : 'notifications-off-outline'} 
                                    size={48} 
                                    color="#CCC" 
                                />
                                <ThemedText style={styles.emptyTitle}>
                                    {filter === 'emergency' ? t('notifications.emptyState.noCriticalTitle') : t('notifications.emptyState.noNotificationsTitle')}
                                </ThemedText>
                                <ThemedText style={styles.emptyMessage}>
                                    {filter === 'unread' 
                                        ? t('notifications.emptyState.allCaughtUp') 
                                        : filter === 'emergency'
                                        ? t('notifications.emptyState.noCriticalMessage')
                                        : t('notifications.emptyState.defaultMessage')
                                    }
                                </ThemedText>
                            </View>
                        ) : (
                            <FlatList
                                data={getFilteredNotifications()}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => <NotificationItem item={item} />}
                                contentContainerStyle={styles.listContainer}
                                showsVerticalScrollIndicator={false}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={onRefresh}
                                        tintColor="#4ECDC4"
                                        colors={['#4ECDC4']}
                                    />
                                }
                            />
                        )}
                    </ThemedView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    overlayTouch: {
        flex: 1,
    },
    drawer: {
        width: width * 0.9,
        maxWidth: 380,
        height: height,
        shadowColor: '#000',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    badge: {
        backgroundColor: '#FF4444',
        borderRadius: 12,
        paddingHorizontal: 6,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    filtersContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        padding: 4,
        marginHorizontal: 20,
        marginTop: 10,
    },
    filterButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 6,
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: '#FFFFFF',
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#FFFFFF',
    },
    filterTextActive: {
        color: '#4ECDC4',
    },
    actionsBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#FFF',
    },
    content: {
        flex: 1,
    },
    listContainer: {
        paddingBottom: 20,
    },
    notificationItem: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        position: 'relative',
    },
    unreadNotification: {
        backgroundColor: '#F8FCFF',
    },
    notificationHeader: {
        flexDirection: 'row',
        padding: 16,
    },
    notificationIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        flexWrap: 'wrap',
        gap: 6,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
        minWidth: 0,
    },
    unreadTitle: {
        fontWeight: 'bold',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4ECDC4',
    },
    priorityBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    notificationMessage: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 8,
    },
    notificationMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    notificationTime: {
        fontSize: 12,
        color: '#999',
    },
    metaSeparator: {
        fontSize: 12,
        color: '#999',
    },
    notificationLocation: {
        fontSize: 12,
        color: '#4ECDC4',
    },
    deleteButton: {
        padding: 4,
    },
    emergencyIndicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: '#FF0000',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyMessage: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
});
