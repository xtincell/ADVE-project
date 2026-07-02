"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/forms";
import { applyToMissionAction } from "./actions";

/**
 * Candidature simple à une mission du mur (WP-011) : un pitch, un envoi.
 * Une seule candidature par mission (contrainte DB) — quand elle existe, la
 * page n'affiche plus ce formulaire. La décision d'accès reste 100 % serveur.
 */
export function ApplyToMissionForm({ missionId }: { missionId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    applyToMissionAction,
    null,
  );

  return (
    <details className="group mt-3 rounded-md border border-line-soft bg-ink-3/40">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-semibold text-sand transition-colors hover:text-bone">
        Candidater à cette mission
      </summary>
      <form action={formAction} className="space-y-3 px-4 pb-4 pt-1" aria-label="Candidater">
        <input type="hidden" name="missionId" value={missionId} />
        <label htmlFor={`pitch-${missionId}`} className="block text-sm font-semibold text-sand">
          Votre pitch
        </label>
        <Textarea
          id={`pitch-${missionId}`}
          name="pitch"
          rows={4}
          placeholder="Votre approche pour cette mission, une référence pertinente, votre délai — la marque lit ce pitch avec votre profil."
          required
          minLength={20}
          maxLength={1500}
          aria-invalid={Boolean(state?.fieldErrors?.pitch?.length) || undefined}
        />
        {state?.fieldErrors?.pitch?.[0] ? (
          <p className="text-sm text-coral" role="alert">
            {state.fieldErrors.pitch[0]}
          </p>
        ) : null}
        {state?.formError ? (
          <p className="text-sm text-coral" role="alert">
            {state.formError}
          </p>
        ) : null}
        <Button type="submit" size="sm" disabled={pending}>
          <Send aria-hidden />
          {pending ? "Envoi…" : "Envoyer ma candidature"}
        </Button>
      </form>
    </details>
  );
}
