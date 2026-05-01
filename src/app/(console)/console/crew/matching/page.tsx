"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { ImhotepMatchCard } from "@/components/neteru/imhotep-match-card";

export default function ImhotepMatchingPage() {
  const [missionId, setMissionId] = useState("");
  const [topN, setTopN] = useState(5);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const matchCreator = trpc.imhotep.matchCreator.useMutation({
    onSuccess: (r) => { setResult(r); setError(null); },
    onError: (e) => { setError(e.message); setResult(null); },
  });

  type Cand = { talentProfileId: string; userId: string; displayName: string; tier: string; matchScore: number; devotionInSector: number; manipulationFit: boolean; reasons: string[] };
  const r = result as { missionId: string; candidates: Cand[]; rationale: string } | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matching Creator"
        description="IMHOTEP_MATCH_CREATOR — top-N candidats pondérés devotion-potential pour une mission donnée."
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Crew", href: "/console/crew" }, { label: "Matching" }]}
      />

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Mission ID</label>
            <input value={missionId} onChange={(e) => setMissionId(e.target.value)} placeholder="wk-mission-bliss-01" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-muted">Top N</label>
            <input type="number" min={1} max={20} value={topN} onChange={(e) => setTopN(parseInt(e.target.value, 10) || 5)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <button
          onClick={() => matchCreator.mutate({ missionId, topN })}
          disabled={!missionId || matchCreator.isPending}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {matchCreator.isPending ? "Matching…" : "Matcher"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {r && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-sm text-foreground-muted">{r.rationale}</p>
          <div className="space-y-2">
            {r.candidates.map((c) => (
              <ImhotepMatchCard
                key={c.talentProfileId}
                displayName={c.displayName}
                tier={c.tier}
                matchScore={c.matchScore}
                devotionInSector={c.devotionInSector}
                manipulationFit={c.manipulationFit}
                reasons={c.reasons}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
