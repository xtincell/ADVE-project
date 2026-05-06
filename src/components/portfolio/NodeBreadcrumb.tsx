/**
 * <NodeBreadcrumb /> — Phase 18 (ADR-0052) Brand Tree.
 *
 * Affiche le chemin ancêtres → nœud courant pour la navigation cockpit.
 * Collapse compact au-delà de 4 segments visibles (cas conglomérat type
 * Berkshire ou édition limitée saisonnière).
 */

"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { ChevronRight } from "lucide-react";

export interface NodeBreadcrumbProps {
  /** Le nœud courant (sa propre row sera ajoutée en fin de breadcrumb). */
  nodeId: string;
  /** Operator slug pour reconstruire les routes URL. */
  operatorSlug?: string;
}

export function NodeBreadcrumb({ nodeId }: NodeBreadcrumbProps) {
  const { data: ancestors } = trpc.brandNode.getAncestorPath.useQuery({ nodeId });
  const { data: current } = trpc.brandNode.get.useQuery({ nodeId });

  if (!current) return null;

  type Crumb = { id: string; name: string; slug: string; nodeKind: string };
  const path: Crumb[] = [
    ...((ancestors ?? []).slice().reverse() as Crumb[]),
    { id: current.id, name: current.name, slug: current.slug, nodeKind: current.nodeKind },
  ];
  const compact: Crumb[] =
    path.length > 5 && path[0]
      ? [path[0], { id: "...", name: "...", slug: "", nodeKind: "" }, ...path.slice(-3)]
      : path;

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-foreground-secondary" aria-label="Breadcrumb">
      <Link href="/cockpit/portfolio" className="hover:text-foreground hover:underline">
        Portfolio
      </Link>
      {compact.map((node, i) => (
        <span key={`${node.id}-${i}`} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 opacity-50" />
          {node.id === "..." ? (
            <span className="px-1 opacity-60">{node.name}</span>
          ) : i === compact.length - 1 ? (
            <span className="font-medium text-foreground" title={node.nodeKind}>
              {node.name}
            </span>
          ) : (
            <Link
              href={`/cockpit/portfolio/${node.slug}`}
              className="hover:text-foreground hover:underline"
              title={node.nodeKind}
            >
              {node.name}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
