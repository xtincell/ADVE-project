/**
 * <CampaignChangeRequestForm /> — Phase 18-A1-β (audit MATANGA V4 TICKETS MODIFS).
 *
 * Form 100% manuel (Manual-first parity ADR-0060). Crée un ticket de modif
 * client sur un CampaignDeliverable. Auto-génère ticketCode `[ID_TÂCHE]-R[NN]`.
 *
 * Brouillon (ADR-0202) : le besoin saisi et l'UUID de demande déjà envoyé sont
 * conservés dans le sessionStorage de l'onglet, par équipe et par tâche. Un
 * remontage (navigation, rechargement) retrouve donc la même identité : le renvoi
 * rend le même reçu au lieu d'une seconde reprise. Purge après reçu confirmé ou
 * abandon explicite ; stockage facultatif, borné et validé à la relecture.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";

type Impact = "COSMETIC" | "MINOR" | "MAJOR" | "OUT_OF_SCOPE";
interface Attempt { body: string; requestId: string }
interface Draft { v: 1; requestedByName: string; description: string; impact: Impact; attempt: Attempt | null }

const IMPACTS: readonly Impact[] = ["COSMETIC", "MINOR", "MAJOR", "OUT_OF_SCOPE"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const draftKey = (operatorId: string, deliverableId: string) => `campaign-change-request-draft:${operatorId}:${deliverableId}`;

function forget(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* Storage is optional: the in-memory identity remains. */ }
}
function readDraft(key: string): Draft | null {
  let raw: string | null = null;
  try { raw = sessionStorage.getItem(key); } catch { return null; }
  if (raw === null) return null;
  try {
    const d = JSON.parse(raw) as Partial<Draft>;
    const attempt = d.attempt ?? null;
    if (d.v === 1 && typeof d.requestedByName === "string" && d.requestedByName.length <= 200
      && typeof d.description === "string" && d.description.length <= 5000
      && IMPACTS.includes(d.impact as Impact)
      && (attempt === null || (typeof attempt.body === "string" && attempt.body.length <= 12_000
        && typeof attempt.requestId === "string" && UUID.test(attempt.requestId)))) {
      return { v: 1, requestedByName: d.requestedByName, description: d.description, impact: d.impact as Impact, attempt };
    }
  } catch { /* Malformed: removed below. */ }
  forget(key);
  return null;
}
function writeDraft(key: string, draft: Omit<Draft, "v">) {
  if (!draft.requestedByName && !draft.description && !draft.attempt) return forget(key);
  try { sessionStorage.setItem(key, JSON.stringify({ v: 1, ...draft })); } catch { /* Same in-memory identity for retries in this view. */ }
}

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
  const [impact, setImpact] = useState<Impact>("MINOR");
  const [error, setError] = useState<string | null>(null);
  const [resumed, setResumed] = useState<"typed" | "sent" | null>(null);
  const [ready, setReady] = useState(false);

  const key = draftKey(operatorId, campaignDeliverableId);
  const attempt = useRef<Attempt | null>(null);
  const submitting = useRef(false);

  // Read after mount only: the server render never sees the tab's storage.
  useEffect(() => {
    const draft = readDraft(key);
    setRequestedByName(draft?.requestedByName ?? "");
    setDescription(draft?.description ?? "");
    setImpact(draft?.impact ?? "MINOR");
    attempt.current = draft?.attempt ?? null;
    setResumed(draft ? (draft.attempt ? "sent" : "typed") : null);
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (ready) writeDraft(key, { requestedByName, description, impact, attempt: attempt.current });
  }, [ready, key, requestedByName, description, impact]);

  const utils = trpc.useUtils();
  const createMutation = trpc.campaignChangeRequest.create.useMutation({
    onSuccess: (res) => {
      attempt.current = null;
      forget(key);
      setResumed(null);
      setRequestedByName(""); setDescription(""); setImpact("MINOR");
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
    // Persist the identity before sending: a remount during the request replays it.
    writeDraft(key, { requestedByName, description, impact, attempt: attempt.current });
    submitting.current = true;
    createMutation.mutate({ ...payload, requestId: attempt.current.requestId });
  };

  const abandon = () => {
    attempt.current = null;
    forget(key);
    onCancel?.();
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold">Nouvelle demande de modification</h2>

      {error && <div role="alert" className="rounded bg-error/15 p-2 text-sm text-error">{error}</div>}
      {resumed && <p role="status" className="rounded border border-border bg-surface-raised p-2 text-sm text-foreground-secondary">
        {resumed === "sent"
          ? "Brouillon repris. Un envoi précédent n’a pas été confirmé : enregistrer à nouveau retrouve la même demande si elle a déjà été reçue, sans doublon."
          : "Brouillon repris : votre saisie a été conservée dans cet onglet."}
      </p>}

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

      <p className="text-xs text-foreground-secondary">La demande est enregistrée ici. Aucune notification externe n’est envoyée. « Annuler » abandonne le brouillon.</p>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={abandon} disabled={createMutation.isPending}>Annuler</Button>}
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Enregistrement…" : "Enregistrer la demande"}
        </Button>
      </div>
    </form>
  );
}
