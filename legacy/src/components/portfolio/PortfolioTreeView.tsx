/**
 * <PortfolioTreeView /> — Phase 18 (ADR-0059) Brand Tree.
 *
 * Vue arborescente lisible du sous-arbre d'un BrandNode. Drill-down via
 * liens Next.js (URL-driven, pas de state collapse). Affiche pour chaque
 * nœud : kind badge, nature badge, country, cluster, lifecycle.
 *
 * Design simple : pas de virtualisation Phase 18-A0 (sous-arbres < 50
 * nœuds typiquement chez FrieslandCampina). Ajout virtualisation si besoin
 * en Phase 18 noyau.
 */

"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Folder, Box, Package, MapPin, Tag } from "lucide-react";

export interface PortfolioTreeViewProps {
  /** Operator owner. */
  operatorId: string;
  /** Si null : affiche les racines (CORPORATE / STANDALONE_BRAND). */
  parentNodeId: string | null;
  /** Profondeur courante (0 = racines, +1 par niveau pour indent). */
  depth?: number;
  /** Profondeur max à charger récursivement (anti-performance hot path). */
  maxDepth?: number;
}

const KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CORPORATE: Folder,
  MASTER_BRAND: Box,
  REGIONAL_CLUSTER: MapPin,
  REGIONAL_BRAND: MapPin,
  PRODUCT_LINE: Package,
  PRODUCT_VARIANT: Package,
  SKU: Package,
  STANDALONE_BRAND: Box,
};

const KIND_BADGE_COLOR: Record<string, string> = {
  CORPORATE: "bg-amber-500/15 text-amber-300",
  MASTER_BRAND: "bg-blue-500/15 text-blue-300",
  REGIONAL_CLUSTER: "bg-violet-500/15 text-violet-300",
  REGIONAL_BRAND: "bg-violet-500/10 text-violet-200",
  PRODUCT_LINE: "bg-emerald-500/15 text-emerald-300",
  PRODUCT_VARIANT: "bg-emerald-500/10 text-emerald-200",
  SKU: "bg-zinc-500/15 text-zinc-300",
  STANDALONE_BRAND: "bg-zinc-500/15 text-zinc-300",
};

export function PortfolioTreeView({
  operatorId,
  parentNodeId,
  depth = 0,
  maxDepth = 6,
}: PortfolioTreeViewProps) {
  const { data, isLoading } = trpc.brandNode.listChildren.useQuery({
    operatorId,
    parentNodeId,
  });

  if (isLoading) return <div className="text-sm text-foreground-secondary">Loading…</div>;
  if (!data || data.length === 0) {
    return depth === 0 ? (
      <div className="rounded border border-dashed border-zinc-700 p-6 text-center text-sm text-foreground-secondary">
        Aucun BrandNode racine. Crée un premier nœud (CORPORATE pour FrieslandCampina, ou STANDALONE_BRAND pour une marque solo).
      </div>
    ) : null;
  }

  return (
    <ul className="space-y-1" style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : 0 }}>
      {data.map((node) => {
        const Icon = KIND_ICONS[node.nodeKind] ?? Box;
        const badgeColor = KIND_BADGE_COLOR[node.nodeKind] ?? "bg-zinc-500/15 text-zinc-300";
        return (
          <li key={node.id}>
            <Link
              href={`/cockpit/portfolio/${node.slug}`}
              className="flex items-center gap-2 rounded p-1.5 hover:bg-zinc-800"
            >
              <Icon className="h-4 w-4 opacity-70" />
              <span className="font-medium">{node.name}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${badgeColor}`}>
                {node.nodeKind}
              </span>
              {node.countryCode && (
                <span className="text-xs text-foreground-secondary">[{node.countryCode}]</span>
              )}
              {node.clusterTag && (
                <span className="text-xs text-foreground-secondary">{node.clusterTag}</span>
              )}
              {node.nodeRole.length > 0 && (
                <span className="flex flex-wrap gap-0.5">
                  {node.nodeRole.slice(0, 3).map((role) => (
                    <span key={role} className="inline-flex items-center gap-0.5 rounded bg-accent/10 px-1 py-0.5 text-[10px] text-accent">
                      <Tag className="h-2.5 w-2.5" />{role}
                    </span>
                  ))}
                  {node.nodeRole.length > 3 && (
                    <span className="text-[10px] text-foreground-secondary">+{node.nodeRole.length - 3}</span>
                  )}
                </span>
              )}
              {node.lifecycle !== "ACTIVE" && (
                <span className="rounded bg-error/10 px-1.5 py-0.5 text-[10px] uppercase text-error">{node.lifecycle}</span>
              )}
            </Link>
            {depth < maxDepth - 1 && (
              <PortfolioTreeView
                operatorId={operatorId}
                parentNodeId={node.id}
                depth={depth + 1}
                maxDepth={maxDepth}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
