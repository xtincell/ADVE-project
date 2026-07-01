/**
 * Brouillons IA pour les champs VIDES d'un pilier ADVE (WP-010).
 *
 * Doctrine needsHuman (CLAUDE.md) : l'humain déclare, l'IA au mieux PROPOSE.
 * Ce module ne produit que des brouillons — l'application en base (certainty
 * INFERRED, révision chaînée) vit dans `apply-draft.ts`, et la validation
 * humaine (flip DECLARED) reste l'amendement opérateur existant.
 *
 * Garde-fous :
 *   - champs VIDES uniquement (la liste est fournie ET re-filtrée sur la bible) ;
 *   - contenu marque inséré via `wrapUntrusted` (<donnees_marque>…</donnees_marque>) ;
 *   - retour validé par un schéma Zod DYNAMIQUE (z.object des fieldIds attendus,
 *     .partial()) — toute clé inattendue est écartée ;
 *   - jamais de throw : résultat typé, échec tracé par la gateway.
 */
import { z, type ZodType } from "zod";
import type { AdvePillarKey, PillarKey } from "@/domain/pillars";
import { getFieldDef, PILLAR_FIELDS, PILLAR_LABELS, type FieldDef } from "@/domain/pillar-fields";
import { structuredCall, wrapUntrusted, type AiCallOptions } from "./gateway";

export type DraftPillarFieldsInput = {
  brandName: string;
  sector: string | null;
  /** Pilier cible — ADVE uniquement (les RTIS sont dérivés, jamais draftés). */
  pillarKey: AdvePillarKey;
  /** Contenu existant des piliers (le contexte dont l'IA s'inspire). */
  existingContent: Partial<Record<PillarKey, Record<string, unknown> | null>>;
  /** Ids des champs VIDES à proposer (re-filtrés contre la bible). */
  fieldsToFill: string[];
  /** Contexte de trace best-effort (ligne AuditLog `ai.fail`). */
  audit?: { workspaceId?: string | null; actorId?: string | null };
};

export type DraftPillarFieldsResult =
  | { ok: true; drafts: Record<string, string> }
  | { ok: false; reason: string };

const SYSTEM_PROMPT =
  "Tu es un stratège de marque senior spécialisé dans les marchés d'Afrique " +
  "francophone. Tu proposes des BROUILLONS de champs de stratégie de marque, " +
  "qui seront relus et validés par un humain. Style : sobre, concret, direct — " +
  "pas de jargon creux, pas de superlatifs. Règles absolues : n'invente JAMAIS " +
  "de chiffres, de preuves, de témoignages ni de données réelles (chiffre " +
  "d'affaires, CAC, parts de marché…) — si un champ exige une donnée réelle que " +
  "tu n'as pas, omets-le. Appuie chaque proposition sur les données de marque " +
  "fournies. Réponses courtes : 1 à 3 phrases par champ texte, des entrées " +
  "brèves pour les listes. Réponds en français.";

/** Description d'un champ pour le prompt (label, attendu, format de réponse). */
function describeField(field: FieldDef): string {
  const format =
    field.type === "liste"
      ? `liste — une entrée par ligne dans la même chaîne (séparateur \\n), ${field.minItems ?? 1} entrée(s) minimum`
      : "texte court (1 à 3 phrases)";
  return `- "${field.id}" (${field.label}) : ${field.description} [format : ${format}]`;
}

/**
 * Propose des brouillons pour les champs vides d'un pilier ADVE à partir du
 * contenu existant des autres champs/piliers. Retourne un Record
 * fieldId → string (listes : une entrée par ligne), validé par un schéma Zod
 * dynamique construit sur les fieldIds attendus. Jamais de throw.
 */
export async function draftPillarFields(
  input: DraftPillarFieldsInput,
  opts?: AiCallOptions,
): Promise<DraftPillarFieldsResult> {
  const fields = input.fieldsToFill
    .map((id) => getFieldDef(input.pillarKey, id))
    .filter((f): f is FieldDef => f !== undefined);
  if (fields.length === 0) {
    return { ok: false, reason: "aucun champ valide à remplir pour ce pilier" };
  }

  // Schéma dynamique : uniquement les champs attendus, tous optionnels
  // (l'IA peut honnêtement en omettre), valeurs string non vides.
  const shape: Record<string, ZodType<string>> = {};
  for (const field of fields) {
    shape[field.id] = z.string();
  }
  const schema = z.object(shape).partial();

  const pillarLabel = PILLAR_LABELS[input.pillarKey];
  const brandData = {
    nomMarque: input.brandName,
    secteur: input.sector ?? "non renseigné",
    piliers: input.existingContent,
  };

  const prompt =
    `Marque à travailler (données déclarées, potentiellement incomplètes) :\n` +
    `${wrapUntrusted("Données de la marque", brandData)}\n\n` +
    `Pilier cible : ${input.pillarKey} — ${pillarLabel} ` +
    `(bible des champs : ${PILLAR_FIELDS[input.pillarKey].length} champs).\n\n` +
    `Propose un brouillon pour CHACUN des champs vides suivants, uniquement ` +
    `s'il peut s'appuyer sur les données fournies :\n` +
    `${fields.map(describeField).join("\n")}\n\n` +
    `Format de réponse : un objet JSON dont les clés sont exactement les ids ` +
    `de champs ci-dessus et les valeurs des chaînes de caractères (pour les ` +
    `listes : une entrée par ligne, séparées par \\n). Omets toute clé pour ` +
    `laquelle tu ne peux rien proposer d'honnête.`;

  const result = await structuredCall(
    {
      system: SYSTEM_PROMPT,
      prompt,
      schema,
      maxTokens: Math.min(4000, 400 + 250 * fields.length),
      caller: `pilier.draft.${input.pillarKey}`,
      audit: input.audit,
    },
    opts,
  );

  if (!result.ok) return { ok: false, reason: result.reason };

  // Ne garder que les valeurs non vides (une string vide n'est pas un brouillon).
  const drafts: Record<string, string> = {};
  for (const field of fields) {
    const value = result.data[field.id];
    if (typeof value === "string" && value.trim().length > 0) {
      drafts[field.id] = value.trim();
    }
  }
  return { ok: true, drafts };
}
