"use client";

import { useActionState } from "react";
import { ArchiveRestore, Archive, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import type { VaultAssetKind } from "@/domain/guidelines";
import { saveAssetAction, setAssetStatusAction } from "./actions";

/**
 * Formulaires du coffre (WP-019) — un seul composant pour créer/corriger un
 * asset, champs selon le kind (couleur : hex+rôle · typo : usage+lien ·
 * logo/document/image : lien+note). L'identité et la marque viennent de la
 * session côté server action — le client n'envoie que les champs métier.
 */

export type AssetFormValues = {
  id: string;
  name: string;
  hex: string;
  role: string;
  usage: string;
  url: string;
  note: string;
};

function FieldError({ messages }: { messages: string[] | undefined }) {
  if (!messages?.[0]) return null;
  return (
    <p className="text-sm text-coral" role="alert">
      {messages[0]}
    </p>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error: string[] | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-sand">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-smoke-2">{hint}</p> : null}
      <FieldError messages={error} />
    </div>
  );
}

/** Placeholders honnêtes par kind — des exemples, jamais des valeurs pré-remplies. */
const NAME_PLACEHOLDERS: Record<VaultAssetKind, string> = {
  LOGO: "Logo principal",
  COULEUR: "Corail",
  TYPO: "Clash Display",
  DOCUMENT: "Charte PDF v2",
  IMAGE: "Visuel héro — gamme 2026",
};

export function VaultAssetForm({
  kind,
  asset,
}: {
  kind: VaultAssetKind;
  /** Absent = création ; présent = correction (champs préremplis). */
  asset?: AssetFormValues;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveAssetAction, null);
  const editing = asset !== undefined;
  const uid = `asset-${asset?.id ?? `new-${kind.toLowerCase()}`}`;
  const errors = state?.fieldErrors;

  return (
    <form action={formAction} className="space-y-4" aria-label={editing ? "Corriger l'asset" : "Ajouter un asset"}>
      <input type="hidden" name="kind" value={kind} />
      {editing ? <input type="hidden" name="assetId" value={asset.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${uid}-name`} label="Nom" error={errors?.name}>
          <Input
            id={`${uid}-name`}
            name="name"
            defaultValue={asset?.name ?? ""}
            placeholder={NAME_PLACEHOLDERS[kind]}
            required
            maxLength={120}
            aria-invalid={Boolean(errors?.name?.length) || undefined}
          />
        </Field>

        {kind === "COULEUR" ? (
          <>
            <Field
              id={`${uid}-hex`}
              label="Code hex"
              hint="Format #RRGGBB — la pastille se rend depuis cette valeur."
              error={errors?.hex}
            >
              <Input
                id={`${uid}-hex`}
                name="hex"
                defaultValue={asset?.hex ?? ""}
                placeholder="#E56458"
                required
                maxLength={7}
                className="font-mono"
                aria-invalid={Boolean(errors?.hex?.length) || undefined}
              />
            </Field>
            <Field
              id={`${uid}-role`}
              label="Rôle (optionnel)"
              hint="Nourrit la section « Usages » de la charte."
              error={errors?.role}
            >
              <Input
                id={`${uid}-role`}
                name="role"
                defaultValue={asset?.role ?? ""}
                placeholder="Couleur primaire — CTA et accents"
                maxLength={80}
              />
            </Field>
          </>
        ) : null}

        {kind === "TYPO" ? (
          <>
            <Field
              id={`${uid}-usage`}
              label="Usage (optionnel)"
              hint="Nourrit la section « Usages » de la charte."
              error={errors?.usage}
            >
              <Input
                id={`${uid}-usage`}
                name="usage"
                defaultValue={asset?.usage ?? ""}
                placeholder="Titres et display"
                maxLength={120}
              />
            </Field>
            <Field id={`${uid}-url`} label="Lien de la fonte (optionnel)" error={errors?.url}>
              <Input
                id={`${uid}-url`}
                name="url"
                type="url"
                defaultValue={asset?.url ?? ""}
                placeholder="https://www.fontshare.com/fonts/clash-display"
                maxLength={300}
                aria-invalid={Boolean(errors?.url?.length) || undefined}
              />
            </Field>
          </>
        ) : null}

        {kind === "LOGO" || kind === "DOCUMENT" || kind === "IMAGE" ? (
          <>
            <Field
              id={`${uid}-url`}
              label="Lien (optionnel)"
              hint="L'upload de fichiers arrive dans une prochaine vague — un lien fait foi."
              error={errors?.url}
            >
              <Input
                id={`${uid}-url`}
                name="url"
                type="url"
                defaultValue={asset?.url ?? ""}
                placeholder="https://…"
                maxLength={300}
                aria-invalid={Boolean(errors?.url?.length) || undefined}
              />
            </Field>
            <Field
              id={`${uid}-note`}
              label="Note d'usage (optionnel)"
              hint="Nourrit la section « Usages » de la charte."
              error={errors?.note}
            >
              <Input
                id={`${uid}-note`}
                name="note"
                defaultValue={asset?.note ?? ""}
                placeholder={
                  kind === "LOGO" ? "Version fond sombre uniquement" : "Référence à respecter"
                }
                maxLength={300}
              />
            </Field>
          </>
        ) : null}
      </div>

      {state?.formError ? (
        <p className="text-sm text-coral" role="alert">
          {state.formError}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        <Save aria-hidden />
        {pending ? "Enregistrement…" : editing ? "Enregistrer la correction" : "Ajouter au coffre"}
      </Button>
    </form>
  );
}

/** Archive / restaure un asset — flip audité, erreur affichée honnêtement. */
export function AssetStatusButton({
  assetId,
  to,
}: {
  assetId: string;
  to: "archive" | "restore";
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    setAssetStatusAction,
    null,
  );
  return (
    <form action={formAction} className="inline-flex flex-col gap-1">
      <input type="hidden" name="assetId" value={assetId} />
      <input type="hidden" name="to" value={to} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        className={to === "archive" ? "text-smoke-2 hover:text-coral" : undefined}
      >
        {to === "archive" ? <Archive aria-hidden /> : <ArchiveRestore aria-hidden />}
        {pending ? "…" : to === "archive" ? "Archiver" : "Restaurer"}
      </Button>
      {state?.formError ? (
        <p className="text-xs text-coral" role="alert">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}
