"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { FormState } from "@/lib/forms";
import { addActionAction } from "./actions";

/**
 * Formulaire « Ajouter une action » — nom + type. Le type pointe le
 * référentiel de coûts : l'estimation se fait côté serveur au marché de la
 * campagne ; « Autre » = hors référentiel, honnêtement à estimer.
 */
export type ActionKindOption = { key: string; label: string };

export function AddActionForm({
  campaignId,
  kinds,
  marketName,
  disabled,
  disabledHint,
}: {
  campaignId: string;
  kinds: ActionKindOption[];
  marketName: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(addActionAction, null);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-line bg-ink-2 p-5"
      aria-label="Ajouter une action"
    >
      <h3 className="font-display text-base font-semibold text-bone">Ajouter une action</h3>
      <p className="mt-1 text-xs text-smoke-2">
        Le coût est estimé depuis le référentiel marché ({marketName}) — s&apos;il y manque une
        ligne, l&apos;action est marquée « à estimer », jamais chiffrée au hasard.
      </p>
      <input type="hidden" name="campaignId" value={campaignId} />
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-1">
          <label htmlFor="action-name" className="block text-xs font-semibold text-sand">
            Nom de l&apos;action
          </label>
          <Input
            id="action-name"
            name="name"
            placeholder="Shooting packshots gamme"
            required
            minLength={2}
            maxLength={120}
            disabled={disabled}
            aria-invalid={Boolean(state?.fieldErrors?.name?.length) || undefined}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="action-kind" className="block text-xs font-semibold text-sand">
            Type (référentiel de coûts)
          </label>
          <Select id="action-kind" name="kind" required defaultValue="" disabled={disabled}>
            <option value="" disabled>
              Choisir un type…
            </option>
            {kinds.map((kind) => (
              <option key={kind.key} value={kind.key}>
                {kind.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" size="md" disabled={disabled || pending}>
            <Plus aria-hidden />
            {pending ? "Ajout…" : "Ajouter"}
          </Button>
        </div>
      </div>
      {disabled && disabledHint ? <p className="mt-2 text-xs text-smoke-2">{disabledHint}</p> : null}
      {state?.fieldErrors?.name?.[0] ? (
        <p className="mt-2 text-sm text-coral" role="alert">
          {state.fieldErrors.name[0]}
        </p>
      ) : null}
      {state?.fieldErrors?.kind?.[0] ? (
        <p className="mt-2 text-sm text-coral" role="alert">
          {state.fieldErrors.kind[0]}
        </p>
      ) : null}
      {state?.formError ? (
        <p className="mt-2 text-sm text-coral" role="alert">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}
