import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseAuthProfile,
} from "firebase/auth";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Import auth and db after they're initialized
import { auth, db } from "../firebase/config";
import { navigate } from "expo-router/build/global-state/routing";

// Conditional Google Sign-in import
let GoogleSignin: any = null;
let statusCodes: any = null;

const deleteCurrentUser = async () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return { success: false, error: "No user is currently signed in." };
  }

  try {
    // Step 1: Delete the user's progress data from Firestore.
    // It's safer to delete data before deleting the auth account.
    const userProgressRef = doc(db, "userProgress", currentUser.uid);
    await deleteDoc(userProgressRef);
    console.log("Firestore data deleted for user:", currentUser.uid);

    // Step 2: Delete the user from Firebase Authentication.
    await deleteUser(currentUser);
    console.log("Firebase Auth user deleted successfully.");
    
    // The onAuthStateChanged listener will automatically handle the logout state change.
    navigate('(tabs)') 
    return { success: true };


  } catch (error: any) {
    // console.error("Error deleting user account:", error);
    
    // Handle the common error where re-authentication is required for security.
    if (error.code === 'auth/requires-recent-login') {
      return { 
        success: false, 
        error: "This is a sensitive operation. Please sign out and sign back in before deleting your account." 
      };
    }
    
    return { 
      success: false, 
      error: error.message || "An unknown error occurred during account deletion." 
    };
  }
};

