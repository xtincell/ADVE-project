"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import type { FormState } from "@/lib/forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createZoneIndexAction,
  deleteZoneIndexAction,
  updateZoneIndexAction,
  upsertCountryAction,
} from "./actions";

/**
 * Formulaires référentiels (client — useActionState). Le rendu des listes
 * reste côté serveur ; ici uniquement la saisie : pays (upsert), ligne
 * d'indice (créer / corriger / supprimer). Source obligatoire partout.
 */

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs font-medium text-coral-deep">{errors[0]}</p>;
}

function FormError({ state }: { state: FormState }) {
  if (!state?.formError) return null;
  return (
    <p
      role="alert"
      className="rounded-sm border border-coral/30 bg-coral/8 px-3 py-2 text-xs font-medium text-coral-deep"
    >
      {state.formError}
    </p>
  );
}

const SUBMIT_CLASS =
  "h-10 rounded-sm bg-ink px-4 text-sm font-semibold text-bone transition-colors hover:bg-ink-3 disabled:pointer-events-none disabled:opacity-50";

// ── Pays ────────────────────────────────────────────────────────────────

export type CountryDefaults = {
  code?: string;
  name?: string;
  currency?: string;
  zone?: string;
};

export function CountryForm({ defaults }: { defaults?: CountryDefaults }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    upsertCountryAction,
    null,
  );
  const editing = Boolean(defaults?.code);

  return (
    <form
      action={formAction}
      className="space-y-3"
      noValidate
      key={defaults?.code ?? "nouveau"} // re-monte le formulaire quand la cible change
    >
      <FormError state={state} />
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="country-code">Code ISO-2</Label>
          <Input
            id="country-code"
            name="code"
            defaultValue={defaults?.code ?? ""}
            placeholder="CI"
            maxLength={2}
            required
            className="h-10 font-mono text-sm uppercase"
            aria-invalid={state?.fieldErrors?.code ? true : undefined}
          />
          <FieldErrors errors={state?.fieldErrors?.code} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country-name">Nom</Label>
          <Input
            id="country-name"
            name="name"
            defaultValue={defaults?.name ?? ""}
            placeholder="Côte d'Ivoire"
            required
            className="h-10 text-sm"
            aria-invalid={state?.fieldErrors?.name ? true : undefined}
          />
          <FieldErrors errors={state?.fieldErrors?.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country-currency">Devise ISO-3</Label>
          <Input
            id="country-currency"
            name="currency"
            defaultValue={defaults?.currency ?? ""}
            placeholder="XOF"
            maxLength={3}
            required
            className="h-10 font-mono text-sm uppercase"
            aria-invalid={state?.fieldErrors?.currency ? true : undefined}
          />
          <FieldErrors errors={state?.fieldErrors?.currency} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country-zone">Zone (optionnel)</Label>
          <Input
            id="country-zone"
            name="zone"
            defaultValue={defaults?.zone ?? ""}
            placeholder="UEMOA"
            className="h-10 font-mono text-sm uppercase"
            aria-invalid={state?.fieldErrors?.zone ? true : undefined}
          />
          <FieldErrors errors={state?.fieldErrors?.zone} />
        </div>
      </div>
      <button type="submit" disabled={pending} className={SUBMIT_CLASS}>
        {pending
          ? "Enregistrement…"
          : editing
            ? `Mettre à jour ${defaults?.code}`
            : "Ajouter / mettre à jour le pays"}
      </button>
    </form>
  );
}

// ── Ligne d'indice (création + correction) ──────────────────────────────

export type ZoneIndexDefaults = {
  id?: string;
  family?: string;
  countryCode?: string;
  key?: string;
  value?: string;
  source?: string;
  validFrom?: string;
  validUntil?: string;
};

