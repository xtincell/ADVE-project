"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { readSession, type SessionPayload } from "@/lib/session";
import {
  changeUserEmail,
  changeUserPassword,
  IdentityError,
  updateAccountName,
} from "@/server/identity";

/**
 * Mutations des réglages du compte (WP-022). Le middleware ne couvre pas
 * /reglages (hors matcher /app|/admin) : la session est re-vérifiée dans
 * CHAQUE action — une server action est un endpoint POST à part entière.
 * Toute mutation passe par server/identity.ts (transaction + AuditLog chaîné).
 */

async function requireSession(): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/reglages");
  return session;
}

function zodFormState(error: z.ZodError): FormState {
  const flat = z.flattenError(error);
  return {
    formError: flat.formErrors[0],
    fieldErrors: flat.fieldErrors as Record<string, string[] | undefined>,
  };
}

// ── Nom affiché ─────────────────────────────────────────────────────────

const nameSchema = z.object({
  name: z.string().trim().min(1, "Votre nom est requis.").max(120, "120 caractères maximum."),
});

export async function updateNameAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return zodFormState(parsed.error);

  try {
    await updateAccountName(session, parsed.data.name);
  } catch (err) {
    console.error("[reglages] updateAccountName a échoué :", err);
    return { formError: "L'enregistrement du nom a échoué pour une raison technique." };
  }

  revalidatePath("/reglages");
  redirect("/reglages?ok=nom");
}

// ── Email (re-vérification du mot de passe courant) ─────────────────────

const emailSchema = z.object({
  email: z.email("Adresse email invalide."),
  currentPassword: z.string().min(1, "Votre mot de passe actuel est requis."),
});

export async function changeEmailAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const parsed = emailSchema.safeParse({
    email: formData.get("email"),
    currentPassword: formData.get("currentPassword"),
  });
  if (!parsed.success) return zodFormState(parsed.error);

  try {
    await changeUserEmail(session, parsed.data.email, parsed.data.currentPassword);
  } catch (err) {
    if (err instanceof IdentityError && err.code === "BAD_PASSWORD") {
      return { fieldErrors: { currentPassword: ["Mot de passe incorrect."] } };
    }
    if (err instanceof IdentityError && err.code === "EMAIL_TAKEN") {
      return { fieldErrors: { email: ["Un compte existe déjà avec cet email."] } };
    }
    console.error("[reglages] changeUserEmail a échoué :", err);
    return { formError: "Le changement d'email a échoué pour une raison technique." };
  }

  revalidatePath("/reglages");
  redirect("/reglages?ok=email");
}

// ── Mot de passe ────────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Votre mot de passe actuel est requis."),
    newPassword: z.string().min(8, "8 caractères minimum."),
    confirm: z.string().min(1, "Confirmez le nouveau mot de passe."),
  })
  .refine((d) => d.newPassword === d.confirm, {
    path: ["confirm"],
    message: "Les deux mots de passe ne correspondent pas.",
  });

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return zodFormState(parsed.error);

  try {
    await changeUserPassword(session, parsed.data.currentPassword, parsed.data.newPassword);
  } catch (err) {
    if (err instanceof IdentityError && err.code === "BAD_PASSWORD") {
      return { fieldErrors: { currentPassword: ["Mot de passe incorrect."] } };
    }
    console.error("[reglages] changeUserPassword a échoué :", err);
    return { formError: "Le changement de mot de passe a échoué pour une raison technique." };
  }

  revalidatePath("/reglages");
  redirect("/reglages?ok=motdepasse");
}
