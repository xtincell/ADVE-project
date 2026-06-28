"use client";

/**
 * La Guilde — le mur des services (gigs prestataires, lecture publique). ADR-0117.
 * Les talents listent leurs offres (prix indicatif) ; les marques les parcourent.
 * Consomme talentServices.listPublic (publicProcedure). Recherche + filtre catégorie
 * côté client (le catalogue tient en une page).
 */

import * as React from "react";
import { Search, Wallet, Clock, Star } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { Skeleton } from "@/components/primitives/skeleton";
import { Card, CardBody } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";

function formatPrice(amount: number, currency: string, unit: string): string {
  const cur = currency === "XAF" || currency === "XOF" ? "FCFA" : currency;
  const u = unit === "FORFAIT" ? "" : `/${unit.toLowerCase()}`;
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount))} ${cur}${u}`;
}

export function ServicesWall() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("");

  const list = trpc.talentServices.listPublic.useQuery({ limit: 100 });
  const services = list.data ?? [];

  const categories = React.useMemo(
    () => Array.from(new Set(services.map((s) => s.category).filter((c): c is string => !!c))).sort(),
    [services],
  );

  const filtered = services.filter((s) => {
    if (category && s.category !== category) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!s.title.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Filtres */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un service (photo, vidéo, copywriting…)"
            className="pl-9"
            aria-label="Rechercher un service"
          />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filtrer par catégorie" className="md:w-56">
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>

      {/* Compteur */}
      {!list.isLoading && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} service{filtered.length > 1 ? "s" : ""} disponible{filtered.length > 1 ? "s" : ""}
        </p>
      )}

      {/* Grille */}
      {list.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[var(--card-radius)] border border-border bg-background-subtle p-10 text-center">
          <p className="text-foreground-secondary">Aucun service ne correspond. Les talents publient leurs offres depuis leur espace créateur.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} surface="raised" className="h-full">
              <CardBody className="flex h-full flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  {s.category ? <Badge tone="accent">{s.category}</Badge> : <span />}
                  <Badge tone="neutral" className="gap-1"><Star className="h-3 w-3" />{s.talentProfile.tier}</Badge>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="line-clamp-2 font-semibold tracking-tight text-foreground">{s.title}</h3>
                  <p className="text-xs text-muted-foreground">{s.talentProfile.displayName}</p>
                </div>
                <p className="line-clamp-3 text-sm text-foreground-secondary">{s.description}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-sm">
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <Wallet className="h-3.5 w-3.5" /> {formatPrice(s.priceAmount, s.currency, s.priceUnit)}
                  </span>
                  {s.deliveryDays ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {s.deliveryDays} j
                    </span>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
