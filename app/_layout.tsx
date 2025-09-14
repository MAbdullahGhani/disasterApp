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
import { useEffect } from "react";
import { I18nManager, Alert, AppState, Platform, Linking } from "react-native";
import { useTranslation } from "react-i18next";
import "react-native-reanimated";
import * as Notifications from 'expo-notifications'; // Import expo-notifications
import "../firebase/config";
import "../services/i18n";
import NotificationService, { NotificationData } from "@/services/notificationService";
import GuidelineDetailScreen from "./GuidelineDetailScreen";
import { setupPdfAssets } from "@/services/assetManager";

SplashScreen.preventAutoHideAsync();
I18nManager.allowRTL(true);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    // --- PERMISSION REQUEST LOGIC ---
    // This function checks for and requests notification permissions.
    const requestPermissions = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Only ask if permissions have not already been determined.
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // Handle the case where permission is still not granted.
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

      // Set up notification channels for Android.
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    };
    
    requestPermissions();

    // --- NOTIFICATION INITIALIZATION ---
    NotificationService.initialize((notification: NotificationData) => {
      console.log("App-level notification received:", notification.title);
      if (notification.priority === "critical" && AppState.currentState === "active") {
        Alert.alert(
          t("alerts.criticalTitle"),
          notification.message,
          [{ text: t("alerts.dismiss"), style: "cancel" }]
        );
      }
    });

    return () => {
      NotificationService.cleanup();
    };
  }, [t]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

   useEffect(() => {
    // Call the function to copy PDFs to the document directory
    setupPdfAssets();
  }, []); // The empty array [] ensures this runs only once


  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ProgressProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
            <Stack.Screen name="AuthScreen" options={{ headerShown: false }} />
            <Stack.Screen name="Emergency" options={{ headerShown: false }} />
            <Stack.Screen name="SafetyGuide" options={{ headerShown: false }} />
            <Stack.Screen name="GuidelineDetailScreen"  options={{ headerShown: false }} />
            <Stack.Screen name="Profile" options={{ headerShown: false }} />
            <Stack.Screen name="Settings" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ProgressProvider>
    </AuthProvider>
  );
}