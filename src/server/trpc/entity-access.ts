/**
 * Lectures d'entité keyées par un identifiant d'entrée — un seul refus pour
 * « inconnu » et « hors d'atteinte » (IN1, recette d'installation isolée du
 * 19 octobre ; patron d'`assertSourceAccess`, 6.27.557, étendu en 6.27.570).
 *
 * `findUniqueOrThrow` / `findFirstOrThrow` laissaient remonter P2025 en HTTP 500,
 * avec un message Prisma qui expose le chemin et un extrait d'un fichier serveur.
 * Quand la garde de marque venait après la lecture, un identifiant d'un autre
 * locataire recevait 403 et un identifiant inconnu 500 : la réponse disait si
 * l'identifiant existait ailleurs.
 *
 * Ici : lecture par `findUnique`/`findFirst`, absence → `NOT_FOUND` (404) typé ;
 * le refus de la garde d'accès placée après la lecture (`FORBIDDEN`, le 404 du
 * parent, ou `false` pour un `canAccess*`) devient exactement le même 404, avec
 * le même message.
 * Toute autre erreur (panne de base, `UNAUTHORIZED`, autre code Prisma) garde
 * son code. Aucune règle globale « P2025 → 404 » : P2025 signale aussi une
 * écriture conditionnelle refusée, qui doit rester `CONFLICT`.
 *
 * Verrou anti-régression : `tests/unit/governance/router-entity-not-found.test.ts`.
 */
import { TRPCError } from "@trpc/server";

/** Le refus unique d'une entité inconnue ou hors d'atteinte. */
export function entityNotFound(message: string): TRPCError {
  return new TRPCError({ code: "NOT_FOUND", message });
}

/** Ligne lue par `findUnique`/`findFirst` : absente → 404 typé, jamais P2025. */
export function found<T>(row: T | null | undefined, message: string): T {
  if (row === null || row === undefined) throw entityNotFound(message);
  return row;
}

/**
 * Garde d'accès placée après la lecture d'une entité keyée par un identifiant
 * d'entrée. Son refus — `FORBIDDEN` levé, `NOT_FOUND` d'un parent résolu, ou
 * `false` rendu par un `canAccess*` — devient le 404 d'un identifiant inconnu,
 * avec le message de l'entité demandée. Les autres erreurs gardent leur code.
 */
export async function refusalAsNotFound(guard: () => unknown, message: string): Promise<void> {
  let allowed: unknown;
  try {
    allowed = await guard();
  } catch (error) {
    if (error instanceof TRPCError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND")) throw entityNotFound(message);
    throw error;
  }
  if (allowed === false) throw entityNotFound(message);
}

/**
 * Lit une entité et applique sa garde d'accès : inconnue ou refusée, la même
 * réponse `NOT_FOUND`. La lecture précède toujours la garde, et la garde précède
 * toute écriture de l'appelant.
 */
export async function accessible<T>(
  row: Promise<T | null> | T | null,
  message: string,
  guard?: (value: T) => unknown,
): Promise<T> {
  const value = found(await row, message);
  if (guard) await refusalAsNotFound(() => guard(value), message);
  return value;
}
