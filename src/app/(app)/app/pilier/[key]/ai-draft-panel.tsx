"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";

/**
 * Panneau « brouillons IA » de l'éditeur de pilier ADVE (WP-010).
 * N'est monté par la page QUE si `aiAvailable()` ET s'il reste des champs
 * vides — jamais de bouton mort. Succès = la page revalidée montre les
 * champs proposés en « À valider » (certainty INFERRED, badge existant).
 */
export type AiDraftPanelProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  pillarKey: string;
  emptyCount: number;
};

export function AiDraftPanel({ action, pillarKey, emptyCount }: AiDraftPanelProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-dashed border-coral/40 bg-coral/5 p-4">
      <div className="min-w-0 max-w-xl space-y-1">
        <p className="text-sm font-semibold text-bone">
          {emptyCount} champ{emptyCount > 1 ? "s" : ""} vide{emptyCount > 1 ? "s" : ""} sur ce pilier.
        </p>
        <p className="text-sm text-sand">
          L&apos;IA peut proposer des brouillons à partir de vos données existantes.
          Chaque proposition est marquée « À valider » — rien n&apos;est considéré
          comme acquis tant que vous ne l&apos;avez pas validé, et aucun champ déjà
          rempli n&apos;est modifié.
        </p>
        {state?.formError ? (
          <p className="text-sm text-coral" role="alert">
            {state.formError}
          </p>
        ) : null}
      </div>
      <form action={formAction} className="shrink-0">
        <input type="hidden" name="pillarKey" value={pillarKey} />
        <Button type="submit" size="sm" disabled={pending}>
          <Sparkles aria-hidden />
          {pending ? "Génération en cours…" : "Proposer des brouillons IA pour les champs vides"}
        </Button>
      </form>
    </div>
  );
}
