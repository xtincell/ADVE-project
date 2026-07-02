"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { requestPasswordReset } from "@/server/identity";

const forgotSchema = z.object({
  email: z.email("Adresse email invalide."),
});

/**
 * Demande de réinitialisation — la réponse est IDENTIQUE que le compte existe
 * ou non (anti-énumération) : succès → redirect vers l'écran de confirmation
 * honnête (pas d'email envoyé en v7, relais opérateur WhatsApp).
 */
export async function requestResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await requestPasswordReset(parsed.data.email);
  } catch (err) {
    console.error("[mot-de-passe-oublie] échec technique :", err);
    return { formError: "La demande n'a pas pu être enregistrée. Réessayez dans un instant." };
  }

  redirect("/mot-de-passe-oublie?envoyee=1");
}
