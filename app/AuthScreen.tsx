import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useNavigation } from "expo-router/build/useNavigation";
import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next"; // Import the hook
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

type Props = NativeStackScreenProps<RootStackParamList, "AuthScreen">;

const { width, height } = Dimensions.get("window");

// InputField component moved outside to prevent recreation on every render
const InputField = React.memo(
  ({
    icon,
    placeholder,
    value,
    onChangeText,
    secureTextEntry = false,
    showToggle = false,
    toggleVisibility,
    isVisible,
    keyboardType = "default",
    autoCapitalize = "none",
    autoComplete,
    inputKey,
    isFocused,
    onFocus,
    onBlur,
    themeColors,
  }: any) => {
    return (
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: themeColors.inputBg,
            borderColor: isFocused
              ? themeColors.inputBorderFocused
              : themeColors.inputBorder,
            borderWidth: isFocused ? 2 : 1,
            transform: [{ scale: isFocused ? 1.02 : 1 }],
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            isFocused ? themeColors.inputBorderFocused : themeColors.iconColor
          }
          style={styles.inputIcon}
        />
        <TextInput
          style={[styles.textInput, { color: themeColors.inputText }]}
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholderColor}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          onFocus={onFocus}
          onBlur={onBlur}
          returnKeyType={keyboardType === "email-address" ? "next" : "done"}
        />
        {showToggle && (
          <TouchableOpacity onPress={toggleVisibility} style={styles.eyeIcon}>
            <Ionicons
              name={isVisible ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={themeColors.iconColor}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }
);

export default function AuthScreen(): JSX.Element {
  const { t } = useTranslation(); // Initialize the translation function
  const colorScheme = useColorScheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const navigation = useNavigation();
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInAnonymouslyUser,
    isGoogleSignInAvailable,
  } = useAuth();

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Get dynamic colors based on theme
  const getThemeColors = useCallback(() => {
    const isDark = colorScheme === "dark";
    return {
      background: isDark ? "#0A0A0B" : "#FFFFFF",
      cardBg: isDark ? "#1C1C1E" : "#FFFFFF",
      inputBg: isDark ? "#2C2C2E" : "#F2F2F7",
      inputBorder: isDark ? "#38383A" : "#E5E5EA",
      inputBorderFocused: "#007AFF",
      inputText: isDark ? "#FFFFFF" : "#000000",
      iconColor: isDark ? "#8E8E93" : "#6D6D70",
      placeholderColor: isDark ? "#8E8E93" : "#999999",
      primaryText: isDark ? "#FFFFFF" : "#000000",
      secondaryText: isDark ? "#8E8E93" : "#6D6D70",
      dividerColor: isDark ? "#38383A" : "#E5E5EA",
      shadowColor: isDark ? "#000000" : "#000000",
      overlayBg: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)",
    };
  }, [colorScheme]);

  const themeColors = getThemeColors();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailAuth = async () => {
    // Validation
    if (!email.trim() || !password.trim()) {
      Alert.alert(t("auth.alerts.missingInfoTitle"), t("auth.alerts.missingInfoMessage"));
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert(t("auth.alerts.invalidEmailTitle"), t("auth.alerts.invalidEmailMessage"));
      return;
    }

    if (!isLogin && !displayName.trim()) {
      Alert.alert(t("auth.alerts.missingInfoTitle"), t("auth.alerts.missingNameMessage"));
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert(t("auth.alerts.passwordMismatchTitle"), t("auth.alerts.passwordMismatchMessage"));
      return;
    }

    if (!isLogin && password.length < 6) {
      Alert.alert(t("auth.alerts.weakPasswordTitle"), t("auth.alerts.weakPasswordMessage"));
      return;
    }

    setIsLoading(true);

    try {
      const result = isLogin
        ? await signInWithEmail(email.trim().toLowerCase(), password)
        : await signUpWithEmail(
            email.trim().toLowerCase(),
            password,
            displayName.trim()
          );

      if (result.success) {
        Alert.alert(
          t("auth.alerts.successTitle"),
          isLogin ? t("auth.alerts.welcomeBackMessage") : t("auth.alerts.accountCreatedMessage"),
          [
            {
              text: "OK",
              onPress: () => router.push("(tabs)"),
            },
          ]
        );
      } else {
        Alert.alert(t("auth.alerts.authErrorTitle"), result.error || t("auth.alerts.authErrorMessage"));
      }
    } catch (error) {
      Alert.alert(t("auth.alerts.unexpectedErrorTitle"), t("auth.alerts.unexpectedErrorMessage"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        Alert.alert(t("auth.alerts.successTitle"), t("auth.alerts.googleSignInSuccess"), [
          {
            text: "OK",
            onPress: () => router.push("(tabs)"),
          },
        ]);
      } else {
        Alert.alert(
          t("auth.alerts.googleSignInFailedTitle"),
          result.error || t("auth.alerts.authErrorMessage")
        );
      }
    } catch (error) {
      Alert.alert(t("auth.alerts.unexpectedErrorTitle"), t("auth.alerts.googleSignInFailedTitle"));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: isLogin ? -50 : 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsLogin(!isLogin);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setDisplayName("");
      setFocusedInput(null);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleInputFocus = useCallback((inputKey: string) => {
    setFocusedInput(inputKey);
  }, []);

  const handleInputBlur = useCallback(() => {
    setFocusedInput(null);
  }, []);

  return (
    <>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.background }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Modern Header */}
            <View style={styles.headerSection}>
              <LinearGradient
                colors={["#667eea", "#764ba2"]}
                style={styles.logoContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image
                  source={require("../assets/images/Pdr_logo.png")}
                  style={styles.logoImage}
                />
              </LinearGradient>

              <View style={styles.titleSection}>
                <ThemedText
                  style={[styles.appTitle, { color: themeColors.primaryText }]}
                >
                  {t("auth.appTitle")}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.subtitle,
                    { color: themeColors.secondaryText },
                  ]}
                >
                  {t("auth.subtitle")}
                </ThemedText>
              </View>
            </View>

            {/* Auth Card */}
            <Animated.View
              style={[
                styles.authCard,
                {
                  backgroundColor: themeColors.cardBg,
                  shadowColor: themeColors.shadowColor,
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Mode Toggle */}
              <View style={styles.modeToggleContainer}>
                <ThemedText
                  style={[styles.modeTitle, { color: themeColors.primaryText }]}
                >
                  {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.modeSubtitle,
                    { color: themeColors.secondaryText },
                  ]}
                >
                  {isLogin ? t("auth.signInToContinue") : t("auth.joinCommunity")}
                </ThemedText>
              </View>

              {/* Form Fields */}
              <View style={styles.formSection}>
                {!isLogin && (
                  <InputField
                    icon="person-outline"
                    placeholder={t("auth.fullName")}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    autoComplete="name"
                    inputKey="displayName"
                    isFocused={focusedInput === "displayName"}
                    onFocus={() => handleInputFocus("displayName")}
                    onBlur={handleInputBlur}
                    themeColors={themeColors}
                  />
                )}

                <InputField
                  icon="mail-outline"
                  placeholder={t("auth.emailAddress")}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoComplete="email"
                  inputKey="email"
                  isFocused={focusedInput === "email"}
                  onFocus={() => handleInputFocus("email")}
                  onBlur={handleInputBlur}
                  themeColors={themeColors}
                />

                <InputField
                  icon="lock-closed-outline"
                  placeholder={t("auth.password")}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  showToggle={true}
                  toggleVisibility={() => setShowPassword(!showPassword)}
                  isVisible={showPassword}
                  autoComplete="password"
                  inputKey="password"
                  isFocused={focusedInput === "password"}
                  onFocus={() => handleInputFocus("password")}
                  onBlur={handleInputBlur}
                  themeColors={themeColors}
                />

                {!isLogin && (
                  <InputField
                    icon="shield-checkmark-outline"
                    placeholder={t("auth.confirmPassword")}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    showToggle={true}
                    toggleVisibility={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    isVisible={showConfirmPassword}
                    inputKey="confirmPassword"
                    isFocused={focusedInput === "confirmPassword"}
                    onFocus={() => handleInputFocus("confirmPassword")}
                    onBlur={handleInputBlur}
                    themeColors={themeColors}
                  />
                )}
              </View>

              {/* Primary Action Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
                onPress={handleEmailAuth}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={["#667eea", "#764ba2"]}
                  style={styles.gradientButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>
                      {isLogin ? t("auth.signIn") : t("auth.createAccount")}
                    </ThemedText>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Divider - Only show if Google Sign-in is available */}
              {isGoogleSignInAvailable && (
                <View style={styles.divider}>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: themeColors.dividerColor },
                    ]}
                  />
                  <ThemedText
                    style={[
                      styles.dividerText,
                      { color: themeColors.secondaryText },
                    ]}
                  >
                    {t("auth.orContinueWith")}
                  </ThemedText>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: themeColors.dividerColor },
                    ]}
                  />
                </View>
              )}

              {/* Social Login - Only show if Google Sign-in is available */}
              {isGoogleSignInAvailable && (
                <Pressable
                  style={({ pressed }) => [
                    styles.socialButton,
                    {
                      backgroundColor: themeColors.inputBg,
                      borderColor: themeColors.inputBorder,
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                  onPress={handleGoogleAuth}
                  disabled={isLoading}
                >
                  <Image
                    source={require(".././assets/images/Google.png")}
                    style={styles.googleIcon}
                  />
                  <ThemedText
                    style={[
                      styles.socialButtonText,
                      { color: themeColors.primaryText },
                    ]}
                  >
                    {t("auth.continueWithGoogle")}
                  </ThemedText>
                </Pressable>
              )}

              {/* Development Build Info - Show only in Expo Go */}
              {!isGoogleSignInAvailable &&
                Constants.appOwnership === "expo" && (
                  <View
                    style={[
                      styles.infoContainer,
                      { backgroundColor: themeColors.inputBg },
                    ]}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color={themeColors.iconColor}
                    />
                    <ThemedText
                      style={[
                        styles.infoText,
                        { color: themeColors.secondaryText },
                      ]}
                    >
                      {t("auth.googleSignInInfo")}
                    </ThemedText>
                  </View>
                )}

              {/* Switch Mode */}
              <TouchableOpacity
                style={[
                  styles.switchButton,
                  { marginTop: isGoogleSignInAvailable ? 0 : 16 },
                ]}
                onPress={toggleAuthMode}
              >
                <ThemedText
                  style={[
                    styles.switchText,
                    { color: themeColors.secondaryText },
                  ]}
                >
                  {isLogin
                    ? t("auth.dontHaveAccount")
                    : t("auth.alreadyHaveAccount")}
                  <ThemedText style={styles.switchTextHighlight}>
                    {isLogin ? t("auth.signUp") : t("auth.signIn")}
                  </ThemedText>
                </ThemedText>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  headerSection: {
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 30,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  logoImage: {
    width: 45,
    height: 45,
    resizeMode: "contain",
  },
  titleSection: {
    alignItems: "center",
  },
  appTitle: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    opacity: 0.7,
  },
  authCard: {
    borderRadius: 20,
    padding: 28,
    marginBottom: 30,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  modeToggleContainer: {
    alignItems: "center",
    marginBottom: 28,
  },
  modeTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 6,
  },
  modeSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  formSection: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
  },
  eyeIcon: {
    padding: 6,
  },
  primaryButton: {
    borderRadius: 14,
    marginBottom: 20,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  gradientButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 13,
    opacity: 0.6,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  googleIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  switchButton: {
    alignItems: "center",
    paddingVertical: 14,
  },
  switchText: {
    fontSize: 14,
    textAlign: "center",
  },
  switchTextHighlight: {
    color: "#667eea",
    fontWeight: "600",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
  },
  infoText: {
    marginLeft: 6,
    fontSize: 13,
    flex: 1,
  },
});
