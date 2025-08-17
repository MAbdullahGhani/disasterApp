import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA7SNGXHiglsIkj9EdL6D5pWhMmYKWA1MA",
  authDomain: "pakistan-disaster-ready.firebaseapp.com",
  projectId: "pakistan-disaster-ready",
  storageBucket: "pakistan-disaster-ready.firebasestorage.app",
  messagingSenderId: "139120385098",
  appId: "1:139120385098:web:a4588bb4aa768f7e281ab3",
  measurementId: "G-6MJD1GJJ1T",
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

// Initialize Auth with AsyncStorage persistence
console.log('Initializing Firebase Auth...');
auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
console.log('Firebase Auth initialized');

// Initialize Firestore
console.log('Initializing Firestore...');
db = getFirestore(app);
console.log('Firestore initialized');

export { app, auth, db };
export default app;