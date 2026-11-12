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

import { PORTFOLIO_KIND_LABELS, PORTFOLIO_LIFECYCLE_LABELS } from "@/domain/portfolio-reference";
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

  if (isLoading) return <div className="text-sm text-foreground-secondary">Chargement…</div>;
  if (!data || data.length === 0) {
    return depth === 0 ? (
      <div className="rounded border border-dashed border-border p-6 text-center text-sm text-foreground-secondary">
        Aucune marque à ce niveau. Ajoutez une marque pour organiser son dossier.
      </div>
    ) : null;
  }

  return (
    <ul className="space-y-1" style={{ paddingLeft: depth > 0 ? "12px" : 0 }}>
      {data.map((node) => {
        const Icon = KIND_ICONS[node.nodeKind] ?? Box;

        return (
          <li key={node.id}>
            <Link
              href={`/cockpit/portfolio/${node.slug}?operator=${encodeURIComponent(operatorId)}`}
              className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-3 hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Icon className="h-4 w-4 opacity-70" />
              <span className="font-medium">{node.name}</span>
              <span className="rounded bg-accent/10 px-2 py-1 text-xs text-accent">
                {PORTFOLIO_KIND_LABELS[node.nodeKind] ?? "Élément du portefeuille"}
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
                <span className="rounded bg-error/10 px-1.5 py-0.5 text-[10px] uppercase text-error">{PORTFOLIO_LIFECYCLE_LABELS[node.lifecycle] ?? node.lifecycle}</span>
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
