"use client";

import { useState } from "react";
import { Radio, Plus, X, Briefcase, ToggleLeft, ToggleRight } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";

const ALL_CHANNELS = [
  { value: "INSTAGRAM", label: "Instagram", category: "DIGITAL", type: "Social" },
  { value: "FACEBOOK", label: "Facebook", category: "DIGITAL", type: "Social" },
  { value: "TIKTOK", label: "TikTok", category: "DIGITAL", type: "Social" },
  { value: "LINKEDIN", label: "LinkedIn", category: "DIGITAL", type: "Social" },
  { value: "TWITTER", label: "Twitter/X", category: "DIGITAL", type: "Social" },
  { value: "YOUTUBE", label: "YouTube", category: "DIGITAL", type: "Video" },
  { value: "VIDEO", label: "Video Production", category: "MEDIA", type: "Video" },
  { value: "PHOTOGRAPHY", label: "Photographie", category: "MEDIA", type: "Photo" },
  { value: "PRINT", label: "Print", category: "PHYSICAL", type: "Print" },
  { value: "OOH", label: "Affichage (OOH)", category: "PHYSICAL", type: "Print" },
  { value: "PR", label: "Relations Presse", category: "MEDIA", type: "PR" },
  { value: "EVENT", label: "Événementiel", category: "EXPERIENTIAL", type: "Event" },
  { value: "RADIO", label: "Radio", category: "MEDIA", type: "Audio" },
  { value: "TV", label: "Télévision", category: "MEDIA", type: "Video" },
];

const TYPE_COLORS: Record<string, string> = {
  Social: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  Video: "bg-purple-400/15 text-purple-400 ring-purple-400/30",
  Photo: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
  Print: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
  PR: "bg-pink-400/15 text-pink-400 ring-pink-400/30",
  Event: "bg-orange-400/15 text-orange-400 ring-orange-400/30",
  Audio: "bg-sky-400/15 text-sky-400 ring-sky-400/30",
};

function getExperienceLevel(missions: number): { label: string; color: string } {
  if (missions >= 20) return { label: "Expert", color: "text-emerald-400" };
  if (missions >= 10) return { label: "Confirmé", color: "text-blue-400" };
  if (missions >= 3) return { label: "Intermédiaire", color: "text-amber-400" };
  return { label: "Débutant", color: "text-zinc-400" };
}

export default function DriversPage() {
  const profile = trpc.guilde.getMyProfile.useQuery();
  const updateProfile = trpc.guilde.updateProfile.useMutation({
    onSuccess: () => profile.refetch(),
  });

  if (profile.isLoading) return <SkeletonPage />;

  const currentSpecialties = (profile.data?.driverSpecialties as string[] | null) ?? [];

  // Simulated mission counts per driver (from profile data or computed)
  const driverMissions = (profile.data?.advertis_vector as Record<string, number> | null) ?? {};

  const toggleSpecialty = (channel: string) => {
    const updated = currentSpecialties.includes(channel)
      ? currentSpecialties.filter((s) => s !== channel)
      : [...currentSpecialties, channel];

    updateProfile.mutate({ driverSpecialties: updated });
  };

  // Build cards from all channels, showing selected ones prominently
  const selectedChannels = ALL_CHANNELS.filter((c) =>
    currentSpecialties.includes(c.value)
  );
  const availableChannels = ALL_CHANNELS.filter(
    (c) => !currentSpecialties.includes(c.value)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers Maîtrisés"
        description="Gérez les canaux et drivers sur lesquels vous êtes spécialisé"
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Profil" },
          { label: "Drivers" },
        ]}
      />

      {/* Active driver cards */}
      {selectedChannels.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">
            Vos drivers ({selectedChannels.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selectedChannels.map((ch) => {
              const missions = driverMissions[ch.value] ?? 0;
              const experience = getExperienceLevel(missions);

              return (
                <div
                  key={ch.value}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{ch.label}</h4>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge
                          status={ch.type}
                          variantMap={TYPE_COLORS}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSpecialty(ch.value)}
                      className="text-emerald-400 transition-colors hover:text-emerald-300"
                      title="Marquer indisponible"
                    >
                      <ToggleRight className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
                    <div>
                      <p className="text-xs text-zinc-500">Niveau</p>
                      <p className={`text-sm font-medium ${experience.color}`}>
                        {experience.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Missions</p>
                      <p className="text-sm font-semibold text-zinc-200">{missions}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available drivers to add */}
      {availableChannels.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-400">
            Drivers disponibles
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {availableChannels.map((ch) => (
              <button
                key={ch.value}
                onClick={() => toggleSpecialty(ch.value)}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:border-zinc-700 hover:text-zinc-300"
              >
                <ToggleLeft className="h-4 w-4 text-zinc-600" />
                <span>{ch.label}</span>
                <StatusBadge
                  status={ch.type}
                  variantMap={TYPE_COLORS}
                  className="ml-auto"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state with onboarding guide */}
      {selectedChannels.length === 0 && (
        <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-8 text-center">
          <Radio className="mx-auto h-10 w-10 text-blue-400" />
          <h3 className="mt-3 text-sm font-semibold text-white">
            Aucun driver selectionne
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            Selectionnez les canaux de communication que vous maitrisez.
            Cela permettra de vous proposer des missions adaptees.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Choisissez au moins 1 driver pour recevoir des missions</span>
          </div>
        </div>
      )}
    </div>
  );
}
