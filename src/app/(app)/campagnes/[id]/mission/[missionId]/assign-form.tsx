"use client";

import { useActionState } from "react";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import { assignMissionAction } from "./actions";

/**
 * Gate OPEN → ASSIGNED : déclarer le talent assigné. Champ libre assumé en
 * V1 (nom / contact) — le matching guilde et les profils talents arrivent au
 * WP-011, on ne simule pas un annuaire qui n'existe pas.
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
        Talent assigné
      </label>
      <Input
        id="mission-assignee"
        name="assignee"
        placeholder="Nom du talent (ou contact) — la guilde arrive au prochain chantier"
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
