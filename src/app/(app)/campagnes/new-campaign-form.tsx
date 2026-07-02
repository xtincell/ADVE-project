"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/forms";
import { createCampaignAction } from "./actions";

/**
 * Formulaire « Nouvelle campagne » — le cadre : nom, objectif, marché.
 * Le marché vient du référentiel pays seedé (aucun pays inventé) ; il
 * résoudra les coûts d'action. Succès = redirection vers la campagne.
 */
export type MarketOption = { code: string; name: string; currency: string };

export function NewCampaignForm({ markets }: { markets: MarketOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createCampaignAction,
    null,
  );

  if (!open) {
    return (
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Nouvelle campagne
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-lg border border-line bg-ink-2 p-6"
      aria-label="Nouvelle campagne"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-bone">Nouvelle campagne</h2>
          <p className="mt-1 text-sm text-smoke-2">
            Le cadre d&apos;abord : nom, objectif, marché. Les actions, briefs et missions se
            construisent ensuite, gate par gate.
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-sand" onClick={() => setOpen(false)}>
          <X aria-hidden />
          Fermer
        </Button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="campaign-name" className="block text-sm font-semibold text-sand">
            Nom de la campagne
          </label>
          <Input
            id="campaign-name"
            name="name"
            placeholder="Lancement gamme 2027"
            required
            minLength={2}
            maxLength={120}
            aria-invalid={Boolean(state?.fieldErrors?.name?.length) || undefined}
          />
          {state?.fieldErrors?.name?.[0] ? (
            <p className="text-sm text-coral" role="alert">
              {state.fieldErrors.name[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="campaign-market" className="block text-sm font-semibold text-sand">
            Marché
          </label>
          <Select
            id="campaign-market"
            name="countryCode"
            required
            defaultValue=""
            aria-invalid={Boolean(state?.fieldErrors?.countryCode?.length) || undefined}
          >
            <option value="" disabled>
              Choisir le marché…
            </option>
            {markets.map((market) => (
              <option key={market.code} value={market.code}>
                {market.name} ({market.currency})
              </option>
            ))}
          </Select>
          <p className="text-xs text-smoke-2">
            Le marché résout les coûts d&apos;action depuis le référentiel seedé.
          </p>
          {state?.fieldErrors?.countryCode?.[0] ? (
            <p className="text-sm text-coral" role="alert">
              {state.fieldErrors.countryCode[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="campaign-objective" className="block text-sm font-semibold text-sand">
            Objectif
          </label>
          <Textarea
            id="campaign-objective"
            name="objective"
            rows={3}
            placeholder="Ce que la campagne doit obtenir — il pré-remplira chaque brief de production."
            required
            minLength={4}
            maxLength={500}
            aria-invalid={Boolean(state?.fieldErrors?.objective?.length) || undefined}
          />
          {state?.fieldErrors?.objective?.[0] ? (
            <p className="text-sm text-coral" role="alert">
              {state.fieldErrors.objective[0]}
            </p>
          ) : null}
        </div>
      </div>

      {state?.formError ? (
        <p className="mt-4 text-sm text-coral" role="alert">
          {state.formError}
        </p>
      ) : null}

      <div className="mt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Création…" : "Créer la campagne"}
        </Button>
      </div>
    </form>
  );
}
