import Link from "next/link";
import type { Bounty } from "@/types";

function fmt(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BountyCard({ bounty }: { bounty: Bounty }) {
  const deadline = (bounty.deadline as unknown as { toDate: () => Date })?.toDate?.() ?? new Date();
  return (
    <Link
      href={`/bounties/${bounty.id}`}
      className="surface group block rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
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
      <div className="mt-6 flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-ink/40">Reward</div>
          <div className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {bounty.rewardAmount.toLocaleString()}{" "}
            <span className="text-sm font-normal text-ink/55">{bounty.rewardToken}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-ink/40">Closes</div>
          <div className="mt-1 text-sm text-ink/70">{fmt(deadline)}</div>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-ink/5 pt-4 text-xs text-ink/50">
        <span>{bounty.winnerCount} winner{bounty.winnerCount === 1 ? "" : "s"}</span>
        <span>{bounty.submissionCount} submission{bounty.submissionCount === 1 ? "" : "s"}</span>
      </div>
    </Link>
  );
}
