"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";

const BUCKETS = ["ART_DIRECTOR", "COPYWRITER", "PHOTOGRAPHER", "VIDEOGRAPHER", "COMMUNITY", "DEV_IOS", "DEV_ANDROID", "DEV_WEB", "UX_DESIGNER", "STRATEGIST", "PRODUCER", "EDITOR", "ANIMATOR_2D", "SOUND_DESIGNER", "DATA_ANALYST"] as const;
const MODES = ["peddler", "dealer", "facilitator", "entertainer"] as const;

export default function ImhotepTeamBuilderPage() {
  const [missionId, setMissionId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [buckets, setBuckets] = useState<string[]>(["ART_DIRECTOR", "COPYWRITER"]);
  const [modes, setModes] = useState<string[]>(["facilitator", "entertainer"]);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const composeTeam = trpc.imhotep.composeTeam.useMutation({
    onSuccess: (r) => { setResult(r); setError(null); },
    onError: (e) => { setError(e.message); setResult(null); },
  });

  type Slot = { bucket: string; manipulationMode: string; candidate: { displayName: string; tier: string; matchScore: number; reasons: string[] } };
  const r = result as { composition: Slot[]; cohesionScore: number; warnings: string[] } | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Builder"
        description="IMHOTEP_COMPOSE_TEAM — composer une équipe multi-bucket × manipulation modes pour une campagne ou mission."
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Crew", href: "/console/crew" }, { label: "Team Builder" }]}
      />

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Mission ID (optionnel)</label>
            <input value={missionId} onChange={(e) => setMissionId(e.target.value)} placeholder="wk-mission-bliss-01" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Campaign ID (optionnel)</label>
            <input value={campaignId} onChange={(e) => setCampaignId(e.target.value)} placeholder="wk-campaign-heritage-collection" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground-muted">Buckets (Ctrl+click pour multi-select)</label>
          <select multiple value={buckets} onChange={(e) => setBuckets(Array.from(e.target.selectedOptions).map((o) => o.value))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" size={6}>
            {BUCKETS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground-muted">Manipulation Modes (matchés positionnellement)</label>
          <select multiple value={modes} onChange={(e) => setModes(Array.from(e.target.selectedOptions).map((o) => o.value))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" size={4}>
            {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <button
          onClick={() => composeTeam.mutate({ missionId: missionId || undefined, campaignId: campaignId || undefined, buckets, manipulationModes: modes as never })}
          disabled={(!missionId && !campaignId) || buckets.length === 0 || modes.length === 0 || composeTeam.isPending}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {composeTeam.isPending ? "Composition…" : "Composer l'équipe"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {r && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Composition (cohésion {r.cohesionScore}/100)</h3>
          </div>
          <div className="space-y-2">
            {r.composition.map((slot, i) => (
              <div key={i} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-foreground-muted">{slot.bucket} · {slot.manipulationMode}</div>
                    <div className="text-sm font-semibold mt-1">{slot.candidate.displayName} <span className="ml-2 text-xs text-foreground-muted">{slot.candidate.tier}</span></div>
                  </div>
                  <div className="text-2xl font-bold text-amber-500">{slot.candidate.matchScore}</div>
                </div>
              </div>
            ))}
          </div>
          {r.warnings.length > 0 && (
            <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-200">
              {r.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
