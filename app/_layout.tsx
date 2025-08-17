import { AuthProvider } from '@/contexts/AuthContext';
import { ProgressProvider } from '@/contexts/useProgress';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../firebase/config'; // Add this BEFORE AuthProvider
import '../services/i18n';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ProgressProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
            <Stack.Screen name="AuthScreen" options={{ headerShown: false }} />
            <Stack.Screen name="Emergency" options={{ headerShown: false }} />
            <Stack.Screen name="Profile" options={{ headerShown: false }} />
            <Stack.Screen name="Settings" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ProgressProvider>
    </AuthProvider>
  );
}