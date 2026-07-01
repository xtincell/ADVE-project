"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/forms";
import { readSession } from "@/lib/session";
import { BrandError, getBrandForSession } from "@/server/brand";
import { composeOracleDeliverable } from "@/server/deliverables";
import { canComposeOracle } from "@/server/entitlements";

/**
 * Compose (ou recompose) l'Oracle — mutation EXPLICITE uniquement : la page
 * ne persiste jamais rien en la visitant. Succès = null.
 *
 * Gated par plan (WP-007) : abonnement actif OU grâce découverte de 15 jours
 * (`canComposeOracle`). La LECTURE d'un Oracle déjà composé reste libre —
 * seul l'acte de composition est un droit payant.
 */
export async function composeOracleAction(
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app/oracle");

  const brand = await getBrandForSession(session);
  if (!brand) {
    return { formError: "Aucune marque dans cet espace — commencez par le diagnostic d'entrée." };
  }

  const entitlement = await canComposeOracle(session.workspaceId);
  if (!entitlement.allowed) {
    return {
      formError:
        "Abonnement requis — votre période de découverte de 15 jours est terminée. " +
        "Activez le plan Cockpit ou Retainer depuis la page Facturation (/app/facturation) " +
        "pour composer l'Oracle. Votre Oracle déjà composé reste consultable.",
    };
  }

  try {
    await composeOracleDeliverable({ brandId: brand.id, actorId: session.userId });
  } catch (err) {
    if (err instanceof BrandError) return { formError: err.message };
    console.error("[oracle] composition a échoué :", err);
    return { formError: "La composition a échoué pour une raison technique. Réessayez dans un instant." };
  }

  revalidatePath("/app/oracle", "layout");
  return null;
}
