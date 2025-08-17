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
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';

// Import auth and db after they're initialized
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

  // Updated Google Auth configuration for Expo Go
  const [request, response, promptAsync] = useAuthRequest({
    clientId: '139120385098-pqfbrjjp3fqubai9c7ppo31c376umrl7.apps.googleusercontent.com',
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    redirectUri: AuthSession.makeRedirectUri({
      useProxy: true,
    }),
  });

  // Debug redirect URI
  useEffect(() => {
    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
    console.log('Generated Redirect URI:', redirectUri);
    console.log('Expected format: https://auth.expo.io/@abdullah797/disasterApp');
  }, []);

  // Set up auth state listener
  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    // Wait a bit for Firebase to be fully initialized
    const timer = setTimeout(() => {
      if (!auth) {
        console.error('Auth still not initialized after timeout');
        setInitializing(false);
        return;
      }

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed:', user?.uid || 'no user');
        setUser(user);
        if (initializing) {
          console.log('Auth initialization complete');
          setInitializing(false);
        }
        setLoading(false);
      });

      return () => {
        console.log('Unsubscribing from auth state changes');
        unsubscribe();
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [initializing]);

  useEffect(() => {
    if (response?.type === 'success') {
      console.log('Google auth success, processing...');
      const { authentication } = response;
      handleGoogleSignIn(authentication);
    } else if (response?.type === 'error') {
      console.error('Google Auth Error:', response.error);
      setLoading(false);
    } else if (response?.type === 'cancel') {
      console.log('Google auth cancelled by user');
      setLoading(false);
    }
  }, [response]);

  const handleGoogleSignIn = async (authentication: any) => {
    if (!auth) {
      console.error('Auth not ready');
      setLoading(false);
      return { success: false, error: 'Authentication service not ready' };
    }

    try {
      console.log('Processing Google authentication...');

      if (!authentication?.idToken) {
        throw new Error('No ID token received from Google');
      }

      const credential = GoogleAuthProvider.credential(authentication.idToken);
      const result = await signInWithCredential(auth, credential);

      console.log('Firebase sign-in successful:', result.user.uid);

      // Create user profile document if it doesn't exist
      await createUserProfileIfNeeded(result.user);

      return { success: true, user: result.user };
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const createUserProfileIfNeeded = async (user: User) => {
    if (!db) {
      console.error('Firestore not ready');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        console.log('Creating user profile document...');
        await setDoc(userDocRef, {
          displayName: user.displayName || '',
          email: user.email || '',
          uid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log('User profile document created');
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  const fetchUserProfile = async (): Promise<ProfileData | null> => {
    if (!auth || !db || !auth.currentUser) {
      console.log('Auth/DB not ready or no current user');
      return null;
    }

    try {
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
      return null;
    }
  };

  const updateUserProfile = async (profileData: ProfileData): Promise<{ success: boolean; error?: string }> => {
    if (!auth || !db || !auth.currentUser) {
      return { success: false, error: 'Authentication service not ready or no user logged in' };
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
        uid: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log('Profile updated successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Update Profile Error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (initializing) {
      return { success: false, error: 'Authentication service still initializing' };
    }

    if (!auth) {
      return { success: false, error: 'Authentication service not ready' };
    }

    try {
      setLoading(true);

      if (!request) {
        console.log('Google Auth request not ready yet...');
        return { success: false, error: 'Google Auth request not ready' };
      }

      console.log('Starting Google sign-in...');

      const result = await promptAsync({
        useProxy: true,
        showInRecents: true,
      });

      console.log('Auth prompt result:', result.type);

      if (result.type === 'success') {
        // handleGoogleSignIn will be called automatically via useEffect
        return { success: true };
      } else if (result.type === 'cancel') {
        return { success: false, error: 'User cancelled the sign-in process' };
      } else {
        console.log('Auth failed with type:', result.type);
        return { success: false, error: `Google sign in failed: ${result.type}` };
      }
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      return { success: false, error: error.message };
    }
    // Don't set loading to false here - let useEffect handle it
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (initializing) {
      return { success: false, error: 'Authentication service still initializing' };
    }

    if (!auth) {
      return { success: false, error: 'Authentication service not ready' };
    }

    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Create user profile if needed
      await createUserProfileIfNeeded(result.user);

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
    if (initializing) {
      return { success: false, error: 'Authentication service still initializing' };
    }

    if (!auth) {
      return { success: false, error: 'Authentication service not ready' };
    }

    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);

      if (displayName && result.user) {
        await updateFirebaseAuthProfile(result.user, { displayName });
      }

      // Create user profile document
      await createUserProfileIfNeeded(result.user);

      return { success: true, user: result.user };
    } catch (error: any) {
      console.error('Email Sign Up Error:', error);

      let friendlyMessage = 'Something went wrong. Please try again.';

      switch (error.code) {
        case 'auth/email-already-in-use':
          friendlyMessage = 'An account with this email already exists.';
          break;
        case 'auth/invalid-email':
          friendlyMessage = 'The email address is badly formatted.';
          break;
        case 'auth/weak-password':
          friendlyMessage = 'Password should be at least 6 characters.';
          break;
        default:
          friendlyMessage = error.message || 'An unknown error occurred.';
      }

      return { success: false, error: friendlyMessage };
    } finally {
      setLoading(false);
    }
  };

  const signInAnonymouslyUser = async () => {
    if (initializing) {
      return { success: false, error: 'Authentication service still initializing' };
    }

    if (!auth) {
      return { success: false, error: 'Authentication service not ready' };
    }

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
    if (!auth) {
      return { success: false, error: 'Authentication service not ready' };
    }

    try {
      setLoading(true);
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      console.error('Logout Error:', error);
      return { success: false, error: error.message };
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
    isAuthenticated: !!user && !initializing,
    fetchUserProfile,
    updateUserProfile,
  };

  // Show loading screen during initialization
  if (initializing) {
    return null; // You can replace this with a loading component
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};