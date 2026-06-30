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
    bg: "bg-success/15",
    text: "text-success",
    ring: "ring-success/30",
    Icon: CheckCircle2,
  },
  WARN_AT_BURN_RATE: {
    bg: "bg-warning/15",
    text: "text-warning",
    ring: "ring-warning/30",
    Icon: AlertTriangle,
  },
  DENIED: {
    bg: "bg-error/15",
    text: "text-error",
    ring: "ring-error/30",
    Icon: Flame,
  },
};

const FUEL_STATE_LABELS: Record<string, string> = {
  ALLOWED: "Sous contrôle",
  WARN_AT_BURN_RATE: "Vigilance",
  DENIED: "Budget critique",
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
  if (delta > 0) return "text-success";
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
        title="Campagne introuvable"
        description="L'identifiant de campagne est manquant dans l'URL."
      />
    );
  }

  if (campaignQuery.isLoading) return <SkeletonPage />;
  if (!campaignQuery.data) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Campagne introuvable"
        description="Aucune campagne trouvée pour cet identifiant."
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
        title={`${campaign.name} — Trajectoire`}
        description="Impact de cette campagne sur la trajectoire et la cohérence de votre marque."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Campagnes", href: "/cockpit/operate/campaigns" },
          { label: campaign.name, href: `/cockpit/operate/campaigns/${campaignId}` },
          { label: "Trajectoire" },
        ]}
      />

      {campaign.killTriggeredAt && (
        <div className="flex items-center gap-3 rounded-lg bg-error/10 p-4 ring-1 ring-inset ring-error/30">
          <PauseCircle className="h-5 w-5 text-error" />
          <div>
            <div className="text-sm font-semibold text-error">Campagne en pause — budget épuisé</div>
            <div className="text-xs text-error/70">
              Mise en pause le {new Date(campaign.killTriggeredAt).toLocaleString("fr-FR")}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────── Cluster A ─────────────────────── */}
      <section className="space-y-3">
        <header className="flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
          <Compass className="h-4 w-4" />
          <span className="uppercase tracking-wide">Trajectoire de la marque</span>
        </header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Tier delta */}
          <Card title="Évolution du palier" subtitle="Avant → après campagne">
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
                  <span className="text-xs text-foreground-secondary">points de maturité</span>
                </div>
                {campaign.altitudeRegression && (
                  <div className="rounded bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                    Régression détectée — un pilier a baissé pendant la campagne
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-foreground-secondary">
                Pas encore de mesure — la campagne n'est pas encore lancée
              </div>
            )}
          </Card>

          {/* Fuel burn rate */}
          <Card title="Consommation du budget" subtitle="Budget vs temps">
            {fuelQuery.isLoading ? (
              <div className="text-sm text-foreground-secondary">Chargement…</div>
            ) : fuelQuery.data?.ok ? (
              <FuelDisplay data={fuelQuery.data} />
            ) : (
              <div className="text-sm text-foreground-secondary">Données insuffisantes</div>
            )}
          </Card>

          {/* Regret-window */}
          <Card title="Fenêtre de vigilance" subtitle="J+3 / J+7 / J+14">
            {fuelQuery.data?.ok && fuelQuery.data.regretWindowFlag ? (
              <div className="flex items-center gap-2 text-sm font-medium text-warning">
                <AlertTriangle className="h-4 w-4" />
                Vigilance active — comparez les résultats aux objectifs
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Hors fenêtre de vigilance
              </div>
            )}
            <div className="mt-1 text-xs text-foreground-secondary">
              Temps écoulé : {pct(fuelQuery.data?.ok ? fuelQuery.data.timeRatio : null, 1)}
            </div>
          </Card>
        </div>
      </section>

      {/* ─────────────────────── Cluster B ─────────────────────── */}
      <section className="space-y-3">
        <header className="flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
          <Target className="h-4 w-4" />
          <span className="uppercase tracking-wide">Cohérence de la marque</span>
        </header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Cult index delta */}
          <Card title="Évolution de l'attachement" subtitle="Avant → après campagne">
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
              <div className="text-sm text-foreground-secondary">Mesure non disponible</div>
            )}
          </Card>

          {/* Cultural debt */}
          <Card title="Écart à la promesse" subtitle="Promesse ↔ actions">
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
                {/* codes de diagnostic internes — non exposés au client */}
              </div>
            ) : (
              <div className="text-sm text-foreground-secondary">—</div>
            )}
          </Card>

          {/* Myth arc */}
          <Card title="Continuité du récit" subtitle="Entre vos campagnes">
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
                {/* seuil de continuité interne — non exposé au client */}
              </div>
            ) : (
              <div className="text-sm text-foreground-secondary">
                Historique insuffisant (au moins 2 campagnes requises)
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
          La trajectoire de votre marque ne se mesure pas dans les KPIs marketing classiques (impressions,
          conversions, ROAS). Elle se mesure dans <strong>la production de prescripteurs</strong>, le{" "}
          <strong>déplacement de l'axe culturel sectoriel</strong>, et la <strong>cohérence du culte</strong>. Cette
          vue agrège les indicateurs L2 Instrumental qui répondent à <em>"cette campagne renforce-t-elle ou dilue-t-elle
          la marque iconique en construction ?"</em>.
        </p>
        {/* note de roadmap interne retirée de la vue client */}
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
        {subtitle && <div className="text-2xs text-foreground-secondary">{subtitle}</div>}
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
        {FUEL_STATE_LABELS[data.state] ?? data.state}
      </div>
      <div className="text-xs text-foreground-secondary">
        Conso : <span className="font-mono text-foreground">{pct(data.burnRatio)}</span> / Temps :{" "}
        <span className="font-mono text-foreground">{pct(data.timeRatio)}</span>
        {data.revenuePacing !== null && (
          <>
            {" "}/ Rythme revenus : <span className="font-mono text-foreground">{data.revenuePacing.toFixed(2)}×</span>
          </>
        )}
      </div>
      <p className="text-2xs text-foreground-secondary">{data.recommendation}</p>
    </div>
  );
}
