import { TRPCError } from "@trpc/server";
import type { Context } from "./context";

/**
 * Résout l'ID utilisateur d'une session vers une ligne `User` qui existe
 * RÉELLEMENT en base, et le retourne.
 *
 * # Pourquoi
 *
 * L'auth tourne en JWT (`session: { strategy: "jwt" }`). Le token est signé et
 * survit donc aux suppressions, re-seed et purges de la base. Une session peut
 * porter un `user.id` qui ne correspond plus à aucune ligne `User` ; un
 * `db.strategy.create({ data: { userId } })` brut lèverait alors une violation
 * de clé étrangère opaque.
 *
 * Le jeton n'est PAS une source d'identité (plan 4.11.f) : seule la ligne
 * persistée l'est. Ce helper ne recrée donc jamais un compte depuis les claims
 * du jeton (email, nom, rôle, équipe) et ne le rattache pas à un autre compte
 * partageant son email — un compte supprimé redevenait sinon actif, avec son
 * ancien rôle. Le callback `jwt` (`src/lib/auth/config.ts`) révoque déjà la
 * session d'un compte absent ; ce contrôle couvre la suppression survenue
 * pendant la requête.
 *
 *   1. `session.user.id` existe en base → on le retourne (lecture seule).
 *   2. Sinon → 401 propre (« reconnecte-toi ») plutôt qu'une FK violation.
 */
export async function resolveSessionUserId(ctx: Context): Promise<string> {
  const sessionUser = ctx.session?.user;
  if (!sessionUser) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Session requise." });
  }

  if (sessionUser.id) {
    const byId = await ctx.db.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true },
    });
    if (byId) return byId.id;
  }

  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Session expirée ou compte introuvable — reconnecte-toi.",
  });
}
