"use client";

import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { getContractAddress, getGenLayerClient, getGenBalance } from "@/lib/genlayer";
import type { Bounty, PayoutSplit, RubricWeights } from "@/types";

const BOUNTIES = "bounties";

export interface CreateBountyInput {
  title: string;
  description: string;
  rewardAmount: number;
  rewardToken: string;
  winnerCount: number;
  payoutSplits: PayoutSplit[];
  rubric: RubricWeights;
  deadline: Date;
}

export interface CreateBountyResult {
  firestoreId: string;
  onChainBountyId: string;
  txHash: string;
}

async function readBountyCount(uid: string): Promise<number> {
  const client = getGenLayerClient(uid);
  const address = getContractAddress();
  const value = await client.readContract({
    address,
    functionName: "get_bounty_count",
    args: [],
  });
  return Number(value);
}

async function readSubmissionCount(uid: string): Promise<number> {
  const client = getGenLayerClient(uid);
  const address = getContractAddress();
  const value = await client.readContract({
    address,
    functionName: "get_submission_count",
    args: [],
  });
  return Number(value);
}

export { readBountyCount, readSubmissionCount };


async function assertHasBalance(uid: string): Promise<void> {
  const bal = await getGenBalance(uid);
  if (bal === 0n) {
    throw new Error(
      "Your wallet has 0 GEN. Fund it from the GenLayer Studio faucet before submitting a transaction.",
    );
  }
}

export async function createBountyOnChainAndMirror(
  uid: string,
  input: CreateBountyInput,
): Promise<CreateBountyResult> {
  const totalSplit = input.payoutSplits.reduce((s, p) => s + p.percentage, 0);
  if (totalSplit !== 100) throw new Error("Payout splits must sum to 100");
  const totalRubric =
    input.rubric.innovation +
    input.rubric.technical +
    input.rubric.impact +
    input.rubric.presentation;
  if (totalRubric !== 100) throw new Error("Rubric weights must sum to 100");
  if (input.payoutSplits.length !== input.winnerCount) {
    throw new Error("Payout splits length must match winner count");
  }

  await assertHasBalance(uid);

  const client = getGenLayerClient(uid);
  const address = getContractAddress();

  const txHash = await client.writeContract({
    address,
    functionName: "create_bounty",
    args: [
      input.title,
      input.description,
      input.rewardAmount,
      input.rewardToken,
      input.winnerCount,
      input.payoutSplits.map((p) => ({ rank: p.rank, percentage: p.percentage })),
      {
        innovation: input.rubric.innovation,
        technical: input.rubric.technical,
        impact: input.rubric.impact,
        presentation: input.rubric.presentation,
      },
      Math.floor(input.deadline.getTime() / 1000),
    ],
    value: 0n,
  });

  await client.waitForTransactionReceipt({ hash: txHash, status: 'FINALIZED', retries: 60, interval: 5000 });

  const newCount = await readBountyCount(uid);
  const onChainBountyId = String(newCount);

  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, BOUNTIES), {
    creatorUid: uid,
    title: input.title,
    description: input.description,
    rewardAmount: input.rewardAmount,
    rewardToken: input.rewardToken,
    winnerCount: input.winnerCount,
    payoutSplits: input.payoutSplits,
    rubric: input.rubric,
    status: "open",
    contractAddress: address,
    onChainBountyId,
    revealed: false,
    submissionCount: 0,
    deadline: Timestamp.fromDate(input.deadline),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    firestoreId: docRef.id,
    onChainBountyId,
    txHash: String(txHash),
  };
}

export async function listOpenBounties(max = 50): Promise<Bounty[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, BOUNTIES),
    where("status", "==", "open"),
    orderBy("deadline", "asc"),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Bounty, "id">) }));
}

export async function listMyBounties(uid: string, max = 50): Promise<Bounty[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, BOUNTIES),
    where("creatorUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Bounty, "id">) }));
}

export async function getBountyById(firestoreId: string): Promise<Bounty | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, BOUNTIES, firestoreId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Bounty, "id">) };
}

export async function closeBountySubmissions(
  uid: string,
  bounty: Bounty,
): Promise<void> {
  if (!bounty.onChainBountyId) throw new Error("Bounty has no on-chain id");
  await assertHasBalance(uid);
  const client = getGenLayerClient(uid);
  const address = getContractAddress();
  const txHash = await client.writeContract({
    address,
    functionName: "close_submissions",
    args: [Number(bounty.onChainBountyId)],
    value: 0n,
  });
  await client.waitForTransactionReceipt({ hash: txHash, status: 'FINALIZED', retries: 60, interval: 5000 });

  const db = getFirebaseDb();
  await updateDoc(doc(db, BOUNTIES, bounty.id), {
    status: "judging",
    updatedAt: serverTimestamp(),
  });
}

