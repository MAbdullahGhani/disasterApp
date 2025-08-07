import * as AuthSession from 'expo-auth-session';
import { ResponseType } from 'expo-auth-session';
import { useAuthRequest } from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseAuthProfile,
} from 'firebase/auth';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

WebBrowser.maybeCompleteAuthSession();

// --- Types ---
interface ProfileData {
    displayName?: string;
    phone?: string;
    location?: string;
    emergencyContact?: string;
    email?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  initializing: boolean;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signInAnonymouslyUser: () => Promise<any>;
  logout: () => Promise<any>;
  isAuthenticated: boolean;
  fetchUserProfile: () => Promise<ProfileData | null>;
  updateUserProfile: (profileData: ProfileData) => Promise<{ success: boolean; error?: string }>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);

  const [request, response, promptAsync] = useAuthRequest({
    clientId: '139120385098-bamg6hpod29t48v7a5efe0hd3ub7d9jh.apps.googleusercontent.com',
    iosClientId: '139120385098-orf5ej61nk5fo7fcicf1oqrudaepujbs.apps.googleusercontent.com',
    androidClientId: '139120385098-pem3i8hcsa2valicnjbj0k3ambe6fop2.apps.googleusercontent.com',
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
  });

  // Log the redirect URI that Expo generates
  useEffect(() => {
    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
    console.log('Generated Redirect URI:', redirectUri);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
      setLoading(false);
    });
    return unsubscribe;
  }, [initializing]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleSignIn(authentication);
    } else if (response?.type === 'error') {
      console.error('Google Auth Error:', response.error);
    }
  }, [response]);

  const handleGoogleSignIn = async (authentication: any) => {
    try {
      setLoading(true);
      if (!authentication?.idToken) {
        throw new Error('No ID token received from Google');
      }
      
      const credential = GoogleAuthProvider.credential(authentication.idToken);
      const result = await signInWithCredential(auth, credential);
      return { success: true, user: result.user };
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (): Promise<ProfileData | null> => {
    try {
      if (!auth.currentUser) {
        console.log('No current user');
        return null;
      }
      
      console.log('Fetching profile for user:', auth.currentUser.uid);
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        console.log('Profile data found:', docSnap.data());
        return docSnap.data() as ProfileData;
      } else {
        console.log('No profile document found');
        return null;
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      return null;
    }
  };

  const updateUserProfile = async (profileData: ProfileData): Promise<{ success: boolean; error?: string }> => {
    if (!auth.currentUser) {
      return { success: false, error: 'No user logged in' };
    }
    
    try {
      setLoading(true);
      
      console.log('Updating profile for user:', auth.currentUser.uid);
      console.log('Profile data:', profileData);
      
      const userDocRef = doc(db, 'users', auth.currentUser.uid);

      // Update the user's display name in Firebase Auth if it has changed
      if (profileData.displayName && profileData.displayName !== auth.currentUser.displayName) {
        console.log('Updating Firebase Auth display name...');
        await updateFirebaseAuthProfile(auth.currentUser, { displayName: profileData.displayName });
      }

      // Update or create the document in Firestore with custom data
      console.log('Updating Firestore document...');
      await setDoc(userDocRef, {
        ...profileData,
        email: auth.currentUser.email,
        uid: auth.currentUser.uid, // Add UID for security rules
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(), // Will only be set if document doesn't exist
      }, { merge: true });

      console.log('Profile updated successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Update Profile Error:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      
      if (!request) {
        return { success: false, error: 'Google Auth request not ready' };
      }

      WebBrowser.maybeCompleteAuthSession();

      const result = await promptAsync({
        useProxy: true,
      });
      
      console.log('Full auth result:', result);
      
      if (result.type === 'success') {
        return await handleGoogleSignIn(result.authentication);
      } else if (result.type === 'cancel') {
        return { success: false, error: 'User cancelled the sign-in process' };
      } else {
        console.log('Auth failed with type:', result.type);
        return { success: false, error: `Google sign in failed: ${result.type}` };
      }
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error: any) {
      console.error('Email Sign In Error:', error);
  
      let friendlyMessage = 'Something went wrong. Please try again.';
  
      switch (error.code) {
        case 'auth/invalid-email':
          friendlyMessage = 'The email address is badly formatted.';
          break;
        case 'auth/user-disabled':
          friendlyMessage = 'This account has been disabled.';
          break;
        case 'auth/user-not-found':
          friendlyMessage = 'No user found with this email address.';
          break;
        case 'auth/wrong-password':
          friendlyMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-credential':
          friendlyMessage = 'The provided credentials are invalid.';
          break;
        case 'auth/too-many-requests':
          friendlyMessage = 'Too many failed attempts. Please try again later.';
          break;
        default:
          friendlyMessage = error.message || 'An unknown error occurred.';
      }
  
      return { success: false, error: friendlyMessage };
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName = '') => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && result.user) {
        await updateFirebaseAuthProfile(result.user, { displayName });
      }
      return { success: true, user: result.user };
    } catch (error: any) {
      console.error('Email Sign Up Error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signInAnonymouslyUser = async () => {
    try {
      setLoading(true);
      const result = await signInAnonymously(auth);
      return { success: true, user: result.user };
    } catch (error: any) {
      console.error('Anonymous Sign In Error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    initializing,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInAnonymouslyUser,
    logout,
    isAuthenticated: !!user,
    fetchUserProfile,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};