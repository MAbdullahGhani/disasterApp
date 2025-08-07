import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { useColorScheme } from 'react-native';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SettingsScreen() {
      const colorScheme = useColorScheme();
    
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

    const [settings, setSettings] = useState({
        notifications: true,
        locationServices: true,
        emergencyAlerts: true,
        soundAlerts: true,
        vibration: true,
        dataSaver: false,
        autoBackup: true,
        biometric: false,
        darkMode: false,
    });

    const handleSettingToggle = (key: string, value: boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const SettingItem = ({ 
        icon, 
        title, 
        description, 
        value, 
        onToggle, 
        showToggle = true,
        onPress,
        iconColor = '#4ECDC4'
    }: {
        icon: any;
        title: string;
        description?: string;
        value?: boolean;
        onToggle?: (value: boolean) => void;
        showToggle?: boolean;
        onPress?: () => void;
        iconColor?: string;
    }) => (
        <TouchableOpacity 
            style={styles.settingItem} 
            onPress={onPress}
            disabled={showToggle}
        >
            <ThemedView style={styles.settingIcon}>
                <Ionicons name={icon} size={22} color={iconColor} />
            </ThemedView>
            <ThemedView style={styles.settingContent}>
                <ThemedText style={styles.settingTitle}>{title}</ThemedText>
                {description && (
                    <ThemedText style={styles.settingDescription}>{description}</ThemedText>
                )}
            </ThemedView>
            {showToggle ? (
                <Switch
                    value={value}
                    onValueChange={onToggle}
                    trackColor={{ false: '#E0E0E0', true: '#4ECDC4' }}
                    thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
                />
            ) : (
                <Ionicons name="chevron-forward" size={16} color="#999" />
            )}
        </TouchableOpacity>
    );

    const SectionHeader = ({ title }: { title: string }) => (
        <ThemedText style={styles.sectionHeader}>{title}</ThemedText>
    );

    const handleClearCache = () => {
        Alert.alert(
            'Clear Cache',
            'Are you sure you want to clear the app cache? This will remove temporarily stored data.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => {
                    // Implement cache clearing logic
                    Alert.alert('Success', 'Cache cleared successfully');
                }}
            ]
        );
    };

    const handleResetSettings = () => {
        Alert.alert(
            'Reset Settings',
            'Are you sure you want to reset all settings to default? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: () => {
                    setSettings({
                        notifications: true,
                        locationServices: true,
                        emergencyAlerts: true,
                        soundAlerts: true,
                        vibration: true,
                        dataSaver: false,
                        autoBackup: true,
                        biometric: false,
                        darkMode: false,
                    });
                    Alert.alert('Success', 'Settings reset to default');
                }}
            ]
        );
    };

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
                <ThemedView style={styles.header}>
                    <Ionicons name="settings" size={24}  color={themeColors.iconColor}/>
                    <ThemedText style={styles.headerTitle}>Settings</ThemedText>
                </ThemedView>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Notifications */}
                <ThemedView style={styles.section}>
                    <SectionHeader title="Notifications" />
                    
                    <SettingItem
                        icon="notifications-outline"
                        title={<ThemedText>Push Notifications</ThemedText>}
                        description="Receive alerts and updates"
                        value={settings.notifications}
                        onToggle={(value) => handleSettingToggle('notifications', value)}
                    />
                    
                    <SettingItem
                        icon="warning-outline"
                        title={<ThemedText>Emergency Alerts</ThemedText>}
                        description="Critical disaster warnings"
                        value={settings.emergencyAlerts}
                        onToggle={(value) => handleSettingToggle('emergencyAlerts', value)}
                        iconColor="#FF6B6B"
                    />
                    
                    {/* <SettingItem
                        icon="volume-high-outline"
                        title={<ThemedText>Sound Alerts</ThemedText>}
                        description="Audio notifications"
                        value={settings.soundAlerts}
                        onToggle={(value) => handleSettingToggle('soundAlerts', value)}
                    />
                    
                    <SettingItem
                        icon="phone-portrait-outline"
                        title={<ThemedText>Vibration</ThemedText>}
                        description="Haptic feedback"
                        value={settings.vibration}
                        onToggle={(value) => handleSettingToggle('vibration', value)}
                    /> */}
                </ThemedView>

                {/* Location & Privacy */}
                <ThemedView style={styles.section}>
                    <SectionHeader title="Location & Privacy" />
                    
                    <SettingItem
                        icon="location-outline"
                        title={<ThemedText>Location Services</ThemedText>}
                        description="Enable location-based alerts"
                        value={settings.locationServices}
                        onToggle={(value) => handleSettingToggle('locationServices', value)}
                    />
                    
                    {/* <SettingItem
                        icon="shield-checkmark-outline"
                        title={<ThemedText>Biometric Lock</ThemedText>}
                        description="Use fingerprint or face unlock"
                        value={settings.biometric}
                        onToggle={(value) => handleSettingToggle('biometric', value)}
                    />
                    
                    <SettingItem
                        icon="eye-outline"
                        title={<ThemedText>Privacy Settings</ThemedText>}
                        description="Manage data sharing preferences"
                        showToggle={false}
                        onPress={() => Alert.alert('Privacy', 'Privacy settings will be available soon')}
                    /> */}
                </ThemedView>

                {/* Data & Storage */}
                <ThemedView style={styles.section}>
                    <SectionHeader title="Data & Storage" />
{/*                     
                    <SettingItem
                        icon="cellular-outline"
                        title={<ThemedText>Data Saver</ThemedText>}
                        description="Reduce data usage"
                        value={settings.dataSaver}
                        onToggle={(value) => handleSettingToggle('dataSaver', value)}
                    />
                    
                    <SettingItem
                        icon="cloud-upload-outline"
                        title={<ThemedText>Auto Backup</ThemedText>}
                        description="Backup settings and data"
                        value={settings.autoBackup}
                        onToggle={(value) => handleSettingToggle('autoBackup', value)}
                    /> */}
                    
                    <SettingItem
                        icon="trash-outline"
                        title={<ThemedText>Clear Storage</ThemedText>}
                        description="Free up storage space"
                        showToggle={false}
                        onPress={handleClearCache}
                    />
                </ThemedView>

                {/* Appearance */}
                <ThemedView style={styles.section}>
                    <SectionHeader title="Appearance" />
                    
                    <SettingItem
                        icon="moon-outline"
                        title={<ThemedText>Dark Mode</ThemedText>}
                        description="Use dark theme"
                        value={settings.darkMode}
                        onToggle={(value) => handleSettingToggle('darkMode', value)}
                    />
                    
                    <SettingItem
                        icon="language-outline"
                        title={<ThemedText>Language</ThemedText>}
                        description="English (US)"
                        showToggle={false}
                        onPress={() => Alert.alert('Language', 'Language selection coming soon')}
                    />
                </ThemedView>

                {/* About */}
                <ThemedView style={styles.section}>
                    <SectionHeader title="About" />
                    
                    <SettingItem
                        icon="information-circle-outline"
                        title={<ThemedText>App Version</ThemedText>}
                        description="Pakistan Disaster Ready v1.0"
                        showToggle={false}
                    />
                    
                    <SettingItem
                        icon="shield-outline"
                        title={<ThemedText>Privacy Policy</ThemedText>}
                        showToggle={false}
                        onPress={() => Alert.alert('Privacy', 'Privacy Policy will open in browser')}
                    />
                </ThemedView>

                {/* Danger Zone */}
                <ThemedView style={styles.section}>
                    <SectionHeader title="Danger Zone" />
                    
                    <SettingItem
                        icon="refresh-outline"
                        title={<ThemedText>Reset Settings</ThemedText>}
                        description="Reset all settings to default"
                        showToggle={false}
                        onPress={handleResetSettings}
                        iconColor="#FF6B6B"
                    />
                </ThemedView>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },

    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    content: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 20,
        paddingTop: 15,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4ECDC4',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    settingIcon: {
        width: 40,
        alignItems: 'center',
    },
    settingContent: {
        flex: 1,
        marginLeft: 12,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 14,
        color: '#666',
    },
    bottomSpacer: {
        height: 40,
    },
});