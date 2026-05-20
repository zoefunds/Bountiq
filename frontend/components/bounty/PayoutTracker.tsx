"use client";

import * as React from "react";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CopyButton } from "@/components/ui/CopyButton";
import { getFirebaseDb } from "@/lib/firebase";
import { markSubmissionPaid, unmarkSubmissionPaid } from "@/services/submissionService";
import type { Bounty, Submission } from "@/types";

export function PayoutTracker({
  bounty,
  submissions,
  canManage,
  paidBy,
}: {
  bounty: Bounty;
  submissions: Submission[];
  canManage: boolean;
  paidBy: string;
}) {
  const winners = [...submissions]
    .filter((s) => s.status === "winner" || s.isWinner)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  if (winners.length === 0) return null;

  const total = bounty.rewardAmount;
  function amountForRank(rank: number) {
    const split = bounty.payoutSplits.find((p) => p.rank === rank);
    if (!split) return 0;
    return Math.floor((total * split.percentage) / 100);
  }

  return (
    <section className="surface rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold tracking-tight">Payouts</h3>
        <span className="text-xs text-ink/45">
          {winners.filter((w) => Boolean((w as any).paidAt)).length} / {winners.length} paid
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {winners.map((w) => (
          <PayoutRow
            key={w.id}
            submission={w}
            amount={amountForRank(w.rank ?? 1)}
            token={bounty.rewardToken}
            canManage={canManage}
            paidBy={paidBy}
          />
        ))}
      </ul>
    </section>
  );
}

function truncateAddr(addr: string): string {
  if (!addr) return "";
  if (addr.length < 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function PayoutRow({
  submission,
  amount,
  token,
  canManage,
  paidBy,
}: {
  submission: Submission;
  amount: number;
  token: string;
  canManage: boolean;
  paidBy: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [txRef, setTxRef] = React.useState("");
  const paid = Boolean((submission as any).paidAt);

  const initialWallet = ((submission as any).submitterWallet || "") as string;
  const [wallet, setWallet] = React.useState<string>(initialWallet);

  React.useEffect(() => {
    if (wallet) return;
    let cancelled = false;
    (async () => {
      try {
        const db = getFirebaseDb();
        const snap = await getDoc(doc(db, "users", submission.submitterUid));
        if (!cancelled && snap.exists()) {
          const addr = (snap.data() as { walletAddress?: string }).walletAddress;
          if (addr) setWallet(addr);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [wallet, submission.submitterUid]);

  async function handleMarkPaid() {
    setBusy(true);
    try {
      await markSubmissionPaid(submission.id, paidBy, txRef);
    } finally {
      setBusy(false);
    }
  }

  async function handleUnmark() {
    setBusy(true);
    try {
      await unmarkSubmissionPaid(submission.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-ink/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-ink text-canvas px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest">
              rank {submission.rank}
            </span>
            <span className="truncate font-medium">{submission.title}</span>
          </div>
          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-widest text-ink/45">Pay to</div>
            {wallet ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-ink/80">{truncateAddr(wallet)}</span>
                <CopyButton value={wallet} label="copy address" />
              </div>
            ) : (
              <div className="mt-1 text-xs italic text-ink/45">
                Wallet not recorded for this submitter.
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-xl font-semibold tracking-tight">
            {amount.toLocaleString()} <span className="text-xs font-normal text-ink/55">{token}</span>
          </div>
          {paid ? (
            <span className="mt-1 inline-block rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest">
              paid
            </span>
          ) : (
            <span className="mt-1 inline-block rounded-full bg-canvas.soft text-ink/55 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest">
              pending
            </span>
          )}
        </div>
      </div>

      {canManage ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          {!paid ? (
            <>
              <Input
                label="Tx reference (optional)"
                placeholder="0x… or note"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" loading={busy} onClick={handleMarkPaid} disabled={!wallet}>
                Mark paid
              </Button>
            </>
          ) : (
            <>
              <span className="text-xs text-ink/55">
                {(submission as any).paidTxRef ? `Ref: ${(submission as any).paidTxRef}` : null}
              </span>
              <Button size="sm" variant="outline" loading={busy} onClick={handleUnmark}>
                Undo
              </Button>
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}
