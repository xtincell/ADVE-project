"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { GitPullRequest, Play, Pause, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

const STEP_STATUS_ICON: Record<string, { icon: typeof CheckCircle; color: string }> = {
  COMPLETED: { icon: CheckCircle, color: "text-emerald-400" },
  RUNNING: { icon: Play, color: "text-blue-400" },
  PENDING: { icon: Clock, color: "text-foreground-muted" },
  WAITING: { icon: Pause, color: "text-amber-400" },
  FAILED: { icon: XCircle, color: "text-red-400" },
  SKIPPED: { icon: AlertTriangle, color: "text-foreground-muted" },
};

const AGENT_LABELS: Record<string, string> = {
  PROTOCOLE_R: "Risk",
  PROTOCOLE_T: "Track",
  PROTOCOLE_I: "Innovation",
  PROTOCOLE_S: "Strategy",
  COMMANDANT: "Commandant",
  ARTEMIS_SEQUENCE: "Artemis",
  SCORE: "Score",
  WAIT_HUMAN: "Validation operateur",
  SEED_ADVE: "Seed ADVE",
  SESHAT_ENRICH: "Seshat Enrichment",
  CREATE_CAMPAIGN: "Creation Campagne",
  SPAWN_MISSIONS: "Missions",
  ARTEMIS_SUGGEST: "Suggestion Artemis",
};

export default function MestorPlansPage() {
  const { data: strategies, isLoading } = trpc.strategy.list.useQuery({});

  if (isLoading) return <SkeletonPage />;

  const activeStrategies = (strategies ?? []).filter((s) => s.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans d'Orchestration"
        description="L'Hyperviseur genere des plans DAG — chaque etape a des dependances et un agent executeur"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Mestor", href: "/console/mestor" },
          { label: "Plans" },
        ]}
      />

      {/* Agent types reference */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Agents du plan</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(AGENT_LABELS).map(([key, label]) => (
            <span key={key} className="rounded-md bg-background-overlay px-2 py-1 text-[10px] font-mono text-foreground-muted">
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Per-strategy plan status */}
      <div className="space-y-4">
        {activeStrategies.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <GitPullRequest className="mx-auto mb-3 h-8 w-8 text-foreground-muted" />
            <p className="text-sm text-foreground-muted">Aucune strategie active. Creez un client via L'Oracle pour commencer.</p>
          </div>
        ) : (
          activeStrategies.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{s.name}</h3>
                  <p className="text-xs text-foreground-muted">{s.description}</p>
                </div>
                <span className="rounded-md bg-violet-500/15 px-2 py-1 text-[10px] font-semibold text-violet-300">
                  Aucun plan actif
                </span>
              </div>
              <p className="text-xs text-foreground-muted">
                Utilisez &quot;Build Plan&quot; pour generer un plan d'orchestration. L'Hyperviseur analysera l'etat des piliers et produira un DAG d'etapes.
              </p>
            </div>
          ))
        )}
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Pipeline RTIS</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {["ADVE", "R (Risk)", "T (Track)", "Recos", "Review", "I (Innovation)", "S (Strategy)", "Score"].map((step, i) => (
            <div key={step} className="flex shrink-0 items-center gap-2">
              <div className="rounded-lg bg-background-overlay px-3 py-2 text-xs font-medium text-foreground">
                {step}
              </div>
              {i < 7 && <span className="text-foreground-muted">→</span>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-foreground-muted">
          L'Hyperviseur construit ce pipeline automatiquement. Les etapes WAIT_HUMAN bloquent jusqu'a validation operateur.
        </p>
      </div>
    </div>
  );
}
