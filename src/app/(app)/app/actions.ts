"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/forms";
import { readSession } from "@/lib/session";
import { BrandError, deriveRtis, getBrandForSession } from "@/server/brand";

/**
 * Dérive les piliers RTIS depuis le socle ADVE de la marque du workspace.
 * La marque est TOUJOURS résolue depuis la session (jamais un id client).
 * Succès = null ; échec = message FR affichable.
 */
export async function deriveRtisAction(
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app");

  const brand = await getBrandForSession(session);
  if (!brand) {
    return { formError: "Aucune marque dans cet espace — commencez par le diagnostic d'entrée." };
  }

  try {
    await deriveRtis({ brandId: brand.id, actorId: session.userId });
  } catch (err) {
    if (err instanceof BrandError) return { formError: err.message };
    console.error("[app] deriveRtis a échoué :", err);
    return { formError: "La dérivation a échoué pour une raison technique. Réessayez dans un instant." };
  }

  revalidatePath("/app", "layout");
  return null;
}
