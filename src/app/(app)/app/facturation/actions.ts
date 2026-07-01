"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/forms";
import { readSession } from "@/lib/session";
import { FinanceError, planSchema, requestSubscription } from "@/server/finance";
import { MarketError } from "@/server/market";

/**
 * Demande de souscription manuelle (« Payer via WhatsApp »). Le workspace
 * vient TOUJOURS de la session (jamais d'un champ client) ; seul le plan
 * voyage dans le formulaire, validé Zod. Succès = null → la page revalidée
 * affiche le bloc d'instructions depuis la demande `pending_manual` créée
 * (une seule voie de rendu, demande neuve ou ré-affichée).
 */
export async function requestSubscriptionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app/facturation");

  const parsed = planSchema.safeParse(formData.get("plan"));
  if (!parsed.success) {
    return { formError: "Plan inconnu — rechargez la page et réessayez." };
  }

  try {
    await requestSubscription({
      workspaceId: session.workspaceId,
      plan: parsed.data,
      actorId: session.userId,
    });
  } catch (err) {
    if (err instanceof FinanceError || err instanceof MarketError) {
      return { formError: err.message };
    }
    console.error("[facturation] requestSubscription a échoué :", err);
    return {
      formError: "La demande a échoué pour une raison technique. Réessayez dans un instant.",
    };
  }

  revalidatePath("/app/facturation");
  return null;
}
