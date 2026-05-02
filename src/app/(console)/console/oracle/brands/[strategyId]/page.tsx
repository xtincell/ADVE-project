"use client";

import { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { ScoreBadge } from "@/components/shared/score-badge";
import { PillarProgress } from "@/components/shared/pillar-progress";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  buildPillarContentMap,
  PillarContentCard,
} from "@/components/shared/pillar-content-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  PILLAR_NAMES,
  PILLAR_KEYS,
  classifyBrand,
  type PillarKey,
} from "@/lib/types/advertis-vector";
import {
  ArrowLeft,
  Gauge,
  ShieldCheck,
  Tag,
  Crosshair,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Briefcase,
  Zap,
} from "lucide-react";

/* ─── Classification badge colours ─── */
const CLASSIFICATION_MAP: Record<string, string> = {
  ZOMBIE: "bg-surface-raised text-foreground-secondary ring-border/30",
  ORDINAIRE: "bg-yellow-400/15 text-yellow-400 ring-yellow-400/30",
  FORTE: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  CULTE: "bg-purple-400/15 text-purple-400 ring-purple-400/30",
  ICONE: "bg-warning/15 text-warning ring-warning",
};

/* ─── Types for JSON fields ─── */
interface DiagnosticData {
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}

interface BusinessContextData {
  [key: string]: unknown;
}

