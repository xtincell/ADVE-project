"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";

const CHANNELS = ["EMAIL", "SMS", "PUSH", "IN_APP", "SOCIAL_INSTAGRAM", "SOCIAL_TIKTOK", "SOCIAL_LINKEDIN"] as const;
const MODES = ["peddler", "dealer", "facilitator", "entertainer"] as const;

export default function AnubisDropSchedulerPage() {
  const [strategyId, setStrategyId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [mode, setMode] = useState<typeof MODES[number]>("entertainer");
  const [channels, setChannels] = useState<Array<{ channel: typeof CHANNELS[number]; title: string; body: string; link?: string }>>([
    { channel: "IN_APP", title: "", body: "" },
    { channel: "EMAIL", title: "", body: "" },
  ]);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const drop = trpc.anubis.scheduleDrop.useMutation({
    onSuccess: (r) => { setResult(r); setError(null); },
    onError: (e) => { setError(e.message); setResult(null); },
  });

  type R = { dropId: string; scheduledAt: Date; channelCount: number; estimatedReach: number };
  const r = result as R | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drop Scheduler"
        description="ANUBIS_SCHEDULE_DROP — drop coordonné multi-canaux pour un campaignId, planifié à scheduledAt."
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Comms", href: "/console/comms" }, { label: "Drop Scheduler" }]}
      />

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Strategy ID</label>
            <input value={strategyId} onChange={(e) => setStrategyId(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Campaign ID</label>
            <input value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Scheduled at</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground-muted">Manipulation Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as typeof MODES[number])} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
            {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-foreground-muted">Channels ({channels.length})</h4>
            <button onClick={() => setChannels([...channels, { channel: "IN_APP", title: "", body: "" }])} className="text-xs text-purple-500 hover:underline">+ canal</button>
          </div>
          {channels.map((c, i) => (
            <div key={i} className="rounded-md border border-border p-3 space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select value={c.channel} onChange={(e) => { const next = [...channels]; next[i] = { ...c, channel: e.target.value as typeof CHANNELS[number] }; setChannels(next); }} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
                </select>
                <input placeholder="Title" value={c.title} onChange={(e) => { const next = [...channels]; next[i] = { ...c, title: e.target.value }; setChannels(next); }} className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <textarea placeholder="Body" value={c.body} onChange={(e) => { const next = [...channels]; next[i] = { ...c, body: e.target.value }; setChannels(next); }} rows={2} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
          ))}
        </div>

        <button
          onClick={() =>
            drop.mutate({
              strategyId,
              campaignId,
              scheduledAt: new Date(scheduledAt),
              manipulationMode: mode,
              channels: channels.map((c) => ({ channel: c.channel, payload: { title: c.title, body: c.body, link: c.link } })),
            })
          }
          disabled={!strategyId || !campaignId || !scheduledAt || channels.some((c) => !c.title || !c.body) || drop.isPending}
          className="rounded-md bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-400 disabled:opacity-50"
        >
          {drop.isPending ? "Scheduling…" : "Programmer le drop"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {r && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-2 text-sm">
          <div><span className="text-foreground-muted">dropId:</span> <code>{r.dropId}</code></div>
          <div><span className="text-foreground-muted">scheduledAt:</span> {new Date(r.scheduledAt).toISOString()}</div>
          <div><span className="text-foreground-muted">channels:</span> {r.channelCount}</div>
          <div><span className="text-foreground-muted">estimated reach:</span> {r.estimatedReach.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}
