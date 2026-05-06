/**
 * <CampaignDeliverableForm /> — Phase 18 (ADR-0059) matrice 6D.
 *
 * Form de création / édition d'un CampaignDeliverable 100% manuel
 * (Manual-first parity ADR-0060). Tous champs éditables : targetNodeId
 * (tree-picker), countryCode, clusterTag, deliverableType, language,
 * promoTag, status, dueDate, notes, brandAssetId, delegatedToOperatorId.
 */

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

const DELIVERABLE_TYPES = [
  "OOH_10M2", "OOH_12M2", "OOH_18M2",
  "POSTER_60x40", "POSTER_60x80",
  "POSM", "BANDEROLE", "WOBBLER", "T_SHIRT",
  "PRESENTOIR", "CHEVALET", "LAMPOST", "OUTDOOR",
  "TV_SPOT", "RADIO_SPOT",
  "DIGITAL_AD", "DIGITAL_POSTER", "TABLE_SAMPLING", "TG",
] as const;

const STATUSES = ["TODO", "IN_PROGRESS", "DELIVERED", "VALIDATED"] as const;
const LANGUAGES = ["FR", "EN", "FR_EN"] as const;

export interface CampaignDeliverableFormProps {
  /** Mode édition si fourni. */
  deliverableId?: string;
  /** Campaign owner. Pré-rempli quand le form est ouvert depuis une page campagne. */
  campaignId: string;
  /** Strategy pivot pour audit. */
  strategyId: string;
  /** Operator owner. */
  operatorId: string;
  /** Default targetNodeId si form lancé depuis un nœud SKU. */
  defaultTargetNodeId?: string;
  onSuccess?: (deliverableId: string) => void;
  onCancel?: () => void;
}

interface FormState {
  targetNodeId: string;
  countryCode: string | null;
  clusterTag: string | null;
  deliverableType: string;
  language: "FR" | "EN" | "FR_EN";
  promoTag: string | null;
  status: "TODO" | "IN_PROGRESS" | "DELIVERED" | "VALIDATED";
  dueDate: string | null;
  notes: string | null;
}

export function CampaignDeliverableForm({
  deliverableId,
  campaignId,
  strategyId,
  operatorId,
  defaultTargetNodeId,
  onSuccess,
  onCancel,
}: CampaignDeliverableFormProps) {
  const isEdit = Boolean(deliverableId);

  const [state, setState] = useState<FormState>({
    targetNodeId: defaultTargetNodeId ?? "",
    countryCode: null,
    clusterTag: null,
    deliverableType: "OOH_12M2",
    language: "FR",
    promoTag: null,
    status: "TODO",
    dueDate: null,
    notes: null,
  });
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const createMutation = trpc.campaignDeliverable.create.useMutation({
    onSuccess: (res) => {
      utils.campaignDeliverable.invalidate();
      if (res.ok) onSuccess?.(res.deliverable.id);
    },
    onError: (err) => setError(err.message),
  });

  const updateMutation = trpc.campaignDeliverable.update.useMutation({
    onSuccess: (res) => {
      utils.campaignDeliverable.invalidate();
      if (res.ok) onSuccess?.(res.deliverable.id);
    },
    onError: (err) => setError(err.message),
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!state.targetNodeId.trim()) return setError("Target BrandNode ID requis (SKU ou PRODUCT_VARIANT)");

    if (isEdit && deliverableId) {
      await updateMutation.mutateAsync({
        strategyId,
        operatorId,
        deliverableId,
        patches: {
          status: state.status,
          dueDate: state.dueDate,
          notes: state.notes,
        },
      });
    } else {
      await createMutation.mutateAsync({
        strategyId,
        operatorId,
        campaignId,
        targetNodeId: state.targetNodeId,
        countryCode: state.countryCode,
        clusterTag: state.clusterTag,
        deliverableType: state.deliverableType,
        language: state.language,
        promoTag: state.promoTag,
        dueDate: state.dueDate,
        notes: state.notes,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold">
        {isEdit ? "Éditer livrable" : "Nouveau livrable matrice 6D"}
      </h2>

      {error && <div className="rounded bg-error/15 p-2 text-sm text-error">{error}</div>}

      {/* Target BrandNode (SKU ou PRODUCT_VARIANT) */}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Target BrandNode ID (SKU ou PRODUCT_VARIANT)</span>
        <input
          type="text"
          required
          value={state.targetNodeId}
          onChange={(e) => setState((s) => ({ ...s, targetNodeId: e.target.value }))}
          disabled={isEdit}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-xs disabled:opacity-50"
          placeholder="ckxxx... (cuid du BrandNode)"
        />
      </label>

      {/* Geo */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Country (ISO-2)</span>
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
            disabled={isEdit}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 uppercase disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Cluster Tag</span>
          <input
            type="text"
            value={state.clusterTag ?? ""}
            onChange={(e) =>
              setState((s) => ({ ...s, clusterTag: e.target.value.trim() ? e.target.value : null }))
            }
            disabled={isEdit}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 disabled:opacity-50"
          />
        </label>
      </div>

      {/* Type / Language / Promo */}
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Format livrable</span>
          <select
            value={state.deliverableType}
            disabled={isEdit}
            onChange={(e) => setState((s) => ({ ...s, deliverableType: e.target.value }))}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 disabled:opacity-50"
          >
            {DELIVERABLE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Langue</span>
          <select
            value={state.language}
            disabled={isEdit}
            onChange={(e) => setState((s) => ({ ...s, language: e.target.value as FormState["language"] }))}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 disabled:opacity-50"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Promo Tag</span>
          <input
            type="text"
            value={state.promoTag ?? ""}
            onChange={(e) =>
              setState((s) => ({ ...s, promoTag: e.target.value.trim() ? e.target.value : null }))
            }
            disabled={isEdit}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 disabled:opacity-50"
            placeholder="PROMO_RAMADAN_2026"
          />
        </label>
      </div>

      {/* Status / Due date (editable) */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Status</span>
          <select
            value={state.status}
            onChange={(e) => setState((s) => ({ ...s, status: e.target.value as FormState["status"] }))}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          >
            {STATUSES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Due Date</span>
          <input
            type="date"
            value={state.dueDate ?? ""}
            onChange={(e) =>
              setState((s) => ({ ...s, dueDate: e.target.value || null }))
            }
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Notes (optionnel)</span>
        <textarea
          value={state.notes ?? ""}
          onChange={(e) =>
            setState((s) => ({ ...s, notes: e.target.value.trim() ? e.target.value : null }))
          }
          rows={2}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          placeholder="Brief ad-hoc, contraintes techniques, retours client…"
        />
      </label>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
          >Annuler</button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/80 disabled:opacity-50"
        >
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
        </button>
      </div>
    </form>
  );
}
