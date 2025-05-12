import React, { createContext, useContext, useState, useEffect } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  browserPopupRedirectResolver,
} from "firebase/auth";
import { auth } from "../firebase/config";
import { manageUserDocumentOnLogin } from "../firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Google Sign In
  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(
        auth,
        provider,
        browserPopupRedirectResolver
      );
      return result.user;
    } catch (error) {
      console.error("Google Sign-in error:", error);
      throw error;
    }
  }

  // Email/Password Signup
  async function signup(email, password, username) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      // Update profile with username
      await updateProfile(userCredential.user, {
        displayName: username,
      });
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  }

  // Email/Password Login
  async function login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  }

  // Reset Password
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // Logout user
  function logout() {
    return signOut(auth);
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in or just signed up
        try {
          console.log(
            "[AuthContext] User signed in, attempting to manage document:",
            user.uid
          );
          const userData = await manageUserDocumentOnLogin(user);
          if (userData) {
            console.log(
              "[AuthContext] User document managed successfully:",
              userData
            );
            // Optionally, you can set a richer currentUser state here if needed,
            // e.g., setCurrentUser({ ...user, ...userDataFromFirestore });
            // For now, just ensuring the Firestore document is managed.
            setCurrentUser(user); // Keep existing behavior
          } else {
            console.warn(
              "[AuthContext] manageUserDocumentOnLogin returned no data. User document might not have been fully processed or there was an issue."
            );
            setCurrentUser(user); // Still set user, but log warning
          }
        } catch (error) {
          console.error(
            "[AuthContext] Error calling manageUserDocumentOnLogin:",
            error
          );
          // Decide how to handle this error. Potentially log out the user or show an error message.
          setCurrentUser(user); // Or setCurrentUser(null) if the error is critical
        }
      } else {
        // User is signed out
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signInWithGoogle,
    signup,
    login,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
