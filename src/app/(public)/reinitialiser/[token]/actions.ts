"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { IdentityError, resetPasswordWithToken } from "@/server/identity";

const resetSchema = z
  .object({
    token: z.string().min(20).max(128),
    password: z.string().min(8, "8 caractères minimum."),
    confirm: z.string().min(1, "Confirmez le nouveau mot de passe."),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Les deux mots de passe ne correspondent pas.",
  });

/** Consomme le token (hash + TTL + usage unique, atomique) et pose le
 *  nouveau mot de passe. Succès → écran de confirmation (?ok=1). */
export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await resetPasswordWithToken(parsed.data.token, parsed.data.password);
  } catch (err) {
    if (err instanceof IdentityError && err.code === "RESET_TOKEN_INVALID") {
      return {
        formError:
          "Ce lien est invalide, déjà utilisé ou expiré — refaites une demande de réinitialisation.",
      };
    }
    console.error("[reinitialiser] échec technique :", err);
    return { formError: "La réinitialisation a échoué pour une raison technique. Réessayez." };
  }

  redirect(`/reinitialiser/${encodeURIComponent(parsed.data.token)}?ok=1`);
}
