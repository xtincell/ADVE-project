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
import type { ForgeKind } from "@/server/services/ptah/types";
import { Hammer, Image as ImageIcon, Video, Music, Box } from "lucide-react";
import { readAssetBrandObservation } from "@/domain/asset-brand-observation";
import { cva } from "class-variance-authority";

const filterChip = cva("min-h-11 rounded-full px-3 py-1 text-xs font-medium transition-colors", {
  variants: { active: { true: "bg-accent-subtle text-accent", false: "bg-surface-raised text-foreground-secondary hover:bg-surface-elevated" } },
});

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
    forgeKind: (filterKind ?? undefined) as ForgeKind | undefined,
    limit: 50,
  });

  if (isLoading) {
    return <div className="text-sm text-foreground-secondary">Chargement…</div>;
  }

  if (!forges || forges.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-subtle p-8 text-center">
        <Hammer className="mx-auto mb-3 h-8 w-8 text-foreground-tertiary" />
        <p className="text-sm text-foreground-secondary">
          Votre bibliothèque est vide. Lancez une création depuis le formulaire ci-dessus.
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
            <ForgeCard key={f.id} forge={f} strategyId={strategyId} />
          ))}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={filterChip({ active })}
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
    metadata: unknown;
  }>;
}

function ForgeCard({ forge, strategyId }: { forge: Forge; strategyId: string }) {
  const v = forge.versions[0];
  if (!v) return null;
  const url = v.cdnUrl ?? v.url;
  const observation = readAssetBrandObservation(v.metadata, v.id, strategyId);

  return (
    <div className="group overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
      <div className="relative aspect-square overflow-hidden bg-surface-elevated">
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
          <span className="text-xs uppercase tracking-wider text-foreground-tertiary">{forge.provider}</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-foreground-secondary">
          <span>P-{forge.pillarSource}</span>
          <span>·</span>
          <span>{forge.manipulationMode}</span>
          <span>·</span>
          <span>${(forge.realisedCostUsd ?? forge.estimatedCostUsd).toFixed(2)}</span>
        </div>
        {observation && (
          <details className="mt-1 text-xs text-foreground-secondary">
            <summary className="min-h-11 cursor-pointer">Évolution globale de la marque : {observation.delta > 0 ? "+" : ""}{observation.delta.toFixed(1)} points</summary>
            <p className="mt-1">
              Indice de marque : {observation.before.score.toFixed(1)} le {new Date(observation.before.measuredAt).toLocaleDateString("fr-FR")}
              {" → "}{observation.after.score.toFixed(1)} le {new Date(observation.after.measuredAt).toLocaleDateString("fr-FR")}.
              {" "}Publication reçue le {new Date(observation.publication.publishedAt).toLocaleDateString("fr-FR")}.
              {" "}Comparaison de deux relevés de la marque ; d’autres actions peuvent y contribuer.
            </p>
          </details>
        )}
      </div>
    </div>
  );
}
