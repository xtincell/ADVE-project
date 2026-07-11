"use client";

import { PILLAR_STORAGE_KEYS } from "@/domain";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { DevotionLadder } from "@/components/shared/devotion-ladder";
import { MissionCard } from "@/components/shared/mission-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage, SkeletonCard } from "@/components/shared/loading-skeleton";
import { Timeline } from "@/components/shared/timeline";
import { Sparkline } from "@/components/shared/sparkline";
import { PipelineProgress, buildPipelineSteps } from "@/components/shared/pipeline-progress";
import { AiBadge } from "@/components/shared/ai-badge";
import { useStrategy } from "@/components/cockpit/strategy-context";
import { useCanOperate } from "@/components/cockpit/use-can-operate";
import { OvertonTeaser } from "@/components/cockpit/intelligence/overton-panel";
import { buildPillarContentMap } from "@/components/shared/pillar-content-card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Rocket,
  AlertTriangle,
  Eye,
  Fingerprint,
  Target,
  Lightbulb,
  Users,
  TrendingUp,
  Crown,
  Heart,
  Brain,
  ArrowRight,
  Sparkles,
  Zap,
  Database,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import { Tooltip } from "@/components/primitives/tooltip";

/** Safely render a value that might be nested object/array */
function safeString(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.length > 0 ? `${val.length} elements` : "";
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    // Cherche un libellé lisible avant tout fallback. Le canon utilise des clés
    // variées (valeur/customName/titre…) — sans ça les pills affichaient
    // "(3 champs)" au lieu du contenu.
    const keys = ["customName", "name", "nom", "titre", "title", "label", "libelle", "valeur", "value", "intitule", "action", "texte", "text"];
    for (const k of keys) {
      if (typeof obj[k] === "string" && obj[k] !== "") return obj[k] as string;
    }
    // Fallback : première valeur texte non vide (jamais "(N champs)" si du texte existe).
    const firstStr = Object.values(obj).find((v) => typeof v === "string" && v.length > 0);
    if (typeof firstStr === "string") return firstStr;
    return `(${Object.keys(obj).length} champs)`;
  }
  return String(val);
}

type ViewMode = "EXECUTIVE" | "MARKETING" | "FOUNDER" | "MINIMAL";

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  EXECUTIVE: "Executive",
  MARKETING: "Marketing",
  FOUNDER: "Founder",
  MINIMAL: "Minimal",
};

