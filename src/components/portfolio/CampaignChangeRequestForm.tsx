/**
 * <CampaignChangeRequestForm /> — Phase 18-A1-β (audit MATANGA V4 TICKETS MODIFS).
 *
 * Form 100% manuel (Manual-first parity ADR-0060). Crée un ticket de modif
 * client sur un CampaignDeliverable. Auto-génère ticketCode `[ID_TÂCHE]-R[NN]`.
 */

"use client";

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";

const IMPACT_OPTIONS = [
  { value: "COSMETIC", label: "🟢 Cosmétique (traiter direct)", helper: "Modif minime, pas d'impact production" },
  { value: "MINOR", label: "🟡 Mineur (ajustement)", helper: "Consigner la demande et préciser la direction" },
  { value: "MAJOR", label: "🔴 Majeur (refonte)", helper: "Suspendre la production et demander un arbitrage" },
  { value: "OUT_OF_SCOPE", label: "⚪ Hors scope", helper: "Qualifier le périmètre avec le responsable du projet" },
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

  const attempt = useRef<{ body: string; requestId: string } | null>(null);
  const submitting = useRef(false);
  const utils = trpc.useUtils();
  const createMutation = trpc.campaignChangeRequest.create.useMutation({
    onSuccess: (res) => {
      attempt.current = null;
      utils.campaignChangeRequest.invalidate();
      if (res.ok) onSuccess?.(res.ticket.id);
    },
    onError: (err) => setError(err.message),
    onSettled: () => { submitting.current = false; },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setError(null);
    if (!requestedByName.trim() || !description.trim()) {
      return setError("Demandeur + description requis");
    }
    const payload = { strategyId, operatorId, campaignDeliverableId,
      requestedByName: requestedByName.trim(), description: description.trim(), impact };
    const body = JSON.stringify(payload);
    if (!attempt.current || attempt.current.body !== body) attempt.current = { body, requestId: crypto.randomUUID() };
    submitting.current = true;
    createMutation.mutate({ ...payload, requestId: attempt.current.requestId });

  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold">Nouvelle demande de modification</h2>

      {error && <div role="alert" className="rounded bg-error/15 p-2 text-sm text-error">{error}</div>}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Demandeur</span>
        <input
          type="text"
          required
          maxLength={200}
          disabled={createMutation.isPending}
          value={requestedByName}
          onChange={(e) => setRequestedByName(e.target.value)}
          className="rounded border border-border bg-surface-raised px-2 py-1.5"
          placeholder="Nom du demandeur"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Description de la modif demandée</span>
        <textarea
          required
          maxLength={5000}
          disabled={createMutation.isPending}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded border border-border bg-surface-raised px-2 py-1.5"
          placeholder="Décrire précisément le changement attendu"
        />
      </label>

      <fieldset disabled={createMutation.isPending} className="flex flex-col gap-2 text-sm">
        <legend className="font-medium">Impact sur la production</legend>
        {IMPACT_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-start gap-2 cursor-pointer rounded border border-border p-2 hover:bg-surface-raised">
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

      <p className="text-xs text-foreground-secondary">La demande est enregistrée ici. Aucune notification externe n’est envoyée.</p>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={createMutation.isPending}>Annuler</Button>}
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Enregistrement…" : "Enregistrer la demande"}
        </Button>
      </div>
    </form>
  );
}