export async function revealBountySubmissions(bounty: Bounty): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, BOUNTIES, bounty.id), {
    revealed: true,
    updatedAt: serverTimestamp(),
  });
}

export async function finalizeBountyWinners(
  uid: string,
  bounty: Bounty,
): Promise<number[]> {
  if (!bounty.onChainBountyId) throw new Error("Bounty has no on-chain id");
  await assertHasBalance(uid);
  const client = getGenLayerClient(uid);
  const address = getContractAddress();

  const txHash = await client.writeContract({
    address,
    functionName: "finalize_winners",
    args: [Number(bounty.onChainBountyId)],
    value: 0n,
  });
  try {
    await client.waitForTransactionReceipt({ hash: txHash, status: 'FINALIZED', retries: 60, interval: 5000 });
  } catch (e) {
    console.warn("finalize_winners wait timed out, reading state anyway:", e);
  }

  const raw = (await client.readContract({
    address,
    functionName: "get_bounty",
    args: [Number(bounty.onChainBountyId)],
  })) as string;

  let winnerIds: number[] = [];
  try {
    const parsed = JSON.parse(raw);
    winnerIds = (parsed?.winners ?? []).map((n: unknown) => Number(n));
  } catch (e) {
    console.warn("get_bounty parse failed:", e);
  }

  const db = getFirebaseDb();
  await updateDoc(doc(db, BOUNTIES, bounty.id), {
    status: "completed",
    winners: winnerIds,
    finalizedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (winnerIds.length > 0) {
    const { collection, getDocs, query, where, updateDoc: u, doc: d } = await import("firebase/firestore");
    const snap = await getDocs(
      query(
        collection(db, "submissions"),
        where("bountyId", "==", bounty.id),
      ),
    );
    for (const sd of snap.docs) {
      const data = sd.data() as { onChainSubmissionId?: string };
      const onChainId = Number(data.onChainSubmissionId ?? 0);
      const winnerIndex = winnerIds.indexOf(onChainId);
      if (winnerIndex >= 0) {
        await u(d(db, "submissions", sd.id), {
          isWinner: true,
          rank: winnerIndex + 1,
          status: "winner",
          updatedAt: serverTimestamp(),
        });
      } else if (onChainId > 0) {
        await u(d(db, "submissions", sd.id), {
          isWinner: false,
          status: "rejected",
          updatedAt: serverTimestamp(),
        });
      }
    }
  }

  return winnerIds;
}

export async function syncBountyWinners(
  uid: string,
  bounty: Bounty,
): Promise<{ winners: number[]; updated: number }> {
  if (!bounty.onChainBountyId) throw new Error("Bounty has no on-chain id");
  const client = getGenLayerClient(uid);
  const address = getContractAddress();

  const raw = (await client.readContract({
    address,
    functionName: "get_bounty",
    args: [Number(bounty.onChainBountyId)],
  })) as string;

  let winnerIds: number[] = [];
  try {
    const parsed = JSON.parse(raw);
    winnerIds = (parsed?.winners ?? []).map((n: unknown) => Number(n));
  } catch (e) {
    console.warn("get_bounty parse failed:", e);
  }

  const db = getFirebaseDb();
  await updateDoc(doc(db, BOUNTIES, bounty.id), {
    winners: winnerIds,
    updatedAt: serverTimestamp(),
  });

  let updated = 0;
  const { collection: col, getDocs: gd, query: q, where: w, updateDoc: u, doc: d } = await import("firebase/firestore");
  const snap = await gd(q(col(db, "submissions"), w("bountyId", "==", bounty.id)));
  for (const sd of snap.docs) {
    const data = sd.data() as { onChainSubmissionId?: string };
    const onChainId = Number(data.onChainSubmissionId ?? 0);
    const winnerIndex = winnerIds.indexOf(onChainId);
    if (winnerIndex >= 0) {
      await u(d(db, "submissions", sd.id), {
        isWinner: true,
        rank: winnerIndex + 1,
        status: "winner",
        updatedAt: serverTimestamp(),
      });
      updated++;
    }
  }

  return { winners: winnerIds, updated };
}
