"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchFilter } from "@/components/shared/search-filter";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Modal } from "@/components/shared/modal";
import {
  Timer,
  Cog,
  Zap,
  Layers,
  Play,
  Plus,
  Pause,
  Square,
  Clock,
} from "lucide-react";

type Process = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  status: string;
  frequency?: string | null;
  triggerSignal?: string | null;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
};

const TYPE_COLORS: Record<string, string> = {
  DAEMON: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
  TRIGGERED: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  BATCH: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
};

const STATUS_COLORS: Record<string, string> = {
  RUNNING: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
  PAUSED: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
  STOPPED: "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30",
  COMPLETED: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
};

export default function SchedulerPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    type: "" as "" | "DAEMON" | "TRIGGERED" | "BATCH",
    strategyId: "",
    frequency: "",
    triggerSignal: "",
  });

  // Fetch all processes
  const processesQuery = trpc.process.list.useQuery({});
  const { data: strategies } = trpc.strategy.list.useQuery({});
  const utils = trpc.useUtils();
  const createProcess = trpc.process.create.useMutation({
    onSuccess: () => {
      utils.process.list.invalidate();
      setCreateOpen(false);
      setCreateForm({ name: "", description: "", type: "", strategyId: "", frequency: "", triggerSignal: "" });
    },
  });
  const startProcess = trpc.process.start.useMutation({
    onSuccess: () => {
      utils.process.list.invalidate();
      setSelectedProcess((prev) => prev ? { ...prev, status: "RUNNING" } : null);
    },
  });
  const pauseProcess = trpc.process.pause.useMutation({
    onSuccess: () => {
      utils.process.list.invalidate();
      setSelectedProcess((prev) => prev ? { ...prev, status: "PAUSED" } : null);
    },
  });
  const stopProcess = trpc.process.stop.useMutation({
    onSuccess: () => {
      utils.process.list.invalidate();
      setSelectedProcess((prev) => prev ? { ...prev, status: "STOPPED" } : null);
    },
  });

  const allProcesses = (processesQuery.data ?? []) as unknown as Process[];

  const daemonProcesses = allProcesses.filter((p) => p.type === "DAEMON");
  const triggeredProcesses = allProcesses.filter((p) => p.type === "TRIGGERED");
  const batchProcesses = allProcesses.filter((p) => p.type === "BATCH");

  const runningProcesses = allProcesses.filter((p) => p.status === "RUNNING");
  const pausedProcesses = allProcesses.filter((p) => p.status === "PAUSED");

  const tabFiltered =
    activeTab === "all"
      ? allProcesses
      : activeTab === "daemon"
        ? daemonProcesses
        : activeTab === "triggered"
          ? triggeredProcesses
          : activeTab === "batch"
            ? batchProcesses
            : activeTab === "running"
              ? runningProcesses
              : pausedProcesses;

  const filtered = tabFiltered.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const tabs = [
    { key: "all", label: "Tous", count: allProcesses.length },
    { key: "daemon", label: "DAEMON", count: daemonProcesses.length },
    { key: "triggered", label: "TRIGGERED", count: triggeredProcesses.length },
    { key: "batch", label: "BATCH", count: batchProcesses.length },
  ];

  if (processesQuery.isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Process Scheduler"
        description="Planification et gestion des processus DAEMON, TRIGGERED et BATCH"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Fusee" },
          { label: "Scheduler" },
        ]}
      >
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" /> Nouveau processus
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Processus actifs"
          value={runningProcesses.length}
          icon={Play}
          trend={runningProcesses.length > 0 ? "up" : "flat"}
          trendValue="en cours"
        />
        <StatCard title="DAEMON" value={daemonProcesses.length} icon={Cog} />
        <StatCard title="TRIGGERED" value={triggeredProcesses.length} icon={Zap} />
        <StatCard title="BATCH" value={batchProcesses.length} icon={Layers} />
      </div>

      {/* Process types overview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <h4 className="text-sm font-medium text-white">DAEMON</h4>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Processus permanents en arriere-plan
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {daemonProcesses.filter((p) => p.status === "RUNNING").length}
          </p>
          <p className="text-xs text-zinc-500">en cours d&apos;execution</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <h4 className="text-sm font-medium text-white">TRIGGERED</h4>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Processus declenches par evenement
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {triggeredProcesses.length}
          </p>
          <p className="text-xs text-zinc-500">en attente de declenchement</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <h4 className="text-sm font-medium text-white">BATCH</h4>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Traitements par lots planifies
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {batchProcesses.length}
          </p>
          <p className="text-xs text-zinc-500">planifies</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search */}
      <SearchFilter
        placeholder="Rechercher un processus..."
        value={search}
        onChange={setSearch}
      />

      {/* Process list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Timer}
          title="Aucun processus"
          description="Creez un processus DAEMON, TRIGGERED ou BATCH pour automatiser vos operations."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProcess(p)}
              className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white">{p.name}</h4>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${TYPE_COLORS[p.type] ?? ""}`}
                    >
                      {p.type}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${STATUS_COLORS[p.status] ?? "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30"}`}
                    >
                      {p.status}
                    </span>
                  </div>
                  {p.description && (
                    <p className="mt-1 text-xs text-zinc-400 line-clamp-1">
                      {p.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    {p.frequency && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {p.frequency}
                      </span>
                    )}
                    {p.triggerSignal && (
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {p.triggerSignal}
                      </span>
                    )}
                    {p.lastRunAt && (
                      <span>
                        Dernier: {new Date(p.lastRunAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {p.status === "RUNNING" && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
                      <Pause className="h-3 w-3" />
                    </span>
                  )}
                  {p.status === "PAUSED" && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                      <Play className="h-3 w-3" />
                    </span>
                  )}
                  {p.status !== "STOPPED" && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/10 text-red-400">
                      <Square className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Process Detail Modal */}
      <Modal
        open={!!selectedProcess}
        onClose={() => setSelectedProcess(null)}
        title={selectedProcess?.name ?? "Details du processus"}
        size="lg"
      >
        {selectedProcess && (() => {
          const sp = selectedProcess;
          const typeColors = TYPE_COLORS[sp.type] ?? "";
          const statusColors = STATUS_COLORS[sp.status] ?? "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30";
          const actionPending = startProcess.isPending || pauseProcess.isPending || stopProcess.isPending;
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${typeColors}`}>
                  {sp.type}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusColors}`}>
                  {sp.status}
                </span>
              </div>

              {sp.description && (
                <p className="text-sm text-zinc-400">{sp.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                {sp.frequency && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                    <p className="text-xs text-zinc-500">Frequence</p>
                    <p className="mt-1 text-sm font-medium text-white">{sp.frequency}</p>
                  </div>
                )}
                {sp.triggerSignal && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                    <p className="text-xs text-zinc-500">Signal declencheur</p>
                    <p className="mt-1 text-sm font-medium text-white">{sp.triggerSignal}</p>
                  </div>
                )}
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="text-xs text-zinc-500">Derniere execution</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {sp.lastRunAt
                      ? new Date(sp.lastRunAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                      : "Jamais"}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="text-xs text-zinc-500">Prochaine execution</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {sp.nextRunAt
                      ? new Date(sp.nextRunAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                      : "Non planifiee"}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="text-xs text-zinc-500">Cree le</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {new Date(sp.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 border-t border-zinc-800 pt-4">
                {(sp.status === "STOPPED" || sp.status === "PAUSED") && (
                  <button
                    onClick={() => startProcess.mutate({ id: sp.id })}
                    disabled={actionPending}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" /> Demarrer
                  </button>
                )}
                {sp.status === "RUNNING" && (
                  <button
                    onClick={() => pauseProcess.mutate({ id: sp.id })}
                    disabled={actionPending}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
                  >
                    <Pause className="h-3.5 w-3.5" /> Pause
                  </button>
                )}
                {sp.status !== "STOPPED" && (
                  <button
                    onClick={() => stopProcess.mutate({ id: sp.id })}
                    disabled={actionPending}
                    className="flex items-center gap-1.5 rounded-lg bg-red-500/15 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                  >
                    <Square className="h-3.5 w-3.5" /> Arreter
                  </button>
                )}
                {actionPending && (
                  <span className="text-xs text-zinc-500">Mise a jour...</span>
                )}
                {(startProcess.error || pauseProcess.error || stopProcess.error) && (
                  <span className="text-xs text-red-400">
                    {startProcess.error?.message || pauseProcess.error?.message || stopProcess.error?.message}
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Create Process Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouveau processus"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!createForm.name || !createForm.type || !createForm.strategyId) return;
            createProcess.mutate({
              name: createForm.name,
              type: createForm.type as "DAEMON" | "TRIGGERED" | "BATCH",
              strategyId: createForm.strategyId,
              ...(createForm.description ? { description: createForm.description } : {}),
              ...(createForm.frequency ? { frequency: createForm.frequency } : {}),
              ...(createForm.triggerSignal ? { triggerSignal: createForm.triggerSignal } : {}),
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Nom du processus
            </label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Sync CRM quotidien"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Type
            </label>
            <select
              value={createForm.type}
              onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value as "" | "DAEMON" | "TRIGGERED" | "BATCH" }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              required
            >
              <option value="">Selectionner un type...</option>
              <option value="DAEMON">DAEMON</option>
              <option value="TRIGGERED">TRIGGERED</option>
              <option value="BATCH">BATCH</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Strategie
            </label>
            <select
              value={createForm.strategyId}
              onChange={(e) => setCreateForm((p) => ({ ...p, strategyId: e.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              required
            >
              <option value="">Selectionner une strategie...</option>
              {(strategies ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Description (optionnel)
            </label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description du processus..."
              rows={2}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          {createForm.type === "DAEMON" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Frequence (optionnel)
              </label>
              <input
                type="text"
                value={createForm.frequency}
                onChange={(e) => setCreateForm((p) => ({ ...p, frequency: e.target.value }))}
                placeholder="Ex: */5 * * * * (cron)"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              />
            </div>
          )}

          {createForm.type === "TRIGGERED" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Signal declencheur (optionnel)
              </label>
              <input
                type="text"
                value={createForm.triggerSignal}
                onChange={(e) => setCreateForm((p) => ({ ...p, triggerSignal: e.target.value }))}
                placeholder="Ex: new_lead, payment_received"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              />
            </div>
          )}

          {createProcess.error && (
            <p className="text-sm text-red-400">{createProcess.error.message}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createProcess.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
            >
              {createProcess.isPending ? "Creation..." : "Creer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
