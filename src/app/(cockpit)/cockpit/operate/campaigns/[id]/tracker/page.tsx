"use client";

/**
 * Cockpit /cockpit/operate/campaigns/[id]/tracker — Phase 19, ADR-0052 Vague 1.
 *
 * Vue founder L2 Instrumental d'une Campaign — agrège les 3 sous-clusters
 * shippés Vague 1 dans un dashboard unifié :
 *
 *   Cluster A — Trajectoire & altitude :
 *     - Tier brand snapshot (au lancement) + tier final + delta
 *     - Fuel burn rate live (gauge + recommendation)
 *     - Flame-out kill state (si triggered)
 *     - Regret-window flag
 *
 *   Cluster B — Cohérence narrative :
 *     - Cult Index delta pré → post
 *     - Cultural debt score
 *     - Manipulation drift count (CampaignAction divergent)
 *     - Myth arc cohesion (chronologie inter-campagne Strategy)
 *
 * Source : 4 procedures campaignTracker (read-only queries).
 * Pattern aligné `/cockpit/operate/campaigns/[id]/page.tsx`.
 */

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { AlertCircle } from "lucide-react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Compass,
  Target,
  PauseCircle,
} from "lucide-react";

const FUEL_STATE_STYLES: Record<string, { bg: string; text: string; ring: string; Icon: typeof CheckCircle2 }> = {
  ALLOWED: {
    bg: "bg-emerald-400/15",
    text: "text-emerald-400",
    ring: "ring-emerald-400/30",
    Icon: CheckCircle2,
  },
  WARN_AT_BURN_RATE: {
    bg: "bg-amber-400/15",
    text: "text-amber-400",
    ring: "ring-amber-400/30",
    Icon: AlertTriangle,
  },
  DENIED: {
    bg: "bg-error/15",
    text: "text-error",
    ring: "ring-red-400/30",
    Icon: Flame,
  },
};

