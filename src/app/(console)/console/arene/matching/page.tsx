"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { TierBadge } from "@/components/shared/tier-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import {
  Shuffle,
  Rocket,
  Users,
  Zap,
  ChevronRight,
  CheckCircle,
  Target,
  Sparkles,
  Settings2,
  Play,
  History,
  AlertTriangle,
} from "lucide-react";

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

export default function MatchingPage() {
  const { data: missions, isLoading: loadingMissions } = trpc.mission.list.useQuery({ limit: 50 });
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  const { data: suggestions, isLoading: loadingSuggestions } = trpc.matching.suggest.useQuery(
    { missionId: selectedMissionId ?? "" },
    { enabled: !!selectedMissionId },
  );

  const overrideMutation = trpc.matching.override.useMutation();
  const utils = trpc.useUtils();

  // Matching configuration (persisted in DB via McpServerConfig)
  const MATCH_CONFIG_KEY = "matching-config";
  const DEFAULT_MATCH_CONFIG = { minTier: "COMPAGNON", minScore: 50, autoAssign: false };
  const [showConfig, setShowConfig] = useState(false);
  const [matchConfig, setMatchConfig] = useState(DEFAULT_MATCH_CONFIG);
  const matchConfigQuery = trpc.systemConfig.get.useQuery({ key: MATCH_CONFIG_KEY });
  const matchConfigMutation = trpc.systemConfig.upsert.useMutation();

  // Hydrate from DB when data arrives
  useEffect(() => {
    if (matchConfigQuery.data) {
      setMatchConfig({ ...DEFAULT_MATCH_CONFIG, ...(matchConfigQuery.data as Partial<typeof DEFAULT_MATCH_CONFIG>) });
    }
  }, [matchConfigQuery.data]);

  // Batch matching state
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState<Array<{ missionId: string; title: string; matchCount: number }>>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Matching history
  const [showHistory, setShowHistory] = useState(false);
  const { data: historyData, isLoading: loadingHistory } = trpc.matching.getHistory.useQuery(
    { missionId: selectedMissionId ?? "" },
    { enabled: !!selectedMissionId && showHistory },
  );

  const handleSaveConfig = async () => {
    try {
      await matchConfigMutation.mutateAsync({
        key: MATCH_CONFIG_KEY,
        config: matchConfig as unknown as Record<string, unknown>,
      });
      setShowConfig(false);
      setFeedback({ type: "success", message: "Parametres de matching sauvegardes." });
    } catch {
      setFeedback({ type: "error", message: "Erreur lors de la sauvegarde des parametres." });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleBatchRun = async () => {
    if (unassigned.length === 0) return;
    setBatchRunning(true);
    setBatchResults([]);

    const results: typeof batchResults = [];
    for (const mission of unassigned) {
      try {
        const suggestions = await utils.client.matching.suggest.query({ missionId: mission.id });
        const matchCount = Array.isArray(suggestions) ? suggestions.length : 0;
        results.push({
          missionId: mission.id,
          title: mission.title,
          matchCount,
        });
      } catch {
        results.push({
          missionId: mission.id,
          title: mission.title,
          matchCount: 0,
        });
      }
    }

    setBatchResults(results);
    setBatchRunning(false);
    utils.mission.list.invalidate();
    setFeedback({
      type: "success",
      message: `Matching lance pour ${unassigned.length} mission(s). ${results.reduce((a, r) => a + r.matchCount, 0)} suggestion(s) au total.`,
    });
    setTimeout(() => setFeedback(null), 5000);
  };

  const isLoading = loadingMissions;

  const allMissions = missions ?? [];
  const unassigned = allMissions.filter((m) => m.status === "DRAFT");
  const inProgress = allMissions.filter((m) => m.status === "IN_PROGRESS");
  const assigned = allMissions.filter((m) => m.status === "ASSIGNED");

  const selectedMission = allMissions.find((m) => m.id === selectedMissionId);

  const handleAssign = (talentProfileId: string) => {
    if (!selectedMissionId) return;
    overrideMutation.mutate(
      { missionId: selectedMissionId, talentProfileId },
      {
        onSuccess: () => {
          utils.mission.list.invalidate();
          setSelectedMissionId(null);
        },
      },
    );
  };

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matching"
        description="Croisement automatique briefs x creatifs - attribution et override"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Arene" },
          { label: "Matching" },
        ]}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-raised transition-colors"
          >
            <Settings2 className="h-4 w-4" /> Parametres
          </button>
          <button
            onClick={handleBatchRun}
            disabled={batchRunning || unassigned.length === 0}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50 transition-colors"
          >
            {batchRunning ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-border-subtle border-t-zinc-900" />
                Matching en cours...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Lancer le matching ({unassigned.length})
              </>
            )}
          </button>
        </div>
      </PageHeader>

      {/* Feedback toast */}
      {feedback && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            feedback.type === "success"
              ? "border-success/50 bg-success/20 text-success"
              : "border-error/50 bg-error/20 text-error"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="mr-2 inline h-4 w-4" />
          ) : (
            <AlertTriangle className="mr-2 inline h-4 w-4" />
          )}
          {feedback.message}
        </div>
      )}

      {/* Batch Results */}
      {batchResults.length > 0 && (
        <div className="rounded-xl border border-border bg-background/80 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
            Resultats du batch matching
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {batchResults.map((r) => (
              <div
                key={r.missionId}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2 cursor-pointer hover:bg-background/50 transition-colors"
                onClick={() => setSelectedMissionId(r.missionId)}
              >
                <span className="text-sm text-foreground-secondary truncate">{r.title}</span>
                <span className="shrink-0 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                  {r.matchCount} suggestion(s)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Missions a matcher" value={unassigned.length} icon={Shuffle} />
        <StatCard title="En cours" value={inProgress.length} icon={Rocket} />
        <StatCard title="Assignees" value={assigned.length} icon={Users} />
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Panel: Unassigned Missions */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            <Target className="h-4 w-4" />
            Missions non assignees ({unassigned.length})
          </h3>

          {unassigned.length === 0 ? (
            <EmptyState
              icon={Shuffle}
              title="Aucune mission en attente"
              description="Toutes les missions ont ete assignees."
            />
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {unassigned.map((m) => {
                const isSelected = m.id === selectedMissionId;
                const driver = m.driver as Record<string, unknown> | null;
                const requiredSkills = ((m as Record<string, unknown>).requiredSkills as string[] | null) ?? [];
                const advePriority = (m as Record<string, unknown>).priority ?? (m as Record<string, unknown>).advePriority ?? null;

                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMissionId(isSelected ? null : m.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/20"
                        : "border-border bg-background/80 hover:border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-white">{m.title}</p>
                        {driver && (
                          <p className="mt-0.5 text-xs text-foreground-secondary">
                            {(driver.channel as string) ?? "Canal non defini"}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={m.status} />
                        <ChevronRight
                          className={`h-4 w-4 text-foreground-muted transition-transform ${
                            isSelected ? "rotate-90" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Required Skills */}
                    {requiredSkills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {requiredSkills.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="rounded bg-background px-1.5 py-0.5 text-[10px] text-foreground-secondary"
                          >
                            {s}
                          </span>
                        ))}
                        {requiredSkills.length > 4 && (
                          <span className="text-[10px] text-foreground-muted">
                            +{requiredSkills.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* ADVE Priority */}
                    {advePriority && (
                      <div className="mt-2">
                        <span className="rounded-full bg-purple-400/10 px-2 py-0.5 text-[10px] font-medium text-purple-400">
                          Priorite ADVE: {String(advePriority)}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Panel: Matching Suggestions */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            <Sparkles className="h-4 w-4" />
            Suggestions de matching
          </h3>

          {!selectedMissionId ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/40 px-6 py-20 text-center">
              <div className="rounded-full bg-background/80 p-4">
                <Zap className="h-8 w-8 text-foreground-muted" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                Selectionnez une mission
              </h3>
              <p className="mt-1.5 max-w-sm text-sm text-foreground-secondary">
                Cliquez sur une mission dans le panneau de gauche pour voir les suggestions de creatifs.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Selected Mission Summary */}
              {selectedMission && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
                    Mission selectionnee
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {selectedMission.title}
                  </p>
                </div>
              )}

              {/* Suggestions List */}
              {loadingSuggestions ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-20 animate-pulse rounded-xl border border-border bg-background/80"
                    />
                  ))}
                  <p className="text-center text-sm text-foreground-secondary animate-pulse">
                    Recherche des meilleurs creatifs...
                  </p>
                </div>
              ) : (suggestions as unknown as Array<Record<string, unknown>> ?? []).length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Aucune suggestion"
                  description="Aucun creatif ne correspond aux criteres de cette mission. Verifiez que des creatifs sont enregistres dans la Guilde."
                />
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {(suggestions as unknown as Array<Record<string, unknown>> ?? []).map(
                    (s, i) => {
                      const matchScore = (s.score as number) ?? (s.matchScore as number) ?? 0;
                      const skillsMatch = (s.skillsMatch as number) ?? 0;
                      const adveAlignment = (s.adveAlignment as number) ?? 0;
                      const availability = (s.availability as string) ?? "Disponible";

                      return (
                        <div
                          key={i}
                          className="rounded-xl border border-border bg-background/80 p-4 transition-colors hover:border-border"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-xs font-bold text-foreground-secondary">
                                {i + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {(s.displayName as string) ??
                                    (s.name as string) ??
                                    "Creatif"}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {(s.tier as string) && (
                                    <TierBadge
                                      tier={s.tier as GuildTier}
                                      size="sm"
                                    />
                                  )}
                                  <span className="text-[10px] text-foreground-muted">
                                    {availability}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                handleAssign(
                                  (s.id as string) ??
                                    (s.talentProfileId as string) ??
                                    "",
                                )
                              }
                              disabled={overrideMutation.isPending}
                              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50 transition-colors"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Assigner
                            </button>
                          </div>

                          {/* Match Metrics */}
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-lg bg-background/50 p-2 text-center">
                              <p className="text-xs text-foreground-muted">Match</p>
                              <p className="text-sm font-bold text-white">
                                {matchScore.toFixed(1)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-background/50 p-2 text-center">
                              <p className="text-xs text-foreground-muted">Skills %</p>
                              <p
                                className={`text-sm font-bold ${
                                  skillsMatch >= 80
                                    ? "text-success"
                                    : skillsMatch >= 50
                                      ? "text-warning"
                                      : "text-foreground-secondary"
                                }`}
                              >
                                {skillsMatch.toFixed(0)}%
                              </p>
                            </div>
                            <div className="rounded-lg bg-background/50 p-2 text-center">
                              <p className="text-xs text-foreground-muted">ADVE %</p>
                              <p
                                className={`text-sm font-bold ${
                                  adveAlignment >= 80
                                    ? "text-success"
                                    : adveAlignment >= 50
                                      ? "text-warning"
                                      : "text-foreground-secondary"
                                }`}
                              >
                                {adveAlignment.toFixed(0)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Matching History toggle */}
      {selectedMissionId && (
        <div>
          <button
            onClick={() => setShowHistory((p) => !p)}
            className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground-muted hover:text-foreground-secondary transition-colors"
          >
            <History className="h-4 w-4" />
            Historique d'assignation {showHistory ? "(masquer)" : "(voir)"}
          </button>
          {showHistory && (
            loadingHistory ? (
              <div className="h-20 animate-pulse rounded-xl border border-border bg-background/80" />
            ) : (historyData ?? []).length === 0 ? (
              <p className="text-sm text-foreground-muted">Aucun historique pour cette mission.</p>
            ) : (
              <div className="space-y-2">
                {(historyData ?? []).map((h: Record<string, unknown>) => (
                  <div
                    key={h.id as string}
                    className="flex items-center justify-between rounded-xl border border-border bg-background/80 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{h.talentName as string}</p>
                      <p className="text-xs text-foreground-secondary">
                        Tier: {h.talentTier as string} | Mission: {h.missionTitle as string}
                      </p>
                    </div>
                    <span className="text-[10px] text-foreground-muted">
                      {new Date(h.assignedAt as string).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Recently Assigned */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
          Missions assignees recemment
        </h3>
        {assigned.length === 0 ? (
          <EmptyState
            icon={Shuffle}
            title="Aucun match recent"
            description="Les assignations de missions apparaitront ici."
          />
        ) : (
          <div className="space-y-2">
            {assigned.slice(0, 10).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-border bg-background/80 p-3 transition-colors hover:border-border"
              >
                <div>
                  <p className="text-sm font-medium text-white">{m.title}</p>
                  <p className="text-xs text-foreground-secondary">
                    {(m.driver as Record<string, unknown>)?.channel
                      ? String((m.driver as Record<string, unknown>).channel)
                      : "-"}
                  </p>
                </div>
                <StatusBadge status={m.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Matching Config Modal */}
      <Modal
        open={showConfig}
        onClose={() => setShowConfig(false)}
        title="Parametres du matching"
        size="md"
      >
        <div className="space-y-4">
          <FormField label="Tier minimum requis" helpText="Les creatifs en dessous de ce tier ne seront pas proposes">
            <select
              value={matchConfig.minTier}
              onChange={(e) => setMatchConfig((p: typeof matchConfig) => ({ ...p, minTier: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
            >
              <option value="APPRENTI">Apprenti</option>
              <option value="COMPAGNON">Compagnon</option>
              <option value="MAITRE">Maitre</option>
              <option value="ASSOCIE">Associe</option>
            </select>
          </FormField>

          <FormField label="Score minimum de matching" helpText="Score seuil (0-100) pour qu'un creatif soit suggere">
            <input
              type="number"
              value={matchConfig.minScore}
              onChange={(e) => setMatchConfig((p: typeof matchConfig) => ({ ...p, minScore: parseInt(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
              min={0}
              max={100}
            />
          </FormField>

          <FormField label="Attribution automatique">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={matchConfig.autoAssign}
                onChange={(e) => setMatchConfig((p: typeof matchConfig) => ({ ...p, autoAssign: e.target.checked }))}
                className="h-4 w-4 rounded border-border-strong bg-background text-white accent-white"
              />
              <span className="text-sm text-foreground-secondary">
                Assigner automatiquement le meilleur match si le score depasse le seuil
              </span>
            </label>
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowConfig(false)}
              className="rounded-lg px-4 py-2 text-sm text-foreground-secondary hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveConfig}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground transition-colors"
            >
              Sauvegarder
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
