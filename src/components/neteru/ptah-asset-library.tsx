"use client";

/**
 * <PtahAssetLibrary> — Neteru UI Kit (Layer 5).
 *
 * Galerie des assets matérialisés par Ptah pour une strategy. Filtres par
 * forgeKind + manipulationMode + pillar source.
 */

import { useState } from "react";
import Image from "next/image";
import { trpc } from "@/lib/trpc/client";
import { Hammer, Image as ImageIcon, Video, Music, Box } from "lucide-react";

const FORGE_KINDS = [
  { value: "image", label: "Images", icon: ImageIcon },
  { value: "video", label: "Vidéos", icon: Video },
  { value: "audio", label: "Audio", icon: Music },
  { value: "icon", label: "Icônes", icon: Box },
  { value: "refine", label: "Raffinés", icon: Hammer },
  { value: "transform", label: "Transformés", icon: Hammer },
  { value: "design", label: "Design", icon: Hammer },
] as const;

interface PtahAssetLibraryProps {
  strategyId: string;
}

export function PtahAssetLibrary({ strategyId }: PtahAssetLibraryProps) {
  const [filterKind, setFilterKind] = useState<string | null>(null);

  const { data: forges, isLoading } = trpc.ptah.listForges.useQuery({
    strategyId,
    forgeKind: filterKind as never,
    limit: 50,
  });

  if (isLoading) {
    return <div className="text-sm text-foreground-secondary">Chargement…</div>;
  }

  if (!forges || forges.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
        <Hammer className="mx-auto mb-3 h-8 w-8 text-foreground-tertiary" />
        <p className="text-sm text-foreground-secondary">
          Aucun asset forgé. Lance une forge depuis le formulaire ci-dessus.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterChip label="Tous" active={filterKind === null} onClick={() => setFilterKind(null)} />
        {FORGE_KINDS.map((k) => (
          <FilterChip
            key={k.value}
            label={k.label}
            active={filterKind === k.value}
            onClick={() => setFilterKind(k.value)}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {forges
          .filter((f) => f.versions.length > 0)
          .map((f) => (
            <ForgeCard key={f.id} forge={f} />
          ))}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-amber-500/15 text-amber-300"
          : "bg-white/5 text-foreground-secondary hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

interface Forge {
  id: string;
  forgeKind: string;
  provider: string;
  providerModel: string;
  pillarSource: string;
  manipulationMode: string;
  estimatedCostUsd: number;
  realisedCostUsd: number | null;
  expectedSuperfans: number | null;
  realisedSuperfans: number | null;
  status: string;
  versions: Array<{
    id: string;
    url: string;
    cdnUrl: string | null;
    kind: string;
    cultIndexDeltaObserved: number | null;
  }>;
}

function ForgeCard({ forge }: { forge: Forge }) {
  const v = forge.versions[0];
  if (!v) return null;
  const url = v.cdnUrl ?? v.url;
  const cps = forge.realisedSuperfans
    ? (forge.realisedCostUsd ?? forge.estimatedCostUsd) / forge.realisedSuperfans
    : null;

  return (
    <div className="group overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
      <div className="relative aspect-square overflow-hidden bg-black/40">
        {v.kind === "video" ? (
          <video src={url} className="h-full w-full object-cover" muted loop onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />
        ) : v.kind === "audio" ? (
          <div className="flex h-full items-center justify-center"><Music className="h-12 w-12 text-foreground-tertiary" /></div>
        ) : (
          <Image src={url} alt={forge.forgeKind} fill unoptimized className="object-cover transition-transform group-hover:scale-105" />
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">{forge.forgeKind}</span>
          <span className="text-[10px] uppercase tracking-wider text-foreground-tertiary">{forge.provider}</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-foreground-secondary">
          <span>P-{forge.pillarSource}</span>
          <span>·</span>
          <span>{forge.manipulationMode}</span>
          <span>·</span>
          <span>${(forge.realisedCostUsd ?? forge.estimatedCostUsd).toFixed(2)}</span>
        </div>
        {cps !== null && v.cultIndexDeltaObserved !== null && (
          <div className="mt-1 text-[10px] text-emerald-400">
            +{v.cultIndexDeltaObserved.toFixed(1)} cult · {forge.realisedSuperfans} sf · ${cps.toFixed(2)}/sf
          </div>
        )}
      </div>
    </div>
  );
}
