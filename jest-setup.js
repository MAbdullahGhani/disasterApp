// Set environment variables for Expo BEFORE any imports
process.env.EXPO_OS = 'ios';
process.env.NODE_ENV = 'test';

import "@testing-library/jest-native/extend-expect";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";

// Mock AsyncStorage globally
jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

// Mock i18next to prevent warnings
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
  Trans: ({ children }) => children,
}));

// Mock Firebase
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({})),
  initializeAuth: jest.fn(() => ({})),
  getReactNativePersistence: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({ name: "mocked-app" })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: "mocked-app" })),
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({ mocked: true })),
  doc: jest.fn(() => ({})),
  setDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  deleteDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => new Date()),
}));

// Mock AuthContext
jest.mock("./contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "123", email: "test@example.com", displayName: "Test User" },
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
  AuthProvider: ({ children }) => children,
}));

// Mock navigation
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  useNavigation: () => ({ 
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRouter: () => ({ 
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  router: { 
    push: jest.fn(), 
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  Stack: {
    Screen: ({ children, ...props }) => {
      const React = require('react');
      return React.createElement('div', props, children);
    },
  },
  Tabs: {
    Screen: ({ children, ...props }) => {
      const React = require('react');
      return React.createElement('div', props, children);
    },
  },
  Link: ({ children, ...props }) => {
    const React = require('react');
    return React.createElement('a', props, children);
  },
}));

// Mock ThemedView and ThemedText
jest.mock('@/components/ThemedView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ThemedView: (props) =>
      React.createElement(View, { ...props, testID: 'themed-view' }, props.children),
  };
});

jest.mock('@/components/ThemedText', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ThemedText: (props) =>
      React.createElement(Text, { ...props, testID: 'themed-text' }, props.children),
  };
});

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { ...props, testID: 'safe-area-view' }, children);
  },
}));

// Mock Services
jest.mock("@/services/locationAlertService", () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getAllAlerts: jest.fn().mockResolvedValue([]),
    refreshAlerts: jest.fn().mockResolvedValue(undefined),
    fetchLocationBasedAlerts: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn(),
    getSettings: jest.fn().mockResolvedValue({}),
    updateSettings: jest.fn().mockResolvedValue(undefined),
    isInitialized: jest.fn().mockReturnValue(true),
  },
}));

jest.mock("@/services/notificationService", () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn(),
    getUnreadCount: jest.fn().mockResolvedValue(0),
    scheduleLocalNotification: jest.fn().mockResolvedValue(undefined),
    scheduleWeatherAlert: jest.fn().mockResolvedValue(undefined),
    scheduleNDMAAlert: jest.fn().mockResolvedValue(undefined),
    scheduleSeismicAlert: jest.fn().mockResolvedValue(undefined),
    scheduleFloodAlert: jest.fn().mockResolvedValue(undefined),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    clearAllNotifications: jest.fn().mockResolvedValue(undefined),
    markAsRead: jest.fn().mockResolvedValue(undefined),
    getAllNotifications: jest.fn().mockResolvedValue([]),
  },
}));

// Mock Expo modules
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 31.4504, longitude: 73.1350 }
  }),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([
    { city: 'Faisalabad', region: 'Punjab', country: 'Pakistan' }
  ]),
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  setNotificationHandler: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  writeAsStringAsync: jest.fn().mockResolvedValue(''),
  deleteAsync: jest.fn().mockResolvedValue(''),
}));

// Mock expo-linear-gradient - this was causing the main issue
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props) => 
      React.createElement(View, { 
        ...props, 
        testID: 'linear-gradient-mock',
        style: [props.style, { backgroundColor: '#00BCD4' }] // Fallback color
      }, props.children),
  };
});

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    MaterialIcons: (props) => 
      React.createElement(Text, { 
        ...props, 
        testID: 'material-icon-mock',
        children: `[${props.name}]`
      }),
    Ionicons: (props) => 
      React.createElement(Text, { 
        ...props, 
        testID: 'ionicon-mock',
        children: `[${props.name}]`
      }),
  };
});

// Mock the sidebar components to avoid complex rendering
jest.mock('@/components/SideBar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockSidebar({ visible, onClose }) {
    return visible ? React.createElement(View, { testID: 'sidebar-mock' }) : null;
  };
});

jest.mock('@/components/NotificationSidebar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockNotificationDrawer({ visible, onClose }) {
    return visible ? React.createElement(View, { testID: 'notification-drawer-mock' }) : null;
  };
});

jest.mock('react-native-vector-icons/lib/ensure-native-module-available.js', () => ({
  RNVectorIconsManager: {
    getImageSource: jest.fn(),
    getFontFamily: jest.fn(),
  }
}));
// Mock progress context
jest.mock('@/contexts/useProgress', () => ({
  useProgress: () => ({
    checklist: [
      {
        id: '1',
        title: 'Water Supply',
        description: 'Store 1 gallon per person per day',
        category: 'essentials',
        icon: 'water-drop',
        completed: true,
      },
      {
        id: '2',
        title: 'Emergency Kit',
        description: 'Basic first aid supplies',
        category: 'firstaid',
        icon: 'local-hospital',
        completed: false,
      },
    ],
    overallProgress: 65,
    toggleChecklistItem: jest.fn(),
  }),
}));

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ 
      temperature: 25,
      humidity: 60,
      description: 'Clear sky',
      main: { temp: 25 },
      features: [],
      advisories: [],
      data: []
    }),
    text: () => Promise.resolve(''),
  })
);

// Completely silence console during tests
const originalConsole = { ...console };
console.log = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();
console.info = jest.fn();

// Restore console after all tests
afterAll(() => {
  Object.assign(console, originalConsole);
});