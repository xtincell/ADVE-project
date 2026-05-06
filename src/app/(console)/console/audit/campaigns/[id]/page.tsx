"use client";

/**
 * Console /console/audit/campaigns/[id] — Phase 19 Vague 3, ADR-0052 Cluster G + H.
 *
 * Vue admin **audit** d'une Campaign — agrège :
 *   - Cluster G — Compliance check (par CampaignFieldOp) + credentialsChainSnapshot
 *   - Cluster H — Negative space audit (6 catégories cross-Neteru)
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md §9 + §10
 */

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ScrollText,
  Lock,
  FileSearch,
  Layers,
} from "lucide-react";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; ring: string; Icon: typeof Info }> = {
  CRITICAL: {
    bg: "bg-error/15",
    text: "text-error",
    ring: "ring-red-400/30",
    Icon: AlertCircle,
  },
  WARNING: {
    bg: "bg-amber-400/15",
    text: "text-amber-400",
    ring: "ring-amber-400/30",
    Icon: AlertTriangle,
  },
  INFO: {
    bg: "bg-cyan-400/15",
    text: "text-cyan-400",
    ring: "ring-cyan-400/30",
    Icon: Info,
  },
};

export default function CampaignAuditPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = Array.isArray(id) ? id[0] : id;

  const campaignQuery = trpc.campaign.get.useQuery(
    { id: campaignId ?? "" },
    { enabled: Boolean(campaignId) },
  );

  const strategyId = campaignQuery.data?.strategyId;

  const negativeSpaceQuery = trpc.campaignTracker.auditNegativeSpace.useQuery(
    { strategyId: strategyId ?? "", campaignId: campaignId ?? "" },
    { enabled: Boolean(strategyId && campaignId) },
  );

  if (!campaignId) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Campaign introuvable"
        description="L'identifiant est manquant dans l'URL."
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
  const credSnap = campaign.credentialsChainSnapshot as
    | { snapshotAt: string; connectorIds: string[]; auditHash: string }
    | null;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Audit — ${campaign.name}`}
        description="Vue admin Phase 19 (ADR-0052 §9 + §10). Agrège souveraineté opérationnelle (Cluster G) et negative space audit (Cluster H)."
      />

      {/* ─────────── Cluster G — Souveraineté ─────────── */}
      <section className="space-y-3">
        <header className="flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
          <Lock className="h-4 w-4" />
          <span className="uppercase tracking-wide">Cluster G — Souveraineté opérationnelle</span>
        </header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Credentials chain snapshot */}
          <div className="rounded-lg bg-surface p-4 ring-1 ring-inset ring-border">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">Credentials chain of custody</div>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            {credSnap ? (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-foreground-secondary">
                  Snapshot at <span className="font-mono text-foreground">{new Date(credSnap.snapshotAt).toLocaleString("fr-FR")}</span>
                </div>
                <div className="text-xs text-foreground-secondary">
                  {credSnap.connectorIds.length} ExternalConnector{credSnap.connectorIds.length > 1 ? "s" : ""} référencé
                  {credSnap.connectorIds.length > 1 ? "s" : ""}
                </div>
                <div className="mt-2 break-all rounded bg-surface-secondary px-2 py-1 font-mono text-[10px] text-foreground-secondary">
                  audit hash : {credSnap.auditHash}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-foreground-secondary">
                Pas encore de snapshot. Déclencher <code>SNAPSHOT_CREDENTIALS_CHAIN</code> au passage LIVE.
              </div>
            )}
          </div>

          {/* Compliance check info */}
          <div className="rounded-lg bg-surface p-4 ring-1 ring-inset ring-border">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">Compliance check (par CampaignFieldOp)</div>
              <ShieldAlert className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 text-xs text-foreground-secondary">
              Pré-flight CampaignFieldOp.location → country → règles ARPP/CONAC/ASA.
              Pour vérifier une fieldOp précise, utiliser <code>checkCampaignFieldOpCompliance</code> via tRPC ou
              les pages détail terrain.
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── Cluster H — Negative space ─────────── */}
      <section className="space-y-3">
        <header className="flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
          <FileSearch className="h-4 w-4" />
          <span className="uppercase tracking-wide">Cluster H — Negative space audit</span>
        </header>

        {negativeSpaceQuery.isLoading ? (
          <SkeletonPage />
        ) : negativeSpaceQuery.data?.ok ? (
          <NegativeSpaceFindingsView data={negativeSpaceQuery.data} />
        ) : (
          <div className="rounded-lg bg-error/10 p-4 text-sm text-error">Erreur audit negative space</div>
        )}
      </section>

      <footer className="rounded-lg bg-surface-secondary p-4 text-xs text-foreground-secondary ring-1 ring-inset ring-border">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Layers className="h-4 w-4" />
          Audit cross-Neteru
        </div>
        <p className="mt-2">
          Cette vue agrège les outputs des Intent kinds <code>SNAPSHOT_CREDENTIALS_CHAIN</code>,{" "}
          <code>CHECK_CAMPAIGN_FIELD_OP_COMPLIANCE</code> et <code>AUDIT_CAMPAIGN_NEGATIVE_SPACE</code> — toutes
          gouvernées MESTOR ou ANUBIS et hash-chained dans IntentEmission. La régression non-tracée est impossible
          (voir <code>/console/audit/campaigns/[id]/intent-log</code> pour le log complet — à ship en PR follow-up).
        </p>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-component
// ─────────────────────────────────────────────────────────────────────────

interface NegativeSpaceData {
  campaignId: string;
  findings: ReadonlyArray<{
    category: string;
    severity: string;
    description: string;
    recommendation: string;
    relatedEntityIds: readonly string[];
  }>;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  degradationCodes: readonly string[];
}

function NegativeSpaceFindingsView({ data }: { data: NegativeSpaceData }) {
  return (
    <div className="space-y-3">
      {/* Compteurs */}
      <div className="grid grid-cols-3 gap-3">
        {(["CRITICAL", "WARNING", "INFO"] as const).map((sev) => {
          const style = SEVERITY_STYLES[sev]!;
          const Icon = style.Icon;
          const count =
            sev === "CRITICAL" ? data.criticalCount : sev === "WARNING" ? data.warningCount : data.infoCount;
          return (
            <div
              key={sev}
              className={`flex items-center gap-3 rounded-lg p-4 ring-1 ring-inset ${style.bg} ${style.ring}`}
            >
              <Icon className={`h-5 w-5 ${style.text}`} />
              <div>
                <div className={`text-xs font-medium ${style.text}`}>{sev}</div>
                <div className="text-2xl font-bold tracking-tight text-foreground">{count}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Findings list */}
      {data.findings.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-400/10 p-4 text-sm font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/30">
          <CheckCircle2 className="h-4 w-4" />
          Aucun gap détecté — campagne aligné sur Manifesto + Devotion Ladder + Glory tools.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.findings.map((f, i) => {
            const style = SEVERITY_STYLES[f.severity] ?? SEVERITY_STYLES.INFO!;
            const Icon = style.Icon;
            return (
              <li key={i} className={`rounded-lg p-4 ring-1 ring-inset ${style.bg} ${style.ring}`}>
                <div className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${style.text}`} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <code className={`font-mono text-xs ${style.text}`}>{f.category}</code>
                      <span className={`text-xs uppercase tracking-wide ${style.text}`}>{f.severity}</span>
                    </div>
                    <div className="text-sm text-foreground">{f.description}</div>
                    <div className="text-xs text-foreground-secondary">
                      <span className="font-semibold">Recommandation : </span>
                      {f.recommendation}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Degradation codes */}
      {data.degradationCodes.length > 0 && (
        <div className="rounded-lg bg-surface-secondary p-3 ring-1 ring-inset ring-border">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground-secondary">
            <ScrollText className="h-3.5 w-3.5" />
            Codes de dégradation
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {data.degradationCodes.map((c) => (
              <code key={c} className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                {c}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
