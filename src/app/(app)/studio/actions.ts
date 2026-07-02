"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { readSession } from "@/lib/session";
import {
  applyToMission,
  GuildError,
  pitchSchema,
  talentProfileSchema,
  upsertTalentProfile,
} from "@/server/guild";

/**
 * Server actions du Studio créateur (WP-011) : onboarding/édition du profil
 * talent et candidature à une mission du mur. L'identité vient TOUJOURS de
 * la session (jamais d'un champ client) ; la logique métier + l'audit vivent
 * dans src/server/guild.ts.
 */

async function requireStudioSession() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/studio");
  return session;
}

function toFormError(err: unknown, logPrefix: string): FormState {
  if (err instanceof GuildError) return { formError: err.message };
  console.error(`[studio] ${logPrefix}`, err);
  return { formError: "L'opération a échoué pour une raison technique. Réessayez dans un instant." };
}

/** Crée ou met à jour le profil talent du compte (mutation auditée). */
export async function saveTalentProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireStudioSession();

  const parsed = talentProfileSchema.safeParse({
    headline: formData.get("headline"),
    skills: formData.get("skills"),
    city: formData.get("city"),
    countryCode: formData.get("countryCode"),
    whatsapp: formData.get("whatsapp") ?? undefined,
    portfolioUrl: formData.get("portfolioUrl") ?? undefined,
    dailyRate: formData.get("dailyRate") ?? undefined,
    availability: formData.get("availability"),
    visibility: formData.get("visibility"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await upsertTalentProfile({
      userId: session.userId,
      workspaceId: session.workspaceId,
      data: parsed.data,
      actorId: session.userId,
    });
  } catch (err) {
    return toFormError(err, "upsertTalentProfile a échoué :");
  }

  revalidatePath("/studio");
  return null;
}

const missionIdSchema = z.string().min(1, "Identifiant de mission manquant — rechargez la page.");

/** Candidature du talent de session à une mission du mur. */
export async function applyToMissionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireStudioSession();

  const missionId = missionIdSchema.safeParse(formData.get("missionId"));
  if (!missionId.success) {
    return { formError: "Identifiant de mission manquant — rechargez la page." };
  }
  const pitch = pitchSchema.safeParse(formData.get("pitch"));
  if (!pitch.success) {
    return { fieldErrors: { pitch: [pitch.error.issues[0]!.message] } };
  }

  try {
    await applyToMission({
      userId: session.userId,
      missionId: missionId.data,
      pitch: pitch.data,
      actorId: session.userId,
    });
  } catch (err) {
    return toFormError(err, "applyToMission a échoué :");
  }

  revalidatePath("/studio");
  return null;
}
