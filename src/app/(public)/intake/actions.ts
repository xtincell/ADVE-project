"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { submitIntake } from "@/server/funnel";

/**
 * Server action du wizard /intake — reçoit le payload structuré du client,
 * délègue à `submitIntake` (validation Zod à la frontière service) puis
 * redirige vers la page résultat. Aucune session requise.
 */
export async function submitIntakeAction(
  payload: unknown,
): Promise<{ formError: string } | undefined> {
  let leadId: string;
  try {
    const result = await submitIntake(payload);
    leadId = result.leadId;
  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return {
        formError: first?.message ?? "Réponses invalides — vérifiez le formulaire.",
      };
    }
    console.error("[intake] échec technique :", err);
    return {
      formError:
        "Impossible d'enregistrer votre diagnostic pour le moment. Réessayez dans un instant.",
    };
  }
  redirect(`/intake/resultat/${leadId}`);
}
