import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';
import { ThemedInput } from '@/components/ThemedInput';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const { user, updateUserProfile, fetchUserProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        displayName: user?.displayName || '',
        email: user?.email || '',
        phone: '',
        location: '',
        emergencyContact: '',
    });
    const [loading, setLoading] = useState(false);

    // Load user profile data on component mount
    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const profileData = await fetchUserProfile();
            if (profileData) {
                setFormData(prev => ({
                    ...prev,
                    displayName: user?.displayName || profileData.displayName || '',
                    email: user?.email || '',
                    phone: profileData.phone || '',
                    location: profileData.location || '',
                    emergencyContact: profileData.emergencyContact || '',
                }));
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const result = await updateUserProfile(formData);
            if (result.success) {
                setIsEditing(false);
                Alert.alert('Success', 'Profile updated successfully');
            } else {
                Alert.alert('Error', result.error || 'Failed to update profile');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while updating profile');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        try {
            // Request permission
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (permissionResult.granted === false) {
                Alert.alert('Permission Required', 'Permission to access camera roll is required!');
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                setFormData(prev => ({
                    ...prev,
                    profilePicture: imageUri
                }));
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

const InfoCard = ({ 
    icon, 
    title, 
    value, 
    field, 
    isEditing, 
    handleInputChange, 
    editable = true 
}: {
    icon: any;
    title: string;
    value: string;
    field: string;
    isEditing: boolean;
    handleInputChange: (field: string, value: string) => void;
    editable?: boolean;
}) => (
    <ThemedView 
        style={styles.card}
        lightColor="#FFFFFF" 
        darkColor="#1C1C1E"
    >
        <ThemedView style={styles.infoHeader}>
            <Ionicons name={icon} size={20} color="#4ECDC4" />
            <ThemedText style={styles.infoTitle}>{title}</ThemedText>
        </ThemedView>
        {isEditing && editable ? (
            <ThemedInput
                style={styles.input}
                value={value} // --- 2. FIX: Pass the string value directly ---
                onChangeText={(text) => handleInputChange(field, text)}
                placeholder={`Enter ${title.toLowerCase()}`}
                placeholderTextColor="#999"
                autoCorrect={false}
            />
        ) : (
            <ThemedText style={styles.infoValue}>{value || 'Not provided'}</ThemedText>
        )}
    </ThemedView>
);


    const getUserDisplayName = () => {
        return user?.displayName || formData.displayName || user?.email || 'Anonymous User';
    };

    const getProfileImage = () => {
        return (
            <ThemedText style={styles.profileAvatarText}>
                {getUserDisplayName().charAt(0).toUpperCase()}
            </ThemedText>
        );
    };

    return (
      <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <TouchableOpacity style={styles.profileAvatar} disabled>
            {getProfileImage()}
          </TouchableOpacity>
          <ThemedView style={styles.profileInfo}>
            <ThemedText style={styles.profileName}>{getUserDisplayName()}</ThemedText>
            <ThemedText style={styles.profileStatus}>
              {user?.isAnonymous ? 'Guest Account' : 'Verified User'}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
          disabled={loading}
        >
          <Ionicons name={isEditing ? 'checkmark' : 'pencil'} size={20} />
        </TouchableOpacity>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
                <ThemedView style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Personal Information</ThemedText>
                    
                   <InfoCard 
                        icon="person-outline" 
                        title="Display Name" 
                        value={formData.displayName}
                        field="displayName"
                        isEditing={isEditing}
                        handleInputChange={handleInputChange}
                    />
                    
                    <InfoCard 
                        icon="mail-outline" 
                        title="Email" 
                        value={formData.email}
                        field="email"
                        isEditing={isEditing}
                        handleInputChange={handleInputChange}
                        editable={!user?.isAnonymous}
                    />
                    
                    <InfoCard 
                        icon="call-outline" 
                        title="Phone" 
                        value={formData.phone}
                        field="phone"
                        isEditing={isEditing}
                        handleInputChange={handleInputChange}
                    />
                    
                    <InfoCard 
                        icon="location-outline" 
                        title="Location" 
                        value={formData.location}
                        field="location"
                        isEditing={isEditing}
                        handleInputChange={handleInputChange}
                    />
                </ThemedView>

                {/* Emergency Information */}
                <ThemedView style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Emergency Information</ThemedText>
                    
                    <InfoCard 
                        icon="medical-outline" 
                        title="Emergency Contact" 
                        value={formData.emergencyContact}
                        field="emergencyContact"
                        isEditing={isEditing}
                        handleInputChange={handleInputChange}
                    />
                </ThemedView>
                {/* Account Statistics */}
                <ThemedView style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Account Statistics</ThemedText>
                    
                    <ThemedView style={styles.statsContainer}>
                        <ThemedView style={styles.statCard}>
                            <Ionicons name="shield-checkmark" size={24} color="#4ECDC4" />
                            <ThemedText style={styles.statNumber}>15</ThemedText>
                            <ThemedText style={styles.statLabel}>Alerts Received</ThemedText>
                        </ThemedView>
                        
                        <ThemedView style={styles.statCard}>
                            <Ionicons name="location" size={24} color="#4ECDC4" />
                            <ThemedText style={styles.statNumber}>8</ThemedText>
                            <ThemedText style={styles.statLabel}>Areas Monitored</ThemedText>
                        </ThemedView>
                    </ThemedView>
                </ThemedView>

                {/* Actions */}
                <ThemedView style={styles.section}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="download-outline" size={20} color="#4ECDC4" />
                        <ThemedText style={styles.actionText}>Download My Data</ThemedText>
                        <Ionicons name="chevron-forward" size={16} color="#999" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                        <ThemedText style={[styles.actionText, { color: '#FF6B6B' }]}>Delete Account</ThemedText>
                        <Ionicons name="chevron-forward" size={16} color="#999" />
                    </TouchableOpacity>
                </ThemedView>
            </ScrollView>
        </ThemedView>
            </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
         flexDirection: 'row',
        alignItems: 'center',
    },

    profileAvatar: {
        width: 60,
        height: 60,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        position: 'relative',
        borderWidth: 2,
        overflow: 'hidden',
    },
    profileAvatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    profileAvatarText: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 12,
        padding: 4,
    },
    profileInfo: {
        flex: 1,
    },
    input: {
  fontSize: 16,
  paddingVertical: 8,
  paddingHorizontal: 12,
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#4ECDC4',
  marginTop: 6,
},

editButton: {
  position: 'absolute',
  top: 50,
  right: 20,
  backgroundColor: '#4ECDC4',
  borderRadius: 20,
  padding: 10,
},

actionButton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 15,
  paddingHorizontal: 15,
  borderRadius: 10,
  backgroundColor: 'rgba(255,255,255,0.05)', // added background
  marginBottom: 10,
},

      card: {
        borderRadius: 15,
        padding: 15,
        marginBottom: 12,
        // Add a subtle border for dark mode distinction
        borderWidth: 1,
        // Add shadow for light mode elevation
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3.84,
        elevation: 3,
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    profileStatus: {
        fontSize: 14,
        opacity: 0.8,
    },

    content: {
        flex: 1,
    },
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    infoCard: {
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
        textTransform: 'capitalize',
    },
    infoValue: {
        fontSize: 16,
    },

    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statCard: {
        flex: 1,
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4ECDC4',
        marginVertical: 5,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },

    actionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 12,
    },
});