"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { readSession } from "@/lib/session";
import { isAdminSession } from "@/lib/session-token";
import { approveSubscription, FinanceError, rejectSubscription } from "@/server/finance";
import { MarketError } from "@/server/market";

/**
 * Décisions opérateur sur la file de validation manuelle. Le middleware garde
 * déjà /admin, mais une server action est un endpoint POST à part entière :
 * la session admin est re-vérifiée ici (défense en profondeur). L'acteur
 * audité est TOUJOURS l'opérateur de session.
 */

const idSchema = z.string().min(1).max(64);

async function requireAdminActor(): Promise<string> {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/admin/paiements");
  if (!isAdminSession(session)) redirect("/app");
  return session.userId;
}

function refreshPaymentViews(): void {
  revalidatePath("/admin/paiements");
  revalidatePath("/admin"); // compteur « Paiements à valider »
}

export async function approveSubscriptionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actorId = await requireAdminActor();
  const parsed = idSchema.safeParse(formData.get("subscriptionId"));
  if (!parsed.success) return { formError: "Identifiant de demande invalide." };

  try {
    await approveSubscription({ id: parsed.data, actorId });
  } catch (err) {
    if (err instanceof FinanceError || err instanceof MarketError) {
      return { formError: err.message };
    }
    console.error("[admin/paiements] approve a échoué :", err);
    return { formError: "La validation a échoué pour une raison technique. Réessayez." };
  }

  refreshPaymentViews();
  return null;
}

export async function rejectSubscriptionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actorId = await requireAdminActor();
  const parsed = idSchema.safeParse(formData.get("subscriptionId"));
  if (!parsed.success) return { formError: "Identifiant de demande invalide." };

  try {
    await rejectSubscription({ id: parsed.data, actorId });
  } catch (err) {
    if (err instanceof FinanceError) return { formError: err.message };
    console.error("[admin/paiements] reject a échoué :", err);
    return { formError: "Le rejet a échoué pour une raison technique. Réessayez." };
  }

  refreshPaymentViews();
  return null;
}
