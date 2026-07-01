/**
 * Funnel intake — mapping PUR réponses → contenus piliers (zéro IO, zéro DB).
 *
 * Le wizard public collecte des réponses TEXTE par pilier ADVE et par champ de
 * la bible (`PILLAR_FIELDS`). Ce module les transforme en contenus piliers
 * exploitables par le domaine (diagnostic `diagnose()`, seed à la conversion) :
 *
 *   - champ `texte`  → chaîne trimée ;
 *   - champ `liste`  → textarea « un par ligne » splitté, lignes vides omises ;
 *   - champ vide / inconnu de la bible → OMIS (zéro donnée inventée) ;
 *   - certainty par champ rempli : INFERRED — tout vient du déclaratif
 *     fondateur non validé par l'opérateur (doctrine needsHuman) — SAUF
 *     l'identité (`nomMarque`) : le nom déclaré EST le nom, DECLARED d'emblée.
 *
 * Importable côté client (wizard) comme côté serveur : pur TS.
 */
import { ADVE_PILLARS, type AdvePillarKey } from "@/domain/pillars";
import { PILLAR_FIELDS } from "@/domain/pillar-fields";

// ── Types du payload funnel (forme stockée dans IntakeLead.payload) ────

/** Réponses brutes du wizard : texte libre par pilier ADVE puis par id de champ. */
export type RawIntakeAnswers = Partial<Record<AdvePillarKey, Record<string, string>>>;

/** Forme versionnée du `IntakeLead.payload` (réponses + contexte marché). */
export interface IntakeLeadPayload {
  version: number;
  secteur?: string;
  countryCode?: string;
  answers: RawIntakeAnswers;
}

export const INTAKE_PAYLOAD_VERSION = 1;

/** Statut de certitude d'un champ (doctrine ADVE : draft IA/déclaratif vs validé). */
export type FieldCertainty = "INFERRED" | "DECLARED";

export interface MappedPillar {
  /** Contenu pilier : uniquement les champs réellement remplis. */
  content: Record<string, unknown>;
  /** Certitude par champ rempli (mêmes clés que `content`). */
  certainty: Record<string, FieldCertainty>;
}

export type MappedPillars = Record<AdvePillarKey, MappedPillar>;

// ── Mapping pur ────────────────────────────────────────────────────────

/** Découpe une réponse « un par ligne » : lignes trimées, vides omises. */
export function splitListAnswer(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Injecte les champs d'identité de l'étape 0 (nom de marque, secteur) dans
 * les réponses du pilier A — sans écraser une réponse déjà saisie dans le
 * wizard. Non-destructif : retourne une nouvelle structure.
 */
export function withIdentityAnswers(
  answers: RawIntakeAnswers,
  identity: { brandName?: string; secteur?: string },
): RawIntakeAnswers {
  const a: Record<string, string> = { ...(answers.A ?? {}) };
  const brandName = identity.brandName?.trim();
  const secteur = identity.secteur?.trim();
  if (brandName && !a.nomMarque?.trim()) a.nomMarque = brandName;
  if (secteur && !a.secteur?.trim()) a.secteur = secteur;
  return { ...answers, A: a };
}

/**
 * Mappe les réponses brutes vers les contenus des 4 piliers ADVE.
 * Piloté par la bible : seuls les ids de champs connus de `PILLAR_FIELDS`
 * sont mappés (une clé inconnue dans le payload est ignorée — robustesse
 * face à un payload altéré). Déterministe : même entrée → même sortie.
 */
export function mapIntakeAnswers(answers: RawIntakeAnswers): MappedPillars {
  const out = {} as MappedPillars;
  for (const pillar of ADVE_PILLARS) {
    const raw = answers[pillar] ?? {};
    const content: Record<string, unknown> = {};
    const certainty: Record<string, FieldCertainty> = {};

    for (const field of PILLAR_FIELDS[pillar]) {
      const value = raw[field.id];
      if (typeof value !== "string") continue;

      if (field.type === "liste") {
        const items = splitListAnswer(value);
        if (items.length === 0) continue; // vide → omis
        content[field.id] = items;
      } else {
        const text = value.trim();
        if (text.length === 0) continue; // vide → omis
        content[field.id] = text;
      }

      // Tout le déclaratif funnel est INFERRED (à valider dans l'app),
      // sauf l'identité : le nom déclaré est le nom.
      certainty[field.id] =
        pillar === "A" && field.id === "nomMarque" ? "DECLARED" : "INFERRED";
    }

    out[pillar] = { content, certainty };
  }
  return out;
}

/** Projection contenus-seuls, prête pour `diagnose({ answers })`. */
export function toDiagnosticAnswers(
  mapped: MappedPillars,
): Partial<Record<AdvePillarKey, Record<string, unknown>>> {
  const out: Partial<Record<AdvePillarKey, Record<string, unknown>>> = {};
  for (const pillar of ADVE_PILLARS) out[pillar] = mapped[pillar].content;
  return out;
}

// ── Référentiel pays du funnel (miroir du seed — pas d'accès DB en public) ──

/**
 * Pays proposés dans le Select de l'étape 0. Miroir STRICT de
 * `prisma/seed.mjs` (COUNTRIES, WP-009) — si le seed évolue, ce const suit.
 * La conversion re-vérifie le code contre la table `Country` avant de poser
 * la FK `Brand.countryCode` (la DB reste la vérité au moment d'écrire).
 */
export const INTAKE_COUNTRIES = [
  // CEMAC (XAF)
  { code: "CM", name: "Cameroun" },
  { code: "GA", name: "Gabon" },
  { code: "CG", name: "Congo" },
  { code: "TD", name: "Tchad" },
  { code: "CF", name: "Centrafrique" },
  { code: "GQ", name: "Guinée Équatoriale" },
  // UEMOA (XOF)
  { code: "SN", name: "Sénégal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "BJ", name: "Bénin" },
  { code: "BF", name: "Burkina Faso" },
  { code: "ML", name: "Mali" },
  { code: "NE", name: "Niger" },
  { code: "TG", name: "Togo" },
  // Afrique francophone hors zones CFA
  { code: "CD", name: "RDC" },
  { code: "MA", name: "Maroc" },
  { code: "DZ", name: "Algérie" },
  { code: "TN", name: "Tunisie" },
  // Marché de référence / diaspora
  { code: "FR", name: "France" },
] as const;

export type IntakeCountryCode = (typeof INTAKE_COUNTRIES)[number]["code"];

export const INTAKE_COUNTRY_CODES = INTAKE_COUNTRIES.map((c) => c.code) as [
  IntakeCountryCode,
  ...IntakeCountryCode[],
];

/** Nom FR d'un pays du référentiel funnel, ou null si code inconnu. */
export function intakeCountryName(code: string | null | undefined): string | null {
  if (!code) return null;
  return INTAKE_COUNTRIES.find((c) => c.code === code)?.name ?? null;
}
