"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { readSession } from "@/lib/session";
import { getBrandForSession } from "@/server/brand";
import {
  addAction,
  addActionSchema,
  archiveCampaign,
  CampaignError,
  createBriefFromAction,
  launchCampaign,
} from "@/server/campaigns";

/**
 * Server actions du détail campagne. La marque vient TOUJOURS de la session ;
 * les ids voyagent en champs cachés mais chaque service re-vérifie que
 * l'entité appartient à la marque (id forgé = introuvable). Les gates
 * métier (domain/campaign.ts) rendent des messages FR prêts à afficher.
 */

const idSchema = z.string().min(1, "Identifiant manquant — rechargez la page.");

type SessionBrand = { brandId: string; actorId: string } | { error: string };

async function sessionBrand(next: string): Promise<SessionBrand> {
  const session = await readSession();
  if (!session) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  const brand = await getBrandForSession(session);
  if (!brand) return { error: "Aucune marque dans cet espace — commencez par le diagnostic." };
  return { brandId: brand.id, actorId: session.userId };
}

function toFormError(err: unknown, fallback: string): FormState {
  if (err instanceof CampaignError) return { formError: err.message };
  console.error(`[campagnes] ${fallback}`, err);
  return { formError: "L'opération a échoué pour une raison technique. Réessayez dans un instant." };
}

/** Ajoute une action (frame) — coût estimé par lookup référentiel au passage. */
export async function addActionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await sessionBrand("/campagnes");
  if ("error" in ctx) return { formError: ctx.error };

  const campaignId = idSchema.safeParse(formData.get("campaignId"));
  if (!campaignId.success) return { formError: campaignId.error.issues[0]!.message };

  const parsed = addActionSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await addAction({
      brandId: ctx.brandId,
      campaignId: campaignId.data,
      ...parsed.data,
      actorId: ctx.actorId,
    });
  } catch (err) {
    return toFormError(err, "addAction a échoué :");
  }

  revalidatePath(`/campagnes/${campaignId.data}`);
  revalidatePath("/campagnes");
  return null;
}

/** Gate « lancer la production » (DRAFT → ACTIVE, exige ≥ 1 action). */
export async function launchCampaignAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await sessionBrand("/campagnes");
  if ("error" in ctx) return { formError: ctx.error };

  const campaignId = idSchema.safeParse(formData.get("campaignId"));
  if (!campaignId.success) return { formError: campaignId.error.issues[0]!.message };

  try {
    await launchCampaign({
      brandId: ctx.brandId,
      campaignId: campaignId.data,
      actorId: ctx.actorId,
    });
  } catch (err) {
    return toFormError(err, "launchCampaign a échoué :");
  }

  revalidatePath(`/campagnes/${campaignId.data}`);
  revalidatePath("/campagnes");
  return null;
}

/** Archive la campagne — plus aucune écriture ensuite. */
export async function archiveCampaignAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await sessionBrand("/campagnes");
  if ("error" in ctx) return { formError: ctx.error };

  const campaignId = idSchema.safeParse(formData.get("campaignId"));
  if (!campaignId.success) return { formError: campaignId.error.issues[0]!.message };

  try {
    await archiveCampaign({
      brandId: ctx.brandId,
      campaignId: campaignId.data,
      actorId: ctx.actorId,
    });
  } catch (err) {
    return toFormError(err, "archiveCampaign a échoué :");
  }

  revalidatePath(`/campagnes/${campaignId.data}`);
  revalidatePath("/campagnes");
  return null;
}

/**
 * Gate « transformer en brief » (action PLANNED, campagne ACTIVE) : crée le
 * brief pré-rempli puis redirige vers son éditeur.
 */
export async function transformActionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await sessionBrand("/campagnes");
  if ("error" in ctx) return { formError: ctx.error };

  const actionId = idSchema.safeParse(formData.get("actionId"));
  const campaignId = idSchema.safeParse(formData.get("campaignId"));
  if (!actionId.success || !campaignId.success) {
    return { formError: "Identifiant manquant — rechargez la page." };
  }

  let briefId: string;
  try {
    const brief = await createBriefFromAction({
      brandId: ctx.brandId,
      actionId: actionId.data,
      actorId: ctx.actorId,
    });
    briefId = brief.id;
  } catch (err) {
    return toFormError(err, "createBriefFromAction a échoué :");
  }

  revalidatePath(`/campagnes/${campaignId.data}`);
  redirect(`/campagnes/${campaignId.data}/brief/${briefId}`);
}
