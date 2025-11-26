import React, { useEffect, useState } from "react";
import { Alert, AppState, Platform, Linking, View, Text } from "react-native";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProgressProvider } from "@/contexts/useProgress";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import * as Updates from "expo-updates";
import "react-native-reanimated";

// CRITICAL: Import i18n service synchronously BEFORE component definition
import "../services/i18n";
import "../firebase/config";

// Wrap all heavy imports in try-catch to prevent crashes
let Notifications: any = null;
let NotificationService: any = null;
let setupPdfAssets: any = null;

try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.error('Failed to import expo-notifications:', error);
}

try {
  NotificationService = require("@/services/notificationService").default;
} catch (error) {
  console.error('Failed to import NotificationService:', error);
}

try {
  setupPdfAssets = require("@/services/assetManager").setupPdfAssets;
} catch (error) {
  console.error('Failed to import setupPdfAssets:', error);
}

// Prevent splash screen from hiding automatically
SplashScreen.preventAutoHideAsync().catch(console.error);

// CRITICAL: Force RTL configuration at module level for release builds
try {
  I18nManager.allowRTL(true);
  
  // For release builds, we need to check and potentially force RTL immediately
  const checkInitialRTL = async () => {
    try {
      const savedLanguage = await import('@react-native-async-storage/async-storage').then(
        AsyncStorage => AsyncStorage.default.getItem('@app_language')
      );
      
      const RTL_LANGUAGES = ['ur', 'ar', 'he', 'fa'];
      const shouldBeRTL = RTL_LANGUAGES.includes(savedLanguage || '');
      
      console.log(`Initial language check: ${savedLanguage}, should be RTL: ${shouldBeRTL}, current RTL: ${I18nManager.isRTL}`);
      
      // Force RTL if needed during app startup
      if (shouldBeRTL !== I18nManager.isRTL) {
        console.log(`Forcing RTL to: ${shouldBeRTL}`);
        I18nManager.forceRTL(shouldBeRTL);
      }
    } catch (error) {
      console.error('Error checking initial RTL:', error);
    }
  };
  
  // Only run this check in release builds
  if (!__DEV__) {
    checkInitialRTL();
  }
} catch (error) {
  console.error('Error setting RTL allowance:', error);
}

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [rtlInitialized, setRtlInitialized] = useState(false);
  const colorScheme = useColorScheme();
  const { t, i18n } = useTranslation();

  const [loaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Listen for language changes and handle RTL switching
  useEffect(() => {
    const handleLanguageChange = async (language: string) => {
      console.log(`Language changed to: ${language}`);
      
      const RTL_LANGUAGES = ['ur', 'ar', 'he', 'fa'];
      const shouldBeRTL = RTL_LANGUAGES.includes(language);
      const currentRTL = I18nManager.isRTL;
      
      console.log(`Should be RTL: ${shouldBeRTL}, Current RTL: ${currentRTL}`);
      
      if (shouldBeRTL !== currentRTL) {
        console.log(`RTL change needed: ${shouldBeRTL}`);
        
        try {
          I18nManager.forceRTL(shouldBeRTL);
          
          // For release builds, we need to reload the app to apply RTL changes
          if (!__DEV__) {
            console.log('Release build detected, attempting app reload for RTL change');
            
            Alert.alert(
              "Layout Change Required",
              "The app needs to restart to apply the new text direction. This will happen automatically.",
              [
                {
                  text: "OK",
                  onPress: async () => {
                    try {
                      if (Updates.reloadAsync) {
                        await Updates.reloadAsync();
                      } else {
                        // Fallback: ask user to restart manually
                        Alert.alert(
                          "Please Restart",
                          "Please manually close and reopen the app to apply the language changes."
                        );
                      }
                    } catch (error) {
                      console.error('Failed to reload app:', error);
                      Alert.alert(
                        "Please Restart",
                        "Please manually close and reopen the app to apply the language changes."
                      );
                    }
                  }
                }
              ]
            );
          }
        } catch (error) {
          console.error('Error forcing RTL:', error);
        }
      }
    };

    // Subscribe to language changes
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        console.log('RootLayout: Starting app initialization...');
        
        // CRITICAL: Wait longer for i18n and RTL to be properly set in release builds
        const waitTime = __DEV__ ? 50 : 200;
        await new Promise(resolve => setTimeout(resolve, waitTime));

        // Verify RTL state after initialization
        console.log(`Post-initialization RTL state: ${I18nManager.isRTL}`);
        console.log(`Current language: ${i18n.language}`);
        
        setRtlInitialized(true);

        if (!isMounted) return;

        // Initialize PDF assets (safe)
        if (setupPdfAssets) {
          try {
            await setupPdfAssets();
            console.log('PDF assets setup completed');
          } catch (error) {
            console.error('PDF assets setup error (non-critical):', error);
          }
        }

        if (!isMounted) return;

        // Initialize notifications (safe)
        if (Notifications) {
          try {
            await initializeNotifications();
          } catch (error) {
            console.error('Notification initialization error (non-critical):', error);
          }
        }

        if (!isMounted) return;

        // Initialize notification service (safe)
        if (NotificationService) {
          try {
            NotificationService.initialize((notification: any) => {
              console.log("App-level notification received:", notification.title);
              if (notification.priority === "critical" && AppState.currentState === "active") {
                Alert.alert(
                  t("alerts.criticalTitle") || "Critical Alert",
                  notification.message,
                  [{ text: t("alerts.dismiss") || "Dismiss", style: "cancel" }]
                );
              }
            });
          } catch (error) {
            console.error('NotificationService initialization error (non-critical):', error);
          }
        }

        if (isMounted) {
          console.log('App initialization completed successfully');
          console.log(`Final RTL state: ${I18nManager.isRTL}`);
          setIsAppReady(true);
        }

      } catch (error) {
        console.error('Critical app initialization error:', error);
        if (isMounted) {
          setInitError(error.message || 'Unknown initialization error');
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
      // Cleanup notification service
      if (NotificationService && NotificationService.cleanup) {
        try {
          NotificationService.cleanup();
        } catch (error) {
          console.error('Error cleaning up NotificationService:', error);
        }
      }
    };
  }, [i18n, t]); // Add i18n dependencies

  const initializeNotifications = async () => {
    if (!Notifications) return;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive important disaster alerts.',
          [
            { text: "Don't ask again", style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  useEffect(() => {
    if (loaded && isAppReady && rtlInitialized) {
      // Longer delay for release builds to ensure RTL is properly applied
      const delay = __DEV__ ? 200 : 500;
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().catch(console.error);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [loaded, isAppReady, rtlInitialized]);

  // Show error screen if initialization failed
  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 10, color: '#333' }}>
          App failed to initialize
        </Text>
        <Text style={{ fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 20 }}>
          Please restart the app. If this continues, try reinstalling.
        </Text>
        <Text style={{ fontSize: 12, textAlign: 'center', color: '#999' }}>
          Error: {initError}
        </Text>
      </View>
    );
  }

  // Show loading screen while app initializes
  if (!loaded || !isAppReady || !rtlInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 16, color: '#666' }}>Loading...</Text>
      </View>
    );
  }


  return (
    <AuthProvider>
      <ProgressProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
            <Stack.Screen name="AuthScreen" options={{ headerShown: false }} />
            <Stack.Screen name="Emergency" options={{ headerShown: false }} />
            <Stack.Screen name="SafetyGuide" options={{ headerShown: false }} />
            <Stack.Screen name="GuidelineDetailScreen" options={{ headerShown: false }} />
            <Stack.Screen name="Profile" options={{ headerShown: false }} />
            <Stack.Screen name="Settings" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ProgressProvider>
    </AuthProvider>
  );
}