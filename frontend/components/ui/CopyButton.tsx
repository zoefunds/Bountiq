"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied" : label || "Copy"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-ink/10 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-ink/55 transition hover:bg-canvas.soft hover:text-ink",
        copied ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "",
        className,
      )}
    >
      {copied ? "copied" : label || "copy"}
    </button>
  );
}
