"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import { SearchFilter } from "@/components/shared/search-filter";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Modal } from "@/components/shared/modal";
import {
  FileSignature,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  FileText,
  DollarSign,
} from "lucide-react";

type Contract = {
  id: string;
  title: string;
  contractType: string;
  status: string;
  strategyId: string;
  startDate: string;
  endDate?: string | null;
  value?: number | null;
  signedAt?: string | null;
  createdAt: string;
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  DRAFT: "bg-surface-raised text-foreground-secondary ring-border/30",
  ACTIVE: "bg-success/15 text-success ring-success",
  COMPLETED: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  TERMINATED: "bg-error/15 text-error ring-error",
  DISPUTED: "bg-orange-400/15 text-orange-400 ring-orange-400/30",
};

export default function ContractsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [createForm, setCreateForm] = useState({
    title: "",
    contractType: "",
    strategyId: "",
    startDate: "",
    value: "",
  });

  const contractsQuery = trpc.contract.list.useQuery({});
  const { data: strategies } = trpc.strategy.list.useQuery({});
  const utils = trpc.useUtils();
  const createContract = trpc.contract.create.useMutation({
    onSuccess: () => {
      utils.contract.list.invalidate();
      setCreateOpen(false);
      setCreateForm({ title: "", contractType: "", strategyId: "", startDate: "", value: "" });
    },
  });

  const allContracts = (contractsQuery.data ?? []) as unknown as Contract[];

  const draftContracts = allContracts.filter((c) => c.status === "DRAFT");
  const activeContracts = allContracts.filter((c) => c.status === "ACTIVE");
  const completedContracts = allContracts.filter((c) => c.status === "COMPLETED");
  const terminatedContracts = allContracts.filter((c) => c.status === "TERMINATED" || c.status === "DISPUTED");

  // Contracts expiring within 30 days
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon = allContracts.filter((c) => {
    if (!c.endDate || c.status !== "ACTIVE") return false;
    const end = new Date(c.endDate);
    return end <= thirtyDaysFromNow && end >= now;
  });

  const totalValue = allContracts.reduce((sum, c) => sum + (c.value ?? 0), 0);

  const tabFiltered =
    activeTab === "all"
      ? allContracts
      : activeTab === "draft"
        ? draftContracts
        : activeTab === "active"
          ? activeContracts
          : activeTab === "completed"
            ? completedContracts
            : terminatedContracts;

  const filtered = tabFiltered.filter(
    (c) => !search || c.title.toLowerCase().includes(search.toLowerCase()),
  );

  const tabs = [
    { key: "all", label: "Tous", count: allContracts.length },
    { key: "draft", label: "Brouillons", count: draftContracts.length },
    { key: "active", label: "Actifs", count: activeContracts.length },
    { key: "completed", label: "Termines", count: completedContracts.length },
    { key: "terminated", label: "Resolus/Litiges", count: terminatedContracts.length },
  ];

  if (contractsQuery.isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contrats"
        description="Gestion des contrats clients avec suivi de statut et echeances"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Socle" },
          { label: "Contrats" },
        ]}
      >
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground"
        >
          <Plus className="h-4 w-4" /> Nouveau contrat
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total contrats"
          value={allContracts.length}
          icon={FileText}
        />
        <StatCard
          title="Actifs"
          value={activeContracts.length}
          icon={CheckCircle}
          trend={activeContracts.length > 0 ? "up" : "flat"}
          trendValue="en vigueur"
        />
        <StatCard
          title="Valeur totale"
          value={totalValue > 0 ? `${totalValue.toLocaleString("fr-FR")} XAF` : "0 XAF"}
          icon={DollarSign}
        />
        <StatCard
          title="Expirant bientot"
          value={expiringSoon.length}
          icon={AlertTriangle}
          trend={expiringSoon.length > 0 ? "down" : "flat"}
          trendValue="sous 30 jours"
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search */}
      <SearchFilter
        placeholder="Rechercher un contrat..."
        value={search}
        onChange={setSearch}
      />

      {/* Contract list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="Aucun contrat"
          description="Les contrats clients apparaitront ici une fois crees. Gerez les signatures et echeances."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const statusColors = STATUS_BADGE_COLORS[c.status] ?? "bg-surface-raised text-foreground-secondary ring-border/30";
            return (
              <div
                key={c.id}
                onClick={() => setSelectedContract(c)}
                className="cursor-pointer rounded-xl border border-border bg-background/80 p-4 transition-colors hover:border-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white">{c.title}</h4>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusColors}`}
                      >
                        {c.status}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-[10px] text-foreground-secondary">
                        {c.contractType}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(c.startDate).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {c.endDate && (
                          <>
                            {" - "}
                            {new Date(c.endDate).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </>
                        )}
                      </span>
                      {c.signedAt && (
                        <span className="text-success">
                          Signe le {new Date(c.signedAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  {c.value != null && c.value > 0 && (
                    <span className="text-sm font-semibold text-white">
                      {c.value.toLocaleString("fr-FR")} XAF
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contract Detail Modal */}
      <Modal
        open={!!selectedContract}
        onClose={() => setSelectedContract(null)}
        title={selectedContract?.title ?? "Details du contrat"}
        size="lg"
      >
        {selectedContract && (() => {
          const sc = selectedContract;
          const statusColors = STATUS_BADGE_COLORS[sc.status] ?? "bg-surface-raised text-foreground-secondary ring-border/30";
          const strategyName = (strategies ?? []).find((s) => s.id === sc.strategyId)?.name;
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusColors}`}
                >
                  {sc.status}
                </span>
                <span className="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-[10px] text-foreground-secondary">
                  {sc.contractType}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-background/80 p-3">
                  <p className="text-xs text-foreground-muted">Date de debut</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {new Date(sc.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background/80 p-3">
                  <p className="text-xs text-foreground-muted">Date de fin</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {sc.endDate
                      ? new Date(sc.endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                      : "Non definie"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background/80 p-3">
                  <p className="text-xs text-foreground-muted">Valeur</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {sc.value != null && sc.value > 0
                      ? `${sc.value.toLocaleString("fr-FR")} XAF`
                      : "Non definie"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background/80 p-3">
                  <p className="text-xs text-foreground-muted">Strategie</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {strategyName ?? "—"}
                  </p>
                </div>
              </div>

              {sc.signedAt && (
                <div className="rounded-lg border border-border bg-background/80 p-3">
                  <p className="text-xs text-foreground-muted">Signe le</p>
                  <p className="mt-1 text-sm font-medium text-success">
                    {new Date(sc.signedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-border bg-background/80 p-3">
                <p className="text-xs text-foreground-muted">Cree le</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {new Date(sc.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Create Contract Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouveau contrat"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!createForm.title || !createForm.contractType || !createForm.strategyId || !createForm.startDate) return;
            createContract.mutate({
              title: createForm.title,
              contractType: createForm.contractType,
              strategyId: createForm.strategyId,
              startDate: new Date(createForm.startDate),
              ...(createForm.value ? { value: Number(createForm.value) } : {}),
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Titre du contrat
            </label>
            <input
              type="text"
              value={createForm.title}
              onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ex: Contrat annuel client X"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Strategie
            </label>
            <select
              value={createForm.strategyId}
              onChange={(e) => setCreateForm((p) => ({ ...p, strategyId: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
              required
            >
              <option value="">Selectionner une strategie...</option>
              {(strategies ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Type de contrat
            </label>
            <select
              value={createForm.contractType}
              onChange={(e) => setCreateForm((p) => ({ ...p, contractType: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
              required
            >
              <option value="">Selectionner un type...</option>
              <option value="SERVICE">Service</option>
              <option value="RETAINER">Retainer</option>
              <option value="PROJECT">Projet</option>
              <option value="LICENSE">Licence</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Date de debut
            </label>
            <input
              type="date"
              value={createForm.startDate}
              onChange={(e) => setCreateForm((p) => ({ ...p, startDate: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Valeur (XAF, optionnel)
            </label>
            <input
              type="number"
              value={createForm.value}
              onChange={(e) => setCreateForm((p) => ({ ...p, value: e.target.value }))}
              placeholder="0"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
            />
          </div>

          {createContract.error && (
            <p className="text-sm text-error">{createContract.error.message}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-background"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createContract.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50"
            >
              {createContract.isPending ? "Creation..." : "Creer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
