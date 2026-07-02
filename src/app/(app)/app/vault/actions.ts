"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { readSession } from "@/lib/session";
import { getBrandForSession } from "@/server/brand";
import {
  archiveAsset,
  assetKindSchema,
  assetNameSchema,
  buildAssetValue,
  createAsset,
  restoreAsset,
  updateAsset,
  VaultError,
} from "@/server/vault";

/**
 * Server actions du coffre de marque (WP-019). La marque vient TOUJOURS de
 * la session (jamais d'un id client) ; la validation structurée par kind,
 * la tenancy et l'audit vivent dans src/server/vault.ts.
 */

async function requireVaultContext() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app/vault");
  const brand = await getBrandForSession(session);
  return { session, brand };
}

function toFormError(err: unknown, logPrefix: string): FormState {
  if (err instanceof VaultError) return { formError: err.message };
  console.error(`[vault] ${logPrefix}`, err);
  return {
    formError: "L'opération a échoué pour une raison technique. Réessayez dans un instant.",
  };
}

const baseSchema = z.object({
  kind: assetKindSchema,
  name: assetNameSchema,
  /** Vide = création ; présent = correction de l'asset. */
  assetId: z.string().trim().default(""),
});

/** Champ de formulaire brut → string ("" si absent). */
function field(formData: FormData, name: string): string {
  const raw = formData.get(name);
  return typeof raw === "string" ? raw : "";
}

/** Crée ou corrige un asset structuré du coffre (mutation auditée). */
export async function saveAssetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { session, brand } = await requireVaultContext();
  if (!brand) {
    return { formError: "Aucune marque dans cet espace — commencez par le diagnostic d'entrée." };
  }

  const parsed = baseSchema.safeParse({
    kind: formData.get("kind"),
    name: formData.get("name"),
    assetId: formData.get("assetId") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const { kind, name, assetId } = parsed.data;

  // Value structurée par kind — les erreurs Zod reviennent par champ.
  let value: Record<string, string>;
  try {
    value = buildAssetValue(kind, {
      hex: field(formData, "hex"),
      role: field(formData, "role"),
      usage: field(formData, "usage"),
      url: field(formData, "url"),
      note: field(formData, "note"),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { fieldErrors: z.flattenError(err).fieldErrors };
    }
    throw err;
  }

  try {
    if (assetId === "") {
      await createAsset({ brandId: brand.id, kind, name, value, actorId: session.userId });
    } else {
      await updateAsset({
        brandId: brand.id,
        assetId,
        name,
        value,
        actorId: session.userId,
      });
    }
  } catch (err) {
    return toFormError(err, assetId === "" ? "createAsset a échoué :" : "updateAsset a échoué :");
  }

  revalidatePath("/app", "layout");
  return null;
}

const statusSchema = z.object({
  assetId: z.string().min(1, "Identifiant d'asset manquant — rechargez la page."),
  to: z.enum(["archive", "restore"]),
});

/** Archive (la « suppression » du coffre) ou restaure un asset — flip audité. */
export async function setAssetStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { session, brand } = await requireVaultContext();
  if (!brand) {
    return { formError: "Aucune marque dans cet espace — commencez par le diagnostic d'entrée." };
  }

  const parsed = statusSchema.safeParse({
    assetId: formData.get("assetId"),
    to: formData.get("to"),
  });
  if (!parsed.success) {
    return { formError: "Action invalide — rechargez la page." };
  }

  try {
    const input = { brandId: brand.id, assetId: parsed.data.assetId, actorId: session.userId };
    if (parsed.data.to === "archive") await archiveAsset(input);
    else await restoreAsset(input);
  } catch (err) {
    return toFormError(err, `${parsed.data.to} a échoué :`);
  }

  revalidatePath("/app", "layout");
  return null;
}
