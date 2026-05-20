"use client";

import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export type AuditTargetType = "bounty" | "submission" | "user" | "system";

export interface AuditEventInput {
  actorUid: string;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  metadata?: Record<string, unknown>;
}

const AUDIT = "audit";

export async function recordAudit(event: AuditEventInput): Promise<void> {
  try {
    const db = getFirebaseDb();
    await addDoc(collection(db, AUDIT), {
      actorUid: event.actorUid,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      metadata: event.metadata ?? {},
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("audit write failed", e);
  }
}

export async function listAuditEvents(max: number = 100) {
  const db = getFirebaseDb();
  const q = query(collection(db, AUDIT), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
}
