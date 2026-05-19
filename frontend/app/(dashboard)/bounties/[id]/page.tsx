"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { SubmissionForm } from "@/components/submission/SubmissionForm";
import { SubmissionRow } from "@/components/submission/SubmissionRow";
import { getBountyById } from "@/services/bountyService";
import { subscribeToBountySubmissions } from "@/services/submissionService";
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

  const [bounty, setBounty] = React.useState<Bounty | null>(null);
  const [submissions, setSubmissions] = React.useState<Submission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const b = await getBountyById(id);
        if (!cancelled) setBounty(b);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

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

  const ranked = [...submissions].sort(
    (a, b) => (b.score?.weighted ?? 0) - (a.score?.weighted ?? 0),
  );

  return (
    <div className="container py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <header className="surface rounded-3xl p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-ink/10 bg-canvas.soft px-3 py-1 text-xs font-medium uppercase tracking-wider text-ink/55">
                {bounty.status}
              </span>
              <span className="font-mono text-xs text-ink/40">
                On-chain id #{bounty.onChainBountyId ?? "—"}
              </span>
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
                {submissions.length} total
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {ranked.length === 0 ? (
                <div className="surface rounded-2xl p-8 text-center text-sm text-ink/55">
                  No submissions yet. Be the first.
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

          <SubmissionForm bounty={bounty} />
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
