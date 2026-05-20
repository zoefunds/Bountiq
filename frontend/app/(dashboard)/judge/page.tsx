"use client";

import * as React from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Bounty } from "@/types";

interface BountyHealth {
  bounty: Bounty;
  scored: number;
  unscored: number;
}

export default function JudgePage() {
  const [items, setItems] = React.useState<BountyHealth[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = getFirebaseDb();
        const bSnap = await getDocs(
          query(
            collection(db, "bounties"),
            where("status", "in", ["open", "judging", "completed"]),
            orderBy("createdAt", "desc"),
          ),
        );
        const out: BountyHealth[] = [];
        for (const b of bSnap.docs) {
          const bounty = { id: b.id, ...(b.data() as Omit<Bounty, "id">) };
          const sSnap = await getDocs(
            query(collection(db, "submissions"), where("bountyId", "==", b.id)),
          );
          let scored = 0;
          let unscored = 0;
          sSnap.forEach((d) => {
            const score = (d.data() as { score?: unknown }).score;
            if (score) scored++;
            else unscored++;
          });
          out.push({ bounty, scored, unscored });
        }
        if (!cancelled) setItems(out);
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
  }, []);

  return (
    <div className="container py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Judging</h1>
      <p className="mt-2 text-sm text-ink/60">
        Validator board. AI evaluation results are visible here once submissions are scored.
      </p>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-10">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface h-44 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="surface rounded-2xl p-12 text-center text-sm text-ink/55">
            No bounties to judge yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {items.map(({ bounty, scored, unscored }) => (
              <Link
                key={bounty.id}
                href={`/bounties/${bounty.id}`}
                className="surface group block rounded-2xl p-6 transition hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-ink/10 bg-canvas.soft px-3 py-1 text-xs font-medium uppercase tracking-wider text-ink/55">
                    {bounty.status}
                  </span>
                  <span className="font-mono text-xs text-ink/40">
                    #{bounty.onChainBountyId ?? "—"}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
                  {bounty.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-ink/60">{bounty.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-ink/5 pt-4 text-xs">
                  <span className="text-emerald-700">{scored} scored</span>
                  <span className="text-ink/55">{unscored} pending</span>
                  <span className="text-ink/45">{bounty.winnerCount} winners</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
