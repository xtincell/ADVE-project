"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { readSession } from "@/lib/session";
import { getBrandForSession } from "@/server/brand";
import {
  briefContentSchema,
  CampaignError,
  createMissionsFromBrief,
  missionTitlesSchema,
  updateBriefContent,
  validateBrief,
} from "@/server/campaigns";

/**
 * Server actions du brief : édition du contenu structuré (brouillon
 * uniquement), gate de validation, éclatement en missions (brief validé
 * uniquement). Marque de session, gates re-vérifiées côté service.
 */

const idSchema = z.string().min(1, "Identifiant manquant — rechargez la page.");

async function sessionBrand(next: string) {
  const session = await readSession();
  if (!session) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  const brand = await getBrandForSession(session);
  if (!brand) {
    return { error: "Aucune marque dans cet espace — commencez par le diagnostic." } as const;
  }
  return { brandId: brand.id, actorId: session.userId } as const;
}

function toFormError(err: unknown, logPrefix: string): FormState {
  if (err instanceof CampaignError) return { formError: err.message };
  console.error(`[campagnes] ${logPrefix}`, err);
  return { formError: "L'opération a échoué pour une raison technique. Réessayez dans un instant." };
}

function revalidateBriefPaths(campaignId: string, briefId: string) {
  revalidatePath(`/campagnes/${campaignId}/brief/${briefId}`);
  revalidatePath(`/campagnes/${campaignId}`);
  revalidatePath("/campagnes");
  revalidatePath("/missions");
}

/** Enregistre le contenu structuré du brief (DRAFT uniquement). */
export async function updateBriefAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await sessionBrand("/campagnes");
  if ("error" in ctx) return { formError: ctx.error };

  const briefId = idSchema.safeParse(formData.get("briefId"));
  const campaignId = idSchema.safeParse(formData.get("campaignId"));
  if (!briefId.success || !campaignId.success) {
    return { formError: "Identifiant manquant — rechargez la page." };
  }

  const parsed = briefContentSchema.safeParse({
    objectif: formData.get("objectif") ?? "",
    livrable: formData.get("livrable") ?? "",
    specs: formData.get("specs") ?? "",
    ton: formData.get("ton") ?? "",
    echeance: formData.get("echeance") ?? "",
    contexte: formData.get("contexte") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await updateBriefContent({
      brandId: ctx.brandId,
      briefId: briefId.data,
      content: parsed.data,
      actorId: ctx.actorId,
    });
  } catch (err) {
    return toFormError(err, "updateBriefContent a échoué :");
  }

  revalidateBriefPaths(campaignId.data, briefId.data);
  return null;
}

/** Gate « valider le brief » — fige le contenu, ouvre l'éclatement en missions. */
export async function validateBriefAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await sessionBrand("/campagnes");
  if ("error" in ctx) return { formError: ctx.error };

  const briefId = idSchema.safeParse(formData.get("briefId"));
  const campaignId = idSchema.safeParse(formData.get("campaignId"));
  if (!briefId.success || !campaignId.success) {
    return { formError: "Identifiant manquant — rechargez la page." };
  }

  try {
    await validateBrief({ brandId: ctx.brandId, briefId: briefId.data, actorId: ctx.actorId });
  } catch (err) {
    return toFormError(err, "validateBrief a échoué :");
  }

  revalidateBriefPaths(campaignId.data, briefId.data);
  return null;
}

/** Gate « éclater en missions » — une mission OPEN par titre déclaré. */
export async function splitMissionsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await sessionBrand("/campagnes");
  if ("error" in ctx) return { formError: ctx.error };

  const briefId = idSchema.safeParse(formData.get("briefId"));
  const campaignId = idSchema.safeParse(formData.get("campaignId"));
  if (!briefId.success || !campaignId.success) {
    return { formError: "Identifiant manquant — rechargez la page." };
  }

  const raw = formData.get("titles");
  const titles = typeof raw === "string"
    ? raw.split(/\r?\n/).map((t) => t.trim()).filter((t) => t.length > 0)
    : [];
  const parsed = missionTitlesSchema.safeParse(titles);
  if (!parsed.success) {
    return { fieldErrors: { titles: [parsed.error.issues[0]!.message] } };
  }

  try {
    await createMissionsFromBrief({
      brandId: ctx.brandId,
      briefId: briefId.data,
      titles: parsed.data,
      actorId: ctx.actorId,
    });
  } catch (err) {
    return toFormError(err, "createMissionsFromBrief a échoué :");
  }

  revalidateBriefPaths(campaignId.data, briefId.data);
  return null;
}
