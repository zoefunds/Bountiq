"use client";

import * as React from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { listMySubmissions } from "@/services/submissionService";
import type { Bounty, Submission } from "@/types";

interface Row {
  submission: Submission;
  bountyTitle: string;
  bountyId: string;
}

export default function MySubmissionsPage() {
  const { firebaseUser } = useAuth();
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!firebaseUser) return;
    let cancelled = false;
    async function load() {
      const db = getFirebaseDb();
      const subs = await listMySubmissions(firebaseUser.uid, 100);
      const out: Row[] = [];
      for (const sub of subs) {
        const bountyId = sub.bountyId;
        let bountyTitle = "Unknown bounty";
        try {
          const bSnap = await getDoc(doc(db, "bounties", bountyId));
          if (bSnap.exists()) {
            bountyTitle = (bSnap.data() as Bounty).title || bountyTitle;
          }
        } catch {}
        out.push({ submission: sub, bountyTitle, bountyId });
      }
      if (!cancelled) {
        setRows(out);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [firebaseUser]);

  return (
    <div className="container py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight">My submissions</h1>
      <p className="mt-2 text-sm text-ink/60">
        Every entry you have submitted, with its status and score.
      </p>

      <div className="mt-8 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="surface h-24 animate-pulse rounded-2xl" />
          ))
        ) : rows.length === 0 ? (
          <div className="surface rounded-2xl p-12 text-center text-sm text-ink/55">
            You have not submitted to any bounty yet.{" "}
            <Link href="/bounties" className="font-medium text-ink underline-offset-4 hover:underline">
              Browse open bounties
            </Link>
          </div>
        ) : (
          rows.map(({ submission, bountyTitle, bountyId }) => (
            <Link
              key={submission.id}
              href={`/bounties/${bountyId}`}
              className="surface block rounded-2xl p-5 transition hover:-translate-y-0.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-ink/10 bg-canvas.soft px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-ink/55">
                      {submission.status}
                    </span>
                    {submission.isWinner ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-700">
                        winner · rank {submission.rank}
                      </span>
                    ) : null}
                    {(submission as any).paidAt ? (
                      <span className="rounded-full bg-canvas.soft px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-ink/65">
                        paid
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 truncate font-display text-lg font-semibold tracking-tight">
                    {submission.title}
                  </h3>
                  <p className="mt-1 truncate text-xs text-ink/55">
                    For bounty: <span className="text-ink/75">{bountyTitle}</span>
                  </p>
                </div>
                <div className="text-right">
                  {submission.score ? (
                    <>
                      <div className="text-xs uppercase tracking-widest text-ink/40">Weighted</div>
                      <div className="font-display text-2xl font-semibold tracking-tight">
                        {submission.score.weighted}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-ink/45">No score yet</span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
