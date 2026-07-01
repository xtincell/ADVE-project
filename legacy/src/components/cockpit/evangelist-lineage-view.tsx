"use client";

/**
 * Cockpit — Evangelist Lineage View (Phase 23 Epic 4 Story 4.7, FR10 + UX-DR8).
 *
 * Read-only founder surface mounted on `/cockpit/insights/attribution`. Shows
 * the **observed** Ambassador → Evangelist transitions a campaign produced —
 * concrete superfan-accumulation evidence, not a vanity counter.
 *
 * Design constraints (the 3 DS prohibitions apply here — this lives under
 * `src/components/**`) : semantic design tokens only, no raw zinc/violet
 * classes, KPI + empty states reuse the shared `StatCard` / `EmptyState`
 * primitives. Founder copy translates the internal attribution alphabet
 * (Curious / Convinced / Ambassador / Evangelist) to French rungs and never
 * leaks internal terms ("regression", "ROC AUC", "sub-cluster", raw score) —
 * the founder sees the lineage + the count, not the calibration internals.
 *
 * Reads via `campaignTracker.getFounderAttributionLineage` (paid-tier gated,
 * FR32). On `TIER_GATE_DENIED` it renders an upgrade CTA ; on
 * `INSUFFICIENT_DATA` the honest "accumulation en cours" state.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, GitBranch, Lock, Users, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";

/** Internal attribution alphabet → founder-facing French rungs (no jargon leak). */
const RUNG_LABEL_FR: Record<string, string> = {
  Curious: "Curieux",
  Convinced: "Convaincu",
  Ambassador: "Ambassadeur",
  Evangelist: "Prescripteur",
};

function LineagePanel({ strategyId, campaignId }: { strategyId: string; campaignId: string }) {
  const { data, isLoading } = trpc.campaignTracker.getFounderAttributionLineage.useQuery(
    { strategyId, campaignId },
    { enabled: !!strategyId && !!campaignId },
  );
  const router = useRouter();

  if (isLoading || !data) {
    return (
      <div className="rounded-xl border border-border bg-background/40 px-6 py-12 text-center text-sm text-foreground-secondary">
        Chargement de la lignée…
      </div>
    );
  }

  if (data.state === "TIER_GATE_DENIED") {
    return (
      <EmptyState
        icon={Lock}
        title="Lignée prescripteur — réservée aux abonnements"
        description="Visualisez quelles campagnes transforment vos fans en ambassadeurs et prescripteurs en activant votre abonnement."
        action={{ label: "Découvrir les formules", onClick: () => router.push(data.configureUrl) }}
      />
    );
  }

  if (data.state === "TENANT_MISMATCH") {
    return (
      <EmptyState
        icon={Sparkles}
        title="Lignée prescripteur"
        description="Cette campagne n'est pas rattachée à votre marque."
      />
    );
  }

  if (data.state === "INSUFFICIENT_DATA") {
    return (
      <EmptyState
        icon={Sparkles}
        title="Lignée prescripteur — accumulation en cours"
        description="Pas encore assez de transitions observées sur cette campagne pour révéler la lignée. Continuez à activer votre communauté : chaque ambassadeur compte."
      />
    );
  }

  // OK arm — count metric + dated transition timeline. No raw score for the founder.
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="Prescripteurs générés"
          value={data.evangelistCount}
          trend={data.evangelistCount > 0 ? "up" : "flat"}
          trendValue="par cette campagne"
          icon={Users}
        />
        <StatCard
          title="Transitions observées"
          value={data.lineage.length}
          trend="flat"
          trendValue="vers ambassadeur / prescripteur"
          icon={GitBranch}
        />
      </div>

      {data.lineage.length === 0 ? (
        <p className="text-sm text-foreground-secondary">
          Aucune transition vers ambassadeur ou prescripteur observée pour le moment.
        </p>
      ) : (
        <ol className="space-y-2">
          {data.lineage.map((t, i) => (
            <li
              key={`${t.transitionFrom}-${t.transitionTo}-${t.observedAt}-${i}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-background/80 p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                <GitBranch className="h-4 w-4 text-accent" />
              </div>
              <span className="text-sm text-foreground">
                {RUNG_LABEL_FR[t.transitionFrom] ?? t.transitionFrom}
                <span className="mx-1.5 text-foreground-muted">→</span>
                {RUNG_LABEL_FR[t.transitionTo] ?? t.transitionTo}
              </span>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-foreground-muted">
                <Calendar className="h-3 w-3" />
                {new Date(t.observedAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function EvangelistLineageView() {
  const strategyId = useCurrentStrategyId();
  const [campaignId, setCampaignId] = useState<string>("");

  const campaignsQuery = trpc.campaign.list.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );
  const campaigns = campaignsQuery.data ?? [];

  // Auto-select the most recent campaign once loaded, so the founder lands on
  // content rather than an empty picker.
  useEffect(() => {
    if (!campaignId && campaigns.length > 0) {
      setCampaignId(campaigns[0]!.id);
    }
  }, [campaignId, campaigns]);

  if (!strategyId) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Sparkles className="h-5 w-5 text-accent" />
            Lignée prescripteur
          </h2>
          <p className="mt-0.5 text-sm text-foreground-secondary">
            Les fans que cette campagne a fait monter au rang d&apos;ambassadeur ou de prescripteur.
          </p>
        </div>
        {campaigns.length > 0 && (
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {campaignsQuery.isLoading ? (
        <div className="rounded-xl border border-border bg-background/40 px-6 py-12 text-center text-sm text-foreground-secondary">
          Chargement des campagnes…
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Lignée prescripteur — accumulation en cours"
          description="Lancez une campagne pour commencer à transformer vos fans en prescripteurs."
        />
      ) : campaignId ? (
        <LineagePanel strategyId={strategyId} campaignId={campaignId} />
      ) : null}
    </section>
  );
}
