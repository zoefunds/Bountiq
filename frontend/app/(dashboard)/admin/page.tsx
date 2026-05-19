"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import {
  grantCreatorOnChain,
  listUsers,
  revokeCreatorOnChain,
  toggleRole,
} from "@/services/adminService";
import type { AppUser, UserRole } from "@/types";

const ROLES: UserRole[] = ["submitter", "creator", "judge", "admin"];

function AdminInner() {
  const { firebaseUser } = useAuth();
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [walletAddress, setWalletAddress] = React.useState("");
  const [chainBusy, setChainBusy] = React.useState(false);
  const [chainMessage, setChainMessage] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listUsers(200));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(user: AppUser, role: UserRole) {
    try {
      await toggleRole(user, role);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function handleGrantOnChain() {
    if (!firebaseUser || !walletAddress) return;
    setChainBusy(true);
    setChainMessage(null);
    try {
      const tx = await grantCreatorOnChain(firebaseUser.uid, walletAddress.trim());
      setChainMessage(`Granted creator on chain. Tx ${tx.slice(0, 12)}…`);
    } catch (err) {
      setChainMessage(err instanceof Error ? err.message : "On-chain grant failed");
    } finally {
      setChainBusy(false);
    }
  }

  async function handleRevokeOnChain() {
    if (!firebaseUser || !walletAddress) return;
    setChainBusy(true);
    setChainMessage(null);
    try {
      const tx = await revokeCreatorOnChain(firebaseUser.uid, walletAddress.trim());
      setChainMessage(`Revoked creator on chain. Tx ${tx.slice(0, 12)}…`);
    } catch (err) {
      setChainMessage(err instanceof Error ? err.message : "On-chain revoke failed");
    } finally {
      setChainBusy(false);
    }
  }

  return (
    <div className="container py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-2 text-sm text-ink/60">
        Manage platform roles and on-chain creator authorization.
      </p>

      <section className="surface mt-8 rounded-3xl p-8">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          On-chain creator authorization
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          Calls the Intelligent Contract directly. Requires this account to be the contract admin.
        </p>
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end">
          <Input
            label="Wallet address"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x…"
            className="flex-1"
          />
          <Button onClick={handleGrantOnChain} loading={chainBusy}>
            Grant creator
          </Button>
          <Button variant="outline" onClick={handleRevokeOnChain} loading={chainBusy}>
            Revoke
          </Button>
        </div>
        {chainMessage ? (
          <p className="mt-3 text-xs text-ink/60">{chainMessage}</p>
        ) : null}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">Users</h2>
          <span className="text-xs text-ink/45">{users.length} total</span>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {loading ? (
            <div className="p-8 text-sm text-ink/50">Loading…</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-sm text-ink/50">No users yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-ink/5 bg-canvas.soft text-left">
                <tr>
                  <th className="px-5 py-3 font-medium text-ink/60">User</th>
                  <th className="px-5 py-3 font-medium text-ink/60">Wallet</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-3 py-3 text-center font-medium text-ink/60">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.uid} className="border-b border-ink/5 last:border-b-0">
                    <td className="px-5 py-3">
                      <div className="font-medium">{u.displayName || u.email}</div>
                      <div className="text-xs text-ink/45">{u.email}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-ink/55">
                      {u.walletAddress
                        ? `${u.walletAddress.slice(0, 6)}…${u.walletAddress.slice(-4)}`
                        : "—"}
                    </td>
                    {ROLES.map((r) => (
                      <td key={r} className="px-3 py-3 text-center">
                        <button
                          onClick={() => handleToggle(u, r)}
                          className={
                            u.roles.includes(r)
                              ? "rounded-full bg-ink px-3 py-1 text-xs font-medium text-canvas"
                              : "rounded-full border border-ink/15 px-3 py-1 text-xs font-medium text-ink/50 hover:text-ink"
                          }
                        >
                          {u.roles.includes(r) ? "on" : "off"}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard requiredRoles={["admin"]}>
      <AdminInner />
    </AuthGuard>
  );
}
