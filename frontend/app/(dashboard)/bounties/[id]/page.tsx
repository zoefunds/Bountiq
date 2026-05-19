"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SubmissionForm } from "@/components/submission/SubmissionForm";
import { SubmissionRow } from "@/components/submission/SubmissionRow";
import {
  closeBountySubmissions,
  getBountyById,
  revealBountySubmissions,
} from "@/services/bountyService";
import { subscribeToBountySubmissions } from "@/services/submissionService";
import { useAuth } from "@/hooks/useAuth";
import type { Bounty, Submission } from "@/types";

function fmt(d: Date) {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function BountyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { firebaseUser, appUser, hasRole } = useAuth();

  const [bounty, setBounty] = React.useState<Bounty | null>(null);
  const [submissions, setSubmissions] = React.useState<Submission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionBusy, setActionBusy] = React.useState(false);

  const refreshBounty = React.useCallback(async () => {
    if (!id) return;
    try {
      const b = await getBountyById(id);
      setBounty(b);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  }, [id]);

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    refreshBounty().finally(() => setLoading(false));
  }, [id, refreshBounty]);

  React.useEffect(() => {
    if (!id) return;
    const unsub = subscribeToBountySubmissions(id, setSubmissions);
    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <div className="container py-16">
        <div className="surface h-64 animate-pulse rounded-3xl" />
      </div>
    );
  }

  if (error || !bounty) {
    return (
      <div className="container py-16">
        <div className="surface rounded-2xl p-8 text-sm text-red-600">
          {error || "Bounty not found"}
        </div>
      </div>
    );
  }

  const deadline =
    (bounty.deadline as unknown as { toDate: () => Date })?.toDate?.() ?? new Date();
  const isCreator = firebaseUser?.uid === bounty.creatorUid;
  const isPrivileged = isCreator || hasRole("judge") || hasRole("admin");
  const myUid = firebaseUser?.uid;

  const visible = isPrivileged || bounty.revealed
    ? submissions
    : submissions.filter((s) => s.submitterUid === myUid);

  const ranked = [...visible].sort(
    (a, b) => (b.score?.weighted ?? 0) - (a.score?.weighted ?? 0),
  );

  async function handleClose() {
    if (!firebaseUser) return;
    setActionBusy(true);
    try {
      await closeBountySubmissions(firebaseUser.uid, bounty);
      await refreshBounty();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Close failed");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleReveal() {
    setActionBusy(true);
    try {
      await revealBountySubmissions(bounty);
      await refreshBounty();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reveal failed");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="container py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <header className="surface rounded-3xl p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-ink/10 bg-canvas.soft px-3 py-1 text-xs font-medium uppercase tracking-wider text-ink/55">
                  {bounty.status}
                </span>
                <span className="font-mono text-xs text-ink/40">
                  On-chain id #{bounty.onChainBountyId ?? "—"}
                </span>
                {bounty.revealed ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    revealed
                  </span>
                ) : (
                  <span className="rounded-full border border-ink/10 bg-canvas.soft px-3 py-1 text-xs font-medium text-ink/55">
                    sealed
                  </span>
                )}
              </div>
              {isCreator || hasRole("admin") ? (
                <div className="flex items-center gap-2">
                  {bounty.status === "open" ? (
                    <Button size="sm" variant="outline" onClick={handleClose} loading={actionBusy}>
                      Close submissions
                    </Button>
                  ) : null}
                  {!bounty.revealed ? (
                    <Button size="sm" onClick={handleReveal} loading={actionBusy}>
                      Reveal submissions
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
              {bounty.title}
            </h1>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/70">
              {bounty.description}
            </p>
            <div className="mt-6 grid grid-cols-3 gap-6 border-t border-ink/5 pt-6">
              <Stat label="Reward" value={`${bounty.rewardAmount.toLocaleString()} ${bounty.rewardToken}`} />
              <Stat label="Winners" value={String(bounty.winnerCount)} />
              <Stat label="Closes" value={fmt(deadline)} />
            </div>
          </header>

          <section>
            <div className="flex items-end justify-between">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Submissions
              </h2>
              <span className="text-xs text-ink/45">
                {bounty.submissionCount} total
              </span>
            </div>

            {!isPrivileged && !bounty.revealed ? (
              <div className="surface mt-4 rounded-2xl p-8 text-center">
                <p className="font-display text-lg text-ink/70">Submissions are sealed.</p>
                <p className="mt-2 text-sm text-ink/55">
                  The bounty creator will reveal entries after the task closes. You can still see your own.
                </p>
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {ranked.length === 0 ? (
                <div className="surface rounded-2xl p-8 text-center text-sm text-ink/55">
                  {bounty.revealed || isPrivileged
                    ? "No submissions yet."
                    : "You have not submitted yet."}
                </div>
              ) : (
                ranked.map((s) => <SubmissionRow key={s.id} submission={s} />)
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="surface rounded-3xl p-6">
            <h3 className="font-display text-lg font-semibold tracking-tight">Rubric</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <RubricRow label="Innovation" value={bounty.rubric.innovation} />
              <RubricRow label="Technical" value={bounty.rubric.technical} />
              <RubricRow label="Impact" value={bounty.rubric.impact} />
              <RubricRow label="Presentation" value={bounty.rubric.presentation} />
            </ul>
          </div>

          <div className="surface rounded-3xl p-6">
            <h3 className="font-display text-lg font-semibold tracking-tight">
              Payout split
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              {bounty.payoutSplits.map((p) => (
                <li key={p.rank} className="flex items-center justify-between">
                  <span className="text-ink/65">Rank {p.rank}</span>
                  <span className="font-medium">{p.percentage}%</span>
                </li>
              ))}
            </ul>
          </div>

          {bounty.status === "open" ? <SubmissionForm bounty={bounty} /> : null}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-ink/40">{label}</div>
      <div className="mt-1 font-display text-lg font-semibold tracking-tight">
        {value}
      </div>
    </div>
  );
}

function RubricRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-ink/65">{label}</span>
      <span className="font-medium">{value}%</span>
    </li>
  );
}
