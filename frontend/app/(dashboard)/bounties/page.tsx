"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BountyCard } from "@/components/bounty/BountyCard";
import { listOpenBounties } from "@/services/bountyService";
import type { Bounty } from "@/types";

export default function BountiesPage() {
  const searchParams = useSearchParams();
  const justCreated = searchParams.get("created");

  const [bounties, setBounties] = React.useState<Bounty[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const list = await listOpenBounties(50);
        if (!cancelled) setBounties(list);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load bounties");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Open bounties
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            Live tasks reviewed on chain by GenLayer Intelligent Contracts.
          </p>
        </div>
        <Link href="/create">
          <Button>New bounty</Button>
        </Link>
      </div>

      {justCreated ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Bounty published. The on-chain id is recorded; community members can now submit.
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-10">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="surface h-56 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : bounties.length === 0 ? (
          <div className="surface mt-6 grid place-items-center rounded-2xl p-16 text-center">
            <p className="font-display text-xl text-ink/70">No open bounties yet.</p>
            <p className="mt-2 max-w-md text-sm text-ink/55">
              Be the first to publish. The contract is live on Studionet.
            </p>
            <Link href="/create" className="mt-6">
              <Button>Create the first bounty</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {bounties.map((b) => (
              <BountyCard key={b.id} bounty={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
