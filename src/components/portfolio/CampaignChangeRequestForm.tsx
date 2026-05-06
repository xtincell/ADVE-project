/**
 * <CampaignChangeRequestForm /> — Phase 18-A1-β (audit MATANGA V4 TICKETS MODIFS).
 *
 * Form 100% manuel (Manual-first parity ADR-0053). Crée un ticket de modif
 * client sur un CampaignDeliverable. Auto-génère ticketCode `[ID_PROJET]-R[NN]`.
 */

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

const IMPACT_OPTIONS = [
  { value: "COSMETIC", label: "🟢 Cosmétique (traiter direct)", helper: "Modif minime, pas d'impact production" },
  { value: "MINOR", label: "🟡 Mineur (ajustement)", helper: "Logger ticket + traiter si direction claire" },
  { value: "MAJOR", label: "🔴 Majeur (refonte)", helper: "STOP production + escalade Slack obligatoire" },
  { value: "OUT_OF_SCOPE", label: "⚪ Hors scope", helper: "Refuser poliment + redirection Nelson" },
] as const;

export interface CampaignChangeRequestFormProps {
  campaignDeliverableId: string;
  strategyId: string;
  operatorId: string;
  onSuccess?: (ticketId: string) => void;
  onCancel?: () => void;
}

export function CampaignChangeRequestForm({
  campaignDeliverableId,
  strategyId,
  operatorId,
  onSuccess,
  onCancel,
}: CampaignChangeRequestFormProps) {
  const [requestedByName, setRequestedByName] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState<"COSMETIC" | "MINOR" | "MAJOR" | "OUT_OF_SCOPE">("MINOR");
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const createMutation = trpc.campaignChangeRequest.create.useMutation({
    onSuccess: (res) => {
      utils.campaignChangeRequest.invalidate();
      if (res.ok) onSuccess?.(res.ticket.id);
    },
    onError: (err) => setError(err.message),
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!requestedByName.trim() || !description.trim()) {
      return setError("Demandeur + description requis");
    }
    await createMutation.mutateAsync({
      strategyId,
      operatorId,
      campaignDeliverableId,
      requestedByName,
      description,
      impact,
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold">Nouveau ticket modif (TICKETS MODIFS V4)</h2>

      {error && <div className="rounded bg-error/15 p-2 text-sm text-error">{error}</div>}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Demandeur</span>
        <input
          type="text"
          required
          value={requestedByName}
          onChange={(e) => setRequestedByName(e.target.value)}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          placeholder="ex: Vanelle Omong / Estelle NGAMGO / Junior KOFFI"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Description de la modif demandée</span>
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          placeholder="ex: Modifier texte descriptif Peak Green / Nouvelles dimensions cartons Pasta Gold"
        />
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="font-medium">Impact (workflow PROTOCOLE ABSENCE V4)</legend>
        {IMPACT_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-start gap-2 cursor-pointer rounded border border-zinc-800 p-2 hover:bg-zinc-900">
            <input
              type="radio"
              name="impact"
              value={opt.value}
              checked={impact === opt.value}
              onChange={() => setImpact(opt.value)}
              className="mt-1"
            />
            <span className="flex-1">
              <span className="block font-medium">{opt.label}</span>
              <span className="block text-xs text-foreground-secondary">{opt.helper}</span>
            </span>
          </label>
        ))}
      </fieldset>

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
          {createMutation.isPending ? "Création…" : "Créer ticket"}
        </button>
      </div>
    </form>
  );
}
