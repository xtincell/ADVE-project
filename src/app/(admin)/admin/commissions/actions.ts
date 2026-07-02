"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { readSession } from "@/lib/session";
import { isAdminSession } from "@/lib/session-token";
import {
  approvePayout,
  PayoutError,
  payoutMethodSchema,
  payoutReferenceSchema,
  payPayout,
  rejectPayout,
} from "@/server/payouts";

/**
 * Décisions opérateur sur les ordres de gain talents (WP-024) — le pendant
 * SORTANT de /admin/paiements : approuver l'ordre, puis marquer payé après le
 * versement mobile money réel (référence de transaction obligatoire). Le
 * middleware garde déjà /admin, mais une server action est un endpoint POST à
 * part entière : la session admin est re-vérifiée ici (défense en profondeur).
 * L'acteur audité est TOUJOURS l'opérateur de session.
 */

const idSchema = z.string().min(1).max(64);

async function requireAdminActor(): Promise<string> {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/admin/commissions");
  if (!isAdminSession(session)) redirect("/app");
  return session.userId;
}

function refreshCommissionViews(): void {
  revalidatePath("/admin/commissions");
  // Les gains du talent et la carte commissions de la flotte reflètent la décision.
  revalidatePath("/studio");
  revalidatePath("/espace-agence/revenus");
}

function toFormError(err: unknown, logPrefix: string): FormState {
  if (err instanceof PayoutError) return { formError: err.message };
  console.error(`[admin/commissions] ${logPrefix}`, err);
  return { formError: "L'opération a échoué pour une raison technique. Réessayez." };
}

export async function approvePayoutAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actorId = await requireAdminActor();
  const parsed = idSchema.safeParse(formData.get("payoutId"));
  if (!parsed.success) return { formError: "Identifiant d'ordre invalide." };

  try {
    await approvePayout({ id: parsed.data, actorId });
  } catch (err) {
    return toFormError(err, "approve a échoué :");
  }

  refreshCommissionViews();
  return null;
}

export async function rejectPayoutAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actorId = await requireAdminActor();
  const parsed = idSchema.safeParse(formData.get("payoutId"));
  if (!parsed.success) return { formError: "Identifiant d'ordre invalide." };

  try {
    await rejectPayout({ id: parsed.data, actorId });
  } catch (err) {
    return toFormError(err, "reject a échoué :");
  }

  refreshCommissionViews();
  return null;
}

export async function payPayoutAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actorId = await requireAdminActor();
  const id = idSchema.safeParse(formData.get("payoutId"));
  if (!id.success) return { formError: "Identifiant d'ordre invalide." };

  const method = payoutMethodSchema.safeParse(formData.get("method"));
  if (!method.success) return { formError: "Choisissez le rail de paiement (momo ou manuel)." };

  const reference = payoutReferenceSchema.safeParse(formData.get("reference"));
  if (!reference.success) {
    return { fieldErrors: { reference: [reference.error.issues[0]!.message] } };
  }

  try {
    await payPayout({ id: id.data, method: method.data, reference: reference.data, actorId });
  } catch (err) {
    return toFormError(err, "pay a échoué :");
  }

  refreshCommissionViews();
  return null;
}
