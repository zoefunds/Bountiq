"use client";

import {
  getDocs,
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
import { getContractAddress, getGenLayerClient, getGenBalance } from "@/lib/genlayer";
import { recordAudit } from "@/services/auditService";
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


async function assertHasBalance(uid: string): Promise<void> {
  const bal = await getGenBalance(uid);
  if (bal === 0n) {
    throw new Error(
      "Your wallet has 0 GEN. Fund it from the GenLayer Studio faucet before submitting a transaction.",
    );
  }
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

  await assertHasBalance(uid);

  const client = getGenLayerClient(uid);
  const address = getContractAddress();

  const txHash = await client.writeContract({
    address,
    functionName: "submit_entry",
    args: [input.bountyOnChainId, input.title, input.summary, contentUrl],
    value: 0n,
  });

  await client.waitForTransactionReceipt({ hash: txHash, status: 'FINALIZED', retries: 60, interval: 5000 } as any);
  const countValue = await client.readContract({
    address,
    functionName: "get_submission_count",
    args: [],
  });
  const onChainSubmissionId = String(Number(countValue));

  const submitterWallet = (client?.account?.address || "") as string;

  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, SUBMISSIONS), {
    bountyId: input.bountyFirestoreId,
    bountyOnChainId: input.bountyOnChainId,
    submitterUid: uid,
    submitterWallet,
    title: input.title,
    summary: input.summary,
    contentUrl,
    attachments: input.file ? [contentUrl] : [],
    status: "submitted",
    score: null,
    rank: null,
    isWinner: false,
    paidAt: null,
    paidBy: null,
    paidTxRef: null,
    onChainSubmissionId: onChainSubmissionId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, BOUNTIES, input.bountyFirestoreId), {
    submissionCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  await recordAudit({
    actorUid: uid,
    action: "submission.create",
    targetType: "submission",
    targetId: docRef.id,
    metadata: { bountyId: input.bountyFirestoreId, onChainSubmissionId },
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
  await assertHasBalance(uid);
  const client = getGenLayerClient(uid);
  const address = getContractAddress();

  const txHash = await client.writeContract({
    address,
    functionName: "evaluate_submission",
    args: [onChainSubmissionId],
    value: 0n,
  });

  try {
    await client.waitForTransactionReceipt({ hash: txHash, status: 'FINALIZED', retries: 60, interval: 5000 } as any);
  } catch (waitErr) {
    console.warn("evaluate_submission wait timed out, will read state anyway:", waitErr);
  }

  const readClient = client;
  const raw = (await readClient.readContract({
    address,
    functionName: "get_submission",
    args: [onChainSubmissionId],
  })) as string;

  let parsed: any = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn("get_submission JSON parse failed, raw =", raw);
  }

  const score = parsed?.score ?? null;
  const hasScore = Boolean(parsed?.has_score) || Boolean(score && Number(score.weighted) > 0);

  if (hasScore && score) {
    const db = getFirebaseDb();
    await updateDoc(doc(db, SUBMISSIONS, firestoreSubmissionId), {
      score: {
        innovation: Number(score.innovation ?? 0),
        technical: Number(score.technical ?? 0),
        impact: Number(score.impact ?? 0),
        presentation: Number(score.presentation ?? 0),
        weighted: Number(score.weighted ?? 0),
        reasoning: String(score.reasoning ?? ""),
        evaluatedAt: serverTimestamp(),
      },
      status: "scored",
      updatedAt: serverTimestamp(),
    });
  } else {
    console.warn("evaluate_submission tx returned, but on-chain submission has no score yet", parsed);
  }

  return String(txHash);
}

export async function getSubmission(firestoreId: string): Promise<Submission | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, SUBMISSIONS, firestoreId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Submission, "id">) };
}

export async function evaluateAllUnscored(
  uid: string,
  submissions: Submission[],
  onProgress?: (done: number, total: number, currentId: string) => void,
): Promise<{ ok: number; failed: number }> {
  const targets = submissions.filter((s) => !s.score);
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < targets.length; i++) {
    const sub = targets[i];
    if (!sub) continue;
    onProgress?.(i, targets.length, sub.id);
    const onChainId = (sub as unknown as { onChainSubmissionId?: string }).onChainSubmissionId;
    if (!onChainId) {
      failed++;
      continue;
    }
    try {
      await triggerEvaluation(uid, Number(onChainId), sub.id);
      ok++;
    } catch (err) {
      console.error("evaluateAllUnscored: submission " + sub.id + " failed", err);
      failed++;
    }
  }
  onProgress?.(targets.length, targets.length, "");
  return { ok, failed };
}

export async function markSubmissionPaid(
  submissionId: string,
  paidBy: string,
  paidTxRef: string,
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, SUBMISSIONS, submissionId), {
    paidAt: serverTimestamp(),
    paidBy,
    paidTxRef,
    updatedAt: serverTimestamp(),
  });
  await recordAudit({
    actorUid: paidBy,
    action: "submission.paid",
    targetType: "submission",
    targetId: submissionId,
    metadata: { paidTxRef },
  });
}

export async function unmarkSubmissionPaid(submissionId: string): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, SUBMISSIONS, submissionId), {
    paidAt: null,
    paidBy: null,
    paidTxRef: null,
    updatedAt: serverTimestamp(),
  });
}

export async function listMySubmissions(
  uid: string,
  max: number = 100,
): Promise<Submission[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, SUBMISSIONS),
    where("submitterUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Submission, "id">) }));
}
