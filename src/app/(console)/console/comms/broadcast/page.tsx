"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";

const CHANNELS = ["EMAIL", "SMS", "PUSH", "IN_APP"] as const;
const MODES = ["peddler", "dealer", "facilitator", "entertainer"] as const;

export default function AnubisBroadcastPage() {
  const [strategyId, setStrategyId] = useState("");
  const [channel, setChannel] = useState<typeof CHANNELS[number]>("EMAIL");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [mode, setMode] = useState<typeof MODES[number]>("facilitator");
  const [scheduledAt, setScheduledAt] = useState("");
  const [respectQuiet, setRespectQuiet] = useState(true);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const broadcast = trpc.anubis.broadcast.useMutation({
    onSuccess: (r) => { setResult(r); setError(null); },
    onError: (e) => { setError(e.message); setResult(null); },
  });

  type R = { broadcastId: string; channel: string; estimatedRecipients: number; scheduled: boolean; scheduledAt?: Date; costEstimateUsd: number };
  const r = result as R | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Broadcast"
        description="ANUBIS_BROADCAST — fan-out cohorte. Cap 5000 recipients, respect quiet hours."
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Comms", href: "/console/comms" }, { label: "Broadcast" }]}
      />

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Strategy ID</label>
            <input value={strategyId} onChange={(e) => setStrategyId(e.target.value)} placeholder="wk-strategy-bliss" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as typeof CHANNELS[number])} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground-muted">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground-muted">Body</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Link (optionnel)</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Manipulation Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as typeof MODES[number])} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Scheduled (ISO, optionnel)</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={respectQuiet} onChange={(e) => setRespectQuiet(e.target.checked)} />
          Respect quiet hours (NotificationPreference)
        </label>
        <button
          onClick={() =>
            broadcast.mutate({
              strategyId,
              cohortKey: "ALL_USERS_OPERATOR",
              channel,
              title,
              body,
              link: link || undefined,
              manipulationMode: mode,
              respectQuietHours: respectQuiet,
              scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
            })
          }
          disabled={!strategyId || !title || !body || broadcast.isPending}
          className="rounded-md bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-400 disabled:opacity-50"
        >
          {broadcast.isPending ? "Diffusion…" : "Diffuser"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {r && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-2 text-sm">
          <div><span className="text-foreground-muted">broadcastId:</span> <code>{r.broadcastId}</code></div>
          <div><span className="text-foreground-muted">recipients:</span> <strong>{r.estimatedRecipients}</strong></div>
          <div><span className="text-foreground-muted">scheduled:</span> {r.scheduled ? "✓" : "immédiat"}</div>
          <div><span className="text-foreground-muted">cost USD estimate:</span> <strong>${r.costEstimateUsd.toFixed(4)}</strong></div>
        </div>
      )}
    </div>
  );
}
