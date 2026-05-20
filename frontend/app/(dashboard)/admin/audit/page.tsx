"use client";

import * as React from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { listAuditEvents } from "@/services/auditService";
import { CopyButton } from "@/components/ui/CopyButton";

function fmt(ts: any): string {
  try {
    if (ts?.toDate) return ts.toDate().toLocaleString();
  } catch {}
  return "";
}

function Inner() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const list = await listAuditEvents(200);
        setItems(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Audit log</h1>
      <p className="mt-2 text-sm text-ink/60">
        Every meaningful action on Bountiq, in reverse chronological order.
      </p>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
        {loading ? (
          <div className="p-8 text-sm text-ink/50">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-sm text-ink/50">No audit events yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-ink/5 bg-canvas.soft text-left">
              <tr>
                <th className="px-5 py-3 font-medium text-ink/60">Time</th>
                <th className="px-5 py-3 font-medium text-ink/60">Action</th>
                <th className="px-5 py-3 font-medium text-ink/60">Target</th>
                <th className="px-5 py-3 font-medium text-ink/60">Actor</th>
                <th className="px-5 py-3 font-medium text-ink/60">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-b border-ink/5 last:border-b-0 align-top">
                  <td className="px-5 py-3 whitespace-nowrap text-ink/65">{fmt(e.createdAt)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-ink/80">{e.action}</td>
                  <td className="px-5 py-3">
                    <div className="text-xs uppercase tracking-widest text-ink/45">{e.targetType}</div>
                    <div className="mt-1 flex items-center gap-2 font-mono text-xs">
                      <span className="break-all">{String(e.targetId).slice(0, 14)}…</span>
                      <CopyButton value={String(e.targetId)} label="copy" />
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span>{String(e.actorUid).slice(0, 10)}…</span>
                      <CopyButton value={String(e.actorUid)} label="copy" />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <pre className="max-w-md overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-canvas.soft p-2 text-[11px] text-ink/70">
                      {JSON.stringify(e.metadata, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <AuthGuard requiredRoles={["admin"]}>
      <Inner />
    </AuthGuard>
  );
}
