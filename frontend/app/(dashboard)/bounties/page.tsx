"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BountyCard } from "@/components/bounty/BountyCard";
import { listAllBounties } from "@/services/bountyService";
import type { Bounty } from "@/types";

export default function BountiesPage() {
  const searchParams = useSearchParams();
  const justCreated = searchParams.get("created");

  const [bounties, setBounties] = React.useState<Bounty[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listAllBounties(200);
        if (!cancelled) {
          console.log("[bounties] loaded", list.length, list.map(b => ({ id: b.id, status: b.status, title: b.title })));
          setBounties(list);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openBounties = bounties.filter((b) => b.status === "open");
  const pastBounties = bounties.filter((b) => b.status !== "open");

  return (
    <div className="container py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Bounties</h1>
          <p className="mt-2 text-sm text-ink/60">
            Open tasks and the archive of past tasks, all reviewed on chain.
          </p>
        </div>
        <Link href="/create">
          <Button>New bounty</Button>
        </Link>
      </div>

      {justCreated ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Bounty published. The on-chain id is recorded.
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Open</h2>
          <span className="text-xs text-ink/45">{openBounties.length}</span>
        </div>
        {loading ? (
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="surface h-56 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : openBounties.length === 0 ? (
          <div className="surface mt-4 grid place-items-center rounded-2xl p-12 text-center">
            <p className="font-display text-lg text-ink/70">No open bounties right now.</p>
            <Link href="/create" className="mt-4">
              <Button size="sm">Create one</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {openBounties.map((b) => <BountyCard key={b.id} bounty={b} />)}
          </div>
        )}
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Past</h2>
          <span className="text-xs text-ink/45">{pastBounties.length}</span>
        </div>
        {loading ? (
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="surface h-56 animate-pulse rounded-2xl opacity-60" />
            ))}
          </div>
        ) : pastBounties.length === 0 ? (
          <div className="surface mt-4 rounded-2xl p-8 text-center text-sm text-ink/50">
            No past bounties yet.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {pastBounties.map((b) => (
              <div key={b.id} className="opacity-85 transition hover:opacity-100">
                <BountyCard bounty={b} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
