/**
 * /cockpit/portfolio/[corporateSlug] — Phase 18 (ADR-0052) Brand Tree.
 *
 * Détail d'un BrandNode (par slug) + drill-down de sa descendance.
 * Tous champs read + boutons "+ Ajouter enfant" / "Éditer" / "Archiver" 100%
 * manuels (Manual-first parity ADR-0053).
 *
 * Le slug pourrait potentiellement résoudre vers n'importe quel niveau de
 * l'arbre (corporate, master_brand, regional, etc.) — l'unique constraint
 * (operatorId, slug) garantit l'unicité.
 */

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { BrandNodeForm } from "@/components/portfolio/BrandNodeForm";
import { PortfolioTreeView } from "@/components/portfolio/PortfolioTreeView";
import { NodeBreadcrumb } from "@/components/portfolio/NodeBreadcrumb";
import { Plus, Edit3, Archive, MapPin, Tag, Calendar } from "lucide-react";

export default function PortfolioNodeDetailPage() {
  const params = useParams<{ corporateSlug: string }>();
  const router = useRouter();
  const slug = params.corporateSlug;

  const [mode, setMode] = useState<"VIEW" | "EDIT" | "CREATE_CHILD">("VIEW");

  const { data: operator } = trpc.operator.getOwn.useQuery();
  const { data: node, isLoading } = trpc.brandNode.getBySlug.useQuery(
    { operatorId: operator?.id ?? "", slug },
    { enabled: Boolean(operator?.id) },
  );

  const utils = trpc.useUtils();
  const archiveMutation = trpc.brandNode.delete.useMutation({
    onSuccess: () => {
      utils.brandNode.invalidate();
      router.push("/cockpit/portfolio");
    },
  });

  if (isLoading || !operator) return <div className="p-6 text-sm text-foreground-secondary">Loading…</div>;
  if (!node) {
    return (
      <div className="p-6">
        <NodeBreadcrumb nodeId="" />
        <div className="mt-4 rounded border border-error/30 bg-error/10 p-4 text-sm">
          BrandNode "<code>{slug}</code>" introuvable pour operator {operator.name}.
        </div>
      </div>
    );
  }

  const handleArchive = async () => {
    if (!confirm(`Archiver "${node.name}" ? L'archive est réversible mais les descendants ACTIVE doivent être archivés en premier.`)) return;
    await archiveMutation.mutateAsync({
      strategyId: node.strategyId ?? `audit:${operator.id}`,
      operatorId: operator.id,
      nodeId: node.id,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <NodeBreadcrumb nodeId={node.id} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-baseline gap-3 text-2xl font-semibold">
              {node.name}
              <span className="rounded bg-blue-500/15 px-2 py-0.5 text-xs uppercase tracking-wide text-blue-300">
                {node.nodeKind}
              </span>
              <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs uppercase tracking-wide">
                {node.nodeNature}
              </span>
            </h1>
            <code className="text-xs text-foreground-secondary">slug: {node.slug}</code>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMode((m) => (m === "EDIT" ? "VIEW" : "EDIT"))}
              className="inline-flex items-center gap-1 rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
            >
              <Edit3 className="h-4 w-4" /> Éditer
            </button>
            <button
              onClick={() => setMode((m) => (m === "CREATE_CHILD" ? "VIEW" : "CREATE_CHILD"))}
              className="inline-flex items-center gap-1 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/80"
            >
              <Plus className="h-4 w-4" /> Ajouter enfant
            </button>
            <button
              onClick={handleArchive}
              disabled={archiveMutation.isPending}
              className="inline-flex items-center gap-1 rounded border border-error/40 px-3 py-1.5 text-sm text-error hover:bg-error/10 disabled:opacity-50"
            >
              <Archive className="h-4 w-4" /> Archiver
            </button>
          </div>
        </div>
      </header>

      {/* Forms */}
      {mode === "EDIT" && (
        <div className="rounded border border-zinc-700 bg-zinc-900/50">
          <BrandNodeForm
            nodeId={node.id}
            operatorId={operator.id}
            parentNodeId={node.parentNodeId}
            strategyId={node.strategyId ?? `audit:${operator.id}`}
            onSuccess={() => {
              setMode("VIEW");
              utils.brandNode.invalidate();
            }}
            onCancel={() => setMode("VIEW")}
          />
        </div>
      )}

      {mode === "CREATE_CHILD" && (
        <div className="rounded border border-zinc-700 bg-zinc-900/50">
          <BrandNodeForm
            operatorId={operator.id}
            parentNodeId={node.id}
            strategyId={node.strategyId ?? `audit:${operator.id}`}
            clientId={node.clientId}
            onSuccess={() => {
              setMode("VIEW");
              utils.brandNode.invalidate();
            }}
            onCancel={() => setMode("VIEW")}
          />
        </div>
      )}

      {/* Metadata */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetaItem icon={<MapPin className="h-4 w-4" />} label="Country" value={node.countryCode ?? "—"} />
        <MetaItem icon={<MapPin className="h-4 w-4" />} label="Cluster" value={node.clusterTag ?? "—"} />
        <MetaItem icon={<Calendar className="h-4 w-4" />} label="Lifecycle" value={node.lifecycle} />
        <MetaItem
          icon={<Tag className="h-4 w-4" />}
          label="Roles"
          value={node.nodeRole.length === 0 ? "—" : node.nodeRole.join(", ")}
        />
      </section>

      {/* Children */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-foreground-secondary">
          Descendance directe
        </h2>
        <PortfolioTreeView operatorId={operator.id} parentNodeId={node.id} maxDepth={4} />
      </section>
    </div>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-foreground-secondary">
        {icon} {label}
      </div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
