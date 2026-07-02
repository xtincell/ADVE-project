"use client";

import { useActionState } from "react";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import { assignMissionAction } from "./actions";

/**
 * Gate OPEN → ASSIGNED : assignation DIRECTE (nom/contact déclaré) — le
 * fallback hors Guilde, conservé pour les talents qui ne passent pas par le
 * mur. La voie Guilde (candidatures → accepter) vit dans la section « La
 * Guilde » de la page mission (WP-011).
 */
export function AssignMissionForm({
  missionId,
  campaignId,
}: {
  missionId: string;
  campaignId: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    assignMissionAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3" aria-label="Assigner la mission">
      <input type="hidden" name="missionId" value={missionId} />
      <input type="hidden" name="campaignId" value={campaignId} />
      <label htmlFor="mission-assignee" className="block text-sm font-semibold text-sand">
        Assignation directe (hors Guilde)
      </label>
      <Input
        id="mission-assignee"
        name="assignee"
        placeholder="Nom du talent (ou contact) si vous ne passez pas par le mur de la Guilde"
        required
        minLength={2}
        maxLength={120}
        aria-invalid={Boolean(state?.fieldErrors?.assignee?.length) || undefined}
      />
      {state?.fieldErrors?.assignee?.[0] ? (
        <p className="text-sm text-coral" role="alert">
          {state.fieldErrors.assignee[0]}
        </p>
      ) : null}
      {state?.formError ? (
        <p className="text-sm text-coral" role="alert">
          {state.formError}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        <UserCheck aria-hidden />
        {pending ? "Assignation…" : "Assigner la mission"}
      </Button>
    </form>
  );
}
