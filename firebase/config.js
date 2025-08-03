import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Get this config from Firebase Console → Project Settings → General → Your apps
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
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;