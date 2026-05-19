"use client";

import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import {
  getFirebaseDb,
  getFirebaseStorage,
} from "@/lib/firebase";
import { getContractAddress, getGenLayerClient } from "@/lib/genlayer";
import type { Submission } from "@/types";

const SUBMISSIONS = "submissions";
const BOUNTIES = "bounties";

export interface CreateSubmissionInput {
  bountyFirestoreId: string;
  bountyOnChainId: number;
  title: string;
  summary: string;
  contentUrl: string;
  file: File | null;
}

export interface CreateSubmissionResult {
  firestoreId: string;
  onChainSubmissionId: string;
  txHash: string;
}

export async function uploadSubmissionFile(
  uid: string,
  bountyOnChainId: number,
  file: File,
): Promise<string> {
  const storage = getFirebaseStorage();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `submissions/${bountyOnChainId}/${uid}/${Date.now()}_${safeName}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  return await getDownloadURL(ref);
}

export async function createSubmissionOnChainAndMirror(
  uid: string,
  input: CreateSubmissionInput,
): Promise<CreateSubmissionResult> {
  let contentUrl = input.contentUrl;
  if (input.file) {
    contentUrl = await uploadSubmissionFile(uid, input.bountyOnChainId, input.file);
  }

  const client = getGenLayerClient(uid);
  const address = getContractAddress();

  const txHash = await client.writeContract({
    address,
    functionName: "submit_entry",
    args: [input.bountyOnChainId, input.title, input.summary, contentUrl],
    value: 0n,
  });

  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  const onChainSubmissionId = String(
    receipt?.consensus_data?.leader_receipt?.result ?? "",
  );

  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, SUBMISSIONS), {
    bountyId: input.bountyFirestoreId,
    bountyOnChainId: input.bountyOnChainId,
    submitterUid: uid,
    title: input.title,
    summary: input.summary,
    contentUrl,
    attachments: input.file ? [contentUrl] : [],
    status: "submitted",
    score: null,
    rank: null,
    isWinner: false,
    onChainSubmissionId: onChainSubmissionId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, BOUNTIES, input.bountyFirestoreId), {
    submissionCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  return {
    firestoreId: docRef.id,
    onChainSubmissionId,
    txHash: String(txHash),
  };
}

export function subscribeToBountySubmissions(
  bountyFirestoreId: string,
  callback: (submissions: Submission[]) => void,
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, SUBMISSIONS),
    where("bountyId", "==", bountyFirestoreId),
    orderBy("createdAt", "desc"),
    limit(100),
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Submission, "id">) })),
    );
  });
}

export async function triggerEvaluation(
  uid: string,
  onChainSubmissionId: number,
  firestoreSubmissionId: string,
): Promise<string> {
  const client = getGenLayerClient(uid);
  const address = getContractAddress();

  const txHash = await client.writeContract({
    address,
    functionName: "evaluate_submission",
    args: [onChainSubmissionId],
    value: 0n,
  });

  const receipt = await client.waitForTransactionReceipt({ hash: txHash });

  const readClient = client;
  const raw = (await readClient.readContract({
    address,
    functionName: "get_submission",
    args: [onChainSubmissionId],
  })) as string;

  let parsed: { score?: Record<string, unknown>; status?: string; has_score?: boolean } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  if (parsed?.has_score && parsed?.score) {
    const db = getFirebaseDb();
    await updateDoc(doc(db, SUBMISSIONS, firestoreSubmissionId), {
      score: {
        innovation: Number((parsed.score as Record<string, unknown>).innovation ?? 0),
        technical: Number((parsed.score as Record<string, unknown>).technical ?? 0),
        impact: Number((parsed.score as Record<string, unknown>).impact ?? 0),
        presentation: Number((parsed.score as Record<string, unknown>).presentation ?? 0),
        weighted: Number((parsed.score as Record<string, unknown>).weighted ?? 0),
        reasoning: String((parsed.score as Record<string, unknown>).reasoning ?? ""),
        evaluatedAt: serverTimestamp(),
      },
      status: "scored",
      updatedAt: serverTimestamp(),
    });
  }

  return String(txHash);
}

export async function getSubmission(firestoreId: string): Promise<Submission | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, SUBMISSIONS, firestoreId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Submission, "id">) };
}
