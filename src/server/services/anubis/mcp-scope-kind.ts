/**
 * Normalisation FAIL-CLOSED de la portée d'une clé MCP.
 */
/**
 * Normalise le `scopeKind` d'une clé/jeton en FAIL-CLOSED.
 *
 * `scopeKind` est une colonne `String` libre (pas un enum Prisma) avec
 * `@default("SYSTEM")`. La normalisation historique était
 * `x === "BRAND" ? "BRAND" : "SYSTEM"` : **toute** valeur inattendue —
 * `"brand"`, `" BRAND"`, `""`, une valeur nulle laissée par un import ou une
 * migration — devenait SYSTEM, c'est-à-dire **portée globale sur toutes les
 * marques**. Le défaut sûr est l'inverse : ce qu'on ne reconnaît pas est traité
 * comme scopé, et sans marque de portée `enforceBrandScope` refuse.
 *
 * Seul `"SYSTEM"` exact donne la portée globale (relecture adversariale
 * 2026-07-27).
 */
export function normalizeScopeKind(raw: unknown): "BRAND" | "SYSTEM" {
  return raw === "SYSTEM" ? "SYSTEM" : "BRAND";
}
