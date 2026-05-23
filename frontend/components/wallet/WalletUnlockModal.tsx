"use client";

import * as React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function WalletUnlockModal() {
  const { firebaseUser, walletStatus, setupWallet, unlockWallet } = useAuth();
  const [pin, setPin] = React.useState("");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPin("");
    setConfirmPin("");
    setError(null);
  }, [walletStatus]);

  if (!firebaseUser) return null;
  if (walletStatus !== "setup" && walletStatus !== "unlock") return null;

  const isSetup = walletStatus === "setup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isSetup) {
      if (pin.length < 6) {
        setError("PIN must be at least 6 characters.");
        return;
      }
      if (pin !== confirmPin) {
        setError("PINs do not match.");
        return;
      }
    } else {
      if (!pin) {
        setError("Enter your PIN.");
        return;
      }
    }
    setBusy(true);
    try {
      const result = isSetup ? await setupWallet(pin) : await unlockWallet(pin);
      if (!result.ok) setError(result.error || "Failed.");
      else {
        setPin("");
        setConfirmPin("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 backdrop-blur-sm px-4">
      <div className="surface w-full max-w-md rounded-3xl p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-canvas">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {isSetup ? "Secure your wallet" : "Unlock your wallet"}
          </h2>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-ink/65">
          {isSetup
            ? "Set a PIN to encrypt your wallet's private key. You will need this PIN to access your wallet from any new device or after clearing your cache."
            : "Enter the PIN you set when you first secured this wallet."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="PIN"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={isSetup ? "At least 6 characters" : "Your PIN"}
            autoFocus
          />
          {isSetup ? (
            <Input
              label="Confirm PIN"
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="Re-enter the same PIN"
            />
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" loading={busy}>
            {isSetup ? "Create PIN and continue" : "Unlock"}
          </Button>
        </form>

        {isSetup ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold uppercase tracking-widest">Important</p>
            <p className="mt-1">
              Store this PIN somewhere safe. Bountiq cannot recover it for you. If you forget it, the wallet linked to this account becomes unreachable along with any funds on it.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