/* ─── Helpers ─── */
function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/* ─── Page component ─── */
export default function StrategyDetailPage({
  params,
}: {
  params: Promise<{ strategyId: string }>;
}) {
  const { strategyId } = use(params);

  const {
    data: strategy,
    isLoading,
    error,
  } = trpc.strategy.get.useQuery({ id: strategyId });

  /* ─── Loading state ─── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Chargement..."
          breadcrumbs={[
            { label: "Console", href: "/console" },
            { label: "Oracle" },
            { label: "Clients", href: "/console/oracle/clients" },
            { label: "..." },
          ]}
        />
        <SkeletonPage />
      </div>
    );
  }

  /* ─── Error state ─── */
  if (error || !strategy) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Erreur"
          breadcrumbs={[
            { label: "Console", href: "/console" },
            { label: "Oracle" },
            { label: "Clients", href: "/console/oracle/clients" },
          ]}
        />
        <div className="rounded-xl border border-error/50 bg-error/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-error" />
          <p className="mt-2 text-sm text-error">
            Impossible de charger cette strategie.
          </p>
          <Link
            href="/console/oracle/clients"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-foreground-secondary transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux clients
          </Link>
        </div>
      </div>
    );
  }

  /* ─── Derived data ─── */
  const vector = strategy.advertis_vector as Record<string, number> | null;
  const composite = vector
    ? PILLAR_KEYS.reduce((sum, k) => sum + (vector[k] ?? 0), 0)
    : 0;
  const confidence = vector?.confidence ?? null;
  const classification = classifyBrand(composite);

  const pillarContentMap = buildPillarContentMap(
    strategy.pillars as Array<{ key: string; content: unknown }>,
  );

  const diagnostic = (strategy as unknown as { diagnostic?: DiagnosticData })
    .diagnostic ?? null;
  const businessContext = strategy.businessContext as BusinessContextData | null;

  const drivers = strategy.drivers ?? [];

  return (
    <div className="space-y-8">
      {/* ─── Back link ─── */}
      <Link
        href="/console/oracle/clients"
        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux clients
      </Link>

      {/* ─── Header ─── */}
      <PageHeader
        title={strategy.name}
        description={strategy.description ?? undefined}
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Oracle" },
          { label: "Clients", href: "/console/oracle/clients" },
          { label: strategy.name },
        ]}
      >
        <div className="flex items-center gap-3">
          <StatusBadge
            status={classification}
            variantMap={CLASSIFICATION_MAP}
          />
          <StatusBadge status={strategy.status ?? "DRAFT"} />
        </div>
      </PageHeader>

      {/* ─── Radar + Overview ─── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Radar chart */}
        <div className="flex items-center justify-center rounded-xl border border-border bg-background/60 p-6">
          {vector ? (
            <AdvertisRadar
              scores={vector as Partial<Record<PillarKey, number>>}
              size="lg"
              drillDownBasePath={`/console/oracle/clients/${strategyId}`}
            />
          ) : (
            <div className="py-16 text-center text-sm text-foreground-muted">
              Aucun vecteur ADVE-RTIS disponible
            </div>
          )}
        </div>

        {/* Key metrics + pillar progress */}
        <div className="space-y-6">
          {/* Composite score + metrics row */}
          <div className="flex items-start gap-6">
            <ScoreBadge score={composite} size="lg" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-foreground-muted" />
                <span className="text-xs text-foreground-muted">Composite</span>
                <span className="ml-auto text-sm font-semibold text-white">
                  {composite.toFixed(0)} / 200
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-foreground-muted" />
                <span className="text-xs text-foreground-muted">Confiance</span>
                <span className="ml-auto text-sm font-semibold text-white">
                  {confidence !== null
                    ? `${(confidence * 100).toFixed(0)}%`
                    : "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-foreground-muted" />
                <span className="text-xs text-foreground-muted">Classification</span>
                <span className="ml-auto">
                  <StatusBadge
                    status={classification}
                    variantMap={CLASSIFICATION_MAP}
                  />
                </span>
              </div>
            </div>
          </div>

          {/* Pillar progress bars */}
          {vector && (
            <PillarProgress
              scores={vector as Partial<Record<PillarKey, number>>}
            />
          )}
        </div>
      </section>

      {/* ─── 8 Pillar Cards ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">
          Profil ADVE-RTIS complet
        </h2>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {PILLAR_KEYS.map((key) => {
            const pillar = (
              strategy.pillars as Array<{
                key: string;
                confidence: number | null;
              }>
            )?.find((p) => p.key === key);
            const content = pillarContentMap[key] ?? {};
            const pillarScore = vector?.[key] ?? undefined;
            const pillarConfidence = pillar?.confidence ?? null;

            return (
              <div key={key} id={`pillar-${key}`}>
                <PillarContentCard
                  pillarKey={key as PillarKey}
                  content={content}
                  score={pillarScore}
                  variant="full"
                />
                {pillarConfidence !== null && (
                  <div className="mt-1 px-5 text-[10px] text-foreground-muted">
                    Confiance : {(pillarConfidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Diagnostic (from quick intake) ─── */}
      {diagnostic && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Diagnostic rapide
          </h2>
          <div className="rounded-xl border border-border bg-background/60 p-6 space-y-5">
            {diagnostic.summary && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                  Resume
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  {diagnostic.summary}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Strengths */}
              {diagnostic.strengths && diagnostic.strengths.length > 0 && (
                <div className="rounded-lg border border-success/40 bg-success/15 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-xs font-semibold text-success">
                      Forces
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {diagnostic.strengths.map((s, i) => (
                      <li
                        key={i}
                        className="text-xs leading-relaxed text-foreground-secondary"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {diagnostic.weaknesses && diagnostic.weaknesses.length > 0 && (
                <div className="rounded-lg border border-error/40 bg-error/15 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-error" />
                    <span className="text-xs font-semibold text-error">
                      Faiblesses
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {diagnostic.weaknesses.map((w, i) => (
                      <li
                        key={i}
                        className="text-xs leading-relaxed text-foreground-secondary"
                      >
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {diagnostic.recommendations &&
                diagnostic.recommendations.length > 0 && (
                  <div className="rounded-lg border border-warning/40 bg-warning/15 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-warning" />
                      <span className="text-xs font-semibold text-warning">
                        Recommandations
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {diagnostic.recommendations.map((r, i) => (
                        <li
                          key={i}
                          className="text-xs leading-relaxed text-foreground-secondary"
                        >
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        </section>
      )}

      {/* ─── Drivers ─── */}
      {drivers.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Drivers ({drivers.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drivers.map((driver) => (
              <div
                key={driver.id}
                className="rounded-xl border border-border bg-background/60 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium text-white">
                      {driver.name}
                    </span>
                  </div>
                  <StatusBadge status={driver.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-foreground-muted">
                  <span>{driver.channel}</span>
                  <span className="text-foreground-muted">|</span>
                  <span>{driver.channelType}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Business Context ─── */}
      {businessContext && Object.keys(businessContext).length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Contexte business
          </h2>
          <div className="rounded-xl border border-border bg-background/60 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Object.entries(businessContext).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-background/40 p-3">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
                    {formatLabel(key)}
                  </p>
                  {Array.isArray(value) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(value as string[]).map((item, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-background px-2.5 py-0.5 text-xs text-foreground-secondary"
                        >
                          {String(item)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-foreground">
                      {String(value ?? "-")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Meta ─── */}
      <section className="border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-foreground-muted">
          <span>
            <Briefcase className="mr-1 inline h-3.5 w-3.5" />
            Piliers: {strategy.pillars?.length ?? 0}
          </span>
          <span>
            Campagnes: {strategy.campaigns?.length ?? 0}
          </span>
          <span>
            Assets: {strategy.brandAssets?.length ?? 0}
          </span>
          {strategy.createdAt && (
            <span>
              Cree le{" "}
              {new Date(strategy.createdAt).toLocaleDateString("fr-FR")}
            </span>
          )}
          {strategy.updatedAt && (
            <span>
              Mis a jour le{" "}
              {new Date(strategy.updatedAt).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
