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

import { usePortfolioOperator } from "@/components/portfolio/use-portfolio-operator";
import { BrandWorkspace } from "@/components/portfolio/BrandWorkspace";
import { PORTFOLIO_KIND_LABELS, PORTFOLIO_LIFECYCLE_LABELS } from "@/domain/portfolio-reference";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { BrandNodeForm } from "@/components/portfolio/BrandNodeForm";
import { PortfolioTreeView } from "@/components/portfolio/PortfolioTreeView";
import { NodeBreadcrumb } from "@/components/portfolio/NodeBreadcrumb";
import { ADVE_STORAGE_KEYS, RTIS_STORAGE_KEYS } from "@/domain/pillars";
import { useStrategy } from "@/components/cockpit/strategy-context";
import { Plus, Edit3, Archive, MapPin, Tag, Calendar, Rocket, Sparkles } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/shared/notification-toast";

export default function PortfolioNodeDetailPage() {
  const params = useParams<{ corporateSlug: string }>();
  const router = useRouter();
  const slug = params.corporateSlug;

  const [mode, setMode] = useState<"VIEW" | "EDIT" | "CREATE_CHILD">("VIEW");
  // Déclaré ICI avec les autres hooks, AVANT les early returns isLoading/!node
  // plus bas — sinon Rules of Hooks violée (React #310).
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const { operator, isLoading: operatorLoading, error: operatorError } = usePortfolioOperator();
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

  if (operatorError) return <p role="alert" className="p-6 text-error">{operatorError.message}</p>;
  if (!operatorLoading && !operator) return <p className="p-6">Aucune équipe accessible pour ce portefeuille.</p>;
  if (isLoading || !operator) return <div className="p-6 text-sm text-foreground-secondary">Chargement…</div>;
  if (!node) {
    return (
      <div className="p-6">
        <NodeBreadcrumb nodeId="" />
        <div className="mt-4 rounded border border-error/30 bg-error/10 p-4 text-sm">
          Marque "<code>{slug}</code>" introuvable dans l’équipe {operator.name}.
        </div>
      </div>
    );
  }

  const doArchive = async () => {
    setArchiveConfirmOpen(false);
    await archiveMutation.mutateAsync({
      strategyId: node.strategyId ?? `audit:${operator.id}`,
      operatorId: operator.id,
      nodeId: node.id,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-2">
        <NodeBreadcrumb nodeId={node.id} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex flex-wrap items-baseline gap-3 font-display text-3xl font-semibold">
              {node.name}
              <span className="rounded bg-info/15 px-2 py-0.5 text-xs uppercase tracking-wide text-info">
                {PORTFOLIO_KIND_LABELS[node.nodeKind] ?? "Élément du portefeuille"}
              </span>
              <span className="rounded bg-surface-overlay px-2 py-0.5 text-xs uppercase tracking-wide">
                {PORTFOLIO_LIFECYCLE_LABELS[node.lifecycle] ?? node.lifecycle}
              </span>
            </h1>
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
              className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-sm hover:bg-card"
            >
              <Edit3 className="h-4 w-4" /> Éditer
            </button>
            <button
              onClick={() => setMode((m) => (m === "CREATE_CHILD" ? "VIEW" : "CREATE_CHILD"))}
              className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-sm hover:bg-card"
            >
              <Plus className="h-4 w-4" /> Ajouter un élément
            </button>
            <button
              onClick={() => setArchiveConfirmOpen(true)}
              disabled={archiveMutation.isPending}
              className="inline-flex items-center gap-1 rounded border border-error/40 px-3 py-1.5 text-sm text-error hover:bg-error/10 disabled:opacity-50"
            >
              <Archive className="h-4 w-4" /> Archiver
            </button>
            <ConfirmDialog
              open={archiveConfirmOpen}
              onClose={() => setArchiveConfirmOpen(false)}
              onConfirm={() => void doArchive()}
              variant="warning"
              title={`Archiver « ${node.name} » ?`}
              message="L'archivage est réversible, mais les descendants actifs doivent être archivés en premier."
              confirmLabel="Archiver"
            />
          </div>
        </div>
      </header>

      {/* Forms */}
      {mode === "EDIT" && (
        <div className="rounded border border-border bg-surface-raised/50">
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
        <div className="rounded border border-border bg-surface-raised/50">
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

      <BrandWorkspace nodeId={node.id} />
      <details className="border-t border-border pt-4">
        <summary className="cursor-pointer text-sm text-foreground-secondary">Arbre complet et héritage stratégique</summary>
        <div className="mt-5 space-y-6">
          <InheritanceSection nodeId={node.id} />
          <PortfolioTreeView operatorId={operator.id} parentNodeId={node.id} maxDepth={4} />
        </div>
      </details>
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
  const toast = useToast();
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);

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
    setCreateConfirmOpen(false);
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
      toast.error(`Création échouée : ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setCreateConfirmOpen(true)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent hover:border-accent hover:bg-accent/20 disabled:opacity-50"
        title={`Créer la plateforme de marque pour ${nodeName}`}
      >
        <Sparkles className="h-4 w-4" />
        {isPending ? "Création…" : "Créer la plateforme de marque"}
      </button>
      <ConfirmDialog
        open={createConfirmOpen}
        onClose={() => setCreateConfirmOpen(false)}
        onConfirm={() => void handleCreate()}
        variant="info"
        title={`Créer la plateforme de marque pour « ${nodeName} » ?`}
        message="Vous pourrez ensuite éditer les piliers et générer l'Oracle."
        confirmLabel="Créer"
      />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// InheritanceSection — Phase 18-N1/N8
// ──────────────────────────────────────────────────────────────────────

function InheritanceSection({ nodeId }: { nodeId: string }) {
  const { data: resolved } = trpc.brandNode.resolveEffectivePillars.useQuery({ nodeId });
  if (!resolved) return null;

  const SOURCE_COLORS: Record<string, string> = {
    OWN_OVERRIDE: "bg-warning/15 text-warning",
    OWN_VIA_STRATEGY: "bg-success/15 text-success",
    INHERITED_FROM: "bg-info/15 text-info",
    DEFAULT_EMPTY: "bg-foreground-muted/15 text-foreground-secondary",
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
    <section className="rounded border border-border">
      <header className="border-b border-border px-4 py-2 flex items-center gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide">
          Piliers résolus (héritage)
        </h2>
        <span className="text-xs text-foreground-secondary">
          Phase 18-N1 — résolution remontée arbre
        </span>
      </header>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        {ADVE.map((key) => {
          const v = resolved.pillars[key];
          return (
            <div key={key} className="rounded border border-border-subtle bg-surface-raised/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-semibold uppercase">{key}</span>
                <span className={`rounded px-1.5 py-0.5 text-2xs uppercase ${SOURCE_COLORS[v.source] ?? ""}`}>
                  {SOURCE_LABELS[v.source] ?? v.source}
                </span>
              </div>
              {v.provenanceNodeName && (
                <div className="mt-1 text-2xs text-foreground-secondary" title={`Distance: ${v.inheritanceDistance}`}>
                  ← {v.provenanceNodeName}
                </div>
              )}
              <div className="mt-1 text-2xs text-foreground-secondary">
                {v.content === null ? "(pas de contenu)" : `${Object.keys((v.content as object) ?? {}).length} champs`}
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border-subtle px-4 py-2">
        <div className="text-2xs uppercase tracking-wide text-foreground-secondary">
          Piliers stratégiques (dérivés — recalculés automatiquement)
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
    <div className="rounded border border-border-subtle bg-surface-raised/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-foreground-secondary">
        {icon} {label}
      </div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
