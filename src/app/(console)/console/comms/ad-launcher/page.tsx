"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { AnubisCostPerSuperfanBadge } from "@/components/neteru/anubis-cost-per-superfan-badge";

const PLATFORMS = ["META_ADS", "GOOGLE_ADS", "TIKTOK_ADS", "X_ADS"] as const;
const MODES = ["peddler", "dealer", "facilitator", "entertainer"] as const;

export default function AnubisAdLauncherPage() {
  const [strategyId, setStrategyId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [platform, setPlatform] = useState<typeof PLATFORMS[number]>("META_ADS");
  const [budget, setBudget] = useState(2_000_000);
  const [currency, setCurrency] = useState("XAF");
  const [durationDays, setDurationDays] = useState(14);
  const [mode, setMode] = useState<typeof MODES[number]>("facilitator");
  const [countries, setCountries] = useState("WK");
  const [creativeAssetVersionId, setCreativeAssetVersionId] = useState("");
  const [expectedSuperfans, setExpectedSuperfans] = useState(500);
  const [benchmark, setBenchmark] = useState<number | "">("");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const launch = trpc.anubis.launchAdCampaign.useMutation({
    onSuccess: (r) => { setResult(r); setError(null); },
    onError: (e) => { setError(e.message); setResult(null); },
  });

  type R = { amplificationId: string; platform: string; status: string; estimatedReach: number; estimatedSuperfans: number; costPerSuperfanProjected: number; benchmarkRatio: number };
  const r = result as R | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ad Launcher"
        description="ANUBIS_LAUNCH_AD_CAMPAIGN — Meta/Google/TikTok/X. Pre-flight : OAuth + audience + cost_per_superfan ≤ 2× benchmark."
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Comms", href: "/console/comms" }, { label: "Ad Launcher" }]}
      />

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Strategy ID</label>
            <input value={strategyId} onChange={(e) => setStrategyId(e.target.value)} placeholder="wk-strategy-bliss" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Campaign ID</label>
            <input value={campaignId} onChange={(e) => setCampaignId(e.target.value)} placeholder="wk-campaign-heritage-collection" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value as typeof PLATFORMS[number])} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Budget</label>
            <input type="number" value={budget} onChange={(e) => setBudget(parseInt(e.target.value, 10) || 0)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Currency</label>
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Duration (days)</label>
            <input type="number" min={1} max={365} value={durationDays} onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 14)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Manipulation</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as typeof MODES[number])} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Countries (CSV ISO-2)</label>
            <input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="WK,CM" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">AssetVersion ID</label>
            <input value={creativeAssetVersionId} onChange={(e) => setCreativeAssetVersionId(e.target.value)} placeholder="wk-asset-bliss-000" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Expected superfans</label>
            <input type="number" min={0} value={expectedSuperfans} onChange={(e) => setExpectedSuperfans(parseInt(e.target.value, 10) || 0)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground-muted">Benchmark cost_per_superfan (override, optionnel)</label>
          <input type="number" value={benchmark} onChange={(e) => setBenchmark(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <button
          onClick={() =>
            launch.mutate({
              strategyId,
              campaignId,
              platform,
              budget,
              currency,
              durationDays,
              manipulationMode: mode,
              audienceTargeting: { countries: countries.split(",").map((c) => c.trim()).filter(Boolean) },
              creativeAssetVersionId,
              expectedSuperfans,
              benchmarkCostPerSuperfan: benchmark === "" ? undefined : benchmark,
            })
          }
          disabled={!strategyId || !campaignId || !creativeAssetVersionId || launch.isPending}
          className="rounded-md bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-400 disabled:opacity-50"
        >
          {launch.isPending ? "Lancement…" : "Lancer la campagne"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {r && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-3 text-sm">
          <div><span className="text-foreground-muted">amplificationId:</span> <code>{r.amplificationId}</code></div>
          <div><span className="text-foreground-muted">platform:</span> {r.platform}</div>
          <div><span className="text-foreground-muted">status:</span> <strong>{r.status}</strong></div>
          <div><span className="text-foreground-muted">estimatedReach:</span> {r.estimatedReach.toLocaleString()}</div>
          <AnubisCostPerSuperfanBadge
            projected={r.costPerSuperfanProjected}
            benchmark={r.benchmarkRatio > 0 ? r.costPerSuperfanProjected / r.benchmarkRatio : null}
            currency={currency}
          />
        </div>
      )}
    </div>
  );
}
