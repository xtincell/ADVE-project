/**
 * <OperatorActionForm /> — Phase 18-A1-γ (audit MATANGA V4 ACTIONS).
 *
 * Form 100% manuel (Manual-first parity ADR-0060). Crée une action opérationnelle
 * transverse (relance, prep avant départ, RH, production setup).
 */

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

const PRIORITY_OPTIONS = ["CRITIQUE", "HAUTE", "MOYENNE", "BASSE"] as const;
const CATEGORY_OPTIONS = [
  { value: "BEFORE_DEPARTURE", label: "Avant Départ" },
  { value: "SYSTEM", label: "Système" },
  { value: "FOLLOWUPS", label: "Relances" },
  { value: "PRODUCTION", label: "Production" },
  { value: "OTHER", label: "Autre" },
] as const;
const SOURCE_OPTIONS = [
  "GMAIL", "SLACK", "WHATSAPP", "VERBAL", "BRIEF", "SYSTEM", "OTHER",
] as const;

export interface OperatorActionFormProps {
  strategyId: string;
  operatorId: string;
  defaultCampaignId?: string | null;
  onSuccess?: (actionId: string) => void;
  onCancel?: () => void;
}

export function OperatorActionForm({
  strategyId,
  operatorId,
  defaultCampaignId,
  onSuccess,
  onCancel,
}: OperatorActionFormProps) {
  const [label, setLabel] = useState("");
  const [context, setContext] = useState("");
  const [priority, setPriority] = useState<"CRITIQUE" | "HAUTE" | "MOYENNE" | "BASSE">("MOYENNE");
  const [category, setCategory] = useState<"BEFORE_DEPARTURE" | "SYSTEM" | "FOLLOWUPS" | "PRODUCTION" | "OTHER">("OTHER");
  const [source, setSource] = useState<"GMAIL" | "SLACK" | "WHATSAPP" | "VERBAL" | "BRIEF" | "SYSTEM" | "OTHER">("OTHER");
  const [campaignId, setCampaignId] = useState(defaultCampaignId ?? "");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const createMutation = trpc.operatorAction.create.useMutation({
    onSuccess: (res) => {
      utils.operatorAction.invalidate();
      if (res.ok) onSuccess?.(res.action.id);
    },
    onError: (err) => setError(err.message),
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!label.trim()) return setError("Label requis");
    await createMutation.mutateAsync({
      strategyId,
      operatorId,
      label,
      context: context.trim() || null,
      priority,
      category,
      source,
      campaignId: campaignId.trim() || null,
      dueDate: dueDate || null,
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-semibold">Nouvelle action opérationnelle</h2>

      {error && <div className="rounded bg-error/15 p-2 text-sm text-error">{error}</div>}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Action</span>
        <input
          type="text"
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          placeholder="ex: Relancer Derick TCHAOU pour dimensions TG"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Contexte (optionnel)</span>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={2}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          placeholder="Détails / contraintes / liens"
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium">Priorité</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1">
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium">Catégorie</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1">
            {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium">Source</span>
          <select value={source} onChange={(e) => setSource(e.target.value as typeof source)} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1">
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium">Campaign liée (cuid optionnel)</span>
          <input
            type="text"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono"
            placeholder="cmou..."
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium">Due date</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
          />
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={createMutation.isPending}
            className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
          >Annuler</button>
        )}
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/80 disabled:opacity-50"
        >
          {createMutation.isPending ? "Création…" : "Créer action"}
        </button>
      </div>
    </form>
  );
}
