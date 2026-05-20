"use client";

import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { getContractAddress, getGenLayerClient } from "@/lib/genlayer";
import { recordAudit } from "@/services/auditService";
import type { AppUser, UserRole } from "@/types";

const USERS = "users";

export async function listUsers(max = 100): Promise<AppUser[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, USERS), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as AppUser);
}

export async function setUserRoles(uid: string, roles: UserRole[]): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, USERS, uid), {
    roles,
    updatedAt: serverTimestamp(),
  });
  await recordAudit({
    actorUid: uid,
    action: "user.roles.update",
    targetType: "user",
    targetId: uid,
    metadata: { roles },
  });
}

export async function toggleRole(
  user: AppUser,
  role: UserRole,
): Promise<UserRole[]> {
  const next = user.roles.includes(role)
    ? user.roles.filter((r) => r !== role)
    : [...user.roles, role];
  if (!next.includes("submitter")) next.push("submitter");
  await setUserRoles(user.uid, next);
  return next;
}

export async function grantCreatorOnChain(
  adminUid: string,
  walletAddress: string,
): Promise<string> {
  const client = getGenLayerClient(adminUid);
  const address = getContractAddress();
  const txHash = await client.writeContract({
    address,
    functionName: "grant_creator",
    args: [walletAddress],
    value: 0n,
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  await recordAudit({
    actorUid: adminUid,
    action: "onchain.grant_creator",
    targetType: "user",
    targetId: walletAddress,
    metadata: { txHash: String(txHash) },
  });
  return String(txHash);
}

export async function revokeCreatorOnChain(
  adminUid: string,
  walletAddress: string,
): Promise<string> {
  const client = getGenLayerClient(adminUid);
  const address = getContractAddress();
  const txHash = await client.writeContract({
    address,
    functionName: "revoke_creator",
    args: [walletAddress],
    value: 0n,
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  await recordAudit({
    actorUid: adminUid,
    action: "onchain.revoke_creator",
    targetType: "user",
    targetId: walletAddress,
    metadata: { txHash: String(txHash) },
  });
  return String(txHash);
}
