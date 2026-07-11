"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { Section, MiniBtn, EmptyMsg } from "./shared";
import { CheckCircle, Layers, Plus, Zap } from "lucide-react";

export function ActionsTab({ campaignId }: { campaignId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [newAction, setNewAction] = useState({ actionTypeSlug: "", name: "", budget: "" });
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  // ── PRIMAIRE : actions stratégiques (BrandAction, ADR-0094/0119) ──
  const brandActionsQuery = trpc.campaignManager.listBrandActions.useQuery({ campaignId });
  const generateBriefMut = trpc.campaignManager.generateBriefFromAction.useMutation({
    onSuccess: () => {
      utils.campaignManager.listBrandActions.invalidate({ campaignId });
      utils.campaignManager.chainHealth.invalidate({ campaignId });
      utils.campaign.get.invalidate({ id: campaignId });
      utils.campaignManager.listBriefs.invalidate({ campaignId });
      setGeneratingId(null);
    },
    onError: () => setGeneratingId(null),
  });
  const brandActions = (brandActionsQuery.data ?? []) as Array<Record<string, unknown>>;

  // Pipeline staged : action → brief (état via chainHealth.actionBriefs) →
  // [validation onglet Briefs] → mission (chainHealth.explodedActionIds).
  const chainQuery = trpc.campaignManager.chainHealth.useQuery({ campaignId });
  const chainData = chainQuery.data as
    | { actionBriefs?: Record<string, { briefId: string; status: string }>; explodedActionIds?: string[] }
    | undefined;
  const actionBriefs = chainData?.actionBriefs ?? {};
  const missionSet = new Set(chainData?.explodedActionIds ?? []);

  // ── SECONDAIRE : plan média / exécution (CampaignAction ATL/BTL/TTL) ──
  const actionsQuery = trpc.campaignManager.listActions.useQuery({ campaignId, category: filter === "ALL" ? undefined : filter as any });
  const typesQuery = trpc.campaignManager.getActionTypes.useQuery({ category: filter === "ALL" ? undefined : filter as any });
  const createMut = trpc.campaignManager.createAction.useMutation({
    onSuccess: () => { actionsQuery.refetch(); setShowCreate(false); setNewAction({ actionTypeSlug: "", name: "", budget: "" }); },
  });

  const actions = (actionsQuery.data ?? []) as unknown as Array<Record<string, unknown>>;
  const actionTypes = (typesQuery.data ?? []) as unknown as Array<Record<string, unknown>>;

  const PRIORITY_COLORS: Record<string, string> = {
    P0: "bg-error/20 text-error", P1: "bg-warning/20 text-warning",
    P2: "bg-info/15 text-info", P3: "bg-surface-raised text-foreground-secondary",
  };

  return (
    <div className="space-y-6">
      {/* ── PRIMAIRE : Actions stratégiques (BrandAction) ── */}
      <Section title={`Actions strategiques (${brandActions.length})`} icon={Zap}>
        <p className="-mt-2 mb-3 text-xs text-foreground-muted">
          Issues du Pilier S/I, rattachées à cette campagne. « Générer le brief » dérive un brief de production déterministe de l&apos;action (éditable). On le valide ensuite dans l&apos;onglet Briefs pour créer la mission.
        </p>
        {brandActionsQuery.isLoading ? (
          <EmptyMsg text="Chargement..." />
        ) : brandActions.length === 0 ? (
          <EmptyState icon={Zap} title="Aucune action strategique liee" description="La validation de la direction creative (Proposition Creative) rattachera les actions de production a ce frame canon, ou cree des actions via La Forge." />
        ) : (
          <div className="space-y-2">
            {brandActions.map((a) => {
              const id = a.id as string;
              const status = (a.status as string) ?? "PROPOSED";
              const brief = actionBriefs[id];
              const hasMission = missionSet.has(id);
              const budget = (a.budgetMax ?? a.budgetMin) as number | null;
              return (
                <div key={id} className="rounded-lg border border-border bg-background/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!!a.priority && <span className={`rounded px-1.5 py-0.5 text-2xs font-bold ${PRIORITY_COLORS[a.priority as string] ?? ""}`}>{a.priority as string}</span>}
                        <h4 className="text-sm font-medium text-white">{a.title as string}</h4>
                      </div>
                      {!!a.description && <p className="mt-1 text-xs text-foreground-muted line-clamp-2">{a.description as string}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-foreground-muted">
                        {!!a.touchpoint && <span className="rounded bg-white/5 px-1.5 py-0.5">{a.touchpoint as string}</span>}
                        {!!a.aarrrIntent && <span className="rounded bg-accent/15 px-1.5 py-0.5 text-accent">{a.aarrrIntent as string}</span>}
                        {!!budget && <span>{budget.toLocaleString("fr-FR")} {(a.budgetCurrency as string) ?? "XAF"}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusBadge status={status} />
                      {hasMission ? (
                        <span className="flex items-center gap-1 text-2xs text-success"><CheckCircle className="h-3 w-3" /> Mission creee</span>
                      ) : brief ? (
                        <span className="flex flex-col items-end gap-0.5 text-2xs">
                          <span className={`flex items-center gap-1 ${brief.status === "VALIDATED" ? "text-success" : "text-info"}`}>
                            <CheckCircle className="h-3 w-3" /> Brief {brief.status === "VALIDATED" ? "valide" : "genere"}
                          </span>
                          <span className="text-foreground-muted">{brief.status === "VALIDATED" ? "→ creer la mission (Briefs)" : "→ onglet Briefs pour valider"}</span>
                        </span>
                      ) : (
                        <MiniBtn
                          variant="primary"
                          disabled={generateBriefMut.isPending}
                          onClick={() => { setGeneratingId(id); generateBriefMut.mutate({ brandActionId: id }); }}
                        >
                          {generatingId === id && generateBriefMut.isPending ? "Generation..." : "Generer le brief"}
                        </MiniBtn>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {generateBriefMut.isError && <p className="mt-2 text-xs text-error">{generateBriefMut.error.message}</p>}
      </Section>

      {/* ── SECONDAIRE : Plan média / exécution (CampaignAction) ── */}
      <Section
        title={`Plan media — execution (${actions.length})`}
        icon={Layers}
        action={<MiniBtn onClick={() => setShowCreate(true)} variant="primary"><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Ajouter</span></MiniBtn>}
      >
        <p className="-mt-2 mb-3 text-xs text-foreground-muted">
          Couche d&apos;exécution média (achats ATL/BTL/TTL/Digital) — optionnelle, complémentaire aux actions stratégiques.
        </p>
        <div className="mb-3 flex gap-2">
          {["ALL", "ATL", "BTL", "TTL", "DIGITAL"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === cat ? "bg-background text-white" : "text-foreground-muted hover:text-foreground-secondary"}`}
            >
              {cat}
            </button>
          ))}
        </div>
        {actionsQuery.isLoading ? (
          <EmptyMsg text="Chargement..." />
        ) : actions.length === 0 ? (
          <EmptyMsg text="Aucune action media. Optionnel — ajoute des achats ATL/BTL/TTL si besoin." />
        ) : (
          <div className="space-y-2">
            {actions.map((a) => (
              <div key={a.id as string} className="rounded-lg border border-border bg-background/80 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-2xs font-bold ${a.category === "ATL" ? "bg-info/15 text-info" : a.category === "BTL" ? "bg-success/15 text-success" : a.category === "TTL" ? "bg-accent/15 text-accent" : "bg-warning/15 text-warning"}`}>
                        {a.category as string}
                      </span>
                      <h4 className="text-sm font-medium text-white">{a.label as string}</h4>
                    </div>
                    <p className="mt-1 text-xs text-foreground-muted">{a.typeCode as string}</p>
                    {!!a.kpiTarget && <p className="mt-1 text-xs text-foreground-secondary">KPI: {String(a.kpiTarget)}</p>}
                  </div>
                  <StatusBadge status={(a.status as string) ?? "PLANNED"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle action" size="md">
        <div className="space-y-4">
          <FormField label="Type d'action" required>
            <select
              value={newAction.actionTypeSlug}
              onChange={(e) => setNewAction({ ...newAction, actionTypeSlug: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong"
            >
              <option value="">Sélectionner un type...</option>
              {actionTypes.map((t) => (
                <option key={t.slug as string} value={t.slug as string}>{(t.name as string) ?? (t.label as string) ?? (t.slug as string)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Nom" required>
            <input
              type="text"
              value={newAction.name}
              onChange={(e) => setNewAction({ ...newAction, name: e.target.value })}
              placeholder="Ex: Spot TV 30s — campagne notoriete"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong"
            />
          </FormField>
          <FormField label="Budget (XAF)">
            <input
              type="number"
              value={newAction.budget}
              onChange={(e) => setNewAction({ ...newAction, budget: e.target.value })}
              placeholder="Ex: 500000"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong"
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowCreate(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newAction.actionTypeSlug) return;
              createMut.mutate({
                campaignId,
                actionTypeSlug: newAction.actionTypeSlug,
                name: newAction.name || undefined,
                budget: newAction.budget ? parseFloat(newAction.budget) : undefined,
              });
            }} disabled={createMut.isPending}>
              {createMut.isPending ? "Creation..." : "Creer"}
            </MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
