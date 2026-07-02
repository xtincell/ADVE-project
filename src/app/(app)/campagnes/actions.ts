"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { readSession } from "@/lib/session";
import { getBrandForSession } from "@/server/brand";
import { CampaignError, createCampaign, createCampaignSchema } from "@/server/campaigns";

/**
 * Création du cadre de campagne (nom, objectif, marché). La marque vient
 * TOUJOURS de la session (jamais d'un champ client). Succès = redirection
 * vers la page de la campagne créée.
 */
export async function createCampaignAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/campagnes");

  const brand = await getBrandForSession(session);
  if (!brand) {
    return { formError: "Aucune marque dans cet espace — commencez par le diagnostic (/intake)." };
  }

  const parsed = createCampaignSchema.safeParse({
    name: formData.get("name"),
    objective: formData.get("objective"),
    countryCode: formData.get("countryCode"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  let campaignId: string;
  try {
    const campaign = await createCampaign({
      brandId: brand.id,
      ...parsed.data,
      actorId: session.userId,
    });
    campaignId = campaign.id;
  } catch (err) {
    if (err instanceof CampaignError) return { formError: err.message };
    console.error("[campagnes] createCampaign a échoué :", err);
    return {
      formError: "La création a échoué pour une raison technique. Réessayez dans un instant.",
    };
  }

  revalidatePath("/campagnes");
  redirect(`/campagnes/${campaignId}`);
}
