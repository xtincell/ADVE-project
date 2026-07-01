"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { readSession } from "@/lib/session";
import { PILLARS } from "@/domain/pillars";
import { amendPillarField, BrandError, getBrandForSession } from "@/server/brand";

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
