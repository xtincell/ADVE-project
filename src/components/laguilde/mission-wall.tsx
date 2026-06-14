"use client";

/**
 * La Guilde — le mur des missions disponibles (lecture publique). ADR-0093.
 * Filtres secteur/catégorie/remote + recherche. Consomme laGuilde.listOpenMissions.
 */

import * as React from "react";
import { Search } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { Skeleton } from "@/components/primitives/skeleton";
import { cn } from "@/lib/utils";
import {
  GUILD_MISSION_CATEGORIES,
  GUILD_MISSION_CATEGORY_LABELS,
} from "@/lib/types/guild-mission-brief";
import { GuildMissionCard } from "./guild-mission-card";

export function MissionWall() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [remoteOnly, setRemoteOnly] = React.useState(false);
  const [limit, setLimit] = React.useState(24);

  const stats = trpc.laGuilde.stats.useQuery();
  const list = trpc.laGuilde.listOpenMissions.useQuery({
    search: search.trim() || undefined,
    category: (category || undefined) as (typeof GUILD_MISSION_CATEGORIES)[number] | undefined,
    remoteOnly: remoteOnly || undefined,
    limit,
  });

  const missions = list.data?.missions ?? [];
  const total = list.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Filtres */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (titre, secteur, ville…)"
            className="pl-9"
            aria-label="Rechercher une mission"
          />
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filtrer par catégorie"
          className="md:w-56"
        >
          <option value="">Toutes les catégories</option>
          {GUILD_MISSION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {GUILD_MISSION_CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={() => setRemoteOnly((v) => !v)}
          aria-pressed={remoteOnly}
          className={cn(
            "rounded-[var(--button-radius)] border px-4 py-2 text-sm font-medium transition-colors",
            remoteOnly
              ? "border-transparent bg-accent text-accent-foreground"
              : "border-border text-foreground-secondary hover:text-foreground",
          )}
        >
          Remote uniquement
        </button>
      </div>

      {/* Compteur */}
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {list.isLoading
          ? "Chargement des missions…"
          : `${total} mission${total > 1 ? "s" : ""} ouverte${total > 1 ? "s" : ""}`}
        {stats.data && stats.data.total > 0 && !search && !category && !remoteOnly ? (
          <span> · {stats.data.total} au total sur le mur</span>
        ) : null}
      </p>

      {/* Grille */}
      {list.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-[var(--card-radius)]" />
          ))}
        </div>
      ) : missions.length === 0 ? (
        <div className="rounded-[var(--card-radius)] border border-dashed border-border bg-background-subtle px-6 py-16 text-center">
          <p className="text-foreground">Aucune mission ne correspond à ces critères.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Élargissez la recherche, ou revenez bientôt — le mur se remplit chaque semaine.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {missions.map((m) => (
              <GuildMissionCard key={m.id} mission={m} />
            ))}
          </div>
          {missions.length < total && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setLimit((l) => l + 24)}
                className="rounded-[var(--button-radius)] border border-border px-5 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:text-foreground"
              >
                Voir plus
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
