/**
 * Fixtures de test — génération déterministe de contenus piliers.
 * Pas un fichier de test (pas de suffixe .test.ts).
 */
import type { AdvePillarKey, PillarKey } from "@/domain/pillars";
import { PILLAR_FIELDS } from "@/domain/pillar-fields";
import { ADVE_PILLARS, PILLARS } from "@/domain/pillars";

/** Texte long déterministe (≥ 120 chars — franchit le seuil d'enrichissement). */
export function longText(id: string): string {
  return `${id} : donnée réelle déclarée par le fondateur, suffisamment développée pour dépasser le seuil de profondeur du scoring structurel v7.`;
}

/**
 * Contenu « riche » d'un pilier : tous les champs remplis, listes au
 * minimum d'items, textes au-delà du seuil d'enrichissement.
 * → score structurel attendu : 25/25 (100/100).
 */
export function makeRichPillar(key: PillarKey): Record<string, unknown> {
  const content: Record<string, unknown> = {};
  for (const field of PILLAR_FIELDS[key]) {
    if (field.type === "liste") {
      const n = field.minItems ?? 1;
      content[field.id] = Array.from({ length: n }, (_, i) => ({
        nom: `${field.id} item ${i + 1}`,
        description: `Description réelle de ${field.id} n°${i + 1}.`,
      }));
    } else {
      content[field.id] = longText(field.id);
    }
  }
  return content;
}

/** Socle ADVE complet et riche. */
export function makeRichAdve(): Record<AdvePillarKey, Record<string, unknown>> {
  const out = {} as Record<AdvePillarKey, Record<string, unknown>>;
  for (const key of ADVE_PILLARS) out[key] = makeRichPillar(key);
  return out;
}

/** Les 8 piliers complets et riches. */
export function makeRichBrand(): Record<PillarKey, Record<string, unknown>> {
  const out = {} as Record<PillarKey, Record<string, unknown>>;
  for (const key of PILLARS) out[key] = makeRichPillar(key);
  return out;
}
