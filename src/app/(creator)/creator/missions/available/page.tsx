import { PILLAR_STORAGE_KEYS } from "@/domain";

"use client";

import { useState } from "react";
import {
  Briefcase,
  Clock,
  DollarSign,
  Radio,
  Target,
  CheckCircle,
  Eye,
  ArrowUpDown,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilter } from "@/components/shared/search-filter";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PillarProgress } from "@/components/shared/pillar-progress";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { type PillarKey } from "@/lib/types/advertis-vector";

export default function AvailableMissionsPage() {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<"date" | "deadline" | "budget">("date");
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [acceptDialog, setAcceptDialog] = useState<string | null>(null);

  const missions = trpc.mission.list.useQuery({ status: "DRAFT", limit: 50 });
  const drivers = trpc.driver.list.useQuery({});
  const updateMission = trpc.mission.update.useMutation({
    onSuccess: () => {
      missions.refetch();
      setAcceptDialog(null);
    },
  });

  const missionDetail = trpc.mission.get.useQuery(
    { id: selectedMission! },
    { enabled: !!selectedMission }
  );

  if (missions.isLoading) return <SkeletonPage />;

  const allMissions = missions.data ?? [];

  const filteredUnsorted = allMissions.filter((m) => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchDriver = !filterValues.driver || m.driverId === filterValues.driver;
    return matchSearch && matchDriver;
  });

  const filtered = [...filteredUnsorted].sort((a, b) => {
    const metaA = a.advertis_vector as Record<string, unknown> | null;
    const metaB = b.advertis_vector as Record<string, unknown> | null;

    if (sortBy === "deadline") {
      const dA = (metaA?.deadline as string) ?? "";
      const dB = (metaB?.deadline as string) ?? "";
      if (!dA && !dB) return 0;
      if (!dA) return 1;
      if (!dB) return -1;
      return new Date(dA).getTime() - new Date(dB).getTime();
    }

    if (sortBy === "budget") {
      const bA = (metaA?.budget as number) ?? 0;
      const bB = (metaB?.budget as number) ?? 0;
      return bB - bA; // highest budget first
    }

    // Default: by date posted (most recent first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const driverOptions = (drivers.data ?? []).map((d) => ({
    value: d.id,
    label: `${d.name} (${d.channel})`,
  }));

  const handleAccept = (missionId: string) => {
    updateMission.mutate({ id: missionId, status: "IN_PROGRESS" });
  };

  const detail = missionDetail.data;
  const detailVector = detail?.advertis_vector as Record<string, number> | null;
  const pillarScores: Partial<Record<PillarKey, number>> = {};
  if (detailVector) {
    ([...PILLAR_STORAGE_KEYS] as PillarKey[]).forEach((k) => {
      if (detailVector[k] != null) pillarScores[k] = detailVector[k];
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missions disponibles"
        description="Missions ouvertes correspondant a votre profil et tier"
        breadcrumbs={[
          { label: "Dashboard", href: "/creator" },
          { label: "Missions" },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <SearchFilter
            placeholder="Rechercher une mission..."
            value={search}
            onChange={setSearch}
            filters={[{ key: "driver", label: "Canal", options: driverOptions }]}
            filterValues={filterValues}
            onFilterChange={(key, value) =>
              setFilterValues((prev) => ({ ...prev, [key]: value }))
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "deadline" | "budget")}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 outline-none focus:border-zinc-600"
          >
            <option value="date">Plus recentes</option>
            <option value="deadline">Deadline (proche)</option>
            <option value="budget">Budget (eleve)</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Aucune mission disponible"
          description="Revenez plus tard pour consulter les nouvelles missions"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => {
            const meta = m.advertis_vector as Record<string, unknown> | null;
            const deadline = meta?.deadline as string | undefined;
            const budget = meta?.budget as number | undefined;

            return (
              <div
                key={m.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white line-clamp-2">
                    {m.title}
                  </h3>
                  <StatusBadge status={m.status} />
                </div>

                <div className="mt-3 space-y-2 text-xs text-zinc-400">
                  {deadline && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>
                        Deadline:{" "}
                        {new Date(deadline).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  {budget && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3" />
                      <span>
                        {new Intl.NumberFormat("fr-FR").format(budget)} XAF
                      </span>
                    </div>
                  )}
                  {m.driver && (
                    <div className="flex items-center gap-1.5">
                      <Radio className="h-3 w-3" />
                      <span>
                        {m.driver.name} ({m.driver.channel})
                      </span>
                    </div>
                  )}
                  {m.mode && (
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3 w-3" />
                      <span>
                        {m.mode === "COLLABORATIF" ? "Collaboratif" : "Dispatch"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setSelectedMission(m.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Details
                  </button>
                  <button
                    onClick={() => setAcceptDialog(m.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Accepter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mission detail modal */}
      <Modal
        open={!!selectedMission}
        onClose={() => setSelectedMission(null)}
        title="Details de la mission"
        size="lg"
      >
        {missionDetail.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-zinc-800" />
            ))}
          </div>
        ) : detail ? (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-white">{detail.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">
                {detail.strategy?.name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Canal</span>
                <p className="font-medium text-zinc-300">
                  {detail.driver?.channel ?? "N/A"}
                </p>
              </div>
              <div>
                <span className="text-zinc-500">Mode</span>
                <p className="font-medium text-zinc-300">
                  {detail.mode ?? "DISPATCH"}
                </p>
              </div>
              <div>
                <span className="text-zinc-500">Statut</span>
                <div className="mt-0.5">
                  <StatusBadge status={detail.status} />
                </div>
              </div>
              <div>
                <span className="text-zinc-500">Livrables</span>
                <p className="font-medium text-zinc-300">
                  {detail.deliverables?.length ?? 0}
                </p>
              </div>
            </div>

            {Object.keys(pillarScores).length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-zinc-400">
                  Focus pilliers ADVE
                </h4>
                <PillarProgress scores={pillarScores} />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedMission(null)}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setSelectedMission(null);
                  setAcceptDialog(detail.id);
                }}
                className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
              >
                Accepter la mission
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!acceptDialog}
        onClose={() => setAcceptDialog(null)}
        onConfirm={() => acceptDialog && handleAccept(acceptDialog)}
        title="Accepter la mission"
        message="Voulez-vous accepter cette mission ? Elle sera ajoutee a vos missions actives."
        confirmLabel="Accepter"
        variant="info"
      />
    </div>
  );
}
