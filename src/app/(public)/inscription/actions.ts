"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { createSession } from "@/lib/session";
import { IdentityError, registerUser } from "@/server/identity";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Votre nom est requis."),
  email: z.email("Adresse email invalide."),
  password: z.string().min(8, "8 caractères minimum."),
  brandName: z.string().trim().min(1, "Le nom de votre marque est requis."),
});

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    brandName: formData.get("brandName"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  let session;
  try {
    session = await registerUser(parsed.data);
  } catch (err) {
    if (err instanceof IdentityError && err.code === "EMAIL_TAKEN") {
      return {
        fieldErrors: { email: ["Un compte existe déjà avec cet email — connectez-vous."] },
      };
    }
    console.error("[inscription] échec technique :", err);
    return { formError: "Inscription impossible pour le moment. Réessayez dans un instant." };
  }

  await createSession(session);
  redirect("/app");
}
