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
  updateProfile
} from 'firebase/auth';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase/config';

WebBrowser.maybeCompleteAuthSession();

// --- Types ---
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
  const [loading, setLoading] = useState<boolean>(true);
  const [initializing, setInitializing] = useState<boolean>(true);

  const [request, response, promptAsync] = useAuthRequest({
    // Use the WEB CLIENT ID - this is crucial for proxy mode
    clientId: '139120385098-bamg6hpod29t48v7a5efe0hd3ub7d9jh.apps.googleusercontent.com',
    iosClientId: '139120385098-orf5ej61nk5fo7fcicf1oqrudaepujbs.apps.googleusercontent.com',
    androidClientId: '139120385098-pem3i8hcsa2valicnjbj0k3ambe6fop2.apps.googleusercontent.com',
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    // Let Expo handle the redirect URI automatically
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

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      
      // Check if request is ready
      if (!request) {
        return { success: false, error: 'Google Auth request not ready' };
      }

      // Set browser settings for better compatibility
      WebBrowser.maybeCompleteAuthSession();

      const result = await promptAsync({
        useProxy: true, // This forces the use of expo.dev proxy
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
        await updateProfile(result.user, { displayName });
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};