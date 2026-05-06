"use client";

/**
 * Console /console/governance/campaign-tracker — Phase 19, ADR-0052.
 *
 * Vue admin du registry des sous-clusters Vague 1 (Cluster A + B) du module
 * campaign-tracker. Expose pour chaque sous-cluster :
 *   - Capability state 4-états (READY / PARTIAL / STUB / DISABLED) — primitive #1 ADR-0052 §2.5
 *   - Lifecycle (STUB / MVP / PRODUCTION) — primitive #2 ADR-0052 §2.5
 *   - Description + codes de dégradation
 *   - ADR enfant éventuel (promotion MVP → PRODUCTION)
 *
 * Source : `trpc.campaignTracker.listClusterCapabilities` (read-only registry).
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 */

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { CheckCircle2, AlertTriangle, MinusCircle, XCircle, FileText, Layers } from "lucide-react";

const STATE_STYLES: Record<string, { bg: string; text: string; ring: string; Icon: typeof CheckCircle2; label: string }> = {
  READY: {
    bg: "bg-emerald-400/15",
    text: "text-emerald-400",
    ring: "ring-emerald-400/30",
    Icon: CheckCircle2,
    label: "READY",
  },
  PARTIAL: {
    bg: "bg-amber-400/15",
    text: "text-amber-400",
    ring: "ring-amber-400/30",
    Icon: AlertTriangle,
    label: "PARTIAL",
  },
  STUB: {
    bg: "bg-zinc-400/15",
    text: "text-foreground-secondary",
    ring: "ring-zinc-400/30",
    Icon: MinusCircle,
    label: "STUB",
  },
  DISABLED: {
    bg: "bg-error/10",
    text: "text-error",
    ring: "ring-red-400/30",
    Icon: XCircle,
    label: "DISABLED",
  },
};

const LIFECYCLE_STYLES: Record<string, string> = {
  STUB: "bg-zinc-500/10 text-foreground-secondary",
  MVP: "bg-cyan-400/15 text-cyan-400",
  PRODUCTION: "bg-emerald-400/15 text-emerald-400",
};

const CLUSTER_LABELS: Record<string, string> = {
  A: "Trajectoire & altitude",
  B: "Cohérence narrative",
  C: "Superfan economy",
  D: "Signaux faibles & culture",
  E: "Boucles d'apprentissage",
  F: "Économie agence",
  G: "Souveraineté opérationnelle",
  H: "Negative space",
};

export default function CampaignTrackerGovernancePage() {
  const { data, isLoading } = trpc.campaignTracker.listClusterCapabilities.useQuery();

  if (isLoading) return <SkeletonPage />;

  const caps = data?.capabilities ?? [];
  type Cap = (typeof caps)[number];
  const byCluster = caps.reduce<Record<string, Cap[]>>((acc, c) => {
    (acc[c.cluster] ??= []).push(c);
    return acc;
  }, {});

  const counts = {
    READY: caps.filter((c) => c.state === "READY").length,
    PARTIAL: caps.filter((c) => c.state === "PARTIAL").length,
    STUB: caps.filter((c) => c.state === "STUB").length,
    DISABLED: caps.filter((c) => c.state === "DISABLED").length,
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Campaign Tracker — Capability Registry"
        description="Vue admin Phase 19 (ADR-0052) — registry des sous-clusters L2 Instrumental, leur état runtime (READY/PARTIAL/STUB/DISABLED) et leur lifecycle (STUB/MVP/PRODUCTION). Cf. ADR-0052 §2.5 trois primitives architecturales."
      />

      {/* Synthèse compteurs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["READY", "PARTIAL", "STUB", "DISABLED"] as const).map((state) => {
          const style = STATE_STYLES[state]!;
          const Icon = style.Icon;
          return (
            <div
              key={state}
              className={`flex items-center gap-3 rounded-lg p-4 ring-1 ring-inset ${style.bg} ${style.ring}`}
            >
              <Icon className={`h-5 w-5 ${style.text}`} />
              <div>
                <div className={`text-xs font-medium ${style.text}`}>{style.label}</div>
                <div className="text-2xl font-bold tracking-tight text-foreground">{counts[state]}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Détail par cluster */}
      {Object.keys(byCluster)
        .sort()
        .map((clusterLetter) => {
          const clusterCaps = byCluster[clusterLetter]!;
          return (
            <section key={clusterLetter} className="space-y-3">
              <header className="flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
                <Layers className="h-4 w-4" />
                <span className="font-mono uppercase">Cluster {clusterLetter}</span>
                <span className="text-foreground">{CLUSTER_LABELS[clusterLetter] ?? "?"}</span>
                <span className="text-foreground-secondary">— {clusterCaps.length} sous-cluster{clusterCaps.length > 1 ? "s" : ""}</span>
              </header>

              <div className="overflow-hidden rounded-lg ring-1 ring-inset ring-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-secondary text-xs uppercase tracking-wide text-foreground-secondary">
                    <tr>
                      <th className="px-4 py-2 text-left">Sous-cluster</th>
                      <th className="px-4 py-2 text-left">État</th>
                      <th className="px-4 py-2 text-left">Lifecycle</th>
                      <th className="px-4 py-2 text-left">Description</th>
                      <th className="px-4 py-2 text-left">Codes dégradation</th>
                      <th className="px-4 py-2 text-left">ADR enfant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {clusterCaps.map((c) => {
                      const stateStyle = STATE_STYLES[c.state] ?? STATE_STYLES.STUB!;
                      const StateIcon = stateStyle.Icon;
                      return (
                        <tr key={c.slug} className="bg-surface align-top">
                          <td className="px-4 py-3 font-mono text-xs text-foreground">{c.slug}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${stateStyle.bg} ${stateStyle.text} ${stateStyle.ring}`}
                            >
                              <StateIcon className="h-3 w-3" />
                              {stateStyle.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-xs font-semibold ${LIFECYCLE_STYLES[c.lifecycle] ?? LIFECYCLE_STYLES.STUB}`}
                            >
                              {c.lifecycle}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-foreground-secondary">{c.description}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {c.degradationCodes.map((code) => (
                                <code
                                  key={code}
                                  className="rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] text-foreground-secondary"
                                >
                                  {code}
                                </code>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {c.childAdr ? (
                              <span className="inline-flex items-center gap-1 text-cyan-400">
                                <FileText className="h-3 w-3" />
                                <code className="font-mono">{c.childAdr}</code>
                              </span>
                            ) : (
                              <span className="text-foreground-secondary">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

      {/* Footer doc */}
      <footer className="rounded-lg bg-surface-secondary p-4 text-xs text-foreground-secondary ring-1 ring-inset ring-border">
        <div className="font-semibold text-foreground">Comment lire cette page</div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>READY</strong> : toutes deps disponibles, sous-cluster pleinement fonctionnel.
          </li>
          <li>
            <strong>PARTIAL</strong> : deps partielles. Output flagué <code>INCOMPLETE_DATA</code>. L1 jamais bloqué.
          </li>
          <li>
            <strong>STUB</strong> : retour <code>DEFERRED_AWAITING_DEPS</code> (pattern Anubis Credentials Vault, ADR-0021).
          </li>
          <li>
            <strong>DISABLED</strong> : opt-out opérateur. L1 continue identiquement.
          </li>
        </ul>
        <div className="mt-3">
          Cf.{" "}
          <a
            className="text-cyan-400 underline"
            href="/docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md"
          >
            ADR-0052 v2 §2.5 trois primitives architecturales
          </a>
        </div>
      </footer>
    </div>
  );
}
