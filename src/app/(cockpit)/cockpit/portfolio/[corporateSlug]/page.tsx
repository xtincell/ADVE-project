/**
 * /cockpit/portfolio/[corporateSlug] — Phase 18 (ADR-0059) Brand Tree.
 *
 * Détail d'un BrandNode (par slug) + drill-down de sa descendance.
 * Tous champs read + boutons "+ Ajouter enfant" / "Éditer" / "Archiver" 100%
 * manuels (Manual-first parity ADR-0060).
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
import { ADVE_STORAGE_KEYS, RTIS_STORAGE_KEYS } from "@/domain/pillars";
import { useStrategy } from "@/components/cockpit/strategy-context";
import { Plus, Edit3, Archive, MapPin, Tag, Calendar, Rocket, Sparkles } from "lucide-react";

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
          <div className="flex flex-wrap gap-2">
            <BrandPlatformCta
              nodeId={node.id}
              nodeName={node.name}
              nodeKind={node.nodeKind}
              operatorId={operator.id}
              clientId={node.clientId}
              strategyId={node.strategyId}
            />
            <button
              onClick={() => setMode((m) => (m === "EDIT" ? "VIEW" : "EDIT"))}
              className="inline-flex items-center gap-1 rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
            >
              <Edit3 className="h-4 w-4" /> Éditer
            </button>
            <button
              onClick={() => setMode((m) => (m === "CREATE_CHILD" ? "VIEW" : "CREATE_CHILD"))}
              className="inline-flex items-center gap-1 rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
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

      {/* Phase 18-N1/N8 — Inheritance résolue (badges) */}
      <InheritanceSection nodeId={node.id} />

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

// ──────────────────────────────────────────────────────────────────────
// BrandPlatformCta — Phase 18 (round 7, 2026-05-07)
// ──────────────────────────────────────────────────────────────────────
//
// Bouton contextuel sur la page portfolio d'un BrandNode :
//   - Strategy déjà attachée → "Ouvrir la plateforme de marque" : set le
//     strategyId actif dans le contexte cockpit + nav vers /cockpit/brand/strategy
//   - Pas de Strategy → "Créer la plateforme de marque" : crée la Strategy
//     puis l'attache au BrandNode via brandNode.attachStrategy.
//
// User intent (2026-05-07) : "un produit ou un service doit avoir un bouton
// ou une option sur la page produit qui permet d'ouvrir ou de creer sa
// plateforme de marque". Modèle UPgraders → le service consulting/matching
// n'a PAS besoin de plateforme (peut rester sans Strategy), mais LaFusée
// produit a SA plateforme propre. Le bouton est neutre et n'oblige pas la
// création — c'est l'opérateur qui décide.