// Only import Google Sign-in in development builds
const initializeGoogleSignIn = async () => {
  try {
    const isExpoGo = Constants.appOwnership === "expo";

    if (!isExpoGo && Platform.OS === "android") {
      const googleSignInModule = await import(
        "@react-native-google-signin/google-signin"
      );
      GoogleSignin = googleSignInModule.GoogleSignin;
      statusCodes = googleSignInModule.statusCodes;
      return true;
    }
    return false;
  } catch (error) {
    console.log("Google Sign-in not available:", error);
    return false;
  }
};

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
  deleteCurrentUser: () => Promise<any>;
  initializing: boolean;
  isGoogleSignInAvailable: boolean;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signInAnonymouslyUser: () => Promise<any>;
  logout: () => Promise<any>;
  isAuthenticated: boolean;
  fetchUserProfile: () => Promise<ProfileData | null>;
  updateUserProfile: (
    profileData: ProfileData
  ) => Promise<{ success: boolean; error?: string }>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [isGoogleSignInAvailable, setIsGoogleSignInAvailable] =
    useState<boolean>(false);

  // Configure Google Sign-In
  const configureGoogleSignIn = () => {
    if (!GoogleSignin) return;

    try {
      GoogleSignin.configure({
        // IMPORTANT: Use your actual Google Console Client IDs
        webClientId:
          "139120385098-pqfbrjjp3fqubai9c7ppo31c376umrl7.apps.googleusercontent.com", // From Web OAuth Client

        // Platform specific client IDs (optional but recommended)
        iosClientId:
          "139120385098-orf5ej61nk5fo7fcicf1oqrudaepujbs.apps.googleusercontent.com", // From iOS OAuth Client

        offlineAccess: true, // If you want to access Google API on behalf of the user
        prompt: "select_account", // Forces account selection
        forceCodeForRefreshToken: true, // Android only
      });
      console.log("✅ Google Sign-In configured successfully");
    } catch (error) {
      console.log("⚠️ Error configuring Google Sign-In:", error);
    }
  };

  // Initialize Google Sign-In configuration
  useEffect(() => {
    const initGoogleSignIn = async () => {
      console.log("🔧 Initializing Google Sign-In...");
      const available = await initializeGoogleSignIn();
      setIsGoogleSignInAvailable(available);

      if (available) {
        console.log("🔧 Configuring Google Sign-In...");
        configureGoogleSignIn();
      } else {
        console.log("⚠️ Google Sign-In not available in this environment");
      }
    };

    initGoogleSignIn();
  }, []);

  // Set up auth state listener
  useEffect(() => {
    console.log("🔥 Setting up Firebase auth listener...");

    const initTimer = setTimeout(() => {
      if (!auth) {
        console.error("❌ Auth not initialized after timeout");
        setInitializing(false);
        return;
      }

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log(
          "🔐 Auth state changed:",
          user ? `User: ${user.email} (${user.uid})` : "No user"
        );
        setUser(user);

        if (initializing) {
          console.log("✅ Firebase auth initialization complete");
          setInitializing(false);
        }
        setLoading(false);
      });

      return () => {
        console.log("🔌 Unsubscribing from auth state changes");
        unsubscribe();
      };
    }, 1000);

    return () => {
      clearTimeout(initTimer);
    };
  }, [initializing]);

  const createUserProfileIfNeeded = async (user: User) => {
    if (!db) {
      console.error("❌ Firestore not ready");
      return;
    }

    try {
      const userDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        console.log("📝 Creating user profile document...");
        const profileData = {
          displayName: user.displayName || "",
          email: user.email || "",
          uid: user.uid,
          photoURL: user.photoURL || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(userDocRef, profileData);
        console.log("✅ User profile document created");
      } else {
        console.log("📄 User profile already exists, updating last login...");
        await setDoc(
          userDocRef,
          {
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error("❌ Error creating/updating user profile:", error);
    }
  };

  const fetchUserProfile = async (): Promise<ProfileData | null> => {
    if (!auth || !db || !auth.currentUser) {
      console.log("⚠️ Auth/DB not ready or no current user");
      return null;
    }

    try {
      console.log("📖 Fetching profile for user:", auth.currentUser.uid);
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        console.log("✅ Profile data found");
        return docSnap.data() as ProfileData;
      } else {
        console.log("📭 No profile document found, creating one...");
        await createUserProfileIfNeeded(auth.currentUser);
        return {
          displayName: auth.currentUser.displayName || "",
          email: auth.currentUser.email || "",
        };
      }
    } catch (error: any) {
      console.error("❌ Error fetching user profile:", error);
      return null;
    }
  };

  const updateUserProfile = async (
    profileData: ProfileData
  ): Promise<{ success: boolean; error?: string }> => {
    if (!auth || !db || !auth.currentUser) {
      return {
        success: false,
        error: "Authentication service not ready or no user logged in",
      };
    }

    try {
      setLoading(true);
      console.log("📝 Updating profile for user:", auth.currentUser.uid);

      const userDocRef = doc(db, "users", auth.currentUser.uid);

      if (
        profileData.displayName &&
        profileData.displayName !== auth.currentUser.displayName
      ) {
        console.log("🔄 Updating Firebase Auth display name...");
        await updateFirebaseAuthProfile(auth.currentUser, {
          displayName: profileData.displayName,
        });
      }

      console.log("💾 Updating Firestore document...");
      await setDoc(
        userDocRef,
        {
          ...profileData,
          email: auth.currentUser.email,
          uid: auth.currentUser.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log("✅ Profile updated successfully");
      return { success: true };
    } catch (error: any) {
      console.error("❌ Update Profile Error:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // REACT NATIVE GOOGLE SIGN-IN IMPLEMENTATION
  const signInWithGoogle = async () => {
    // Check if Google Sign-In is available
    if (!isGoogleSignInAvailable || !GoogleSignin) {
      console.log("⚠️ Google Sign-In not available");
      return {
        success: false,
        error:
          "Google Sign-In is not available in this environment. Please use a development build on Android.",
      };
    }

    if (initializing) {
      console.log("⚠️ Auth still initializing...");
      return {
        success: false,
        error: "Authentication service still initializing",
      };
    }

    if (!auth) {
      console.error("❌ Auth not ready");
      return { success: false, error: "Authentication service not ready" };
    }

    try {
      setLoading(true);
      console.log("🚀 Starting React Native Google sign-in...");

      // First sign out to force account picker (optional)
      try {
        await GoogleSignin.signOut();
      } catch (signOutError) {
        console.log("Sign out error (ignored):", signOutError);
      }

      // Check Play Services (Android)
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Get the users ID token
      console.log("📱 Opening Google Sign-In popup...");
      const signInResult = await GoogleSignin.signIn();

      // Extract ID token
      let idToken = signInResult.data?.idToken;
      if (!idToken) {
        idToken = signInResult.idToken;
      }
      if (!idToken) {
        throw new Error("No ID token received from Google");
      }

      console.log("🔑 Creating Firebase credential...");
      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign-in the user with the credential
      console.log("🔥 Signing in with Firebase...");
      const result = await signInWithCredential(auth, googleCredential);
      console.log("✅ Google sign-in successful:", result.user.email);

      // Create user profile document if needed
      await createUserProfileIfNeeded(result.user);

      return { success: true, user: result.user };
    } catch (error: any) {
      console.error("❌ Google Sign In Error:", error);
      setLoading(false);

      // Handle specific Google Sign-In errors
      if (error?.code && statusCodes) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            return { success: false, error: "Sign in was cancelled" };
          case statusCodes.IN_PROGRESS:
            return { success: false, error: "Sign in is already in progress" };
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            return {
              success: false,
              error: "Play services not available or outdated",
            };
          default:
            return { success: false, error: `Sign in failed: ${error.code}` };
        }
      } else if (error instanceof Error) {
        return {
          success: false,
          error: error.message || "An unexpected error occurred",
        };
      } else {
        return {
          success: false,
          error: "An unexpected error occurred during sign in",
        };
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (initializing || !auth) {
      return { success: false, error: "Authentication service not ready" };
    }

    try {
      setLoading(true);
      console.log("📧 Signing in with email:", email);

      // Add network connectivity check
      console.log("🌐 Testing Firebase connectivity...");

      const result = await signInWithEmailAndPassword(auth, email, password);
      await createUserProfileIfNeeded(result.user);

      console.log("✅ Email sign-in successful");
      return { success: true, user: result.user };
    } catch (error: any) {
      console.error("❌ Email Sign In Error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      let friendlyMessage = "Something went wrong. Please try again.";
      switch (error.code) {
        case "auth/network-request-failed":
          friendlyMessage =
            "Network error. Please check your internet connection and try again.";
          break;
        case "auth/invalid-email":
          friendlyMessage = "The email address is badly formatted.";
          break;
        case "auth/user-disabled":
          friendlyMessage = "This account has been disabled.";
          break;
        case "auth/user-not-found":
          friendlyMessage = "No user found with this email address.";
          break;
        case "auth/wrong-password":
          friendlyMessage = "Incorrect password. Please try again.";
          break;
        case "auth/invalid-credential":
          friendlyMessage = "The provided credentials are invalid.";
          break;
        case "auth/too-many-requests":
          friendlyMessage = "Too many failed attempts. Please try again later.";
          break;
        case "auth/app-not-authorized":
          friendlyMessage = "App not authorized. Please contact support.";
          break;
        case "auth/api-key-not-valid":
          friendlyMessage = "Configuration error. Please contact support.";
          break;
        default:
          friendlyMessage = error.message || "An unknown error occurred.";
      }

      return { success: false, error: friendlyMessage };
    } finally {
      setLoading(false);
    }
  };

  // Add similar enhanced error handling to signUpWithEmail
  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName = ""
  ) => {
    if (initializing || !auth) {
      return { success: false, error: "Authentication service not ready" };
    }

    try {
      setLoading(true);
      console.log("📝 Creating account with email:", email);

      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (displayName && result.user) {
        await updateFirebaseAuthProfile(result.user, { displayName });
      }

      await createUserProfileIfNeeded(result.user);

      console.log("✅ Account created successfully");
      return { success: true, user: result.user };
    } catch (error: any) {
      console.error("❌ Email Sign Up Error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      let friendlyMessage = "Something went wrong. Please try again.";
      switch (error.code) {
        case "auth/network-request-failed":
          friendlyMessage =
            "Network error. Please check your internet connection and try again.";
          break;
        case "auth/email-already-in-use":
          friendlyMessage = "An account with this email already exists.";
          break;
        case "auth/invalid-email":
          friendlyMessage = "The email address is badly formatted.";
          break;
        case "auth/weak-password":
          friendlyMessage = "Password should be at least 6 characters.";
          break;
        case "auth/app-not-authorized":
          friendlyMessage = "App not authorized. Please contact support.";
          break;
        case "auth/api-key-not-valid":
          friendlyMessage = "Configuration error. Please contact support.";
          break;
        default:
          friendlyMessage = error.message || "An unknown error occurred.";
      }

      return { success: false, error: friendlyMessage };
    } finally {
      setLoading(false);
    }
  };

  const signInAnonymouslyUser = async () => {
    if (initializing || !auth) {
      return { success: false, error: "Authentication service not ready" };
    }

    try {
      setLoading(true);
      console.log("👤 Signing in anonymously...");

      const result = await signInAnonymously(auth);

      console.log("✅ Anonymous sign-in successful");
      return { success: true, user: result.user };
    } catch (error: any) {
      console.error("❌ Anonymous Sign In Error:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!auth) {
      return { success: false, error: "Authentication service not ready" };
    }

    try {
      setLoading(true);
      console.log("🚪 Signing out...");

      // Sign out from Firebase
      await signOut(auth);

      // Sign out from Google (only if available)
      if (isGoogleSignInAvailable && GoogleSignin) {
        try {
          await GoogleSignin.signOut();
        } catch (googleSignOutError) {
          console.log("Google sign out error (ignored):", googleSignOutError);
        }
      }

      console.log("✅ Sign out successful");
      return { success: true };
    } catch (error: any) {
      console.error("❌ Logout Error:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    initializing,
    isGoogleSignInAvailable,
    signInWithEmail,
    deleteCurrentUser,
    signUpWithEmail,
    signInWithGoogle,
    signInAnonymouslyUser,
    logout,
    isAuthenticated: !!user && !initializing,
    fetchUserProfile,
    updateUserProfile,
  };

  if (initializing) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
