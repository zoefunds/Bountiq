"use client";

import * as React from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { ensureUserDocument, setUserWalletAddress } from "@/services/userService";
import { getLocalAddress } from "@/lib/genlayer";
import type { AppUser, UserRole } from "@/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  walletAddress: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = React.useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const doc = await ensureUserDocument(user);
          setAppUser(doc);
          const addr = getLocalAddress(user.uid);
          setWalletAddress(addr);
          if (doc.walletAddress !== addr) {
            await setUserWalletAddress(user.uid, addr);
          }
        } catch (err) {
          console.error("auth bootstrap failed", err);
          setAppUser(null);
          setWalletAddress(null);
        }
      } else {
        setAppUser(null);
        setWalletAddress(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    const auth = getFirebaseAuth();
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, []);

  const signInWithEmail = React.useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = React.useCallback(
    async (email: string, password: string, displayName: string) => {
      const auth = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
    },
    [],
  );

  const signOutUser = React.useCallback(async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
  }, []);

  const hasRole = React.useCallback(
    (role: UserRole) => Boolean(appUser?.roles.includes(role)),
    [appUser],
  );

  const value: AuthContextValue = {
    firebaseUser,
    appUser,
    walletAddress,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOutUser,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
