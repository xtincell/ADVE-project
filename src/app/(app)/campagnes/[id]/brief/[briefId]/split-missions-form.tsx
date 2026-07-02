"use client";

import { useActionState } from "react";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/forms";
import { splitMissionsAction } from "./actions";

/**
 * Gate « éclater en missions » : une mission par ligne. Réservée aux briefs
 * VALIDÉS (le serveur re-vérifie). Les missions naissent OPEN, prêtes à être
 * assignées.
 */
export function SplitMissionsForm({
  briefId,
  campaignId,
}: {
  briefId: string;
  campaignId: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    splitMissionsAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3" aria-label="Éclater en missions">
      <input type="hidden" name="briefId" value={briefId} />
      <input type="hidden" name="campaignId" value={campaignId} />
      <label htmlFor="mission-titles" className="block text-sm font-semibold text-sand">
        Missions à créer — une par ligne
      </label>
      <Textarea
        id="mission-titles"
        name="titles"
        rows={4}
        placeholder={"Shooting studio — 12 packshots\nRetouche + déclinaisons formats"}
        aria-invalid={Boolean(state?.fieldErrors?.titles?.length) || undefined}
      />
      {state?.fieldErrors?.titles?.[0] ? (
        <p className="text-sm text-coral" role="alert">
          {state.fieldErrors.titles[0]}
        </p>
      ) : null}
      {state?.formError ? (
        <p className="text-sm text-coral" role="alert">
          {state.formError}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        <Scissors aria-hidden />
        {pending ? "Création…" : "Éclater en missions"}
      </Button>
    </form>
  );
}
