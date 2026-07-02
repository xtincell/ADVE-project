"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readSession } from "@/lib/session";
import { isAdminSession } from "@/lib/session-token";
import { IdentityError, issueResetLink } from "@/server/identity";

/**
 * Émission manuelle d'un lien de réinitialisation (WP-022) — l'acquis
 * « validation manuelle » appliqué à l'auth : sans provider email, c'est
 * l'opérateur qui mint le lien et le transmet par WhatsApp. Le lien ne
 * s'affiche qu'UNE fois (rotation du hash en base — rien de rejouable).
 *
 * Le middleware garde /admin, mais une server action est un endpoint POST à
 * part entière : session admin re-vérifiée ici (défense en profondeur).
 */

export type IssueLinkState = {
  url?: string;
  email?: string;
  expiresAt?: string; // pré-formaté serveur (fr-FR)
  error?: string;
} | null;

const EXPIRY_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "2-digit",
});

async function requireAdminActor(): Promise<string> {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/admin/utilisateurs");
  if (!isAdminSession(session)) redirect("/app");
  return session.userId;
}

export async function issueResetLinkAction(
  _prev: IssueLinkState,
  formData: FormData,
): Promise<IssueLinkState> {
  const actorId = await requireAdminActor();
  const parsed = z.string().min(1).max(64).safeParse(formData.get("requestId"));
  if (!parsed.success) return { error: "Demande introuvable." };

  let issued;
  try {
    issued = await issueResetLink(parsed.data, actorId);
  } catch (err) {
    if (err instanceof IdentityError && err.code === "RESET_REQUEST_USED") {
      return { error: "Cette demande a déjà servi — le compte a réinitialisé son mot de passe." };
    }
    console.error("[admin/utilisateurs] issueResetLink a échoué :", err);
    return { error: "L'émission du lien a échoué pour une raison technique." };
  }

  revalidatePath("/admin/utilisateurs"); // rafraîchit l'échéance affichée dans la file
  return {
    url: issued.url,
    email: issued.email,
    expiresAt: EXPIRY_FORMAT.format(issued.expiresAt),
  };
}
