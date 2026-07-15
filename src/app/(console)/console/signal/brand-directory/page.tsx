"use client";

/**
 * /console/signal/brand-directory — ADR-0151.
 *
 * La base de marques de Seshat : chaque recherche `/scorer` (empreinte publique
 * d'une marque hors-plateforme) y est conservée. Lecture seule — rend le
 * répertoire visible (jamais un magasin silencieux). Dernière observation par
 * marque + nombre d'observations. Sans PII.
 *
 * missionContribution: GROUND_INFRASTRUCTURE
 * groundJustification: surface opérateur interne — visibilité de la base de
 *   connaissance marché accumulée par Seshat. Jamais exposée au client.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Input, Badge } from "@/components/primitives";
import { Database, Globe } from "lucide-react";

export default function BrandDirectoryPage() {
  const [q, setQ] = useState("");
  const { data: rows, isLoading } = trpc.footprint.directory.useQuery({ limit: 500 });

  if (isLoading) return <SkeletonPage />;

  const filtered = (rows ?? []).filter((r) =>
    q.trim() ? `${r.name} ${r.brandKey} ${r.sectorSlug ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()) : true,
  );

  return (
    <section className="space-y-6">
      <PageHeader
        title="Base de marques — Seshat"
        description="Chaque marque scorée sur /scorer est conservée ici. Répertoire d'empreintes publiques (aucune donnée perdue), dernière observation par marque."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm">
          <Database className="h-4 w-4 text-foreground-muted" aria-hidden />
          <span className="font-mono">{rows?.length ?? 0}</span>
          <span className="text-foreground-muted">marques observées</span>
        </div>
        <Input
          placeholder="Filtrer (nom, domaine, secteur)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/40 px-6 py-16 text-center">
          <Globe className="h-8 w-8 text-foreground-muted" aria-hidden />
          <p className="mt-3 text-sm text-foreground-secondary">
            {rows && rows.length > 0 ? "Aucune marque ne correspond au filtre." : "Aucune marque observée pour l'instant."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wider text-foreground-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Marque</th>
                <th className="px-4 py-3 font-medium">Clé / domaine</th>
                <th className="px-4 py-3 font-medium">Secteur</th>
                <th className="px-4 py-3 font-medium">Empreinte</th>
                <th className="px-4 py-3 font-medium">Observations</th>
                <th className="px-4 py-3 font-medium">Dernier scan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.brandKey} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {r.name}
                    {r.countryCode ? <span className="ml-1.5 text-xs text-foreground-muted">{r.countryCode}</span> : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground-secondary">{r.brandKey}</td>
                  <td className="px-4 py-3 text-foreground-secondary">{r.sectorSlug ?? "—"}</td>
                  <td className="px-4 py-3">
                    {r.total === null ? (
                      <span className="text-foreground-muted">non mesurable</span>
                    ) : (
                      <span className="font-mono font-semibold text-foreground">{r.total}/100</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{r.observations}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground-muted">
                    {new Date(r.lastCapturedAt).toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
