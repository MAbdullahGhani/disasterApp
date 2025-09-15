import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 1. Import the hook

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const { bottom } = useSafeAreaInsets(); // 2. Get the bottom safe area inset

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4ECDC4',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        // 3. Update the tabBarStyle to be aware of the safe area
        tabBarStyle: {
          position: 'absolute', // Keep it in the layout flow on Android
          height: 60 + bottom, // Add the inset to the total height
          paddingBottom: 20 + bottom, // Add the inset to the bottom padding
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="preparation"
        options={{
          title: 'Preparation',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'list' : 'list-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="badges"
        options={{
          title: 'Badges',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'medal' : 'medal-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          title: 'Quiz',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'help-circle' : 'help-circle-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'analytics' : 'analytics-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}