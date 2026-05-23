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
import {
  getCloudWalletStatus,
  getLocalAddress,
  setupWalletWithPin,
  unlockWalletWithPin,
  type WalletStatus,
} from "@/lib/genlayer";
import type { AppUser, UserRole } from "@/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  walletAddress: string | null;
  walletStatus: WalletStatus | "loading";
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  setupWallet: (pin: string) => Promise<{ ok: boolean; error?: string }>;
  unlockWallet: (pin: string) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = React.useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
  const [walletStatus, setWalletStatus] = React.useState<WalletStatus | "loading">("loading");
  const [loading, setLoading] = React.useState(true);

  const refreshWalletAddress = React.useCallback(async (uid: string, userDoc: AppUser | null) => {
    try {
      const addr = getLocalAddress(uid);
      setWalletAddress(addr);
      if (userDoc && userDoc.walletAddress !== addr) {
        await setUserWalletAddress(uid, addr);
      }
    } catch {
      setWalletAddress(null);
    }
  }, []);

  React.useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userDoc = await ensureUserDocument(user);
          setAppUser(userDoc);
          const status = await getCloudWalletStatus(user.uid);
          setWalletStatus(status);
          if (status === "ready") {
            await refreshWalletAddress(user.uid, userDoc);
          } else {
            setWalletAddress(null);
          }
        } catch (err) {
          console.error("auth bootstrap failed", err);
          setAppUser(null);
          setWalletAddress(null);
          setWalletStatus("setup");
        }
      } else {
        setAppUser(null);
        setWalletAddress(null);
        setWalletStatus("loading");
      }
      setLoading(false);
    });
    return () => unsub();
  }, [refreshWalletAddress]);

  const signInWithGoogle = React.useCallback(async () => {
    await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  }, []);

  const signInWithEmail = React.useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }, []);

  const signUpWithEmail = React.useCallback(
    async (email: string, password: string, displayName: string) => {
      const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
      if (displayName) await updateProfile(cred.user, { displayName });
    },
    [],
  );

  const signOutUser = React.useCallback(async () => {
    await signOut(getFirebaseAuth());
  }, []);

  const hasRole = React.useCallback(
    (role: UserRole) => Boolean(appUser?.roles.includes(role)),
    [appUser],
  );

  const setupWallet = React.useCallback(
    async (pin: string): Promise<{ ok: boolean; error?: string }> => {
      if (!firebaseUser) return { ok: false, error: "Not signed in" };
      try {
        await setupWalletWithPin(firebaseUser.uid, pin);
        await refreshWalletAddress(firebaseUser.uid, appUser);
        setWalletStatus("ready");
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Setup failed" };
      }
    },
    [firebaseUser, appUser, refreshWalletAddress],
  );

  const unlockWallet = React.useCallback(
    async (pin: string): Promise<{ ok: boolean; error?: string }> => {
      if (!firebaseUser) return { ok: false, error: "Not signed in" };
      const result = await unlockWalletWithPin(firebaseUser.uid, pin);
      if (!result.ok) return { ok: false, error: "Incorrect PIN. Please try again." };
      await refreshWalletAddress(firebaseUser.uid, appUser);
      setWalletStatus("ready");
      return { ok: true };
    },
    [firebaseUser, appUser, refreshWalletAddress],
  );

  const value: AuthContextValue = {
    firebaseUser,
    appUser,
    walletAddress,
    walletStatus,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOutUser,
    hasRole,
    setupWallet,
    unlockWallet,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