export default function CockpitDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("MARKETING");
  const { strategyId, isLoading: strategiesLoading } = useStrategy();
  const router = useRouter();

  const strategyQuery = trpc.strategy.getWithScore.useQuery(
    { id: strategyId! },
    { enabled: !!strategyId },
  );

  const devotionQuery = trpc.devotionLadder.getByStrategy.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  const missionsQuery = trpc.mission.list.useQuery(
    { strategyId: strategyId!, limit: 5 },
    { enabled: !!strategyId },
  );

  const signalsQuery = trpc.signal.list.useQuery(
    { strategyId: strategyId!, limit: 8 },
    { enabled: !!strategyId },
  );

  const scoreHistoryQuery = trpc.analytics.getScoreHistory.useQuery(
    { strategyId: strategyId!, limit: 8 },
    { enabled: !!strategyId },
  );

  const campaignsQuery = trpc.campaign.list.useQuery(
    { strategyId: strategyId ?? undefined },
    { enabled: !!strategyId },
  );

  const superfanCountQuery = trpc.superfan.count.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  const superfanVelocityQuery = trpc.superfan.velocity.useQuery(
    { strategyId: strategyId!, days: 30 },
    { enabled: !!strategyId },
  );

  const cultIndexQuery = trpc.cultIndex.trend.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  const mestorInsightsQuery = trpc.mestor.getInsights.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId, staleTime: 5 * 60_000 },
  );

  if (!strategyId && strategiesLoading) {
    return <SkeletonPage />;
  }

  if (!strategyId) {
    // Loaded, but the founder has no brand yet → onboarding CTA instead of an
    // infinite skeleton (this was a first-run dead-end).
    return (
      <div className="ck-dash">
        <EmptyState
          icon={Rocket}
          title="Créez votre première marque"
          description="Lancez votre première fiche de marque pour activer votre cockpit : fondation, recommandations, livrables et campagnes."
          action={{ label: "Créer ma marque", onClick: () => router.push("/cockpit/new") }}
        />
      </div>
    );
  }

  if (strategyQuery.isLoading) {
    return <SkeletonPage />;
  }

  if (strategyQuery.error) {
    return (
      <div className="ck-dash">
        <h1 className="ck-ph__title">Tableau de bord</h1>
        <div className="rounded-xl border border-destructive-subtle bg-destructive-subtle/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm text-destructive">
            Erreur de chargement : {strategyQuery.error.message}
          </p>
          <button
            onClick={() => strategyQuery.refetch()}
            className="mt-3 rounded-lg bg-background-overlay px-4 py-2 text-sm text-foreground hover:bg-border"
          >
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  const strategy = strategyQuery.data;
  const vector = (strategy?.advertis_vector as Record<string, number>) ?? {};
  const scores: Partial<Record<PillarKey, number>> = {
    a: vector.a ?? 0, d: vector.d ?? 0, v: vector.v ?? 0, e: vector.e ?? 0,
    r: vector.r ?? 0, t: vector.t ?? 0, i: vector.i ?? 0, s: vector.s ?? 0,
  };
  const composite = strategy?.composite ?? 0;
  const cultIndex = Math.round(composite / 2);

  const devotion = devotionQuery.data;
  // Honnêteté des données (canon : ne jamais inventer de données) — aucune
  // distribution fabriquée tant qu'il n'y a pas de donnée réelle de communauté.
  const hasDevotion = devotion != null;
  const devotionValues = {
    spectateur: devotion?.spectateur ?? 0,
    interesse: devotion?.interesse ?? 0,
    participant: devotion?.participant ?? 0,
    engage: devotion?.engage ?? 0,
    ambassadeur: devotion?.ambassadeur ?? 0,
    evangeliste: devotion?.evangeliste ?? 0,
  };

  const missions = missionsQuery.data ?? [];
  const activeMissions = missions.filter((m) => m.status === "IN_PROGRESS" || m.status === "DRAFT");
  const activeCampaigns = (campaignsQuery.data ?? []).filter((c) => c.status === "ACTIVE");
  const signals = signalsQuery.data ?? [];
  const alertSignals = signals.filter((s) => s.type === "DRIFT_ALERT" || s.type === "INTERVENTION_REQUEST");

  const timelineEvents = signals.slice(0, 6).map((s) => {
    const data = s.data as Record<string, unknown> | null;
    return {
      date: (s.createdAt as unknown as string) ?? new Date().toISOString(),
      title: (data?.title as string) ?? s.type,
      description: (data?.description as string) ?? undefined,
      type: s.type === "DRIFT_ALERT" ? ("warning" as const) : s.type === "INTERVENTION_REQUEST" ? ("error" as const) : ("info" as const),
    };
  });

  // Build sparkline from real ScoreSnapshot history (oldest to newest)
  const snapshots = scoreHistoryQuery.data ?? [];
  const sortedSnapshots = [...snapshots].reverse(); // API returns desc, we need asc for sparkline
  const scoreTrend = sortedSnapshots.map((s) => {
    const vec = s.advertis_vector as Record<string, number> | null;
    return vec
      ? [...PILLAR_STORAGE_KEYS].reduce((sum, k) => sum + (vec[k] ?? 0), 0)
      : 0;
  });
  const cultTrend = scoreTrend.map((s) => Math.round(s / 2));

  // Brand content from pillars (field names match Zod schemas: pillar-schemas.ts)
  const pillarContentMap = buildPillarContentMap(
    (strategy as Record<string, unknown> & { pillars?: Array<{ key: string; content: unknown }> })?.pillars,
  );
  const authContent = pillarContentMap["a"];   // A: noyauIdentitaire, prophecy, valeurs, archetype...
  const distContent = pillarContentMap["d"];   // D: positionnement, promesseMaitre, tonDeVoix...
  const valeurContent = pillarContentMap["v"]; // V: produitsCatalogue, unitEconomics...
  const engageContent = pillarContentMap["e"]; // E: rituels, touchpoints, kpis...

  // Extract key qualitative text per pillar — values, not scores
  function getPillarHeadline(key: string): string {
    const c = pillarContentMap[key.toLowerCase()];
    if (!c) return "";
    switch (key.toLowerCase()) {
      case "a": return safeString(c.prophecy) || safeString(c.noyauIdentitaire) || "";
      case "d": return safeString(c.promesseMaitre) || safeString(c.positionnement) || "";
      case "v": {
        const cat = c.produitsCatalogue;
        if (Array.isArray(cat) && cat.length > 0) {
          const first = cat[0] as Record<string, unknown>;
          return safeString(first?.nom) || safeString(first?.categorie) || "";
        }
        return "";
      }
      case "e": {
        const tp = c.touchpoints;
        if (Array.isArray(tp) && tp.length > 0) {
          const first = tp[0] as Record<string, unknown>;
          return safeString(first?.canal) || safeString(first?.role) || "";
        }
        const rit = c.rituels;
        if (Array.isArray(rit) && rit.length > 0) {
          const first = rit[0] as Record<string, unknown>;
          return safeString(first?.nom) || safeString(first?.description) || "";
        }
        return "";
      }
      case "r": {
        const swot = c.globalSwot as Record<string, unknown> | undefined;
        if (swot) {
          const strengths = swot.strengths;
          if (Array.isArray(strengths) && strengths.length > 0) return safeString(strengths[0]);
        }
        const miti = c.mitigationPriorities;
        if (Array.isArray(miti) && miti.length > 0) return safeString((miti[0] as Record<string, unknown>)?.action) || "";
        return "";
      }
      case "t": {
        const tri = c.triangulation as Record<string, unknown> | undefined;
        return safeString(tri?.trendAnalysis)?.substring(0, 120) || "";
      }
      case "i": return safeString(c.syntheseExecutive)?.substring(0, 120) || "";
      case "s": return safeString(c.visionStrategique)?.substring(0, 120) || safeString(c.syntheseExecutive)?.substring(0, 120) || "";
      default: return "";
    }
  }

  // Find weakest/strongest RTIS pillars (ADVE is qualitative, focus scoring on RTIS)
  const pillarEntries = Object.entries(scores) as [PillarKey, number][];
  const weakestPillar = pillarEntries.reduce((min, [k, v]) => (v < min[1] ? [k, v] : min), pillarEntries[0]!);
  const strongestPillar = pillarEntries.reduce((max, [k, v]) => (v > max[1] ? [k, v] : max), pillarEntries[0]!);

  const showSection = (section: "kpi" | "radar" | "devotion" | "prescriptions" | "missions" | "timeline") => {
    switch (viewMode) {
      case "EXECUTIVE": return ["kpi", "devotion", "prescriptions"].includes(section);
      case "MARKETING": return true;
      case "FOUNDER": return ["kpi", "radar", "prescriptions"].includes(section);
      case "MINIMAL": return ["prescriptions", "missions"].includes(section);
    }
  };

  return (
    <div className="ck-dash">
      <div className="ck-dash__mobile-note"><Eye />Le cockpit est optimisé pour grand écran — basculez sur desktop pour la sidebar complète.</div>

      {/* Header + view modes */}
      <div className="ck-ph">
        <div>
          <p className="ck-ph__bc">Cockpit / Dashboard</p>
          <h1 className="ck-ph__title">Tableau de bord</h1>
          <p className="ck-ph__desc">Marque : <span className="em">{strategy?.name ?? "…"}</span></p>
        </div>
        <div className="ck-views">
          {(Object.keys(VIEW_MODE_LABELS) as ViewMode[]).map((mode) => (
            <button key={mode} data-on={viewMode === mode ? 1 : 0} onClick={() => setViewMode(mode)}>{VIEW_MODE_LABELS[mode]}</button>
          ))}
        </div>
      </div>

      {/* ── Batch Actions Bar ──────────────────────────────────── */}
      <BatchActionsBar strategyId={strategyId} />

      {/* Brand Story Hero */}
      <div className="ck-grid ck-grid--hero">
        {/* Identité & Positionnement */}
        <div className="ck-id">
          <p className="ck-id__eyebrow"><Fingerprint />Identité de marque</p>
          {authContent?.noyauIdentitaire || authContent?.prophecy ? (
            <p className="ck-id__noyau">{safeString(authContent.noyauIdentitaire || authContent.prophecy)}</p>
          ) : (
            <p className="ck-id__noyau" style={{ fontStyle: "italic", color: "var(--text-muted)", fontSize: 14 }}>Noyau identitaire non défini — remplissez le pilier A (Authenticité)</p>
          )}
          {!!distContent?.positionnement && (
            <p className="ck-id__row"><span className="k">Positionnement :</span> {safeString(distContent.positionnement)}</p>
          )}
          {!!distContent?.promesseMaitre && (
            <p className="ck-id__promise">« {safeString(distContent.promesseMaitre)} »</p>
          )}
          {!!authContent?.valeurs && Array.isArray(authContent.valeurs) && (
            <div className="ck-id__values">
              {(authContent.valeurs as Array<Record<string, unknown>>).slice(0, 6).map((v, i) => (
                <span className="ck-val" key={i}>{safeString(v.customName || v.value || v)}</span>
              ))}
            </div>
          )}
        </div>

        {/* Focus Stratégique */}
        <div className="ck-focus">
          <p className="ck-focus__eyebrow"><Target />Focus stratégique</p>
          <div className="ck-focus__blocks">
            <div>
              <p className="ck-focus__k">Force principale</p>
              <p className="ck-focus__v up">{strongestPillar[0].toUpperCase()} — {PILLAR_NAMES[strongestPillar[0]]}</p>
              {getPillarHeadline(strongestPillar[0])
                ? <p className="ck-focus__d">{getPillarHeadline(strongestPillar[0])}</p>
                : <p className="ck-focus__d">{strongestPillar[1].toFixed(1)}/25</p>}
            </div>
            <div>
              <p className="ck-focus__k">Priorité d&apos;amélioration</p>
              <p className="ck-focus__v down">{weakestPillar[0].toUpperCase()} — {PILLAR_NAMES[weakestPillar[0]]}</p>
              {getPillarHeadline(weakestPillar[0])
                ? <p className="ck-focus__d">{getPillarHeadline(weakestPillar[0])}</p>
                : <p className="ck-focus__d" style={{ fontStyle: "italic" }}>Contenu à remplir</p>}
            </div>
            <div className="ck-focus__tip">
              <Lightbulb />
              <p>Renforcer {PILLAR_NAMES[weakestPillar[0]]} pour convertir plus de superfans et débloquer le prochain palier.</p>
            </div>
          </div>
        </div>
      </div>

      {/* NORTHSTAR + KPIs */}
      {showSection("kpi") && (
        <>
          <div className="ck-north">
            <div className="ck-north__grid">
              <div className="ck-north__lead">
                <span className="ck-north__crown"><Crown /></span>
                <div>
                  <p className="ck-north__k">Northstar</p>
                  <div className="ck-north__big">
                    <span className="ck-north__n">{superfanCountQuery.data?.active ?? "—"}</span>
                    <span className="ck-north__lbl">superfans actifs</span>
                  </div>
                </div>
              </div>
              <div className="ck-north__stats">
                <div className="ck-north__stat"><p className="sk">Évangélistes</p><p className="sv gold">{superfanCountQuery.data?.evangelistes ?? 0}</p></div>
                <div className="ck-north__stat"><p className="sk">Ratio superfan</p><p className="sv accent">{superfanCountQuery.data?.ratio ?? 0}%</p></div>
                <div className="ck-north__stat"><p className="sk">Vélocité /30j</p><p className={`sv ${superfanVelocityQuery.data?.trend === "up" ? "up" : ""}`}>
                  {superfanVelocityQuery.data?.trend === "up" && <TrendingUp />}
                  {superfanVelocityQuery.data?.delta != null ? `${superfanVelocityQuery.data.delta > 0 ? "+" : ""}${superfanVelocityQuery.data.delta}` : "—"}
                </p></div>
                <div className="ck-north__stat"><p className="sk">Total profils</p><p className="sv">{superfanCountQuery.data?.total ?? 0}</p></div>
              </div>
            </div>
          </div>

          {/* KPI grid */}
          <div className="ck-grid ck-grid--kpi">
            <div className="ck-kpi">
              <div className="ck-kpi__top"><span className="ck-kpi__lbl">Indice d'attachement</span><span className="ck-kpi__spark"><Sparkline data={cultTrend} width={60} height={20} /></span></div>
              <p className="ck-kpi__val">{cultIndexQuery.data?.current ?? cultIndex}<span className="m">/100</span></p>
              {(() => {
                const d = cultIndexQuery.data?.delta ?? 0;
                return d !== 0 ? <span className={`ck-kpi__delta ${d > 0 ? "up" : ""}`}><TrendingUp />{d > 0 ? "+" : ""}{d} ce mois</span> : null;
              })()}
            </div>
            <div className="ck-kpi">
              <div className="ck-kpi__top"><span className="ck-kpi__lbl">Missions actives</span><Rocket className="h-4 w-4 text-accent" /></div>
              <p className="ck-kpi__val">{activeMissions.length}</p>
              <span className="ck-kpi__delta">{activeCampaigns.length} campagne{activeCampaigns.length > 1 ? "s" : ""}</span>
            </div>
            <div className="ck-kpi">
              <div className="ck-kpi__top"><span className="ck-kpi__lbl">Alertes</span><AlertTriangle className="h-4 w-4 text-warning" /></div>
              <p className="ck-kpi__val">{alertSignals.length}</p>
              <span className="ck-kpi__delta">{alertSignals.length} prescription{alertSignals.length > 1 ? "s" : ""}</span>
            </div>
            <div className="ck-kpi">
              <div className="ck-kpi__top"><span className="ck-kpi__lbl">Score ADVE-RTIS</span><span className="ck-kpi__spark"><Sparkline data={scoreTrend} width={60} height={20} /></span></div>
              <p className="ck-kpi__val">{Math.round(composite)}<span className="m">/200</span></p>
            </div>
          </div>
        </>
      )}

      {/* Pipeline + Devotion */}
      {(showSection("radar") || showSection("devotion")) && (
        <div className="ck-grid ck-grid--2">
          {showSection("radar") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="ck-card">
                <div className="ck-card__head">
                  <h3 className="ck-card__t">Pipeline de transformation</h3>
                  <Link href="/cockpit/insights/diagnostics" className="ck-card__link">Voir le radar →</Link>
                </div>
                <PipelineProgress steps={buildPipelineSteps(scores, {})} />
              </div>
              <Link href="/cockpit/brand/proposition" className="ck-oracle">
                <span className="ck-oracle__ic"><Brain /></span>
                <span className="ck-oracle__t"><b>L&apos;Oracle</b><span>Proposition stratégique vivante</span></span>
                <ArrowRight className="ck-oracle__arr" />
              </Link>
              <OvertonTeaser />
            </div>
          )}

          {showSection("devotion") && (
            <div className="ck-card">
              <div className="ck-card__head">
                <h3 className="ck-card__t">Échelle d'engagement</h3>
                <span className="ck-card__sub"><Heart />{superfanCountQuery.data?.active ?? 0} superfans actifs</span>
              </div>
              {devotionQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-6 animate-[shimmer_2s_linear_infinite] rounded-full bg-surface-overlay" />
                  ))}
                </div>
              ) : hasDevotion ? (
                <DevotionLadder {...devotionValues} variant="pyramid" />
              ) : (
                <p className="ck-presc__empty">Pas encore de données de communauté — l&apos;échelle d&apos;engagement apparaîtra dès les premières interactions mesurées.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Prescriptions Mestor */}
      {showSection("prescriptions") && (
        <div className="ck-presc">
          <div className="ck-presc__head"><Brain /><h3>Recommandations</h3><AiBadge /></div>
          {mestorInsightsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-[shimmer_2s_linear_infinite] rounded-lg bg-surface-overlay" />
              ))}
            </div>
          ) : (mestorInsightsQuery.data ?? []).length > 0 ? (
            <div className="ck-presc__list">
              {(mestorInsightsQuery.data ?? []).slice(0, 4).map((insight: { type: string; severity: string; title: string; description: string; suggestedAction?: string }, i: number) => (
                <div className="ck-presc__item" key={i}>
                  <span className="ck-presc__sev" data-s={insight.severity} />
                  <div className="ck-presc__b">
                    <div className="ck-presc__row1">
                      <span className="ck-presc__type">{insight.type}</span>
                      <span className="ck-presc__title">{insight.title}</span>
                    </div>
                    <p className="ck-presc__desc">{insight.description}</p>
                    {insight.suggestedAction && <p className="ck-presc__action">→ {insight.suggestedAction}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : alertSignals.length > 0 ? (
            <div className="ck-presc__list">
              {alertSignals.slice(0, 3).map((signal, i) => {
                const data = signal.data as Record<string, unknown> | null;
                return (
                  <div className="ck-presc__item" key={signal.id ?? i}>
                    <span className="ck-presc__sev" data-s="HIGH" />
                    <div className="ck-presc__b">
                      <span className="ck-presc__title">{(data?.title as string) ?? signal.type}</span>
                      {!!data?.description && <p className="ck-presc__desc">{safeString(data.description)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="ck-presc__empty">Aucune recommandation active — l'assistant surveille votre marque.</p>
          )}
        </div>
      )}

      {/* Missions + Timeline */}
      {(showSection("missions") || showSection("timeline")) && (
        <div className="ck-grid ck-grid--2">
          {showSection("missions") && (
            <div className="ck-card">
              <div className="ck-card__head">
                <h3 className="ck-card__t">Missions récentes</h3>
                <a href="/cockpit/operate/missions" className="ck-card__link">Voir tout →</a>
              </div>
              {missionsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : missions.length === 0 ? (
                <EmptyState icon={Rocket} title="Aucune mission" description="Les missions apparaitront ici une fois creees." />
              ) : (
                <div className="space-y-3">
                  {missions.slice(0, 4).map((m) => (
                    <MissionCard
                      key={m.id}
                      mission={{
                        title: m.title,
                        status: m.status,
                        deadline: (m.advertis_vector as Record<string, unknown>)?.deadline as string | undefined,
                        driverChannel: m.driver?.channel,
                        assignee: m.driver?.name,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {showSection("timeline") && (
            <div className="ck-card">
              <div className="ck-card__head"><h3 className="ck-card__t">Activité récente</h3></div>
              {signalsQuery.isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-8 w-8 animate-pulse rounded-full bg-surface-overlay" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-overlay" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-overlay" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : timelineEvents.length === 0 ? (
                <EmptyState icon={Activity} title="Aucune activite" description="L'activite recente apparaitra ici." />
              ) : (
                <Timeline events={timelineEvents} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Batch Actions Bar ────────────────────────────────────────────────────

function BatchActionsBar({ strategyId }: { strategyId: string }) {
  const utils = trpc.useUtils();
  // Gestes opérateur (enrichissement batch, cascade, sources) — jamais
  // rendus au founder : UX-DR16 + fin du clic→FORBIDDEN (audit [M02-01]).
  const canOperate = useCanOperate();

  const autoFillAll = trpc.pillar.autoFillAll.useMutation({
    onSuccess: () => {
      utils.pillar.get.invalidate();
      utils.pillar.assess.invalidate();
      utils.strategy.getWithScore.invalidate();
    },
  });

  const cascadeRTIS = trpc.pillar.cascadeRTIS.useMutation({
    onSuccess: () => {
      utils.pillar.get.invalidate();
      utils.pillar.assess.invalidate();
      utils.strategy.getWithScore.invalidate();
    },
  });

  const enrichAll = trpc.pillar.enrichAllFromVault.useMutation({
    onSuccess: () => {
      utils.pillar.get.invalidate();
      utils.pillar.assess.invalidate();
    },
  });

  const anyLoading = autoFillAll.isPending || cascadeRTIS.isPending || enrichAll.isPending;

  if (!canOperate) return null;

  return (
    <div className="ck-batch">
      <span className="ck-batch__lbl">Actions</span>

      <Tooltip
        multiline
        side="bottom"
        content={
          <span className="block">
            <strong className="block text-2xs font-bold text-accent">Enrichir ADVE</strong>
            <span className="mt-0.5 block text-2xs leading-snug">
              Auto-remplit les 4 piliers fondateurs (Authenticité, Distinction, Valeur, Engagement) via vault de documents, calculs déductifs, puis IA pour les champs restants. Ne touche pas les piliers dérivés.
            </span>
          </span>
        }
      >
        <button className="ck-chip ck-chip--accent" onClick={() => autoFillAll.mutate({ strategyId })} disabled={anyLoading}>
          {autoFillAll.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles />}
          Enrichir ADVE
        </button>
      </Tooltip>

      <Tooltip
        multiline
        side="bottom"
        content={
          <span className="block">
            <strong className="block text-2xs font-bold text-info">Lancer R + T</strong>
            <span className="mt-0.5 block text-2xs leading-snug">
              Déclenche l'analyse stratégique (Risque, Marché) puis génère des recommandations pour enrichir votre fondation de marque. Requiert une fondation au moins enrichie.
            </span>
          </span>
        }
      >
        <button className="ck-chip ck-chip--info" onClick={() => cascadeRTIS.mutate({ strategyId, updateADVE: true })} disabled={anyLoading}>
          {cascadeRTIS.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap />}
          Lancer R+T
        </button>
      </Tooltip>

      <Tooltip
        multiline
        side="bottom"
        content={
          <span className="block">
            <strong className="block text-2xs font-bold text-foreground">Enrichir depuis Sources</strong>
            <span className="mt-0.5 block text-2xs leading-snug">
              Scanne vos sources (PDF, sites web, briefs ingérés) pour générer des recommandations granulaires sur tous les piliers. Les recommandations en attente apparaissent dans le panneau Recommandations pour validation.
            </span>
          </span>
        }
      >
        <button className="ck-chip ck-chip--muted" onClick={() => enrichAll.mutate({ strategyId })} disabled={anyLoading}>
          {enrichAll.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database />}
          Sources
        </button>
      </Tooltip>

      {(autoFillAll.isSuccess || cascadeRTIS.isSuccess || enrichAll.isSuccess) && (
        <span className="ck-batch__done"><CheckCircle /> Terminé</span>
      )}
    </div>
  );
}
