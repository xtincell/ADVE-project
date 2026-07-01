import { createHash } from "node:crypto";

/**
 * Hash-chain d'audit — la partie PURE (zéro IO, testable sans DB).
 * Principe hérité du legacy `IntentEmission.prevHash/selfHash`, réduit à
 * l'essentiel : selfHash = sha256(prevHash + JSON canonique de l'entrée).
 * Toute falsification a posteriori d'une ligne casse la chaîne du workspace.
 */

/** Ce qui entre dans le hash — le sous-ensemble signifiant d'une ligne d'audit. */
export type AuditHashRecord = {
  workspaceId: string | null;
  actorId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  payload: unknown;
};

/**
 * JSON canonique : clés d'objet triées récursivement, tableaux dans l'ordre,
 * `undefined` omis (sémantique JSON). Deux objets égaux à ordre de clés près
 * produisent la même chaîne → le hash est stable et re-vérifiable.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      const v = source[key];
      if (v !== undefined) sorted[key] = sortDeep(v);
    }
    return sorted;
  }
  return value;
}

/**
 * selfHash = sha256(prevHash + canonicalJson(record)), hex (64 chars).
 * `prevHash` null (première ligne de la chaîne d'un workspace) = chaîne vide.
 * Les clés à valeur `undefined`/absentes sont normalisées à `null` AVANT
 * hachage pour que la re-vérification depuis la DB (où tout est null) matche.
 */
export function computeSelfHash(prevHash: string | null, record: AuditHashRecord): string {
  const normalized: AuditHashRecord = {
    workspaceId: record.workspaceId ?? null,
    actorId: record.actorId ?? null,
    action: record.action,
    entity: record.entity ?? null,
    entityId: record.entityId ?? null,
    payload: record.payload === undefined ? null : record.payload,
  };
  return createHash("sha256")
    .update((prevHash ?? "") + canonicalJson(normalized))
    .digest("hex");
}
