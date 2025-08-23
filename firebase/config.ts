import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyA7SNGXHiglsIkj9EdL6D5pWhMmYKWA1MA",
  authDomain: "pakistan-disaster-ready.firebaseapp.com",
  projectId: "pakistan-disaster-ready",
  storageBucket: "pakistan-disaster-ready.firebasestorage.app",
  messagingSenderId: "139120385098",
  appId: "1:139120385098:web:a4588bb4aa768f7e281ab3",
  measurementId: "G-6MJD1GJJ1T"
};


let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Initialize Firebase App
if (getApps().length === 0) {
  console.log('Initializing Firebase app...');
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized');
} else {
  console.log('Using existing Firebase app');
  app = getApps()[0];
}

// Initialize Auth with platform-specific configuration
console.log('Initializing Firebase Auth...');
console.log('Platform:', Platform.OS);

try {
  if (Platform.OS === 'web') {
    // Use default web auth for browser
    console.log('Using web auth (browser)');
    auth = getAuth(app);
  } else {
    // Use React Native auth with AsyncStorage persistence for mobile
    console.log('Using React Native auth with persistence');
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
  console.log('Firebase Auth initialized successfully');
} catch (error) {
  console.error('Auth initialization failed:', error);
  // Fallback to default auth if there's an issue
  console.log('Falling back to default auth');
  auth = getAuth(app);
}

// Initialize Firestore
console.log('Initializing Firestore...');
try {
  db = getFirestore(app);
  console.log('Firestore initialized successfully');
} catch (error) {
  console.error('Firestore initialization failed:', error);
  throw error;
}

export { app, auth, db };
export default app;