import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { getFirebaseDb } from "@/lib/firebase";
import type { AppUser } from "@/types";

const USERS = "users";

export async function ensureUserDocument(user: FirebaseUser): Promise<AppUser> {
  const db = getFirebaseDb();
  const ref = doc(db, USERS, user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const payload = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      walletAddress: null,
      roles: ["submitter"],
      reputation: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
    const created = await getDoc(ref);
    return created.data() as AppUser;
  }

  const data = snap.data() as AppUser;
  const drifted =
    data.email !== user.email ||
    data.displayName !== user.displayName ||
    data.photoURL !== user.photoURL;

  if (drifted) {
    await updateDoc(ref, {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      updatedAt: serverTimestamp(),
    });
  }

  return data;
}

export async function getUserDocument(uid: string): Promise<AppUser | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, USERS, uid));
  return snap.exists() ? (snap.data() as AppUser) : null;
}
