/**
 * <BrandNodeForm /> — Phase 18 (ADR-0059) Brand Tree.
 *
 * Form de création / édition d'un BrandNode 100% manuel (Manual-first parity
 * ADR-0060). Tous les champs sont éditables : name, slug, parentNodeId picker,
 * nodeKind dropdown filtré par nodeNature (via BRAND_NATURE_ARCHETYPES),
 * countryCode, clusterTag, lifecycle, nodeRole tags.
 *
 * Le LLM (wizard portfolio-bulk-import) appelle les **mêmes endpoints**
 * (`brandNode.create` / `brandNode.update`) qu'un opérateur humain via ce form.
 */

"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  ALL_BRAND_NATURES,
  BRAND_NATURE_ARCHETYPES,
  getValidChildKinds,
} from "@/domain/brand-nature-archetypes";
import type { BrandNature } from "@prisma/client";
import { PORTFOLIO_KIND_LABELS, PORTFOLIO_LIFECYCLE_LABELS, PORTFOLIO_NATURE_LABELS } from "@/domain/portfolio-reference";

export interface BrandNodeFormProps {
  /** Si fourni : mode édition. Sinon : mode création. */
  nodeId?: string;
  /** Operator owner — toujours requis. */
  operatorId: string;
  /** Si pré-rempli : parent par défaut (cas "+ Ajouter sous ce nœud"). */
  parentNodeId?: string | null;
  /** Strategy pivot pour audit trail (cf. Intent payloads). */
  strategyId: string;
  /** Si fourni : client business owner (FC etc.). */
  clientId?: string | null;
  /** Callback après succès (close modal, refresh liste, etc.). */
  onSuccess?: (nodeId: string) => void;
  /** Callback annulation. */
  onCancel?: () => void;
}

interface FormState {
  name: string;
  slug: string;
  nodeKind: string;
  nodeNature: BrandNature;
  countryCode: string | null;
  clusterTag: string | null;
  nodeRole: string[];
  attachStrategyId: string | null;
  lifecycle: string;
}

