"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { createSession, destroySession } from "@/lib/session";
import { isAdminSession } from "@/lib/session-token";
import { verifyCredentials } from "@/server/identity";

const loginSchema = z.object({
  email: z.email("Adresse email invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

/** N'accepte que des chemins internes (« /app/... ») — jamais d'URL externe. */
function safeNextPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  let session;
  try {
    session = await verifyCredentials(parsed.data.email, parsed.data.password);
  } catch (err) {
    console.error("[connexion] échec technique :", err);
    return { formError: "Connexion impossible pour le moment. Réessayez dans un instant." };
  }
  if (!session) {
    return { formError: "Email ou mot de passe incorrect." };
  }

  await createSession(session);
  const next = safeNextPath(formData.get("next"));
  redirect(next ?? (isAdminSession(session) ? "/admin" : "/app"));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/connexion");
}
