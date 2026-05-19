"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { createSubmissionOnChainAndMirror } from "@/services/submissionService";
import type { Bounty } from "@/types";

export function SubmissionForm({
  bounty,
  onSubmitted,
}: {
  bounty: Bounty;
  onSubmitted?: () => void;
}) {
  const { firebaseUser } = useAuth();
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [contentUrl, setContentUrl] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    if (!bounty.onChainBountyId) {
      setError("Bounty has no on-chain id yet, cannot submit");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createSubmissionOnChainAndMirror(firebaseUser.uid, {
        bountyFirestoreId: bounty.id,
        bountyOnChainId: Number(bounty.onChainBountyId),
        title,
        summary,
        contentUrl,
        file,
      });
      setSuccess(`Submitted. On-chain id ${result.onChainSubmissionId}.`);
      setTitle("");
      setSummary("");
      setContentUrl("");
      setFile(null);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface rounded-3xl p-8 space-y-5">
      <div>
        <h3 className="font-display text-xl font-semibold tracking-tight">
          Submit your entry
        </h3>
        <p className="mt-1 text-sm text-ink/60">
          On-chain record plus optional file upload to platform storage.
        </p>
      </div>

      <Input
        label="Title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="A short name for your submission"
      />

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/60">
          Summary
        </label>
        <textarea
          required
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What did you build, why does it solve the bounty, and how to evaluate it."
          className="w-full rounded-xl border border-ink/10 bg-white p-4 text-sm text-ink placeholder:text-ink/35 transition focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/10"
        />
      </div>

      <Input
        label="Link to your work"
        type="url"
        value={contentUrl}
        onChange={(e) => setContentUrl(e.target.value)}
        placeholder="https://github.com/you/project or demo video URL"
      />

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/60">
          Attachment (optional, up to 25 MB)
        </label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-ink/70 file:mr-4 file:rounded-full file:border file:border-ink/10 file:bg-canvas.soft file:px-4 file:py-2 file:text-xs file:font-medium file:text-ink hover:file:bg-canvas.deep"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          Submit entry
        </Button>
      </div>
    </form>
  );
}