const INITIAL_STATE: FormState = {
  name: "",
  slug: "",
  nodeKind: "STANDALONE_BRAND",
  nodeNature: "PRODUCT",
  countryCode: null,
  clusterTag: null,
  nodeRole: [],
  attachStrategyId: null,
  lifecycle: "ACTIVE",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function BrandNodeForm({
  nodeId,
  operatorId,
  parentNodeId,
  strategyId,
  clientId,
  onSuccess,
  onCancel,
}: BrandNodeFormProps) {
  const isEdit = Boolean(nodeId);
  const platforms = trpc.strategy.list.useQuery({ operatorId }, { enabled: !isEdit });
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [roleInput, setRoleInput] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  // Fetch parent kind for filtering valid child nodeKinds (cascade canonique)
  const { data: parent } = trpc.brandNode.get.useQuery(
    { nodeId: parentNodeId ?? "" },
    { enabled: Boolean(parentNodeId) },
  );

  // Fetch existing node for edit mode
  const { data: existingNode, isLoading: existingLoading } = trpc.brandNode.get.useQuery(
    { nodeId: nodeId ?? "" },
    { enabled: Boolean(nodeId) },
  );

  useEffect(() => {
    if (existingNode) {
      setState({
        name: existingNode.name,
        slug: existingNode.slug,
        nodeKind: existingNode.nodeKind,
        nodeNature: existingNode.nodeNature,
        countryCode: existingNode.countryCode,
        clusterTag: existingNode.clusterTag,
        nodeRole: existingNode.nodeRole,
        attachStrategyId: existingNode.strategyId,
        lifecycle: existingNode.lifecycle,
      });
      setAutoSlug(false);
    }
  }, [existingNode]);

  const utils = trpc.useUtils();

  const createMutation = trpc.brandNode.create.useMutation({
    onSuccess: (res) => {
      utils.brandNode.listChildren.invalidate();
      utils.brandNode.listRoots.invalidate();
      if (res.ok) onSuccess?.(res.node.id);
    },
    onError: (err) => setError(err.message),
  });

  const updateMutation = trpc.brandNode.update.useMutation({
    onSuccess: (res) => {
      utils.brandNode.get.invalidate({ nodeId });
      utils.brandNode.listChildren.invalidate();
      if (res.ok) onSuccess?.(res.node.id);
    },
    onError: (err) => setError(err.message),
  });

  // Editing cannot change the kind. Display the recorded kind even when the
  // parent is not supplied, rather than the first allowed root option.
  const validKinds = isEdit ? [state.nodeKind] : getValidChildKinds(parent?.nodeKind ?? null, state.nodeNature);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!state.name.trim()) return setError("Nom requis");
    if (!state.slug.trim()) return setError("Adresse du dossier requise");
    if (!state.nodeKind) return setError("Type de dossier requis");

    if (isEdit && nodeId) {
      await updateMutation.mutateAsync({
        strategyId,
        operatorId,
        nodeId,
        expectedUpdatedAt: existingNode?.updatedAt.toISOString(),
        patches: {
          name: state.name,
          slug: state.slug,
          countryCode: state.countryCode,
          clusterTag: state.clusterTag,
          nodeRole: state.nodeRole,
          ...(state.lifecycle !== existingNode?.lifecycle ? { lifecycle: state.lifecycle } : {}),
        },
      });
    } else {
      await createMutation.mutateAsync({
        strategyId,
        operatorId,
        clientId: clientId ?? null,
        parentNodeId: parentNodeId ?? null,
        name: state.name,
        slug: state.slug,
        nodeKind: state.nodeKind,
        nodeNature: state.nodeNature,
        nodeRole: state.nodeRole,
        countryCode: state.countryCode,
        clusterTag: state.clusterTag,
        attachStrategyId: state.attachStrategyId,
      });
    }
  };

  if (isEdit && existingLoading) {
    return <div className="text-foreground-secondary">Chargement…</div>;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold">
        {isEdit ? "Modifier le dossier" : `Nouveau dossier${parent ? ` sous « ${parent.name} »` : " (racine)"}`}
      </h2>

      {error && <div className="rounded bg-error/15 p-2 text-sm text-error">{error}</div>}

      {!isEdit && <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Plateforme de marque existante</span>
        <select aria-label="Plateforme de marque existante" value={state.attachStrategyId ?? ""}
          onChange={(e) => {
            const selected = platforms.data?.find((row) => row.id === e.target.value);
            setState((current) => ({ ...current, attachStrategyId: selected?.id ?? null,
              ...(!current.name && selected ? { name: selected.name, slug: slugify(selected.name) } : {}) }));
          }} className="rounded border border-border bg-surface-raised px-2 py-1.5">
          <option value="">À créer ou rattacher plus tard</option>
          {(platforms.data ?? []).filter((row) => !row.brandNode).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
        {platforms.error && <span role="alert" className="text-xs text-warning">Les plateformes existantes n’ont pas pu être relues. Vous pouvez créer le dossier sans rattachement.</span>}
        <span className="text-xs text-foreground-secondary">Choisissez un dossier déjà commencé pour conserver ses réponses et ses sources.</span>
      </label>}
      {/* Name + Slug */}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Nom</span>
        <input
          type="text"
          required
          value={state.name}
          onChange={(e) => {
            const name = e.target.value;
            setState((s) => ({
              ...s,
              name,
              slug: autoSlug ? slugify(name) : s.slug,
            }));
          }}
          className="rounded border border-border bg-surface-raised px-2 py-1.5"
          placeholder="ex: Bonnet Rouge Global"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Adresse du dossier (unique dans cette équipe)</span>
        <input
          type="text"
          required
          value={state.slug}
          onChange={(e) => {
            setState((s) => ({ ...s, slug: e.target.value }));
            setAutoSlug(false);
          }}
          pattern="[a-z0-9\-]+"
          className="rounded border border-border bg-surface-raised px-2 py-1.5 font-mono text-xs"
          placeholder="bonnet-rouge-global"
        />
      </label>

      {isEdit && <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">État du dossier</span>
        <select value={state.lifecycle} onChange={(e) => setState((s) => ({ ...s, lifecycle: e.target.value }))} className="rounded border border-border bg-surface-raised px-2 py-1.5">
          {!PORTFOLIO_LIFECYCLE_LABELS[state.lifecycle] && <option value={state.lifecycle}>État historique à préciser</option>}
          {Object.entries(PORTFOLIO_LIFECYCLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <span className="text-xs text-foreground-secondary">Un dossier archivé se restaure en choisissant son état de reprise. Son historique et ses liens sont conservés.</span>
      </label>}

      {/* Nature + Kind */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Nature de la marque</span>
          <select
            value={state.nodeNature}
            disabled={isEdit /* nodeNature immutable post-création (utiliser MOVE) */}
            onChange={(e) => {
              const nature = e.target.value as BrandNature;
              setState((s) => ({
                ...s,
                nodeNature: nature,
                // Reset kind to default cascade root for new nature
                nodeKind: BRAND_NATURE_ARCHETYPES[nature].cascade[0] ?? "STANDALONE_BRAND",
              }));
            }}
            className="rounded border border-border bg-surface-raised px-2 py-1.5 disabled:opacity-50"
          >
            {ALL_BRAND_NATURES.map((n) => (
              <option key={n} value={n}>{PORTFOLIO_NATURE_LABELS[n] ?? "Nature à préciser"}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Type de dossier</span>
          <select
            value={state.nodeKind}
            disabled={isEdit /* immutable post-création */}
            onChange={(e) => setState((s) => ({ ...s, nodeKind: e.target.value }))}
            className="rounded border border-border bg-surface-raised px-2 py-1.5 disabled:opacity-50"
          >
            {validKinds.length === 0 ? (
              <option value="">— pas de transition valide —</option>
            ) : (
              validKinds.map((k) => (
                <option key={k} value={k}>{PORTFOLIO_KIND_LABELS[k] ?? k}</option>
              ))
            )}
          </select>
          {parent && (
            <span className="text-xs text-foreground-secondary">
              Types disponibles sous {parent.name} : {validKinds.map((k) => PORTFOLIO_KIND_LABELS[k] ?? k).join(", ") || "aucun sous-dossier"}
            </span>
          )}
        </label>
      </div>

      {/* Geo */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Pays (code à deux lettres)</span>
          <input
            type="text"
            maxLength={2}
            value={state.countryCode ?? ""}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                countryCode: e.target.value.trim() ? e.target.value.toUpperCase() : null,
              }))
            }
            className="rounded border border-border bg-surface-raised px-2 py-1.5 uppercase"
            placeholder="CI / SN / NG / CMR…"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Regroupement</span>
          <input
            type="text"
            value={state.clusterTag ?? ""}
            onChange={(e) =>
              setState((s) => ({ ...s, clusterTag: e.target.value.trim() ? e.target.value : null }))
            }
            className="rounded border border-border bg-surface-raised px-2 py-1.5"
            placeholder="WESTERN_CLUSTER / TROPICAL_CLUSTER / ESA…"
          />
        </label>
      </div>

      {/* Tags nodeRole */}
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="font-medium">Rôles complémentaires</legend>
        <div className="flex flex-wrap gap-1">
          {state.nodeRole.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 rounded bg-accent/15 px-2 py-0.5 text-xs text-accent"
            >
              {r}
              <button
                type="button"
                onClick={() => setState((s) => ({ ...s, nodeRole: s.nodeRole.filter((x) => x !== r) }))}
                className="hover:text-error"
              >×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            placeholder="SEASONAL, LIMITED_EDITION, PROMO_RAMADAN_2026…"
            className="flex-1 rounded border border-border bg-surface-raised px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={() => {
              const r = roleInput.trim();
              if (r && !state.nodeRole.includes(r)) {
                setState((s) => ({ ...s, nodeRole: [...s.nodeRole, r] }));
                setRoleInput("");
              }
            }}
            className="rounded bg-accent/20 px-2 py-1 text-xs text-accent hover:bg-accent/30"
          >+ Ajouter</button>
        </div>
      </fieldset>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-elevated"
          >Annuler</button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-background hover:bg-accent/80 disabled:opacity-50"
        >
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
        </button>
      </div>
    </form>
  );
}
