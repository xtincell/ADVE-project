"use client";

import { useActionState, useState } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/forms";
import { CertaintyBadge } from "./certainty-badge";
import type { FieldCertaintyStatus } from "./certainty";

/**
 * Éditeur inline d'un champ de pilier ADVE. Un champ = une carte : valeur
 * courante + badge de certitude + édition par server action
 * (`amendPillarField`). Les listes se saisissent une entrée par ligne.
 * En lecture seule (piliers RTIS), la carte affiche sans jamais éditer.
 */
export type FieldEditorProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  pillarKey: string;
  fieldId: string;
  label: string;
  description: string;
  needsHuman: boolean;
  kind: "texte" | "liste";
  /** Texte de pré-remplissage du textarea (listes : une entrée par ligne). */
  defaultText: string;
  /** Valeur courante rendue pour la lecture (null = champ vide). */
  currentDisplay: string | null;
  status: FieldCertaintyStatus;
  /** Ligne « v{n} · {reason} · {date} » de la dernière modification. */
  historyLine: string | null;
  readOnly?: boolean;
};

export function FieldEditor({
  action,
  pillarKey,
  fieldId,
  label,
  description,
  needsHuman,
  kind,
  defaultText,
  currentDisplay,
  status,
  historyLine,
  readOnly = false,
}: FieldEditorProps) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await action(prev, formData);
      if (result === null) {
        // Succès — la page revalidée porte la nouvelle valeur.
        setEditing(false);
      }
      return result;
    },
    null,
  );

  return (
    <div className="rounded-lg border border-line bg-ink-2 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold text-bone">{label}</h3>
            <CertaintyBadge status={status} />
            {needsHuman ? (
              <span
                className="text-[11px] font-semibold uppercase tracking-wider text-gold-deep"
                title="Non-dérivable : décision ou donnée réelle que seul l'humain déclare."
              >
                décision humaine
              </span>
            ) : null}
          </div>
          <p className="text-sm text-smoke-2">{description}</p>
        </div>
        {readOnly ? null : (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-sand"
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
          >
            {editing ? <X aria-hidden /> : <Pencil aria-hidden />}
            {editing ? "Fermer" : "Modifier"}
          </Button>
        )}
      </div>

      <div className="mt-4">
        {editing && !readOnly ? (
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="pillarKey" value={pillarKey} />
            <input type="hidden" name="fieldId" value={fieldId} />
            <Textarea
              name="value"
              defaultValue={defaultText}
              rows={kind === "liste" ? 6 : 4}
              aria-label={`Valeur du champ ${label}`}
              aria-invalid={Boolean(state?.fieldErrors?.value?.length) || undefined}
            />
            <p className="text-xs text-smoke-2">
              {kind === "liste"
                ? "Une entrée par ligne. Vider le champ l'efface."
                : "Vider le champ l'efface."}
            </p>
            {state?.formError ? (
              <p className="text-sm text-coral" role="alert">
                {state.formError}
              </p>
            ) : null}
            {state?.fieldErrors?.value?.[0] ? (
              <p className="text-sm text-coral" role="alert">
                {state.fieldErrors.value[0]}
              </p>
            ) : null}
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-sand"
                onClick={() => setEditing(false)}
                disabled={pending}
              >
                Annuler
              </Button>
            </div>
          </form>
        ) : currentDisplay ? (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-sand-2">
            {currentDisplay}
          </p>
        ) : (
          <p className="text-sm italic text-smoke-2">Champ vide.</p>
        )}
      </div>

      {historyLine ? (
        <p className="mt-3 border-t border-line-soft pt-2 font-mono text-[11px] text-smoke-2">
          {historyLine}
        </p>
      ) : null}
    </div>
  );
}
