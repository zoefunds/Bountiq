"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { createBountyOnChainAndMirror } from "@/services/bountyService";
import type { PayoutSplit, RubricWeights } from "@/types";

function defaultSplits(winnerCount: number): PayoutSplit[] {
  if (winnerCount <= 0) return [];
  const base = Math.floor(100 / winnerCount);
  const remainder = 100 - base * winnerCount;
  return Array.from({ length: winnerCount }, (_, i) => ({
    rank: i + 1,
    percentage: i === 0 ? base + remainder : base,
  }));
}

export default function CreateBountyPage() {
  const router = useRouter();
  const { firebaseUser, walletAddress } = useAuth();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [rewardAmount, setRewardAmount] = React.useState(1000);
  const [rewardToken, setRewardToken] = React.useState("USDC");
  const [winnerCount, setWinnerCount] = React.useState(3);
  const [splits, setSplits] = React.useState<PayoutSplit[]>(defaultSplits(3));
  const [rubric, setRubric] = React.useState<RubricWeights>({
    innovation: 30,
    technical: 30,
    impact: 25,
    presentation: 15,
  });
  const [deadline, setDeadline] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSplits(defaultSplits(winnerCount));
  }, [winnerCount]);

  const rubricTotal =
    rubric.innovation + rubric.technical + rubric.impact + rubric.presentation;
  const splitsTotal = splits.reduce((s, p) => s + p.percentage, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createBountyOnChainAndMirror(firebaseUser.uid, {
        title,
        description,
        rewardAmount,
        rewardToken,
        winnerCount,
        payoutSplits: splits,
        rubric,
        deadline: new Date(deadline),
      });
      router.replace(`/bounties?created=${result.firestoreId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bounty");
    } finally {
      setSubmitting(false);
    }
  }

  function updateSplit(i: number, percentage: number) {
    setSplits((prev) => prev.map((p, idx) => (idx === i ? { ...p, percentage } : p)));
  }

  function updateRubric(key: keyof RubricWeights, value: number) {
    setRubric((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="container max-w-3xl py-12">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Create a bounty
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          Publishes on chain via Intelligent Contract, then mirrors to the platform index.
        </p>
        {walletAddress ? (
          <p className="mt-3 font-mono text-xs text-ink/45">
            Signing with {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="surface rounded-3xl p-8 space-y-6">
        <Input
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What problem are you sponsoring?"
        />

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/60">
            Description
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Goals, constraints, deliverables, definition of done."
            className="w-full rounded-xl border border-ink/10 bg-white p-4 text-sm text-ink placeholder:text-ink/35 transition focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Reward amount"
            type="number"
            min={0}
            value={rewardAmount}
            onChange={(e) => setRewardAmount(Number(e.target.value))}
          />
          <Input
            label="Token"
            value={rewardToken}
            onChange={(e) => setRewardToken(e.target.value)}
            placeholder="USDC"
          />
          <Input
            label="Deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Winner count"
            type="number"
            min={1}
            max={10}
            value={winnerCount}
            onChange={(e) => setWinnerCount(Math.max(1, Math.min(10, Number(e.target.value))))}
          />
          <div className="flex items-end text-xs text-ink/55">
            Splits total: <span className={splitsTotal === 100 ? "ml-1 text-emerald-600" : "ml-1 text-red-500"}>{splitsTotal}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {splits.map((s, i) => (
            <Input
              key={s.rank}
              label={`Rank ${s.rank}`}
              type="number"
              min={0}
              max={100}
              value={s.percentage}
              onChange={(e) => updateSplit(i, Number(e.target.value))}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-ink/10 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold tracking-tight">Rubric weights</h3>
            <span className={rubricTotal === 100 ? "text-xs text-emerald-600" : "text-xs text-red-500"}>
              {rubricTotal}% / 100%
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Input
              label="Innovation"
              type="number" min={0} max={100}
              value={rubric.innovation}
              onChange={(e) => updateRubric("innovation", Number(e.target.value))}
            />
            <Input
              label="Technical"
              type="number" min={0} max={100}
              value={rubric.technical}
              onChange={(e) => updateRubric("technical", Number(e.target.value))}
            />
            <Input
              label="Impact"
              type="number" min={0} max={100}
              value={rubric.impact}
              onChange={(e) => updateRubric("impact", Number(e.target.value))}
            />
            <Input
              label="Presentation"
              type="number" min={0} max={100}
              value={rubric.presentation}
              onChange={(e) => updateRubric("presentation", Number(e.target.value))}
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.replace("/bounties")}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={rubricTotal !== 100 || splitsTotal !== 100}
          >
            Publish bounty
          </Button>
        </div>
      </form>
    </div>
  );
}