function ZoneIndexFields({
  idPrefix,
  defaults,
  state,
}: {
  idPrefix: string;
  defaults?: ZoneIndexDefaults;
  state: FormState;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-family`}>Famille</Label>
          <Input
            id={`${idPrefix}-family`}
            name="family"
            defaultValue={defaults?.family ?? ""}
            placeholder="pricing · cost-of-living…"
            required
            className="h-10 font-mono text-sm"
            aria-invalid={state?.fieldErrors?.family ? true : undefined}
          />
          <FieldErrors errors={state?.fieldErrors?.family} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-countryCode`}>Zone / pays</Label>
          <Input
            id={`${idPrefix}-countryCode`}
            name="countryCode"
            defaultValue={defaults?.countryCode ?? ""}
            placeholder="UEMOA · CEMAC · CI…"
            required
            className="h-10 font-mono text-sm uppercase"
            aria-invalid={state?.fieldErrors?.countryCode ? true : undefined}
          />
          <FieldErrors errors={state?.fieldErrors?.countryCode} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-key`}>Clé</Label>
          <Input
            id={`${idPrefix}-key`}
            name="key"
            defaultValue={defaults?.key ?? ""}
            placeholder="plan.cockpit.monthly"
            required
            className="h-10 font-mono text-sm"
            aria-invalid={state?.fieldErrors?.key ? true : undefined}
          />
          <FieldErrors errors={state?.fieldErrors?.key} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-value`}>Valeur</Label>
          <Input
            id={`${idPrefix}-value`}
            name="value"
            type="number"
            step="any"
            defaultValue={defaults?.value ?? ""}
            placeholder="8000"
            required
            className="h-10 font-mono text-sm"
            aria-invalid={state?.fieldErrors?.value ? true : undefined}
          />
          <FieldErrors errors={state?.fieldErrors?.value} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-validFrom`}>Valide à partir du</Label>
          <Input
            id={`${idPrefix}-validFrom`}
            name="validFrom"
            type="date"
            defaultValue={defaults?.validFrom ?? ""}
            required
            className="h-10 font-mono text-sm"
            aria-invalid={state?.fieldErrors?.validFrom ? true : undefined}
          />
          <FieldErrors errors={state?.fieldErrors?.validFrom} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-validUntil`}>Fin de validité (optionnel)</Label>
          <Input
            id={`${idPrefix}-validUntil`}
            name="validUntil"
            type="date"
            defaultValue={defaults?.validUntil ?? ""}
            className="h-10 font-mono text-sm"
            aria-invalid={state?.fieldErrors?.validUntil ? true : undefined}
          />
          <FieldErrors errors={state?.fieldErrors?.validUntil} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-source`}>Source (obligatoire)</Label>
          <Input
            id={`${idPrefix}-source`}
            name="source"
            defaultValue={defaults?.source ?? ""}
            placeholder="décision opérateur 2026-07 · Numbeo…"
            required
            className="h-10 text-sm"
            aria-invalid={state?.fieldErrors?.source ? true : undefined}
          />
          <FieldErrors errors={state?.fieldErrors?.source} />
        </div>
      </div>
    </>
  );
}

export function ZoneIndexCreateForm({ defaults }: { defaults?: ZoneIndexDefaults }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createZoneIndexAction,
    null,
  );
  return (
    <form action={formAction} className="space-y-3" noValidate>
      <FormError state={state} />
      <ZoneIndexFields idPrefix="zi-create" defaults={defaults} state={state} />
      <button type="submit" disabled={pending} className={SUBMIT_CLASS}>
        {pending ? "Création…" : "Créer la ligne d'indice"}
      </button>
    </form>
  );
}

export function ZoneIndexEditForm({ defaults }: { defaults: ZoneIndexDefaults & { id: string } }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateZoneIndexAction,
    null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState<FormState, FormData>(
    deleteZoneIndexAction,
    null,
  );
  const busy = pending || deletePending;

  return (
    <div className="space-y-4" key={defaults.id}>
      <form action={formAction} className="space-y-3" noValidate>
        <input type="hidden" name="id" value={defaults.id} />
        <FormError state={state} />
        <ZoneIndexFields idPrefix="zi-edit" defaults={defaults} state={state} />
        <button type="submit" disabled={busy} className={SUBMIT_CLASS}>
          {pending ? "Correction…" : "Corriger cette ligne"}
        </button>
        <p className="text-xs text-smoke-2">
          Correction en place (faute de frappe, clôture). Pour un NOUVEAU barème, créez
          plutôt une nouvelle ligne avec sa date d&apos;effet — la résolution prend la plus
          récente valide.
        </p>
      </form>

      <form
        action={deleteAction}
        className="flex flex-wrap items-center gap-3 border-t border-ink/10 pt-3"
      >
        <input type="hidden" name="id" value={defaults.id} />
        <label className="flex items-center gap-2 text-xs text-graphite">
          <input type="checkbox" name="confirm" className="size-3.5 accent-coral" />
          Je confirme la suppression définitive (la ligne reste tracée dans l&apos;audit)
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-coral/12 px-3 text-xs font-bold text-coral-deep transition-colors hover:bg-coral/20 disabled:pointer-events-none disabled:opacity-50"
        >
          <Trash2 className="size-3.5" aria-hidden />
          {deletePending ? "Suppression…" : "Supprimer"}
        </button>
        {deleteState?.formError ? (
          <p className="text-xs font-medium text-coral-deep" role="alert">
            {deleteState.formError}
          </p>
        ) : null}
      </form>
    </div>
  );
}
