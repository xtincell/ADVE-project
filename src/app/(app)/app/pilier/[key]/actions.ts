"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { readSession } from "@/lib/session";
import { ADVE_PILLARS, PILLARS } from "@/domain/pillars";
import { PILLAR_FIELDS } from "@/domain/pillar-fields";
import { isFilled } from "@/domain/scoring";
import {
  amendPillarField,
  BrandError,
  brandPillarsContent,
  getBrandForSession,
  jsonRecord,
} from "@/server/brand";
import { aiAvailable } from "@/server/ai/gateway";
import { draftPillarFields } from "@/server/ai/pillar-draft";
import { applyPillarDraft } from "@/server/ai/apply-draft";

const amendSchema = z.object({
  pillarKey: z.enum(PILLARS),
  fieldId: z.string().min(1, "Champ manquant."),
  value: z.string(), // vide = effacement explicite du champ
});

/**
 * Amendement d'un champ de pilier depuis l'éditeur inline. La marque vient
 * de la session (jamais d'id client) ; la validation métier (ADVE only,
 * champ connu) vit dans `amendPillarField`. Succès = null.
 */
export async function amendFieldAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app");

  const parsed = amendSchema.safeParse({
    pillarKey: formData.get("pillarKey"),
    fieldId: formData.get("fieldId"),
    value: formData.get("value"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const brand = await getBrandForSession(session);
  if (!brand) {
    return { formError: "Aucune marque dans cet espace — commencez par le diagnostic d'entrée." };
  }

  try {
    await amendPillarField({
      brandId: brand.id,
      pillarKey: parsed.data.pillarKey,
      fieldId: parsed.data.fieldId,
      value: parsed.data.value,
      actorId: session.userId,
    });
  } catch (err) {
    if (err instanceof BrandError) return { formError: err.message };
    console.error("[pilier] amendPillarField a échoué :", err);
    return { formError: "L'enregistrement a échoué pour une raison technique. Réessayez dans un instant." };
  }

  revalidatePath("/app", "layout");
  return null;
}

const draftSchema = z.object({
  pillarKey: z.enum(ADVE_PILLARS), // ADVE uniquement — les RTIS ne se draftent pas
});

/**
 * Brouillons IA pour les champs VIDES du pilier (WP-010). IA OPTIONNELLE :
 * l'action re-vérifie `aiAvailable()` côté serveur (le bouton n'est déjà pas
 * rendu sans provider). Les champs vides sont recalculés ici depuis l'état
 * réel en base — jamais depuis le client. Échec IA = message FR, données
 * intactes ; succès = champs proposés en INFERRED « À valider ».
 */
export async function draftAiFieldsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app");

  const parsed = draftSchema.safeParse({ pillarKey: formData.get("pillarKey") });
  if (!parsed.success) {
    return { formError: "Pilier invalide — seuls les piliers du socle ADVE acceptent des brouillons IA." };
  }
  const pillarKey = parsed.data.pillarKey;

  if (!aiAvailable()) {
    return {
      formError:
        "L'assistant IA n'est pas configuré sur cette instance — le produit reste entièrement utilisable sans lui.",
    };
  }

  const brand = await getBrandForSession(session);
  if (!brand) {
    return { formError: "Aucune marque dans cet espace — commencez par le diagnostic d'entrée." };
  }

  const pillarRow = brand.pillars.find((p) => p.key === pillarKey) ?? null;
  const content = jsonRecord(pillarRow?.content);
  const fieldsToFill = PILLAR_FIELDS[pillarKey]
    .filter((field) => !isFilled(content[field.id]))
    .map((field) => field.id);
  if (fieldsToFill.length === 0) {
    return { formError: "Tous les champs de ce pilier sont déjà remplis — rien à proposer." };
  }

  const draft = await draftPillarFields({
    brandName: brand.name,
    sector: brand.sector,
    pillarKey,
    existingContent: brandPillarsContent(brand.pillars),
    fieldsToFill,
    audit: { workspaceId: session.workspaceId, actorId: session.userId },
  });
  if (!draft.ok) {
    return {
      formError:
        "L'IA n'a pas pu produire de brouillons (service indisponible ou réponse invalide). " +
        "Vos données restent inchangées — réessayez plus tard.",
    };
  }
  if (Object.keys(draft.drafts).length === 0) {
    return {
      formError:
        "L'IA n'a proposé aucun brouillon exploitable pour ces champs — " +
        "complétez d'abord quelques champs voisins pour lui donner du contexte.",
    };
  }

  try {
    const result = await applyPillarDraft({
      brandId: brand.id,
      pillarKey,
      drafts: draft.drafts,
      actorId: session.userId,
    });
    if (result.applied.length === 0) {
      return { formError: "Aucun brouillon applicable — les champs ont été remplis entre-temps." };
    }
  } catch (err) {
    if (err instanceof BrandError) return { formError: err.message };
    console.error("[pilier] applyPillarDraft a échoué :", err);
    return { formError: "L'application des brouillons a échoué pour une raison technique. Réessayez dans un instant." };
  }

  revalidatePath("/app", "layout");
  return null;
}
