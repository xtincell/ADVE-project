"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { StatusBadge } from "@/components/shared/status-badge";
import { Section, EmptyMsg, type CampaignState } from "./shared";
import { ArrowRight, Briefcase, ClipboardList, Layers, ShieldAlert, Sparkles } from "lucide-react";

export function OverviewTab({ campaignId, strategyId, state, onRefresh }: { campaignId: string; strategyId: string; state: CampaignState; onRefresh: () => void }) {
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);

  // Diagnostic campaign-scoped (actions → briefs → missions) — source des stats.
  const chainQuery = trpc.campaignManager.chainHealth.useQuery({ campaignId });
  const transitionsQuery = trpc.campaignManager.availableTransitions.useQuery({ state });
  const briefsQuery = trpc.campaignManager.listBriefs.useQuery({ campaignId });
  const missionsQuery = trpc.campaign.get.useQuery({ id: campaignId });
  const depsQuery = trpc.campaignManager.listDependencies.useQuery({ campaignId });

  const transitionMut = trpc.campaignManager.transition.useMutation({
    onSuccess: () => { setTransitionError(null); onRefresh(); },
    onError: (err) => setTransitionError(err.message),
  });

  const validateBriefMut = trpc.campaignManager.validateBriefAndCreateMission.useMutation({
    onSuccess: () => {
      briefsQuery.refetch();
      missionsQuery.refetch();
      chainQuery.refetch();
      onRefresh();
    },
  });

  const genProd = trpc.campaignManager.generateProductionBrief.useMutation({
    onSuccess: () => {
      briefsQuery.refetch();
      setGeneratingBrief(false);
    },
    onError: (err) => {
      console.error(err);
      setGeneratingBrief(false);
    }
  });

  const chain = chainQuery.data as {
    brandActions: number; actionsWithBrief: number; actionsWithMission: number; brandActionsPending: number;
    actionBriefs: Record<string, { briefId: string; status: string }>;
    explodedActionIds: string[];
    briefs: number; briefsValidated: number; missions: number; campaignActions: number;
  } | null;
  const transitions = (transitionsQuery.data ?? []) as string[];
  const briefs = (briefsQuery.data ?? []) as Array<Record<string, unknown>>;
  const missions = ((missionsQuery.data as Record<string, unknown>)?.missions ?? []) as Array<Record<string, unknown>>;
  const deps = (depsQuery.data ?? []) as Array<Record<string, unknown>>;

  const pendingBriefs = briefs.filter((b) => b.status !== "VALIDATED");

  return (
    <div className="space-y-5">
      {/* Diagnostic de chaîne (campaign-scoped) : actions → briefs → missions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Actions", value: chain?.brandActions ?? 0 },
          { label: "Briefs generes", value: `${chain?.actionsWithBrief ?? 0}/${chain?.brandActions ?? 0}` },
          { label: "Briefs valides", value: chain?.briefsValidated ?? 0 },
          { label: "Missions", value: chain?.missions ?? 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-2xs uppercase text-foreground-muted">{s.label}</p>
            <p className="text-lg font-bold text-white">{String(s.value)}</p>
          </div>
        ))}
      </div>
      {chain && chain.brandActions === 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
          Aucune action strategique liee a cette campagne. Genere les campagnes canon depuis le Pilier S (page Campagnes → « Regenerer »), ou ajoute des actions via La Forge.
        </div>
      )}
      {chain && chain.brandActions > 0 && chain.actionsWithBrief < chain.brandActions && (
        <div className="rounded-lg border border-info/30 bg-info/5 p-3 text-xs text-info">
          {chain.brandActionsPending} action(s) sans brief — onglet « Actions » → « Generer le brief », puis valide le brief (onglet Briefs) pour creer la mission.
        </div>
      )}

      {/* State transitions */}
      <Section title="Transitions d'etat" icon={ArrowRight}>
        {transitions.length === 0 ? (
          <EmptyMsg text="Aucune transition disponible depuis cet etat." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {transitions.map((toState) => (
              <button
                key={toState}
                onClick={() => {
                  setTransitionError(null);
                  transitionMut.mutate({ campaignId, toState: toState as CampaignState });
                }}
                disabled={transitionMut.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-surface-raised disabled:opacity-50"
              >
                <ArrowRight className="h-3 w-3" />
                {toState.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        )}
        {transitionError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-error/50 bg-error/20 p-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-error" />
            <p className="text-xs text-error">{transitionError}</p>
          </div>
        )}
      </Section>

      {/* Missions */}
      <Section
        title={`Missions (${missions.length})`}
        icon={Briefcase}
        action={
          <button
            onClick={() => {
              setGeneratingBrief(true);
              genProd.mutate({ campaignId, strategyId });
            }}
            disabled={generatingBrief}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-raised disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            {generatingBrief ? "Génération..." : "Générer Brief de Mission"}
          </button>
        }
      >
        {pendingBriefs.length > 0 && (
          <div className="mb-4 space-y-2 border-b border-border/50 pb-4">
            <h4 className="text-xs font-semibold text-foreground-muted flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              Briefs de missions à valider ({pendingBriefs.length})
            </h4>
            <div className="space-y-2">
              {pendingBriefs.map((b) => (
                <div key={b.id as string} className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <div>
                    <p className="text-sm font-medium text-white">{b.title as string}</p>
                    <p className="text-2xs text-foreground-muted">Type: {String(b.briefType || b.type || "PRODUCTION")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => validateBriefMut.mutate({ id: b.id as string })}
                      disabled={validateBriefMut.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-foreground-muted hover:bg-foreground disabled:opacity-50"
                    >
                      {validateBriefMut.isPending ? "Validation..." : "Valider & Créer la Mission"}
                    </button>
                    {validateBriefMut.isError && validateBriefMut.variables?.id === b.id && (
                      <p className="text-2xs text-error max-w-[200px] text-right">{validateBriefMut.error.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {missions.length === 0 ? (
          <EmptyMsg text="Aucune mission associee." />
        ) : (
          <div className="space-y-2">
            {missions.map((m) => (
              <div key={m.id as string} className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
                <div className="flex items-center gap-2">
                  {typeof m.priority === "number" && (
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-2xs font-bold ${m.priority <= 1 ? "bg-error/20 text-error" : m.priority <= 3 ? "bg-warning/20 text-warning" : "bg-surface-raised text-foreground-secondary"}`}>
                      {m.priority}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{(m.title as string) || (m.id as string).slice(0, 8)}</p>
                    {!!m.description && <p className="text-xs text-foreground-muted line-clamp-1">{m.description as string}</p>}
                  </div>
                </div>
                <StatusBadge status={m.status as string} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Dependencies */}
      {deps.length > 0 && (
        <Section title="Dependances" icon={Layers}>
          <div className="space-y-1.5">
            {deps.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-foreground-secondary">{(d.type as string) ?? "FINISH_TO_START"}</span>
                <span className="text-white">{(d.targetCampaignId as string)?.slice(0, 8)}...</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
