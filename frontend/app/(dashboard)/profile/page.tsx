"use client";

import * as React from "react";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { getGenBalance, formatGen } from "@/lib/genlayer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CopyButton } from "@/components/ui/CopyButton";

export default function ProfilePage() {
  const { firebaseUser, appUser, walletAddress } = useAuth();
  const [displayName, setDisplayName] = React.useState(appUser?.displayName || "");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [balance, setBalance] = React.useState<string>("…");

  React.useEffect(() => {
    setDisplayName(appUser?.displayName || "");
  }, [appUser?.displayName]);

  React.useEffect(() => {
    if (!firebaseUser) return;
    let cancelled = false;
    (async () => {
      try {
        const bal = await getGenBalance(firebaseUser.uid);
        if (!cancelled) setBalance(formatGen(bal) + " GEN");
      } catch {
        if (!cancelled) setBalance("—");
      }
    })();
    return () => { cancelled = true; };
  }, [firebaseUser]);

  async function handleSave() {
    if (!firebaseUser) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile(firebaseUser, { displayName });
      const db = getFirebaseDb();
      await updateDoc(doc(db, "users", firebaseUser.uid), {
        displayName,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (!firebaseUser || !appUser) {
    return <div className="container py-20 text-sm text-ink/55">Loading…</div>;
  }

  return (
    <div className="container max-w-3xl py-12 space-y-6">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-2 text-sm text-ink/60">
          Your account, wallet, and on-chain balance.
        </p>
      </header>

      <section className="surface rounded-3xl p-8 space-y-4">
        <h2 className="font-display text-xl font-semibold tracking-tight">Identity</h2>
        <Input
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
        />
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/60">Email</label>
          <div className="rounded-xl border border-ink/10 bg-canvas.soft px-4 py-2.5 text-sm text-ink/65">
            {firebaseUser.email}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} loading={saving}>Save</Button>
          {saved ? <span className="text-xs text-emerald-700">Saved</span> : null}
        </div>
      </section>

      <section className="surface rounded-3xl p-8 space-y-4">
        <h2 className="font-display text-xl font-semibold tracking-tight">Wallet</h2>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/60">
            GenLayer address
          </label>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3">
            <span className="font-mono text-sm break-all">{walletAddress || "—"}</span>
            {walletAddress ? <CopyButton value={walletAddress} label="copy address" /> : null}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/60">
            GEN balance
          </label>
          <div className="flex items-center justify-between rounded-xl border border-ink/10 bg-white px-4 py-3">
            <span className="font-display text-2xl font-semibold tracking-tight">{balance}</span>
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-ink/55 underline-offset-4 hover:underline"
            >
              Open Studio faucet
            </a>
          </div>
          {balance === "0 GEN" || balance === "0" ? (
            <p className="mt-2 text-xs text-red-600">
              You cannot submit transactions until you fund this address.
            </p>
          ) : null}
        </div>
      </section>

      <section className="surface rounded-3xl p-8">
        <h2 className="font-display text-xl font-semibold tracking-tight">Roles</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {appUser.roles.map((r) => (
            <span
              key={r}
              className="rounded-full border border-ink/10 bg-canvas.soft px-3 py-1 text-xs font-medium uppercase tracking-widest text-ink/65"
            >
              {r}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink/55">
          To request creator or judge access, contact a platform admin.
        </p>
      </section>
    </div>
  );
}
