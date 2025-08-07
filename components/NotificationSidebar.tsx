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
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface Notification {
    id: string;
    type: 'emergency' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    location?: string;
    priority: 'high' | 'medium' | 'low';
}

interface NotificationDrawerProps {
    visible: boolean;
    onClose: () => void;
}

export default function NotificationDrawer({ visible, onClose }: NotificationDrawerProps) {
    const slideAnim = useRef(new Animated.Value(width)).current;
    const [filter, setFilter] = useState<'all' | 'unread' | 'emergency'>('all');
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: '1',
            type: 'emergency',
            title: 'Flash Flood Warning',
            message: 'Severe flash flooding expected in your area. Seek higher ground immediately.',
            timestamp: '2 minutes ago',
            read: false,
            location: 'Faisalabad, Punjab',
            priority: 'high'
        },
        {
            id: '2',
            type: 'warning',
            title: 'Heavy Rain Alert',
            message: 'Monsoon rains expected in the next 6 hours. Avoid unnecessary travel.',
            timestamp: '1 hour ago',
            read: false,
            location: 'Punjab Region',
            priority: 'medium'
        },
        {
            id: '3',
            type: 'info',
            title: 'Weather Update',
            message: 'Clear skies expected tomorrow. Temperature: 28°C - 35°C',
            timestamp: '3 hours ago',
            read: true,
            location: 'Faisalabad',
            priority: 'low'
        },
        {
            id: '4',
            type: 'success',
            title: 'Emergency Contact Added',
            message: 'Your emergency contact has been successfully updated.',
            timestamp: '1 day ago',
            read: true,
            priority: 'low'
        },
        {
            id: '5',
            type: 'warning',
            title: 'Earthquake Alert System Test',
            message: 'This is a test of the emergency alert system. No action required.',
            timestamp: '2 days ago',
            read: false,
            priority: 'medium'
        }
    ]);
    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: visible ? 0 : width,
            useNativeDriver: true,
        }).start();
    }, [visible]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const getFilteredNotifications = () => {
        switch (filter) {
            case 'unread': return notifications.filter(n => !n.read);
            case 'emergency': return notifications.filter(n => n.type === 'emergency' || n.priority === 'high');
            default: return notifications;
        }
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const getNotificationIcon = (type: string) => {
        const icons = {
            emergency: 'warning',
            warning: 'alert-circle',
            info: 'information-circle',
            success: 'checkmark-circle',
        };
        return icons[type as keyof typeof icons] || 'notifications';
    };

    const getNotificationColor = (type: string) => {
        const colors = {
            emergency: '#FF4444',
            warning: '#FF9500',
            info: '#4ECDC4',
            success: '#4CAF50',
        };
        return colors[type as keyof typeof colors] || '#4ECDC4';
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

    const NotificationItem = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            style={[styles.notificationItem, !item.read && styles.unreadNotification]}
            onPress={() => markAsRead(item.id)}
        >
            <View style={styles.notificationHeader}>
                <View style={styles.notificationIconContainer}>
                    <Ionicons
                        name={getNotificationIcon(item.type)}
                        size={20}
                        color={getNotificationColor(item.type)}
                    />
                </View>
                <View style={styles.notificationContent}>
                    <View style={styles.notificationTitleRow}>
                        <ThemedText style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
                            {item.title}
                        </ThemedText>
                        {!item.read && <View style={styles.unreadDot} />}
                    </View>
                    <ThemedText style={styles.notificationMessage}>{item.message}</ThemedText>
                    <View style={styles.notificationMeta}>
                        <ThemedText style={styles.notificationTime}>{item.timestamp}</ThemedText>
                        {item.location && (
                            <>
                                <ThemedText style={styles.metaSeparator}> • </ThemedText>
                                <ThemedText style={styles.notificationLocation}>{item.location}</ThemedText>
                            </>
                        )}
                    </View>
                </View>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteNotification(item.id)}>
                    <Ionicons name="close" size={16} color="#999" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <Modal animationType="none" transparent visible={visible} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.overlayTouch} onPress={onClose} />
                <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
                    <LinearGradient colors={['#4ECDC4', '#44A08D']} style={styles.header}>
                        <View style={styles.headerContent}>
                            <View style={styles.headerLeft}>
                                <Ionicons name="notifications" size={22} color="#FFF" />
                                <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
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
                            <FilterButton title="All" value="all" active={filter === 'all'} />
                            <FilterButton title="Unread" value="unread" active={filter === 'unread'} />
                            <FilterButton title="Emergency" value="emergency" active={filter === 'emergency'} />
                        </View>

                        {unreadCount > 0 && (
                            <View style={styles.actionsBar}>
                                <TouchableOpacity style={styles.actionButton} onPress={markAllAsRead}>
                                    <Ionicons name="checkmark-done" size={16} color="#4ECDC4" />
                                    <ThemedText style={styles.actionText}>Mark all as read</ThemedText>
                                </TouchableOpacity>
                            </View>
                        )}
                    </LinearGradient>

                    <ThemedView style={styles.content}>
                        {getFilteredNotifications().length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="notifications-off-outline" size={48} color="#CCC" />
                                <ThemedText style={styles.emptyTitle}>No notifications</ThemedText>
                                <ThemedText style={styles.emptyMessage}>
                                    {filter === 'unread' ? 'All caught up!' : 'You’ll see notifications here when they arrive'}
                                </ThemedText>
                            </View>
                        ) : (
                            <FlatList
                                data={getFilteredNotifications()}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => <NotificationItem item={item} />}
                                contentContainerStyle={styles.listContainer}
                                showsVerticalScrollIndicator={false}
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
        drawer: {
            width: width * 0.9,
            maxWidth: 380,
            height: height,
            backgroundColor: '#FFFFFF',
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
      
        closeButton: {
            padding: 5,
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
            backgroundColor: '#F8F9FA',
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
        },
        notificationTitle: {
            fontSize: 16,
            fontWeight: '500',
            color: '#333',
        },
        unreadTitle: {
            fontWeight: 'bold',
        },
        unreadDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#4ECDC4',
            marginLeft: 8,
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