import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { RootStackParamList } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useNavigation } from 'expo-router/build/useNavigation';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthScreen'>;

export default function AuthScreen(): JSX.Element {
    const colorScheme = useColorScheme();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigation = useNavigation();
    const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInAnonymouslyUser } = useAuth();

    // Get dynamic colors based on theme
    const getThemeColors = () => {
        const isDark = colorScheme === 'dark';
        return {
            containerBg: isDark ? '#1A1A1A' : '#FFFFFF',
            inputBg: isDark ? '#2A2A2A' : '#F8F8F8',
            inputBorder: isDark ? '#444444' : '#E0E0E0',
            inputText: isDark ? '#FFFFFF' : '#333333',
            iconColor: isDark ? '#AAAAAA' : '#666666',
            placeholderColor: isDark ? '#777777' : '#999999',
            toggleBg: isDark ? '#2A2A2A' : '#F5F5F5',
            toggleInactiveText: isDark ? '#AAAAAA' : '#666666',
            dividerLine: isDark ? '#444444' : '#E0E0E0',
            googleButtonBg: isDark ? '#2A2A2A' : '#FFFFFF',
            googleButtonBorder: isDark ? '#444444' : '#E0E0E0',
            googleButtonText: isDark ? '#FFFFFF' : '#333333',
        };
    };

    const handleEmailAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (!isLogin && password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (!isLogin && password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters long');
            return;
        }

        setIsLoading(true);

        try {
            const result = isLogin
                ? await signInWithEmail(email, password)
                : await signUpWithEmail(email, password, displayName);

            if (result.success) {
                Alert.alert('Success', isLogin ? 'Signed in successfully!' : 'Account created successfully!');
                router.push('(tabs)');
            } else {
                Alert.alert('Error', result.error || 'Authentication failed');
            }
        } catch {
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const resetFields = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setDisplayName('');
    };

    const handleGoogleAuth = async () => {
        setIsLoading(true);
        try {
            const result = await signInWithGoogle();
            Alert.alert(result.success ? 'Success' : 'Error', result.success ? 'Signed in with Google successfully!' : result.error || 'Google sign in failed');
        } catch {
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAuthMode = () => {
        setIsLogin(!isLogin);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setDisplayName('');
    };

    const themeColors = getThemeColors();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.containerBg }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <LinearGradient colors={['#4ECDC4', '#44A08D']} style={styles.headerGradient}>
                        <View style={styles.headerContent}>
                            <Image
                                source={require('../assets/images/Pdr_logo.png')}
                                style={styles.logoImage}
                            />
                            <View style={styles.titleContainer}>
                                <ThemedText style={styles.headerTitle}>Pakistan Disaster Ready</ThemedText>
                                <ThemedText style={styles.headerSubtitle}>
                                    {isLogin ? 'Welcome back!' : 'Join our community'}
                                </ThemedText>
                            </View>
                        </View>
                    </LinearGradient>

                    <ThemedView style={styles.formContainer}>
                        <View style={[styles.authToggle, { backgroundColor: themeColors.toggleBg }]}>
                            <TouchableOpacity 
                                style={[styles.toggleButton, isLogin && styles.activeToggle]} 
                                onPress={() => setIsLogin(true)}
                            >
                                <ThemedText style={[
                                    styles.toggleText, 
                                    { color: isLogin ? '#FFFFFF' : themeColors.toggleInactiveText }
                                ]}>
                                    Login
                                </ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.toggleButton, !isLogin && styles.activeToggle]} 
                                onPress={() => { setIsLogin(false), resetFields() }}
                            >
                                <ThemedText style={[
                                    styles.toggleText, 
                                    { color: !isLogin ? '#FFFFFF' : themeColors.toggleInactiveText }
                                ]}>
                                    Sign Up
                                </ThemedText>
                            </TouchableOpacity>
                        </View>

                        {!isLogin && (
                            <View style={[
                                styles.inputContainer, 
                                { 
                                    backgroundColor: themeColors.inputBg,
                                    borderColor: themeColors.inputBorder
                                }
                            ]}>
                                <Ionicons name="person-outline" size={20} color={themeColors.iconColor} style={styles.inputIcon} />
                                <TextInput 
                                    style={[styles.textInput, { color: themeColors.inputText }]} 
                                    placeholder="Full Name" 
                                    placeholderTextColor={themeColors.placeholderColor} 
                                    value={displayName} 
                                    onChangeText={setDisplayName} 
                                    autoCapitalize="words" 
                                />
                            </View>
                        )}

                        <View style={[
                            styles.inputContainer, 
                            { 
                                backgroundColor: themeColors.inputBg,
                                borderColor: themeColors.inputBorder
                            }
                        ]}>
                            <Ionicons name="mail-outline" size={20} color={themeColors.iconColor} style={styles.inputIcon} />
                            <TextInput 
                                style={[styles.textInput, { color: themeColors.inputText }]} 
                                placeholder="Email Address" 
                                placeholderTextColor={themeColors.placeholderColor} 
                                value={email} 
                                onChangeText={setEmail} 
                                keyboardType="email-address" 
                                autoCapitalize="none" 
                                autoComplete="email" 
                            />
                        </View>

                        <View style={[
                            styles.inputContainer, 
                            { 
                                backgroundColor: themeColors.inputBg,
                                borderColor: themeColors.inputBorder
                            }
                        ]}>
                            <Ionicons name="lock-closed-outline" size={20} color={themeColors.iconColor} style={styles.inputIcon} />
                            <TextInput 
                                style={[styles.textInput, { color: themeColors.inputText }]} 
                                placeholder="Password" 
                                placeholderTextColor={themeColors.placeholderColor} 
                                value={password} 
                                onChangeText={setPassword} 
                                secureTextEntry={!showPassword} 
                                autoComplete="password" 
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                <Ionicons 
                                    name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                                    size={20} 
                                    color={themeColors.iconColor} 
                                />
                            </TouchableOpacity>
                        </View>

                        {!isLogin && (
                            <View style={[
                                styles.inputContainer, 
                                { 
                                    backgroundColor: themeColors.inputBg,
                                    borderColor: themeColors.inputBorder
                                }
                            ]}>
                                <Ionicons name="lock-closed-outline" size={20} color={themeColors.iconColor} style={styles.inputIcon} />
                                <TextInput 
                                    style={[styles.textInput, { color: themeColors.inputText }]} 
                                    placeholder="Confirm Password" 
                                    placeholderTextColor={themeColors.placeholderColor} 
                                    value={confirmPassword} 
                                    onChangeText={setConfirmPassword} 
                                    secureTextEntry={!showPassword} 
                                />
                            </View>
                        )}

                        <TouchableOpacity style={styles.primaryButton} onPress={handleEmailAuth} disabled={isLoading}>
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <ThemedText style={styles.primaryButtonText}>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                </ThemedText>
                            )}
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={[styles.dividerLine, { backgroundColor: themeColors.dividerLine }]} />
                            <ThemedText style={[styles.dividerText, { color: themeColors.iconColor }]}>OR</ThemedText>
                            <View style={[styles.dividerLine, { backgroundColor: themeColors.dividerLine }]} />
                        </View>

                        <TouchableOpacity 
                            style={[
                                styles.googleButton, 
                                { 
                                    backgroundColor: themeColors.googleButtonBg,
                                    borderColor: themeColors.googleButtonBorder
                                }
                            ]} 
                            onPress={handleGoogleAuth} 
                            disabled={isLoading}
                        >
                            <Ionicons name="logo-google" size={20} color="#DB4437" />
                            <ThemedText style={[styles.googleButtonText, { color: themeColors.googleButtonText }]}>
                                Continue with Google
                            </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.switchButton} onPress={toggleAuthMode}>
                            <ThemedText style={styles.switchText}>
                                {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                            </ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
    },
    headerGradient: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    headerContent: {
        alignItems: 'center',
    },
    logoImage: {
        width: 100,
        height: 100,
        resizeMode: 'contain',
        marginBottom: 15,
    },
    titleContainer: {
        alignItems: 'center',
        marginTop: 5,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        lineHeight: 34,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#FFFFFF',
        opacity: 0.9,
        textAlign: 'center',
    },
    formContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 30,
    },
    authToggle: {
        flexDirection: 'row',
        borderRadius: 25,
        padding: 4,
        marginBottom: 30,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 21,
    },
    activeToggle: {
        backgroundColor: '#4ECDC4',
    },
    toggleText: {
        fontSize: 16,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 15,
        marginBottom: 15,
        borderWidth: 1,
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
    },
    eyeIcon: {
        padding: 5,
    },
    primaryButton: {
        backgroundColor: '#4ECDC4',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
        shadowColor: '#4ECDC4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 15,
        fontSize: 14,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingVertical: 16,
        marginBottom: 15,
        borderWidth: 1,
    },
    googleButtonText: {
        marginLeft: 10,
        fontSize: 16,
        fontWeight: '600',
    },
    anonymousButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingVertical: 16,
        marginBottom: 30,
    },
    anonymousButtonText: {
        marginLeft: 10,
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    switchButton: {
        alignItems: 'center',
        paddingVertical: 15,
    },
    switchText: {
        color: '#4ECDC4',
        fontSize: 16,
        fontWeight: '600',
    },
});  
