"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SearchFilter } from "@/components/shared/search-filter";
import { TierBadge } from "@/components/shared/tier-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Modal } from "@/components/shared/modal";
import {
  Building,
  Plus,
  Users,
  BarChart3,
  Globe,
  CheckCircle,
  Briefcase,
  Star,
  Pencil,
  Save,
  AlertTriangle,
} from "lucide-react";

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

const TIER_ORDER: Record<string, number> = {
  APPRENTI: 1,
  COMPAGNON: 2,
  MAITRE: 3,
  ASSOCIE: 4,
};

function getCollectiveTier(avgScore: number): GuildTier {
  if (avgScore >= 8.5) return "ASSOCIE";
  if (avgScore >= 7) return "MAITRE";
  if (avgScore >= 5) return "COMPAGNON";
  return "APPRENTI";
}

export default function OrgsPage() {
  const { data: orgs, isLoading } = trpc.guildOrg.list.useQuery();
  const createMutation = trpc.guildOrg.create.useMutation();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", website: "" });
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const updateMutation = trpc.guildOrg.update.useMutation();
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", website: "" });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: orgMembers, isLoading: loadingMembers } = trpc.guildOrg.getMembers.useQuery(
    { orgId: selectedOrgId ?? "" },
    { enabled: !!selectedOrgId },
  );

  const { data: orgMetrics, isLoading: loadingMetrics } = trpc.guildOrg.getMetrics.useQuery(
    { orgId: selectedOrgId ?? "" },
    { enabled: !!selectedOrgId },
  );

  const allOrgs = orgs ?? [];
  const filtered = allOrgs.filter(
    (o) => !search || o.name.toLowerCase().includes(search.toLowerCase()),
  );

  const orgData = filtered.map((o) => {
    const memberCount = (o as Record<string, unknown>)._count
      ? ((o as Record<string, unknown>)._count as Record<string, number>).members
      : 0;
    return {
      id: o.id,
      name: o.name,
      description: o.description ?? "",
      memberCount,
      totalMissions: o.totalMissions ?? 0,
      avgQcScore: o.avgQcScore ?? 0,
      firstPassRate: o.firstPassRate ?? 0,
      website: o.website ?? "",
      collectiveTier: getCollectiveTier(o.avgQcScore ?? 0),
      specializations: (o.specializations as string[] | null) ?? [],
    };
  });

  const selectedOrg = allOrgs.find((o) => o.id === selectedOrgId);

  // Compute stats
  const totalOrgs = allOrgs.length;
  const activeOrgs = allOrgs.filter((o) => {
    const mc = (o as Record<string, unknown>)._count
      ? ((o as Record<string, unknown>)._count as Record<string, number>).members
      : 0;
    return (mc ?? 0) > 0;
  }).length;
  const avgCollectiveTier =
    allOrgs.length > 0
      ? allOrgs.reduce((sum, o) => sum + (TIER_ORDER[getCollectiveTier(o.avgQcScore ?? 0)] ?? 0), 0) /
        allOrgs.length
      : 0;
  const avgTierLabel =
    avgCollectiveTier >= 3.5
      ? "Associe"
      : avgCollectiveTier >= 2.5
        ? "Maitre"
        : avgCollectiveTier >= 1.5
          ? "Compagnon"
          : "Apprenti";

  const handleCreate = () => {
    if (!form.name) return;
    createMutation.mutate(
      {
        name: form.name,
        description: form.description || undefined,
        website: form.website || undefined,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setForm({ name: "", description: "", website: "" });
          utils.guildOrg.list.invalidate();
        },
      },
    );
  };

  const handleStartEdit = () => {
    if (!selectedOrg) return;
    setEditForm({
      name: selectedOrg.name,
      description: selectedOrg.description ?? "",
      website: selectedOrg.website ?? "",
    });
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    if (!selectedOrgId || !editForm.name) return;
    updateMutation.mutate(
      {
        id: selectedOrgId,
        name: editForm.name,
        description: editForm.description || undefined,
        website: editForm.website || undefined,
      },
      {
        onSuccess: () => {
          setEditMode(false);
          utils.guildOrg.list.invalidate();
          utils.guildOrg.getMembers.invalidate();
          utils.guildOrg.getMetrics.invalidate();
          setFeedback({ type: "success", message: "Organisation mise a jour." });
          setTimeout(() => setFeedback(null), 3000);
        },
        onError: () => {
          setFeedback({ type: "error", message: "Echec de la mise a jour." });
          setTimeout(() => setFeedback(null), 3000);
        },
      },
    );
  };

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisations Guild"
        description="Agences de production membres de la Guilde"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Arene" },
          { label: "Organisations" },
        ]}
      >
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground transition-colors"
        >
          <Plus className="h-4 w-4" /> Creer une organisation
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total organisations" value={totalOrgs} icon={Building} />
        <StatCard
          title="Actives"
          value={activeOrgs}
          icon={Users}
          trendValue={`${totalOrgs > 0 ? ((activeOrgs / totalOrgs) * 100).toFixed(0) : 0}%`}
        />
        <StatCard
          title="Tier collectif moyen"
          value={avgTierLabel}
          icon={BarChart3}
          trendValue={`Score: ${avgCollectiveTier.toFixed(1)}/4`}
        />
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-800/50 bg-emerald-950/20 text-emerald-300"
              : "border-red-800/50 bg-error/20 text-error"
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

      {/* Search */}
      <SearchFilter
        placeholder="Rechercher une organisation..."
        value={search}
        onChange={setSearch}
      />

      {/* Card Grid */}
      {orgData.length === 0 ? (
        <EmptyState
          icon={Building}
          title="Aucune organisation"
          description="Creez une organisation pour regrouper des creatifs."
          action={{ label: "Creer", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {orgData.map((org) => (
            <button
              key={org.id}
              onClick={() => setSelectedOrgId(org.id)}
              className="w-full rounded-xl border border-border bg-background/80 p-5 text-left transition-all hover:border-border hover:bg-background"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-foreground-muted shrink-0" />
                    <h4 className="truncate text-base font-semibold text-white">{org.name}</h4>
                  </div>
                  {org.description && (
                    <p className="mt-1 text-xs text-foreground-secondary line-clamp-2">{org.description}</p>
                  )}
                </div>
                <TierBadge tier={org.collectiveTier} size="sm" />
              </div>

              {/* Metrics Row */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-background/50 p-2 text-center">
                  <p className="text-xs text-foreground-muted">Membres</p>
                  <p className="text-sm font-bold text-white">{org.memberCount}</p>
                </div>
                <div className="rounded-lg bg-background/50 p-2 text-center">
                  <p className="text-xs text-foreground-muted">Missions</p>
                  <p className="text-sm font-bold text-white">{org.totalMissions}</p>
                </div>
                <div className="rounded-lg bg-background/50 p-2 text-center">
                  <p className="text-xs text-foreground-muted">Score QC</p>
                  <p
                    className={`text-sm font-bold ${
                      org.avgQcScore >= 8
                        ? "text-emerald-400"
                        : org.avgQcScore >= 6
                          ? "text-amber-400"
                          : "text-foreground-secondary"
                    }`}
                  >
                    {org.avgQcScore.toFixed(1)}
                  </p>
                </div>
              </div>

              {/* Specializations */}
              {org.specializations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {org.specializations.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="rounded bg-background px-1.5 py-0.5 text-[10px] text-foreground-secondary"
                    >
                      {s}
                    </span>
                  ))}
                  {org.specializations.length > 4 && (
                    <span className="text-[10px] text-foreground-muted">
                      +{org.specializations.length - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Website */}
              {org.website && (
                <div className="mt-3 flex items-center gap-1 text-xs text-blue-400">
                  <Globe className="h-3 w-3" />
                  <span className="truncate">{org.website}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Org Detail Modal */}
      <Modal
        open={!!selectedOrgId}
        onClose={() => { setSelectedOrgId(null); setEditMode(false); }}
        title={selectedOrg?.name ?? "Organisation"}
        size="lg"
      >
        {loadingMembers || loadingMetrics ? (
          <div className="space-y-4">
            <div className="h-8 animate-pulse rounded bg-background" />
            <div className="h-24 animate-pulse rounded bg-background" />
            <div className="h-32 animate-pulse rounded bg-background" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Edit Toggle */}
            <div className="flex justify-end">
              {editMode ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditMode(false)}
                    className="rounded-lg px-3 py-1.5 text-xs text-foreground-secondary hover:text-white transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending || !editForm.name}
                    className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50 transition-colors"
                  >
                    <Save className="h-3 w-3" />
                    {updateMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-raised transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Modifier
                </button>
              )}
            </div>

            {/* Description (view or edit) */}
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground-secondary">Nom</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-zinc-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground-secondary">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-zinc-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground-secondary">Site web</label>
                  <input
                    value={editForm.website}
                    onChange={(e) => setEditForm((p) => ({ ...p, website: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-zinc-600"
                    placeholder="https://..."
                  />
                </div>
              </div>
            ) : (
              selectedOrg?.description && (
                <p className="text-sm text-foreground-secondary">{selectedOrg.description}</p>
              )
            )}

            {/* Performance Metrics */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg bg-background/50 p-3 text-center">
                <Users className="mx-auto mb-1 h-4 w-4 text-foreground-muted" />
                <p className="text-lg font-bold text-white">
                  {orgMetrics?.totalMembers ?? 0}
                </p>
                <p className="text-[10px] text-foreground-muted">Membres</p>
              </div>
              <div className="rounded-lg bg-background/50 p-3 text-center">
                <Briefcase className="mx-auto mb-1 h-4 w-4 text-foreground-muted" />
                <p className="text-lg font-bold text-white">
                  {orgMetrics?.totalMissions ?? 0}
                </p>
                <p className="text-[10px] text-foreground-muted">Missions</p>
              </div>
              <div className="rounded-lg bg-background/50 p-3 text-center">
                <CheckCircle className="mx-auto mb-1 h-4 w-4 text-foreground-muted" />
                <p className="text-lg font-bold text-white">
                  {((orgMetrics?.firstPassRate ?? 0) * 100).toFixed(0)}%
                </p>
                <p className="text-[10px] text-foreground-muted">1st Pass</p>
              </div>
              <div className="rounded-lg bg-background/50 p-3 text-center">
                <Star className="mx-auto mb-1 h-4 w-4 text-foreground-muted" />
                <p
                  className={`text-lg font-bold ${
                    (orgMetrics?.avgQcScore ?? 0) >= 8
                      ? "text-emerald-400"
                      : (orgMetrics?.avgQcScore ?? 0) >= 6
                        ? "text-amber-400"
                        : "text-foreground-secondary"
                  }`}
                >
                  {(orgMetrics?.avgQcScore ?? 0).toFixed(1)}
                </p>
                <p className="text-[10px] text-foreground-muted">Score QC</p>
              </div>
            </div>

            {/* Specializations */}
            {selectedOrg && (selectedOrg.specializations as string[] | null)?.length ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                  Specialisations
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {((selectedOrg.specializations as string[] | null) ?? []).map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-background px-2 py-1 text-xs text-foreground-secondary"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Member List */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                Membres ({(orgMembers ?? []).length})
              </p>
              {(orgMembers ?? []).length === 0 ? (
                <p className="text-sm text-foreground-muted">Aucun membre dans cette organisation.</p>
              ) : (
                <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                  {(orgMembers ?? []).map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-xs font-bold text-foreground-secondary">
                          {(member.displayName ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {member.displayName ?? "Sans nom"}
                          </p>
                          <p className="text-[10px] text-foreground-muted">
                            {member.totalMissions ?? 0} missions | Score:{" "}
                            {(member.avgScore ?? 0).toFixed(1)}
                          </p>
                        </div>
                      </div>
                      <TierBadge tier={member.tier as GuildTier} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Website Link */}
            {selectedOrg?.website && (
              <a
                href={selectedOrg.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:underline"
              >
                <Globe className="h-4 w-4" />
                {selectedOrg.website}
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* Create Org Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nouvelle organisation"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">Nom</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-zinc-600"
              placeholder="Nom de l'organisation"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-zinc-600"
              placeholder="Description de l'organisation"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">Site web</label>
            <input
              value={form.website}
              onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-zinc-600"
              placeholder="https://..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg px-4 py-2 text-sm text-foreground-secondary hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.name || createMutation.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? "Creation..." : "Creer"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
