import { TRPCError } from "@trpc/server";
import type { Context } from "./context";

/**
 * Résout l'ID utilisateur d'une session vers une ligne `User` qui existe
 * RÉELLEMENT en base, et le retourne.
 *
 * # Pourquoi
 *
 * L'auth tourne en JWT (`session: { strategy: "jwt" }`). Le token est signé et
 * survit donc aux re-seed / migrations / purges de la base. Conséquence : une
 * session valide peut porter un `user.id` qui ne correspond plus à aucune ligne
 * `User`. Tout `db.strategy.create({ data: { userId: session.user.id } })` brut
 * lève alors `Foreign key constraint violated: Strategy_userId_fkey`.
 *
 * Ce helper neutralise ce trou pour TOUS les flux de création rattachés à un
 * utilisateur (cockpit `strategy.create`, La Guilde `postMission`, …) :
 *
 *   1. `session.user.id` existe en base → on le retourne (chemin rapide, cas usuel).
 *   2. Sinon, `session.user.email` matche une ligne → on relie à cet id
 *      (l'utilisateur a été re-seedé avec un id différent).
 *   3. Sinon, le JWT est signé donc digne de confiance → on recrée la ligne
 *      `User` depuis ses claims (email/name/role) pour que la FK soit satisfaite.
 *   4. Aucun email exploitable → session orpheline irrécupérable → 401 propre
 *      (« reconnecte-toi ») plutôt qu'une FK violation opaque.
 *
 * Idempotent et sans effet de bord au chemin 1 (lecture seule).
 */
export async function resolveSessionUserId(ctx: Context): Promise<string> {
  const sessionUser = ctx.session?.user;
  if (!sessionUser) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Session requise." });
  }

  // 1. Chemin rapide — l'id de session existe en base.
  if (sessionUser.id) {
    const byId = await ctx.db.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true },
    });
    if (byId) return byId.id;
  }

  // 2. Re-lien par email (l'utilisateur a été re-seedé avec un id différent).
  if (sessionUser.email) {
    const byEmail = await ctx.db.user.findUnique({
      where: { email: sessionUser.email },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  // 3. JWT signé mais ligne absente → recrée l'utilisateur depuis les claims.
  if (sessionUser.email) {
    const role = (sessionUser.role as string | undefined) ?? "USER";
    const operatorId =
      (sessionUser as unknown as Record<string, unknown>).operatorId as string | undefined;
    const recreated = await ctx.db.user.upsert({
      where: { email: sessionUser.email },
      update: {},
      create: {
        email: sessionUser.email,
        name: sessionUser.name ?? null,
        role: role as never,
        ...(operatorId ? { operatorId } : {}),
      },
      select: { id: true },
    });
    return recreated.id;
  }

  // 4. Session sans email → irrécupérable.
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Session expirée ou compte introuvable — reconnecte-toi.",
  });
}
