import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { I18nManager } from 'react-native';
import HomeScreen from './app/(tabs)';
I18nManager.allowRTL(true);

export default function App() {
  return (
    <>
      <HomeScreen />
      <StatusBar style="auto" />
    </>
  );
}

registerRootComponent(App);