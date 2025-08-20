import { initializeApp } from "firebase/app";
// Import the necessary functions
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA7SNGXHiglsIkj9EdL6D5pWhMmYKWA1MA",
  authDomain: "pakistan-disaster-ready.firebaseapp.com",
  projectId: "pakistan-disaster-ready",
  storageBucket: "pakistan-disaster-ready.firebasestorage.app",
  messagingSenderId: "139120385098",
  appId: "1:139120385098:web:a4588bb4aa768f7e281ab3",
  measurementId: "G-6MJD1GJJ1T"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Initialize Auth with persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export default app;
