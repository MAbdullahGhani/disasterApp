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
import { Platform } from 'react-native';

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

  // Configure redirect URI for Expo Auth Session
  const redirectUri = AuthSession.makeRedirectUri({
    useProxy: true, // Always use proxy for Google OAuth with Expo
  });

  // Google Auth configuration
  const [request, response, promptAsync] = useAuthRequest({
    clientId: '139120385098-pqfbrjjp3fqubai9c7ppo31c376umrl7.apps.googleusercontent.com',
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
  });

  // Debug info - Enhanced logging
  useEffect(() => {
    console.log('🔧 Auth Configuration:');
    console.log('Platform:', Platform.OS);
    console.log('Development mode:', __DEV__);
    console.log('Redirect URI:', redirectUri);
    console.log('Auth request ready:', !!request);
    console.log('Using proxy:', __DEV__);
    
    if (request) {
      console.log('Request details:', {
        clientId: request.clientId,
        responseType: request.responseType,
        scopes: request.scopes,
      });
    }
  }, [request, redirectUri]);

  // Set up auth state listener
  useEffect(() => {
    console.log('🔥 Setting up Firebase auth listener...');
    
    // Add a small delay to ensure Firebase is properly initialized
    const initTimer = setTimeout(() => {
      if (!auth) {
        console.error('❌ Auth not initialized after timeout');
        setInitializing(false);
        return;
      }

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log('🔐 Auth state changed:', user ? `User: ${user.email} (${user.uid})` : 'No user');
        setUser(user);
        
        if (initializing) {
          console.log('✅ Firebase auth initialization complete');
          setInitializing(false);
        }
        setLoading(false);
      });

      // Cleanup function
      return () => {
        console.log('🔌 Unsubscribing from auth state changes');
        unsubscribe();
      };
    }, 1000); // Increased timeout for better reliability

    return () => {
      clearTimeout(initTimer);
    };
  }, [initializing]);

  // Handle Google auth response with improved error handling
  useEffect(() => {
    if (response?.type === 'success') {
      console.log('✅ Google auth success, processing token...');
      const { authentication } = response;
      handleGoogleSignIn(authentication);
    } else if (response?.type === 'error') {
      console.error('❌ Google Auth Error:', response.error);
      console.error('Error params:', response.params);
      setLoading(false);
    } else if (response?.type === 'cancel') {
      console.log('⚠️ Google auth cancelled by user');
      setLoading(false);
    } else if (response?.type === 'dismiss') {
      console.log('⚠️ Google auth dismissed');
      setLoading(false);
    }
  }, [response]);

  const handleGoogleSignIn = async (authentication: any) => {
    if (!auth) {
      console.error('❌ Firebase Auth not ready');
      setLoading(false);
      return { success: false, error: 'Authentication service not ready' };
    }

    try {
      console.log('🔄 Processing Google authentication...');
      console.log('Authentication object:', authentication);

      if (!authentication?.idToken) {
        throw new Error('No ID token received from Google');
      }

      // Create Firebase credential
      const credential = GoogleAuthProvider.credential(authentication.idToken, authentication.accessToken);
      console.log('🔑 Created Firebase credential');

      // Sign in with Firebase
      const result = await signInWithCredential(auth, credential);
      console.log('✅ Firebase sign-in successful:', result.user.email);

      // Create user profile document if it doesn't exist
      await createUserProfileIfNeeded(result.user);

      return { success: true, user: result.user };
    } catch (error: any) {
      console.error('❌ Google Sign In Error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Provide more specific error messages
      let friendlyError = error.message;
      if (error.code === 'auth/network-request-failed') {
        friendlyError = 'Network error. Please check your internet connection.';
      } else if (error.code === 'auth/popup-blocked') {
        friendlyError = 'Popup was blocked. Please allow popups and try again.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        friendlyError = 'Sign-in was cancelled. Please try again.';
      }
      
      return { success: false, error: friendlyError };
    } finally {
      setLoading(false);
    }
  };

  const createUserProfileIfNeeded = async (user: User) => {
    if (!db) {
      console.error('❌ Firestore not ready');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        console.log('📝 Creating user profile document...');
        const profileData = {
          displayName: user.displayName || '',
          email: user.email || '',
          uid: user.uid,
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        await setDoc(userDocRef, profileData);
        console.log('✅ User profile document created');
      } else {
        console.log('📄 User profile already exists, updating last login...');
        // Update last login time
        await setDoc(userDocRef, {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (error) {
      console.error('❌ Error creating/updating user profile:', error);
    }
  };

  const fetchUserProfile = async (): Promise<ProfileData | null> => {
    if (!auth || !db || !auth.currentUser) {
      console.log('⚠️ Auth/DB not ready or no current user');
      return null;
    }

    try {
      console.log('📖 Fetching profile for user:', auth.currentUser.uid);
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        console.log('✅ Profile data found');
        return docSnap.data() as ProfileData;
      } else {
        console.log('📭 No profile document found, creating one...');
        await createUserProfileIfNeeded(auth.currentUser);
        return {
          displayName: auth.currentUser.displayName || '',
          email: auth.currentUser.email || '',
        };
      }
    } catch (error: any) {
      console.error('❌ Error fetching user profile:', error);
      return null;
    }
  };

  const updateUserProfile = async (profileData: ProfileData): Promise<{ success: boolean; error?: string }> => {
    if (!auth || !db || !auth.currentUser) {
      return { success: false, error: 'Authentication service not ready or no user logged in' };
    }

    try {
      setLoading(true);
      console.log('📝 Updating profile for user:', auth.currentUser.uid);

      const userDocRef = doc(db, 'users', auth.currentUser.uid);

      // Update Firebase Auth display name if changed
      if (profileData.displayName && profileData.displayName !== auth.currentUser.displayName) {
        console.log('🔄 Updating Firebase Auth display name...');
        await updateFirebaseAuthProfile(auth.currentUser, { displayName: profileData.displayName });
      }

      // Update Firestore document
      console.log('💾 Updating Firestore document...');
      await setDoc(userDocRef, {
        ...profileData,
        email: auth.currentUser.email,
        uid: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log('✅ Profile updated successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Update Profile Error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (initializing) {
      console.log('⚠️ Auth still initializing...');
      return { success: false, error: 'Authentication service still initializing' };
    }

    if (!auth) {
      console.error('❌ Auth not ready');
      return { success: false, error: 'Authentication service not ready' };
    }

    try {
      setLoading(true);
      console.log('🚀 Starting Google sign-in...');

      if (!request) {
        console.log('⚠️ Google Auth request not ready yet...');
        return { success: false, error: 'Google Auth request not ready. Please try again.' };
      }

      console.log('📱 Prompting user for authentication...');
      const result = await promptAsync();

      console.log('📱 Auth prompt result:', result.type);

      if (result.type === 'success') {
        console.log('✅ User completed authentication flow');
        // handleGoogleSignIn will be called automatically via useEffect
        return { success: true, message: 'Processing authentication...' };
      } else if (result.type === 'cancel') {
        setLoading(false);
        return { success: false, error: 'User cancelled the sign-in process' };
      } else {
        setLoading(false);
        console.error('Auth result error:', result);
        return { success: false, error: `Google sign in failed: ${result.type}` };
      }
    } catch (error: any) {
      console.error('❌ Google Sign In Error:', error);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (initializing || !auth) {
      return { success: false, error: 'Authentication service not ready' };
    }

    try {
      setLoading(true);
      console.log('📧 Signing in with email:', email);
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      await createUserProfileIfNeeded(result.user);

      console.log('✅ Email sign-in successful');
      return { success: true, user: result.user };
    } catch (error: any) {
      console.error('❌ Email Sign In Error:', error);

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
    if (initializing || !auth) {
      return { success: false, error: 'Authentication service not ready' };
    }

    try {
      setLoading(true);
      console.log('📝 Creating account with email:', email);
      
      const result = await createUserWithEmailAndPassword(auth, email, password);

      if (displayName && result.user) {
        await updateFirebaseAuthProfile(result.user, { displayName });
      }

      await createUserProfileIfNeeded(result.user);

      console.log('✅ Account created successfully');
      return { success: true, user: result.user };
    } catch (error: any) {
      console.error('❌ Email Sign Up Error:', error);

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
    if (initializing || !auth) {
      return { success: false, error: 'Authentication service not ready' };
    }

    try {
      setLoading(true);
      console.log('👤 Signing in anonymously...');
      
      const result = await signInAnonymously(auth);
      
      console.log('✅ Anonymous sign-in successful');
      return { success: true, user: result.user };
    } catch (error: any) {
      console.error('❌ Anonymous Sign In Error:', error);
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
      console.log('🚪 Signing out...');
      
      await signOut(auth);
      
      console.log('✅ Sign out successful');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Logout Error:', error);
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