function pct(n: number | null | undefined, fractionDigits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(fractionDigits)}%`;
}

function score01(n: number | null | undefined, fractionDigits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(fractionDigits);
}

function deltaIcon(delta: number | null) {
  if (delta === null) return Minus;
  if (delta > 0) return TrendingUp;
  if (delta < 0) return TrendingDown;
  return Minus;
}

function deltaColor(delta: number | null): string {
  if (delta === null) return "text-foreground-secondary";
  if (delta > 0) return "text-emerald-400";
  if (delta < 0) return "text-error";
  return "text-foreground-secondary";
}

export default function CampaignTrackerPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = Array.isArray(id) ? id[0] : id;

  // 1. Campaign meta (pour récupérer strategyId + snapshots persistés).
  const campaignQuery = trpc.campaign.get.useQuery(
    { id: campaignId ?? "" },
    { enabled: Boolean(campaignId) },
  );

  const strategyId = campaignQuery.data?.strategyId;

  // 2. Cluster A — fuel burn rate (live).
  const fuelQuery = trpc.campaignTracker.checkFuelBurnRate.useQuery(
    { strategyId: strategyId ?? "", campaignId: campaignId ?? "" },
    { enabled: Boolean(strategyId && campaignId) },
  );

  // 3. Cluster B — cultural debt (agrège bigIdeaCoherenceScore).
  const debtQuery = trpc.campaignTracker.recomputeCulturalDebt.useQuery(
    { strategyId: strategyId ?? "", campaignId: campaignId ?? "" },
    { enabled: Boolean(strategyId && campaignId) },
  );

  // 4. Cluster B — myth arc cohesion (chronologie Strategy).
  const mythQuery = trpc.campaignTracker.evaluateMythArcCohesion.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: Boolean(strategyId) },
  );

  if (!campaignId) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Campaign introuvable"
        description="L'identifiant de campagne est manquant dans l'URL."
      />
    );
  }

  if (campaignQuery.isLoading) return <SkeletonPage />;
  if (!campaignQuery.data) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Campaign introuvable"
        description={`Aucune Campaign avec l'id ${campaignId}`}
      />
    );
  }

  const campaign = campaignQuery.data;
  const tierSnap = campaign.tierBrandSnapshot as { tier?: string; compositeScore?: number } | null;
  const tierFinal = campaign.tierBrandFinal as { tier?: string; compositeScore?: number } | null;
  const tierDelta =
    tierSnap?.compositeScore && tierFinal?.compositeScore
      ? tierFinal.compositeScore - tierSnap.compositeScore
      : null;
  const cultPre = campaign.cultIndexSnapshotPre as { score?: number; tier?: string } | null;
  const cultPost = campaign.cultIndexSnapshotPost as { score?: number; tier?: string } | null;
  const cultDelta = cultPre?.score && cultPost?.score ? cultPost.score - cultPre.score : null;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`${campaign.name} — Trajectory tracker`}
        description="Vue L2 Instrumental Phase 19 (ADR-0052 v2). Agrège trajectoire APOGEE (Cluster A) + cohérence narrative (Cluster B)."
      />

      {campaign.killTriggeredAt && (
        <div className="flex items-center gap-3 rounded-lg bg-error/10 p-4 ring-1 ring-inset ring-red-400/30">
          <PauseCircle className="h-5 w-5 text-error" />
          <div>
            <div className="text-sm font-semibold text-error">Campaign paused — flame-out détecté</div>
            <div className="text-xs text-error/70">
              Triggered at {new Date(campaign.killTriggeredAt).toLocaleString("fr-FR")} (THOT_PAUSE_CAMPAIGN_FLAME_OUT)
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────── Cluster A ─────────────────────── */}
      <section className="space-y-3">
        <header className="flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
          <Compass className="h-4 w-4" />
          <span className="uppercase tracking-wide">Cluster A — Trajectoire & altitude</span>
        </header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Tier delta */}
          <Card title="Tier brand delta" subtitle="Loi 1 conservation altitude">
            {tierSnap?.tier ? (
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-foreground-secondary">{tierSnap.tier}</span>
                  <span className="text-foreground-secondary">→</span>
                  <span className="font-mono text-xs text-foreground">{tierFinal?.tier ?? "(en cours)"}</span>
                </div>
                <div className={`flex items-baseline gap-1.5 ${deltaColor(tierDelta)}`}>
                  {(() => {
                    const Icon = deltaIcon(tierDelta);
                    return <Icon className="h-4 w-4" />;
                  })()}
                  <span className="text-2xl font-bold tracking-tight">
                    {tierDelta !== null ? (tierDelta > 0 ? "+" : "") + tierDelta.toFixed(1) : "—"}
                  </span>
                  <span className="text-xs text-foreground-secondary">composite delta</span>
                </div>
                {campaign.altitudeRegression && (
                  <div className="rounded bg-amber-400/10 px-2 py-1 text-xs font-medium text-amber-400">
                    LAW_1_SILENT_REGRESSION détecté — un pillar a régressé silencieusement
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-foreground-secondary">
                Pas de snapshot — Campaign pas encore LIVE ou snapshot manquant
              </div>
            )}
          </Card>

          {/* Fuel burn rate */}
          <Card title="Fuel burn rate" subtitle="Loi 3 — Thot">
            {fuelQuery.isLoading ? (
              <div className="text-sm text-foreground-secondary">Chargement…</div>
            ) : fuelQuery.data?.ok ? (
              <FuelDisplay data={fuelQuery.data} />
            ) : (
              <div className="text-sm text-foreground-secondary">Insuffisant données</div>
            )}
          </Card>

          {/* Regret-window */}
          <Card title="Regret-window" subtitle="J+3 / J+7 / J+14 — Seshat">
            {fuelQuery.data?.ok && fuelQuery.data.regretWindowFlag ? (
              <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Window active — vérifier KPIs vs targets
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Hors fenêtre regret
              </div>
            )}
            <div className="mt-1 text-xs text-foreground-secondary">
              Time elapsed : {pct(fuelQuery.data?.ok ? fuelQuery.data.timeRatio : null, 1)}
            </div>
          </Card>
        </div>
      </section>

      {/* ─────────────────────── Cluster B ─────────────────────── */}
      <section className="space-y-3">
        <header className="flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
          <Target className="h-4 w-4" />
          <span className="uppercase tracking-wide">Cluster B — Cohérence narrative</span>
        </header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Cult index delta */}
          <Card title="Cult Index delta" subtitle="Pré-LIVE → Post-Campaign">
            {cultPre?.score ? (
              <div className="space-y-1">
                <div className="flex items-baseline gap-2 text-xs text-foreground-secondary">
                  <span>{score01(cultPre.score)}</span>
                  <span>→</span>
                  <span>{cultPost?.score ? score01(cultPost.score) : "(en cours)"}</span>
                </div>
                <div className={`flex items-baseline gap-1.5 ${deltaColor(cultDelta)}`}>
                  {(() => {
                    const Icon = deltaIcon(cultDelta);
                    return <Icon className="h-4 w-4" />;
                  })()}
                  <span className="text-2xl font-bold tracking-tight">
                    {cultDelta !== null ? (cultDelta > 0 ? "+" : "") + cultDelta.toFixed(2) : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-foreground-secondary">Snapshot manquant (null-honest, ADR-0046)</div>
            )}
          </Card>

          {/* Cultural debt */}
          <Card title="Cultural debt" subtitle="Gap Manifesto ↔ actions">
            {debtQuery.isLoading ? (
              <div className="text-sm text-foreground-secondary">Chargement…</div>
            ) : debtQuery.data?.ok ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {score01(debtQuery.data.culturalDebtScore)}
                </div>
                <div className="text-xs text-foreground-secondary">
                  {debtQuery.data.actionsSampled} action{debtQuery.data.actionsSampled > 1 ? "s" : ""} échantillonnée
                  {debtQuery.data.actionsSampled > 1 ? "s" : ""}
                </div>
                {debtQuery.data.degradationCodes.map((code) => (
                  <code
                    key={code}
                    className="mt-1 inline-block rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-400"
                  >
                    {code}
                  </code>
                ))}
              </div>
            ) : (
              <div className="text-sm text-foreground-secondary">—</div>
            )}
          </Card>

          {/* Myth arc */}
          <Card title="Myth arc continuity" subtitle="Cohérence inter-campagne Strategy">
            {mythQuery.isLoading ? (
              <div className="text-sm text-foreground-secondary">Chargement…</div>
            ) : mythQuery.data?.ok && mythQuery.data.globalContinuityScore !== null ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {score01(mythQuery.data.globalContinuityScore)}
                </div>
                <div className="text-xs text-foreground-secondary">
                  {mythQuery.data.pairs.length} paire{mythQuery.data.pairs.length > 1 ? "s" : ""} de chapitres
                </div>
                <div className="text-[11px] text-foreground-secondary">
                  Seuil continuité : 0.18 (Jaccard MVP)
                </div>
              </div>
            ) : (
              <div className="text-sm text-foreground-secondary">
                Insuffisant historique (≥2 campagnes requis)
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Footer info */}
      <footer className="rounded-lg bg-surface-secondary p-4 text-xs text-foreground-secondary ring-1 ring-inset ring-border">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Layers className="h-4 w-4" />
          Pourquoi cette page existe ?
        </div>
        <p className="mt-2">
          La trajectoire APOGEE de votre marque ne se mesure pas dans les KPIs marketing classiques (impressions,
          conversions, ROAS). Elle se mesure dans <strong>la production de prescripteurs</strong>, le{" "}
          <strong>déplacement de l'axe culturel sectoriel</strong>, et la <strong>cohérence du culte</strong>. Cette
          vue agrège les indicateurs L2 Instrumental qui répondent à <em>"cette campagne renforce-t-elle ou dilue-t-elle
          la marque iconique en construction ?"</em>.
        </p>
        <p className="mt-2 text-[11px]">
          Vague 1 = Cluster A + B en mode MVP (Jaccard heuristic). Vagues 2 + 3 ajouteront superfan economy, signaux
          faibles culturels, économie agence et negative space audit.
        </p>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-surface p-4 ring-1 ring-inset ring-border">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {subtitle && <div className="text-[11px] text-foreground-secondary">{subtitle}</div>}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function FuelDisplay({
  data,
}: {
  data: {
    state: string;
    burnRatio: number;
    timeRatio: number;
    revenuePacing: number | null;
    recommendation: string;
  };
}) {
  const style = FUEL_STATE_STYLES[data.state] ?? FUEL_STATE_STYLES.ALLOWED!;
  const Icon = style.Icon;
  return (
    <div className="space-y-2">
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style.bg} ${style.text} ${style.ring}`}
      >
        <Icon className="h-3 w-3" />
        {data.state}
      </div>
      <div className="text-xs text-foreground-secondary">
        Burn : <span className="font-mono text-foreground">{pct(data.burnRatio)}</span> / Time :{" "}
        <span className="font-mono text-foreground">{pct(data.timeRatio)}</span>
        {data.revenuePacing !== null && (
          <>
            {" "}/ Revenue pacing : <span className="font-mono text-foreground">{data.revenuePacing.toFixed(2)}×</span>
          </>
        )}
      </div>
      <p className="text-[11px] text-foreground-secondary">{data.recommendation}</p>
    </div>
  );
}
