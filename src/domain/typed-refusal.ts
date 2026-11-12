/**
 * Refus métier typé, levé par un service sans dépendre de la couche tRPC.
 *
 * Un service partagé avec des scripts hors application (par exemple le script de
 * démarrage de l'image, bundlé sans ses paquets) ne doit pas importer
 * `@trpc/server`. Il lève ce refus ; le middleware de base des procédures
 * (`src/server/trpc/init.ts`) le convertit en `TRPCError` du même code, avec le
 * même message. Hors tRPC, c'est une `Error` ordinaire dont le message est
 * conservé (les appelants qui reconnaissent `SOURCE_CHANGED:` continuent de le lire).
 */
export type TypedRefusalCode = "BAD_REQUEST" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";

export class TypedRefusal extends Error {
  readonly code: TypedRefusalCode;

  constructor(code: TypedRefusalCode, message: string) {
    super(message);
    this.name = "TypedRefusal";
    this.code = code;
  }
}

export function isTypedRefusal(error: unknown): error is TypedRefusal {
  return error instanceof TypedRefusal;
}
