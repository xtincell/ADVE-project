"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs } from "@/components/shared/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchFilter } from "@/components/shared/search-filter";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { SelectInput } from "@/components/shared/select-input";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { PILLAR_KEYS, PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_TAG_BG } from "@/components/shared/pillar-content-card";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import {
  FileText,
  AlertTriangle,
  Radio,
  User,
  Clock,
  Target,
  CheckCircle,
  Plus,
  Send,
  Lightbulb,
  Settings2,
  BarChart3,
} from "lucide-react";

/* ---- constants ---- */

const BRIEF_STATUSES = ["DRAFT", "SUBMITTED", "VALIDATED", "ASSIGNED"] as const;
const BRIEF_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis",
  VALIDATED: "Valide",
  ASSIGNED: "Assigne",
};

const BRIEF_STATUS_VARIANTS: Record<string, string> = {
  DRAFT: "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30",
  IN_PROGRESS: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  SUBMITTED: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
  VALIDATED: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
  ASSIGNED: "bg-violet-400/15 text-violet-400 ring-violet-400/30",
};

/* ---- brief status step indicator ---- */
function BriefStatusSteps({ currentStatus }: { currentStatus: string }) {
  const currentIdx = BRIEF_STATUSES.indexOf(currentStatus as (typeof BRIEF_STATUSES)[number]);
  const idx = currentIdx >= 0 ? currentIdx : 0;

  return (
    <div className="flex items-center gap-1">
      {BRIEF_STATUSES.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s} className="flex items-center">
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all ${
                done
                  ? "bg-emerald-500/15 text-emerald-400"
                  : active
                    ? "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30"
                    : "bg-zinc-800 text-zinc-600"
              }`}
            >
              {done && <CheckCircle className="h-2.5 w-2.5" />}
              {BRIEF_STATUS_LABELS[s]}
            </div>
            {i < BRIEF_STATUSES.length - 1 && (
              <div
                className={`mx-1 h-px w-4 ${done ? "bg-emerald-500/50" : "bg-zinc-700"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---- ADVE alignment bar chart ---- */
function AdveAlignmentBars({ priorities }: { priorities: Record<string, number> }) {
  const maxVal = Math.max(...Object.values(priorities), 1);
  return (
    <div className="space-y-1">
      {PILLAR_KEYS.filter((k) => (priorities[k] ?? 0) > 0).map((k) => {
        const val = priorities[k] ?? 0;
        const pct = (val / maxVal) * 100;
        return (
          <div key={k} className="flex items-center gap-2">
            <span className={`w-5 text-center text-[10px] font-bold ${PILLAR_TAG_BG[k].split(" ")[1]}`}>
              {k.toUpperCase()}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 w-6 text-right">{val.toFixed(0)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---- main page ---- */

export default function BriefsPage() {
  const strategyId = useCurrentStrategyId();
  const [activeTab, setActiveTab] = useState("in_progress");
  const [search, setSearch] = useState("");
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  /* ---- brief builder form state ---- */
  const [briefForm, setBriefForm] = useState({
    objective: "",
    targetPersona: "",
    keyMessage: "",
    pillarPriority: [] as PillarKey[],
    driverId: "",
    budget: "",
    deadline: "",
    deliverables: "",
  });
  const [briefErrors, setBriefErrors] = useState<Record<string, string>>({});

  const missionsQuery = trpc.mission.list.useQuery(
    { strategyId: strategyId!, limit: 100 },
    { enabled: !!strategyId },
  );

  const driversQuery = trpc.driver.list.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  const utils = trpc.useUtils();
  const createMission = trpc.mission.create.useMutation({
    onSuccess: () => {
      utils.mission.list.invalidate();
      setShowBuilder(false);
      setBriefForm({ objective: "", targetPersona: "", keyMessage: "", pillarPriority: [], driverId: "", budget: "", deadline: "", deliverables: "" });
      setBriefErrors({});
    },
  });

  if (!strategyId || missionsQuery.isLoading) {
    return <SkeletonPage />;
  }

  if (missionsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Briefs" />
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-2 text-sm text-red-300">
            {missionsQuery.error.message}
          </p>
        </div>
      </div>
    );
  }

  const allMissions = missionsQuery.data ?? [];
  const drivers = driversQuery.data ?? [];
  const selectedDriver = drivers.find((d) => d.id === briefForm.driverId);

  // Derive brief statuses from mission status
  const inProgress = allMissions.filter(
    (m) => m.status === "IN_PROGRESS" || m.status === "DRAFT",
  );
  const submitted = allMissions.filter(
    (m) => m.deliverables?.some((d) => d.status === "PENDING"),
  );
  const validated = allMissions.filter((m) => m.status === "COMPLETED");

  const tabFiltered =
    activeTab === "in_progress"
      ? inProgress
      : activeTab === "submitted"
        ? submitted
        : validated;

  const missions = tabFiltered.filter(
    (m) =>
      !search || m.title.toLowerCase().includes(search.toLowerCase()),
  );

  const tabs = [
    { key: "in_progress", label: "En cours", count: inProgress.length },
    { key: "submitted", label: "Soumis", count: submitted.length },
    { key: "validated", label: "Valides", count: validated.length },
  ];

  const selectedData = selectedMission
    ? allMissions.find((m) => m.id === selectedMission)
    : null;

  const getBriefStatus = (m: (typeof allMissions)[number]) => {
    if (m.status === "COMPLETED") return "VALIDATED";
    if (m.deliverables?.some((d) => d.status === "PENDING")) return "SUBMITTED";
    return m.status;
  };

  const togglePillar = (k: PillarKey) => {
    setBriefForm((prev) => ({
      ...prev,
      pillarPriority: prev.pillarPriority.includes(k)
        ? prev.pillarPriority.filter((p) => p !== k)
        : [...prev.pillarPriority, k],
    }));
  };

  const validateBrief = () => {
    const e: Record<string, string> = {};
    if (!briefForm.objective.trim()) e.objective = "L'objectif est requis.";
    if (!briefForm.keyMessage.trim()) e.keyMessage = "Le message cle est requis.";
    setBriefErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Briefs"
        description="Suivez vos briefs de mission, de la creation a la validation."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Operations" },
          { label: "Briefs" },
        ]}
      >
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" />
          Nouveau brief
        </button>
      </PageHeader>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search */}
      <SearchFilter
        placeholder="Rechercher un brief..."
        value={search}
        onChange={setSearch}
      />

      {/* Brief cards */}
      {missions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            activeTab === "in_progress"
              ? "Aucun brief en cours"
              : activeTab === "submitted"
                ? "Aucun brief soumis"
                : "Aucun brief valide"
          }
          description="Les briefs apparaitront ici une fois les missions creees."
        />
      ) : (
        <div className="space-y-3">
          {missions.map((m) => {
            const meta = m.advertis_vector as Record<string, unknown> | null;
            const deadline = meta?.deadline as string | undefined;
            const briefDesc = meta?.briefDescription as string | undefined;
            const briefStatus = getBriefStatus(m);

            const priorities: Record<string, number> = {};
            if (meta) {
              for (const k of PILLAR_KEYS) {
                if (typeof meta[k] === "number" && (meta[k] as number) > 0) {
                  priorities[k] = meta[k] as number;
                }
              }
            }

            return (
              <button
                key={m.id}
                onClick={() => setSelectedMission(m.id)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 text-left transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white">
                        {m.title}
                      </h4>
                      <StatusBadge
                        status={briefStatus}
                        variantMap={BRIEF_STATUS_VARIANTS}
                      />
                    </div>

                    {/* Brief status workflow */}
                    <BriefStatusSteps currentStatus={briefStatus} />

                    {briefDesc && (
                      <p className="text-xs text-zinc-500 line-clamp-1">
                        {briefDesc}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                      {m.driver && (
                        <>
                          <span className="flex items-center gap-1">
                            <Radio className="h-3 w-3" />
                            {m.driver.channel}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {m.driver.name}
                          </span>
                        </>
                      )}
                      {deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(deadline).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>

                    {/* ADVE alignment mini bars */}
                    {Object.keys(priorities).length > 0 && (
                      <div className="max-w-xs">
                        <AdveAlignmentBars priorities={priorities} />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Template suggestions */}
      {allMissions.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-white">Briefs similaires</h4>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {allMissions
              .filter((m) => m.status === "COMPLETED")
              .slice(0, 3)
              .map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
                >
                  <p className="text-xs font-medium text-zinc-300">{m.title}</p>
                  {m.driver && (
                    <p className="mt-1 text-[10px] text-zinc-500">
                      {m.driver.channel} / {m.driver.name}
                    </p>
                  )}
                </div>
              ))}
            {allMissions.filter((m) => m.status === "COMPLETED").length === 0 && (
              <p className="text-xs text-zinc-500 col-span-full">
                Les suggestions apparaitront apres vos premieres missions completees.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Brief Detail Modal */}
      <Modal
        open={!!selectedData}
        onClose={() => setSelectedMission(null)}
        title={selectedData?.title ?? "Detail du brief"}
        size="lg"
      >
        {selectedData && (() => {
          const meta = selectedData.advertis_vector as Record<string, unknown> | null;
          const deadline = meta?.deadline as string | undefined;
          const briefDesc = meta?.briefDescription as string | undefined;
          const budget = meta?.budget as number | undefined;
          const briefStatus = getBriefStatus(selectedData);
          const deliverables = selectedData.deliverables ?? [];

          const priorities: Record<string, number> = {};
          if (meta) {
            for (const k of PILLAR_KEYS) {
              if (typeof meta[k] === "number" && (meta[k] as number) > 0) {
                priorities[k] = meta[k] as number;
              }
            }
          }

          return (
            <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
              {/* Status steps */}
              <div className="flex items-center gap-3 flex-wrap">
                <BriefStatusSteps currentStatus={briefStatus} />
              </div>

              {/* Brief description */}
              {briefDesc && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <h4 className="mb-2 text-sm font-medium text-zinc-400">Description du brief</h4>
                  <p className="text-sm leading-relaxed text-zinc-300">{briefDesc}</p>
                </div>
              )}

              {/* Driver specs */}
              {selectedData.driver && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <h4 className="mb-2 text-sm font-medium text-zinc-400 flex items-center gap-1.5">
                    <Settings2 className="h-3.5 w-3.5" />
                    Specifications du driver
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-zinc-500">Nom:</span>{" "}
                      <span className="text-white">{selectedData.driver.name}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Canal:</span>{" "}
                      <span className="text-white">{selectedData.driver.channel}</span>
                    </div>
                    {(() => {
                      const driverMeta = selectedData.driver as Record<string, unknown>;
                      return (
                        <>
                          {driverMeta.formatSpecs && (
                            <div className="col-span-2">
                              <span className="text-zinc-500">Format:</span>{" "}
                              <span className="text-white">{String(driverMeta.formatSpecs)}</span>
                            </div>
                          )}
                          {driverMeta.constraints && (
                            <div className="col-span-2">
                              <span className="text-zinc-500">Contraintes:</span>{" "}
                              <span className="text-zinc-300">{String(driverMeta.constraints)}</span>
                            </div>
                          )}
                          {driverMeta.briefTemplate && (
                            <div className="col-span-2 mt-2 rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
                              <p className="mb-1 text-xs font-medium text-zinc-500">Template de brief</p>
                              <p className="text-xs text-zinc-300 whitespace-pre-wrap">
                                {String(driverMeta.briefTemplate)}
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                {deadline && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Date limite</p>
                    <p className="mt-1 text-sm text-white">
                      {new Date(deadline).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {budget != null && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Budget</p>
                    <p className="mt-1 text-sm text-white">{budget.toLocaleString("fr-FR")} EUR</p>
                  </div>
                )}
              </div>

              {/* ADVE priorities alignment */}
              <div>
                <h4 className="mb-2 text-sm font-medium text-zinc-400 flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Alignement ADVE
                </h4>
                {Object.keys(priorities).length > 0 ? (
                  <AdveAlignmentBars priorities={priorities} />
                ) : (
                  <span className="text-xs text-zinc-500">Aucune priorite definie</span>
                )}
              </div>

              {/* Deliverables expected */}
              <div>
                <h4 className="mb-2 text-sm font-medium text-zinc-400">
                  Livrables ({deliverables.length})
                </h4>
                {deliverables.length === 0 ? (
                  <p className="text-sm text-zinc-500">Aucun livrable soumis.</p>
                ) : (
                  <div className="space-y-2">
                    {deliverables.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm text-white">{d.title}</p>
                          <p className="text-xs text-zinc-500">
                            {new Date(
                              d.createdAt as unknown as string,
                            ).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <StatusBadge status={d.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Brief Builder Modal */}
      <Modal
        open={showBuilder}
        onClose={() => setShowBuilder(false)}
        title="Nouveau brief"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <FormField label="Objectif" required error={briefErrors.objective}>
            <textarea
              value={briefForm.objective}
              onChange={(e) => setBriefForm({ ...briefForm, objective: e.target.value })}
              rows={2}
              placeholder="Definissez l'objectif principal du brief..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </FormField>

          <FormField label="Persona cible">
            <input
              type="text"
              value={briefForm.targetPersona}
              onChange={(e) => setBriefForm({ ...briefForm, targetPersona: e.target.value })}
              placeholder="Ex: CMO, 35-45 ans, secteur tech"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </FormField>

          <FormField label="Message cle" required error={briefErrors.keyMessage}>
            <textarea
              value={briefForm.keyMessage}
              onChange={(e) => setBriefForm({ ...briefForm, keyMessage: e.target.value })}
              rows={2}
              placeholder="Le message principal a communiquer..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </FormField>

          {/* Pillar priority multi-select */}
          <FormField label="Priorite piliers ADVE-RTIS">
            <div className="flex flex-wrap gap-2">
              {PILLAR_KEYS.map((k) => {
                const isSelected = briefForm.pillarPriority.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => togglePillar(k)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? PILLAR_TAG_BG[k] + " ring-1 ring-inset ring-current"
                        : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {k.toUpperCase()} - {PILLAR_NAMES[k]}
                  </button>
                );
              })}
            </div>
          </FormField>

          {/* Driver selection */}
          <FormField label="Driver">
            <select
              value={briefForm.driverId}
              onChange={(e) => setBriefForm({ ...briefForm, driverId: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            >
              <option value="">Selectionner un driver...</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.channel})
                </option>
              ))}
            </select>
          </FormField>

          {/* Selected driver specs */}
          {selectedDriver && (
            <div className="rounded-lg border border-violet-800/30 bg-violet-950/10 p-4">
              <p className="mb-2 text-xs font-semibold text-violet-400 uppercase">
                Specifications du driver selectionne
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500">Canal:</span>{" "}
                  <span className="text-zinc-300">{selectedDriver.channel}</span>
                </div>
                {!!(selectedDriver as Record<string, unknown>).formatSpecs && (
                  <div>
                    <span className="text-zinc-500">Format:</span>{" "}
                    <span className="text-zinc-300">
                      {String((selectedDriver as Record<string, unknown>).formatSpecs)}
                    </span>
                  </div>
                )}
                {!!(selectedDriver as Record<string, unknown>).constraints && (
                  <div className="col-span-2">
                    <span className="text-zinc-500">Contraintes:</span>{" "}
                    <span className="text-zinc-300">
                      {String((selectedDriver as Record<string, unknown>).constraints)}
                    </span>
                  </div>
                )}
                {!!(selectedDriver as Record<string, unknown>).briefTemplate && (
                  <div className="col-span-2 mt-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-2">
                    <p className="mb-1 text-[10px] font-medium text-zinc-500">Template de brief</p>
                    <p className="text-zinc-400 whitespace-pre-wrap">
                      {String((selectedDriver as Record<string, unknown>).briefTemplate)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Budget (EUR)">
              <input
                type="number"
                value={briefForm.budget}
                onChange={(e) => setBriefForm({ ...briefForm, budget: e.target.value })}
                placeholder="0"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              />
            </FormField>
            <FormField label="Date limite">
              <input
                type="date"
                value={briefForm.deadline}
                onChange={(e) => setBriefForm({ ...briefForm, deadline: e.target.value })}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              />
            </FormField>
          </div>

          <FormField label="Livrables attendus" helpText="Un livrable par ligne">
            <textarea
              value={briefForm.deliverables}
              onChange={(e) => setBriefForm({ ...briefForm, deliverables: e.target.value })}
              rows={3}
              placeholder="Ex: 1x Video 30s&#10;3x Visuels statiques&#10;1x Copywriting"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </FormField>

          {/* ADVE alignment preview */}
          {briefForm.pillarPriority.length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
              <p className="mb-2 text-[10px] font-medium text-zinc-500 uppercase">
                Alignement ADVE prevu
              </p>
              <div className="flex flex-wrap gap-1.5">
                {briefForm.pillarPriority.map((k) => (
                  <span
                    key={k}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PILLAR_TAG_BG[k]}`}
                  >
                    {k.toUpperCase()} - {PILLAR_NAMES[k]}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={createMission.isPending}
            onClick={() => {
              if (!validateBrief()) return;
              const pillarPriorities: Record<string, number> = {};
              briefForm.pillarPriority.forEach((k, i) => { pillarPriorities[k] = briefForm.pillarPriority.length - i; });
              createMission.mutate({
                title: briefForm.objective,
                strategyId: strategyId!,
                driverId: briefForm.driverId || undefined,
                advertis_vector: {
                  ...pillarPriorities,
                  targetPersona: briefForm.targetPersona,
                  keyMessage: briefForm.keyMessage,
                  budget: briefForm.budget,
                  deadline: briefForm.deadline,
                  deliverables: briefForm.deliverables,
                },
              });
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          >
            {createMission.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {createMission.isPending ? "Creation..." : "Creer le brief"}
          </button>
          {createMission.error && (
            <p className="mt-2 text-xs text-red-400">{createMission.error.message}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
