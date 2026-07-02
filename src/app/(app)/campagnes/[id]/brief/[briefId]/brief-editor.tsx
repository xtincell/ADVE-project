"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/forms";
import { updateBriefAction } from "./actions";

/**
 * Éditeur du brief structuré (brouillon uniquement). Les champs viennent de
 * la définition domaine (BRIEF_FIELDS) — l'objectif et le livrable sont
 * requis par la gate de validation, pas par l'éditeur (on peut sauvegarder
 * un brouillon incomplet, on ne peut pas le VALIDER).
 */
export type BriefFieldInput = {
  id: string;
  label: string;
  required: boolean;
  hint: string;
  value: string;
};

export function BriefEditor({
  briefId,
  campaignId,
  fields,
}: {
  briefId: string;
  campaignId: string;
  fields: BriefFieldInput[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateBriefAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-5" aria-label="Éditeur du brief">
      <input type="hidden" name="briefId" value={briefId} />
      <input type="hidden" name="campaignId" value={campaignId} />

      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <label htmlFor={`brief-${field.id}`} className="block text-sm font-semibold text-sand">
            {field.label}
            {field.required ? <span className="text-coral"> *</span> : null}
          </label>
          <p className="text-xs text-smoke-2">{field.hint}</p>
          {field.id === "echeance" ? (
            <Input
              id={`brief-${field.id}`}
              name={field.id}
              defaultValue={field.value}
              maxLength={200}
              placeholder="ex. semaine du 14 septembre 2026"
            />
          ) : (
            <Textarea
              id={`brief-${field.id}`}
              name={field.id}
              defaultValue={field.value}
              rows={field.id === "objectif" || field.id === "livrable" ? 3 : 2}
              maxLength={2000}
              aria-invalid={Boolean(state?.fieldErrors?.[field.id]?.length) || undefined}
            />
          )}
          {state?.fieldErrors?.[field.id]?.[0] ? (
            <p className="text-sm text-coral" role="alert">
              {state.fieldErrors[field.id]![0]}
            </p>
          ) : null}
        </div>
      ))}

      {state?.formError ? (
        <p className="text-sm text-coral" role="alert">
          {state.formError}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le brouillon"}
      </Button>
    </form>
  );
}
