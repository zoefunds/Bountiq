"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { triggerEvaluation } from "@/services/submissionService";
import type { Submission } from "@/types";

export function SubmissionRow({ submission }: { submission: Submission }) {
  const { firebaseUser } = useAuth();
  const [evaluating, setEvaluating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onChainId = (submission as unknown as { onChainSubmissionId?: string })
    .onChainSubmissionId;

  async function handleEvaluate() {
    if (!firebaseUser || !onChainId) return;
    setEvaluating(true);
    setError(null);
    try {
      await triggerEvaluation(firebaseUser.uid, Number(onChainId), submission.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className="surface rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-ink/10 bg-canvas.soft px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-ink/55">
              {submission.status}
            </span>
            <span className="font-mono text-xs text-ink/40">
              #{onChainId ?? "—"}
            </span>
          </div>
          <h4 className="mt-2 font-display text-lg font-semibold tracking-tight">
            {submission.title}
          </h4>
          <p className="mt-1 line-clamp-2 text-sm text-ink/60">{submission.summary}</p>
          {submission.contentUrl ? (
            <a
              href={submission.contentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-ink/55 underline-offset-4 hover:underline"
            >
              View work
            </a>
          ) : null}
        </div>

        <div className="text-right">
          {submission.score ? (
            <>
              <div className="text-xs uppercase tracking-widest text-ink/40">Weighted</div>
              <div className="font-display text-3xl font-semibold tracking-tight">
                {submission.score.weighted}
              </div>
              <div className="mt-1 text-[10px] text-ink/45">
                I {submission.score.innovation} · T {submission.score.technical} · X {submission.score.impact} · P {submission.score.presentation}
              </div>
            </>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              loading={evaluating}
              onClick={handleEvaluate}
            >
              Evaluate with AI
            </Button>
          )}
        </div>
      </div>

      {submission.score?.reasoning ? (
        <p className="mt-4 rounded-xl bg-canvas.soft p-3 text-xs italic text-ink/65">
          {submission.score.reasoning}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-xs text-red-500">{error}</p>
      ) : null}
    </div>
  );
}
