"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, label, hint, error, id, ...props }, ref) {
    const inputId = id || React.useId();
    return (
      <div className="w-full">
        {label ? (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/60"
          >
            {label}
          </label>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "h-11 w-full rounded-xl border border-ink/10 bg-white px-4 text-sm text-ink placeholder:text-ink/35 transition",
            "focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/10",
            error ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "",
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="mt-1.5 text-xs text-red-500">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-ink/50">{hint}</p>
        ) : null}
      </div>
    );
  },
);
