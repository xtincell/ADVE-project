"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { readSession } from "@/lib/session";
import { getBrandForSession } from "@/server/brand";
import {
  assigneeSchema,
  assignMission,
  CampaignError,
  deliverMission,
  validateMission,
} from "@/server/campaigns";
import {
  acceptApplication,
  declineApplication,
  GuildError,
  setMissionGuildOpen,
  shortlistApplication,
} from "@/server/guild";
import { declaredGrossSchema, PayoutError } from "@/server/payouts";

/**
 * Server actions du circuit mission : OPEN → ASSIGNED → DELIVERED → VALIDATED,
 * plus la Guilde (WP-011) : publier/retirer la mission du mur et décider les
 * candidatures (shortlist / accepter / décliner). Chaque transition est une
 * gate (flip atomique côté service, message FR si l'état a bougé sous les
 * pieds de l'opérateur).
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
  if (err instanceof CampaignError || err instanceof GuildError || err instanceof PayoutError) {
    return { formError: err.message };
  }
  console.error(`[campagnes] ${logPrefix}`, err);
  return { formError: "L'opération a échoué pour une raison technique. Réessayez dans un instant." };
}

function parseIds(formData: FormData) {
  const missionId = idSchema.safeParse(formData.get("missionId"));
  const campaignId = idSchema.safeParse(formData.get("campaignId"));
  if (!missionId.success || !campaignId.success) return null;
  return { missionId: missionId.data, campaignId: campaignId.data };
}

function revalidateMissionPaths(campaignId: string, missionId: string) {
  revalidatePath(`/campagnes/${campaignId}/mission/${missionId}`);
  revalidatePath(`/campagnes/${campaignId}`);
  revalidatePath("/missions");
  // Le mur et les candidatures du Studio créateur reflètent ces décisions.
  revalidatePath("/studio");
}

/** OPEN → ASSIGNED : assignation directe (nom/contact déclaré — fallback hors Guilde). */
export async function assignMissionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await sessionBrand("/missions");
  if ("error" in ctx) return { formError: ctx.error };

  const ids = parseIds(formData);
  if (!ids) return { formError: "Identifiant manquant — rechargez la page." };

  const assignee = assigneeSchema.safeParse(formData.get("assignee"));
  if (!assignee.success) {
    return { fieldErrors: { assignee: [assignee.error.issues[0]!.message] } };
  }

  try {
    await assignMission({
      brandId: ctx.brandId,
      missionId: ids.missionId,
      assignee: assignee.data,
      actorId: ctx.actorId,
    });
  } catch (err) {
    return toFormError(err, "assignMission a échoué :");
  }

  revalidateMissionPaths(ids.campaignId, ids.missionId);
  return null;
}

/** ASSIGNED → DELIVERED : le talent a livré. */
export async function deliverMissionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await sessionBrand("/missions");
  if ("error" in ctx) return { formError: ctx.error };

  const ids = parseIds(formData);
  if (!ids) return { formError: "Identifiant manquant — rechargez la page." };

  try {
    await deliverMission({ brandId: ctx.brandId, missionId: ids.missionId, actorId: ctx.actorId });
  } catch (err) {
    return toFormError(err, "deliverMission a échoué :");
  }

  revalidateMissionPaths(ids.campaignId, ids.missionId);
  return null;
}

/**
 * DELIVERED → VALIDATED : livraison validée — fin du circuit. Mission gagnée
 * via la Guilde : crée l'ordre de gain (WP-024) — `grossAmount` optionnel
 * saisi par la marque (sinon dérivation dailyRate × jours côté service).
 */
export async function validateMissionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await sessionBrand("/missions");
  if ("error" in ctx) return { formError: ctx.error };

  const ids = parseIds(formData);
  if (!ids) return { formError: "Identifiant manquant — rechargez la page." };

  const gross = declaredGrossSchema.safeParse(formData.get("grossAmount") ?? "");
  if (!gross.success) {
    return { fieldErrors: { grossAmount: [gross.error.issues[0]!.message] } };
  }

  try {
    await validateMission({
      brandId: ctx.brandId,
      missionId: ids.missionId,
      actorId: ctx.actorId,
      declaredGross: gross.data,
    });
  } catch (err) {
    return toFormError(err, "validateMission a échoué :");
  }

  revalidateMissionPaths(ids.campaignId, ids.missionId);
  return null;
}

// ── Guilde (WP-011) : mur des missions + décisions de candidature ──────

/** Publie la mission sur le mur de la Guilde, ou l'en retire (`open` caché). */
export async function toggleGuildAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await sessionBrand("/missions");
  if ("error" in ctx) return { formError: ctx.error };

  const ids = parseIds(formData);
  if (!ids) return { formError: "Identifiant manquant — rechargez la page." };
  const open = formData.get("open") === "true";

  try {
    await setMissionGuildOpen({
      brandId: ctx.brandId,
      missionId: ids.missionId,
      open,
      actorId: ctx.actorId,
    });
  } catch (err) {
    return toFormError(err, "setMissionGuildOpen a échoué :");
  }

  revalidateMissionPaths(ids.campaignId, ids.missionId);
  return null;
}

type ApplicationDecision = "shortlist" | "accept" | "decline";

const DECIDERS: Record<
  ApplicationDecision,
  typeof shortlistApplication | typeof acceptApplication | typeof declineApplication
> = {
  shortlist: shortlistApplication,
  accept: acceptApplication,
  decline: declineApplication,
};

async function decideApplicationAction(
  decision: ApplicationDecision,
  formData: FormData,
): Promise<FormState> {
  const ctx = await sessionBrand("/missions");
  if ("error" in ctx) return { formError: ctx.error };

  const ids = parseIds(formData);
  const applicationId = idSchema.safeParse(formData.get("applicationId"));
  if (!ids || !applicationId.success) {
    return { formError: "Identifiant manquant — rechargez la page." };
  }

  try {
    await DECIDERS[decision]({
      brandId: ctx.brandId,
      applicationId: applicationId.data,
      actorId: ctx.actorId,
    });
  } catch (err) {
    return toFormError(err, `décision de candidature (${decision}) a échoué :`);
  }

  revalidateMissionPaths(ids.campaignId, ids.missionId);
  return null;
}

/** APPLIED → SHORTLISTED : retenir la candidature pour arbitrage. */
export async function shortlistApplicationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return decideApplicationAction("shortlist", formData);
}

/** Accepter = assigner la mission au talent (candidatures sœurs déclinées). */
export async function acceptApplicationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return decideApplicationAction("accept", formData);
}

/** Décliner la candidature (décision terminale). */
export async function declineApplicationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return decideApplicationAction("decline", formData);
}
