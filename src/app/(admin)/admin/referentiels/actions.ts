"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { readSession } from "@/lib/session";
import { isAdminSession } from "@/lib/session-token";
import {
  AdminError,
  countryInputSchema,
  createZoneIndex,
  deleteZoneIndex,
  updateZoneIndex,
  upsertCountry,
  zoneIndexCreateSchema,
  zoneIndexUpdateSchema,
} from "@/server/admin";

/**
 * Mutations référentiels (Country + ZoneIndex) — LE remplacement du « barème
 * seedé » : l'opérateur édite en base, source obligatoire, chaque mutation
 * passe par le service admin (transaction + AuditLog hash-chaîné).
 *
 * Le middleware garde /admin, mais une server action est un endpoint POST à
 * part entière : session admin re-vérifiée ici (défense en profondeur).
 */

async function requireAdminActor(): Promise<string> {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/admin/referentiels");
  if (!isAdminSession(session)) redirect("/app");
  return session.userId;
}

function fieldValues(formData: FormData, keys: string[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const key of keys) values[key] = formData.get(key) ?? "";
  return values;
}

function zodFormState(error: z.ZodError): FormState {
  const flat = z.flattenError(error);
  return {
    formError: flat.formErrors[0],
    fieldErrors: flat.fieldErrors as Record<string, string[] | undefined>,
  };
}

function refresh(): void {
  revalidatePath("/admin/referentiels");
  revalidatePath("/admin"); // compteur « Référentiels »
}

export async function upsertCountryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actorId = await requireAdminActor();
  const parsed = countryInputSchema.safeParse(
    fieldValues(formData, ["code", "name", "currency", "zone"]),
  );
  if (!parsed.success) return zodFormState(parsed.error);

  try {
    await upsertCountry(parsed.data, actorId);
  } catch (err) {
    console.error("[admin/referentiels] upsertCountry a échoué :", err);
    return { formError: "L'enregistrement du pays a échoué pour une raison technique." };
  }
  refresh();
  redirect("/admin/referentiels");
}

export async function createZoneIndexAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actorId = await requireAdminActor();
  const parsed = zoneIndexCreateSchema.safeParse(
    fieldValues(formData, [
      "family",
      "countryCode",
      "key",
      "value",
      "source",
      "validFrom",
      "validUntil",
    ]),
  );
  if (!parsed.success) return zodFormState(parsed.error);

  try {
    await createZoneIndex(parsed.data, actorId);
  } catch (err) {
    console.error("[admin/referentiels] createZoneIndex a échoué :", err);
    return { formError: "La création de la ligne d'indice a échoué pour une raison technique." };
  }
  refresh();
  redirect("/admin/referentiels");
}

export async function updateZoneIndexAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actorId = await requireAdminActor();
  const parsed = zoneIndexUpdateSchema.safeParse(
    fieldValues(formData, [
      "id",
      "family",
      "countryCode",
      "key",
      "value",
      "source",
      "validFrom",
      "validUntil",
    ]),
  );
  if (!parsed.success) return zodFormState(parsed.error);

  try {
    await updateZoneIndex(parsed.data, actorId);
  } catch (err) {
    if (err instanceof AdminError) return { formError: err.message };
    console.error("[admin/referentiels] updateZoneIndex a échoué :", err);
    return { formError: "La mise à jour de la ligne a échoué pour une raison technique." };
  }
  refresh();
  redirect("/admin/referentiels");
}

const deleteSchema = z.object({
  id: z.string().min(1).max(64),
  confirm: z.literal("on", "Cochez la case de confirmation pour supprimer."),
});

export async function deleteZoneIndexAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actorId = await requireAdminActor();
  const parsed = deleteSchema.safeParse({
    id: formData.get("id") ?? "",
    confirm: formData.get("confirm") ?? "",
  });
  if (!parsed.success) {
    return { formError: "Cochez la case de confirmation pour supprimer la ligne." };
  }

  try {
    await deleteZoneIndex(parsed.data.id, actorId);
  } catch (err) {
    if (err instanceof AdminError) return { formError: err.message };
    console.error("[admin/referentiels] deleteZoneIndex a échoué :", err);
    return { formError: "La suppression a échoué pour une raison technique." };
  }
  refresh();
  redirect("/admin/referentiels");
}