function BrandPlatformCta({
  nodeId,
  nodeName,
  nodeKind,
  operatorId,
  clientId,
  strategyId,
}: {
  nodeId: string;
  nodeName: string;
  nodeKind: string;
  operatorId: string;
  clientId: string | null;
  strategyId: string | null;
}) {
  const router = useRouter();
  const { setStrategyId } = useStrategy();
  const utils = trpc.useUtils();

  const createStrategy = trpc.strategy.create.useMutation();
  const attachStrategy = trpc.brandNode.attachStrategy.useMutation();

  const isPending = createStrategy.isPending || attachStrategy.isPending;

  if (strategyId) {
    return (
      <button
        type="button"
        onClick={() => {
          setStrategyId(strategyId);
          router.push("/cockpit/brand/strategy");
        }}
        className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/80"
        title={`Plateforme de marque ${nodeName} (Strategy attachée)`}
      >
        <Rocket className="h-4 w-4" />
        Ouvrir la plateforme de marque
      </button>
    );
  }

  const handleCreate = async () => {
    if (!confirm(
      `Créer la plateforme de marque pour "${nodeName}" ?\n\n` +
      `Cela génère une Strategy ADVE-RTIS attachée au BrandNode (${nodeKind}). ` +
      `Tu pourras ensuite éditer les piliers, lancer Artemis, et générer l'Oracle.`,
    )) return;
    try {
      const newStrategy = await createStrategy.mutateAsync({
        name: nodeName,
        operatorId,
        clientId: clientId ?? undefined,
      });
      await attachStrategy.mutateAsync({ nodeId, strategyId: newStrategy.id, operatorId });
      await utils.brandNode.invalidate();
      await utils.strategy.invalidate();
      setStrategyId(newStrategy.id);
      router.push("/cockpit/brand/strategy");
    } catch (err) {
      alert(`Création échouée : ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent hover:border-accent hover:bg-accent/20 disabled:opacity-50"
      title={`Créer la plateforme de marque pour ${nodeName}`}
    >
      <Sparkles className="h-4 w-4" />
      {isPending ? "Création…" : "Créer la plateforme de marque"}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// InheritanceSection — Phase 18-N1/N8
// ──────────────────────────────────────────────────────────────────────

function InheritanceSection({ nodeId }: { nodeId: string }) {
  const { data: resolved } = trpc.brandNode.resolveEffectivePillars.useQuery({ nodeId });
  if (!resolved) return null;

  const SOURCE_COLORS: Record<string, string> = {
    OWN_OVERRIDE: "bg-amber-500/15 text-amber-300",
    OWN_VIA_STRATEGY: "bg-emerald-500/15 text-emerald-300",
    INHERITED_FROM: "bg-blue-500/15 text-blue-300",
    DEFAULT_EMPTY: "bg-zinc-500/15 text-zinc-400",
  };
  const SOURCE_LABELS: Record<string, string> = {
    OWN_OVERRIDE: "🟡 OVERRIDE",
    OWN_VIA_STRATEGY: "🟢 OWN",
    INHERITED_FROM: "🔵 INHERITED",
    DEFAULT_EMPTY: "⚪ EMPTY",
  };

  const ADVE = ADVE_STORAGE_KEYS;
  const RTIS = RTIS_STORAGE_KEYS;

  return (
    <section className="rounded border border-zinc-700">
      <header className="border-b border-zinc-700 px-4 py-2 flex items-center gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide">
          Piliers ADVE/RTIS résolus (héritage)
        </h2>
        <span className="text-xs text-foreground-secondary">
          Phase 18-N1 — résolution remontée arbre
        </span>
      </header>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        {ADVE.map((key) => {
          const v = resolved.pillars[key];
          return (
            <div key={key} className="rounded border border-zinc-800 bg-zinc-900/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-semibold uppercase">{key}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${SOURCE_COLORS[v.source] ?? ""}`}>
                  {SOURCE_LABELS[v.source] ?? v.source}
                </span>
              </div>
              {v.provenanceNodeName && (
                <div className="mt-1 text-[10px] text-foreground-secondary" title={`Distance: ${v.inheritanceDistance}`}>
                  ← {v.provenanceNodeName}
                </div>
              )}
              <div className="mt-1 text-[10px] text-foreground-secondary">
                {v.content === null ? "(pas de contenu)" : `${Object.keys((v.content as object) ?? {}).length} champs`}
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-zinc-800 px-4 py-2">
        <div className="text-[10px] uppercase tracking-wide text-foreground-secondary">
          RTIS (dérivés ADR-0023 — recalculés via ENRICH_*)
        </div>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RTIS.map((key) => {
            const v = resolved.pillars[key];
            return (
              <div key={key} className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold uppercase">{key}</span>
                <span className={`rounded px-1 py-0.5 text-[9px] uppercase ${SOURCE_COLORS[v.source] ?? ""}`}>
                  {SOURCE_LABELS[v.source] ?? v.source}
                </span>
                {v.provenanceNodeName && (
                  <span className="text-foreground-secondary">← {v.provenanceNodeName}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
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
