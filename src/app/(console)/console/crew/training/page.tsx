"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";

export default function ImhotepTrainingPage() {
  const [talentProfileId, setTalentProfileId] = useState("");
  const enabled = talentProfileId.length > 0;
  const { data, isLoading, error } = trpc.imhotep.recommendTraining.useQuery(
    { talentProfileId },
    { enabled },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training Recos"
        description="IMHOTEP_RECOMMEND_TRAINING — cours Académie suggérés selon les gaps des dernières reviews + spécialité."
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Crew", href: "/console/crew" }, { label: "Training" }]}
      />

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground-muted">TalentProfile ID</label>
          <input value={talentProfileId} onChange={(e) => setTalentProfileId(e.target.value)} placeholder="wk-talent-creator-..." className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
        {isLoading && <p className="text-sm text-foreground-muted">Chargement…</p>}
        {error && <p className="text-sm text-red-500">{error.message}</p>}
      </div>

      {data && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold">Recommendations</h3>
          <div className="space-y-2">
            {data.recommendations.map((r) => (
              <div key={r.courseId} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{r.courseTitle}</div>
                    <div className="text-xs text-foreground-muted mt-1">{r.reason}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-amber-500">+{r.expectedScoreLift.toFixed(2)}</div>
                    <div className="text-xs text-foreground-muted">score lift</div>
                  </div>
                </div>
                {r.pillarFocus && <div className="mt-2 inline-block rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500">pillar {r.pillarFocus}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
