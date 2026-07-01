"use client";

import { useState } from "react";
import { Users, Star, Briefcase, Radio } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilter } from "@/components/shared/search-filter";
import { TierBadge } from "@/components/shared/tier-badge";
import { Tabs } from "@/components/shared/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { SkeletonPage } from "@/components/shared/loading-skeleton";

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

export default function GuildPage() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  const members = trpc.guilde.list.useQuery({
    tier: tierFilter !== "all" ? (tierFilter as GuildTier) : undefined,
    limit: 50,
  });

  if (members.isLoading) return <SkeletonPage />;

  const allMembers = members.data ?? [];

  const filtered = allMembers.filter((m) =>
    (m.displayName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (m.skills as string[] ?? []).some((s: string) =>
      s.toLowerCase().includes(search.toLowerCase())
    )
  );

  const countByTier = (tier: string) =>
    filtered.filter((m) => tier === "all" || m.tier === tier).length;

  const tabs = [
    { key: "all", label: "Tous", count: filtered.length },
    { key: "APPRENTI", label: "Apprenti", count: countByTier("APPRENTI") },
    { key: "COMPAGNON", label: "Compagnon", count: countByTier("COMPAGNON") },
    { key: "MAITRE", label: "Maitre", count: countByTier("MAITRE") },
    { key: "ASSOCIE", label: "Associe", count: countByTier("ASSOCIE") },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Annuaire de la Guilde"
        description="Decouvrez les membres de la communaute, collaborez et progressez ensemble"
        breadcrumbs={[
          { label: "Dashboard", href: "/creator" },
          { label: "Communaute" },
          { label: "Guilde" },
        ]}
      />

      <Tabs
        tabs={tabs}
        activeTab={tierFilter}
        onChange={(key) => setTierFilter(key)}
      />

      <SearchFilter
        placeholder="Rechercher par nom ou competence..."
        value={search}
        onChange={setSearch}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun membre trouve"
          description="Essayez de modifier vos criteres de recherche."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((member) => {
            const memberSkills = (member.skills as string[] | null) ?? [];
            const specialties = (member.driverSpecialties as string[] | null) ?? [];

            return (
              <div
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-300">
                      {(member.displayName ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {member.displayName ?? "Creatif"}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {member.bio?.slice(0, 50) ?? "Membre de la guilde"}
                      </p>
                    </div>
                  </div>
                  <TierBadge tier={member.tier as GuildTier} size="sm" />
                </div>

                {/* Stats */}
                <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {member.totalMissions} missions
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {member.avgScore?.toFixed(1) ?? "N/A"}/10
                  </span>
                </div>

                {/* Skills */}
                {memberSkills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {memberSkills.slice(0, 4).map((skill: string) => (
                      <span
                        key={skill}
                        className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400"
                      >
                        {skill}
                      </span>
                    ))}
                    {memberSkills.length > 4 && (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                        +{memberSkills.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Specialties */}
                {specialties.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {specialties.slice(0, 3).map((s: string) => (
                      <span
                        key={s}
                        className="rounded-full bg-blue-400/10 px-2 py-0.5 text-[10px] text-blue-400"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Member detail modal */}
      <Modal
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title="Profil du membre"
        size="md"
      >
        {selectedMember && (() => {
          const mSkills = (selectedMember.skills as string[] | null) ?? [];
          const mSpecialties = (selectedMember.driverSpecialties as string[] | null) ?? [];
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-lg font-semibold text-zinc-300">
                  {(selectedMember.displayName ?? "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {selectedMember.displayName ?? "Creatif"}
                  </h3>
                  <div className="mt-0.5">
                    <TierBadge tier={selectedMember.tier as GuildTier} size="sm" />
                  </div>
                </div>
              </div>

              {selectedMember.bio && (
                <p className="text-sm text-zinc-400">{selectedMember.bio}</p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500">Missions completees</span>
                  <p className="mt-0.5 flex items-center gap-1 font-medium text-zinc-300">
                    <Briefcase className="h-3.5 w-3.5" />
                    {selectedMember.totalMissions ?? 0}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">Score moyen</span>
                  <p className="mt-0.5 flex items-center gap-1 font-medium text-zinc-300">
                    <Star className="h-3.5 w-3.5" />
                    {selectedMember.avgScore?.toFixed(1) ?? "N/A"}/10
                  </p>
                </div>
              </div>

              {mSkills.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium text-zinc-500">
                    Competences
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {mSkills.map((skill: string) => (
                      <span
                        key={skill}
                        className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {mSpecialties.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium text-zinc-500">
                    Specialites (Drivers)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {mSpecialties.map((s: string) => (
                      <span
                        key={s}
                        className="flex items-center gap-1 rounded-full bg-blue-400/10 px-2.5 py-1 text-xs text-blue-400"
                      >
                        <Radio className="h-3 w-3" />
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedMember(null)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Fermer
              </button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
