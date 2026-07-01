/**
 * Variable Bible — Canonical Map (manuel ADVE ↔ code field paths).
 * Cf. ADR-0037 §11 + PR-K.
 *
 * The ADVE manuel uses metaphoric labels ("Le Messie", "Origin Myth",
 * "Compétences Divines", "Devotion Ladder", …) and structured codes
 * (A1, A6, D5, V12, E-Clerge, …). The TypeScript variable-bible uses
 * its own technical naming (`a.equipeDirigeante`, `a.competencesDivines`,
 * `d.assetsLinguistiques`, …). This file is the single source of truth
 * for the bidirectional mapping.
 *
 * Two consumers:
 *   - `scripts/gen-variable-bible-canon.ts` — auto-régen
 *     `docs/governance/VARIABLE-BIBLE-CANON.md` so the manual lookup
 *     table never drifts from the code.
 *   - `tests/unit/governance/variable-bible-canonical-coverage.test.ts`
 *     — anti-drift CI : assert 100% canonical codes are mapped.
 *
 * Side surface:
 *   - `src/components/cockpit/field-renderers.tsx` — show the
 *     canonicalCode badge next to each field label so an operator who
 *     read the manual finds his way back instantly.
 */

import { VARIABLE_BIBLE } from "./variable-bible";

/** A canonical code from the ADVE manuel (e.g. "A1", "D5", "V12", "E-Clerge"). */
export type CanonicalCode = string;

export interface CanonicalEntry {
  /** Pilier key (lowercase). */
  pillarKey: "a" | "d" | "v" | "e" | "r" | "t" | "i" | "s";
  /** Field path inside the pillar bible (e.g. "nomMarque", "equipeDirigeante"). */
  fieldKey: string;
  /** Human label as it appears in the manuel. */
  canonicalLabel: string;
  /** Section reference (e.g. "PILIER 1 §1.1"). */
  manualSection: string;
}

/**
 * THE canonical map. Every entry of the ADVE manuel that has a code
 * (A1-A11, D1-D12, V1-V18, E-* etc.) MUST have an entry here, mapping
 * to either an existing field in `VARIABLE_BIBLE` or a new one created
 * in PR-K.
 *
 * Entries marked with the suffix "bis" are alternates (e.g. A1 = nom
 * commercial, A1bis = Le Messie figure charismatique).
 *
 * Anti-drift test: see `tests/unit/governance/variable-bible-canonical-coverage.test.ts`.
 */
export const CANONICAL_MAP: Record<CanonicalCode, CanonicalEntry> = {
  // ── PILIER A — Authenticité (Le Gospel) ─────────────────────────────
  A1:        { pillarKey: "a", fieldKey: "nomMarque",          canonicalLabel: "Marque (nom commercial)", manualSection: "PILIER 1 §1.1" },
  A1bis:     { pillarKey: "a", fieldKey: "messieFondateur",    canonicalLabel: "Le Messie",                manualSection: "PILIER 1 §1.1" },
  A2:        { pillarKey: "a", fieldKey: "accroche",            canonicalLabel: "Accroche identitaire",     manualSection: "PILIER 1 §1.2" },
  A3:        { pillarKey: "a", fieldKey: "description",         canonicalLabel: "Description factuelle",    manualSection: "PILIER 1 §1.3" },
  A4:        { pillarKey: "a", fieldKey: "secteur",             canonicalLabel: "Secteur",                  manualSection: "PILIER 1 §1.4" },
  A5:        { pillarKey: "a", fieldKey: "pays",                canonicalLabel: "Pays / Marché",            manualSection: "PILIER 1 §1.5" },
  A5myth:    { pillarKey: "a", fieldKey: "originMyth",          canonicalLabel: "Origin Myth",              manualSection: "PILIER 1 §1.5" },
  A6:        { pillarKey: "a", fieldKey: "competencesDivines",  canonicalLabel: "Compétences Divines",      manualSection: "PILIER 1 §1.6" },
  A7:        { pillarKey: "a", fieldKey: "promesseFondamentale", canonicalLabel: "NorthStar Metric (justification)", manualSection: "PILIER 1 §1.7" },
  A8:        { pillarKey: "a", fieldKey: "preuvesAuthenticite", canonicalLabel: "Preuves d'authenticité",   manualSection: "PILIER 1 §1.8" },
  A9:        { pillarKey: "a", fieldKey: "archetype",           canonicalLabel: "Archétype primaire",       manualSection: "PILIER 1 §1.9" },
  A9bis:     { pillarKey: "a", fieldKey: "archetypeSecondary",  canonicalLabel: "Archétype secondaire",     manualSection: "PILIER 1 §1.9" },
  A10:       { pillarKey: "a", fieldKey: "indexReputation",     canonicalLabel: "Index de réputation",      manualSection: "PILIER 1 §1.10" },
  A11:       { pillarKey: "a", fieldKey: "eNps",                canonicalLabel: "eNPS",                      manualSection: "PILIER 1 §1.11" },
  A11bis:    { pillarKey: "a", fieldKey: "turnoverRate",        canonicalLabel: "Turnover interne",          manualSection: "PILIER 1 §1.11" },
  "A-Vision":   { pillarKey: "a", fieldKey: "prophecy",         canonicalLabel: "Vision Statement",         manualSection: "PILIER 1 §1.2" },
  "A-Mission":  { pillarKey: "a", fieldKey: "missionStatement", canonicalLabel: "Mission Statement",        manualSection: "PILIER 1 §1.3" },
  "A-Valeurs":  { pillarKey: "a", fieldKey: "valeurs",          canonicalLabel: "Valeurs / Commandements",  manualSection: "PILIER 1 §1.4" },
  "A-Ikigai":   { pillarKey: "a", fieldKey: "ikigai",           canonicalLabel: "Ikigai",                    manualSection: "PILIER 1 §1.x" },
  "A-Equipe":   { pillarKey: "a", fieldKey: "equipeDirigeante", canonicalLabel: "Équipe dirigeante",         manualSection: "PILIER 1 §1.x" },
  "A-Hierarchy":{ pillarKey: "a", fieldKey: "hierarchieCommunautaire", canonicalLabel: "Devotion Ladder (hiérarchie)", manualSection: "PILIER 4 §4.1 (mappé en A pour hiérarchie communautaire)" },

  // ── PILIER D — Distinction (Le Mythe) ───────────────────────────────
  D1: { pillarKey: "d", fieldKey: "personas",           canonicalLabel: "Persona cible",                 manualSection: "PILIER 2 §2.5" },
  D2: { pillarKey: "d", fieldKey: "paysageConcurrentiel", canonicalLabel: "Concurrents",                manualSection: "PILIER 2 §2.2" },
  D3: { pillarKey: "a", fieldKey: "secteur",            canonicalLabel: "Secteur (alias A4)",            manualSection: "PILIER 2 §2.3 (alias)" },
  D4: { pillarKey: "d", fieldKey: "promesseMaitre",     canonicalLabel: "USP / Promesse maître",         manualSection: "PILIER 2 §2.4" },
  D5: { pillarKey: "d", fieldKey: "directionArtistique", canonicalLabel: "DA / Territoire visuel",      manualSection: "PILIER 2 §2.2" },
  D6: { pillarKey: "d", fieldKey: "positionnementEmotionnel", canonicalLabel: "Positionnement émotionnel", manualSection: "PILIER 2 §2.6" },
  D7: { pillarKey: "d", fieldKey: "swotFlash",          canonicalLabel: "SWOT Flash",                    manualSection: "PILIER 2 §2.7" },
  D8: { pillarKey: "d", fieldKey: "assetsLinguistiques", canonicalLabel: "Codes propriétaires / Dialecte", manualSection: "PILIER 2 §2.3" },
  D9: { pillarKey: "v", fieldKey: "proprieteIntellectuelle", canonicalLabel: "Portefeuille IP (placement V mais signal D)", manualSection: "PILIER 2 §2.x" },
  D10: { pillarKey: "d", fieldKey: "esov",              canonicalLabel: "ESOV (Excess Share of Voice)",  manualSection: "PILIER 2 §2.10" },
  D11: { pillarKey: "d", fieldKey: "barriersImitation", canonicalLabel: "Barrières imitation",           manualSection: "PILIER 2 §2.11" },
  D12: { pillarKey: "d", fieldKey: "storyEvidenceRatio", canonicalLabel: "Ratio Storytelling/Evidence",  manualSection: "PILIER 2 §2.12" },
  "D-Ton":         { pillarKey: "d", fieldKey: "tonDeVoix",        canonicalLabel: "Ton de Voix",            manualSection: "PILIER 2 §2.4" },
  "D-Position":    { pillarKey: "d", fieldKey: "positionnement",   canonicalLabel: "Positionnement business", manualSection: "PILIER 2 §2.1" },
  "D-Proofs":      { pillarKey: "d", fieldKey: "proofPoints",      canonicalLabel: "Preuves de différenciation", manualSection: "PILIER 2 §2.x" },
  "D-Symboles":    { pillarKey: "d", fieldKey: "symboles",         canonicalLabel: "Symboles",                manualSection: "PILIER 2 §2.x" },

  // ── PILIER V — Valeur (Le Miracle) ──────────────────────────────────
  V1: { pillarKey: "v", fieldKey: "promesseDeValeur",    canonicalLabel: "Besoins client / Proposition", manualSection: "PILIER 3 §3.1" },
  V4: { pillarKey: "v", fieldKey: "produitsCatalogue",   canonicalLabel: "Offres & Prix",                  manualSection: "PILIER 3 §3.2" },
  V7: { pillarKey: "v", fieldKey: "roiProofs",            canonicalLabel: "ROI Proof",                     manualSection: "PILIER 3 §3.7" },
  V12: { pillarKey: "v", fieldKey: "unitEconomics",       canonicalLabel: "Coût acquisition (CAC)",       manualSection: "PILIER 3 §3.12" },
  "V-Promesse":     { pillarKey: "d", fieldKey: "promesseMaitre",      canonicalLabel: "Promesse Divine (alias D4)", manualSection: "PILIER 3 §3.1" },
  "V-MultiSens":    { pillarKey: "v", fieldKey: "experienceMultisensorielle", canonicalLabel: "Architecture Multisensorielle", manualSection: "PILIER 3 §3.3" },
  "V-Sacrifice":    { pillarKey: "v", fieldKey: "sacrificeRequis",     canonicalLabel: "Sacrifice Requis",            manualSection: "PILIER 3 §3.6" },
  "V-Packaging":    { pillarKey: "v", fieldKey: "packagingExperience", canonicalLabel: "Packaging & Delivery",        manualSection: "PILIER 3 §3.7" },
  "V-Ladder":       { pillarKey: "v", fieldKey: "productLadder",       canonicalLabel: "Value Ladder",                 manualSection: "PILIER 3 §3.4" },
  "V-Benefits":     { pillarKey: "v", fieldKey: "valeurClientTangible", canonicalLabel: "Bénéfices directs (tangibles)", manualSection: "PILIER 3 §3.5" },
  "V-BenefitsInt":  { pillarKey: "v", fieldKey: "valeurClientIntangible", canonicalLabel: "Bénéfices indirects (intangibles)", manualSection: "PILIER 3 §3.5" },
  "V-MVP":          { pillarKey: "v", fieldKey: "mvp",                  canonicalLabel: "MVP / Stage produit",          manualSection: "PILIER 3 §3.x" },

  // ── PILIER E — Engagement (L'Église) ────────────────────────────────
  "E-DevotionLadder": { pillarKey: "a", fieldKey: "hierarchieCommunautaire", canonicalLabel: "Devotion Ladder (8 niveaux)", manualSection: "PILIER 4 §4.1" },
  "E-Temples":        { pillarKey: "e", fieldKey: "touchpoints",        canonicalLabel: "Les Temples (points contact)",   manualSection: "PILIER 4 §4.2" },
  "E-Rituels":        { pillarKey: "e", fieldKey: "rituels",            canonicalLabel: "Les Rituels",                     manualSection: "PILIER 4 §4.3" },
  "E-RitualCalendar": { pillarKey: "e", fieldKey: "sacredCalendar",     canonicalLabel: "Ritual Calendar",                  manualSection: "PILIER 4 §4.4" },
  "E-Clerge":         { pillarKey: "e", fieldKey: "clergeStructure",    canonicalLabel: "Le Clergé",                        manualSection: "PILIER 4 §4.5" },
  "E-Pelerinages":    { pillarKey: "e", fieldKey: "pelerinages",        canonicalLabel: "Les Pèlerinages",                  manualSection: "PILIER 4 §4.6" },
  "E-Evangelisation": { pillarKey: "e", fieldKey: "programmeEvangelisation", canonicalLabel: "Programme d'Évangélisation", manualSection: "PILIER 4 §4.7" },
  "E-Community":      { pillarKey: "e", fieldKey: "communityBuilding",  canonicalLabel: "Community Building",               manualSection: "PILIER 4 §4.8" },
  "E-Sacraments":     { pillarKey: "e", fieldKey: "sacraments",         canonicalLabel: "Sacrements",                       manualSection: "PILIER 4 §4.x" },
  "E-Retention":      { pillarKey: "e", fieldKey: "aarrr",              canonicalLabel: "Retention Strategy (AARRR)",       manualSection: "PILIER 4 §4.9" },
  "E-Commandments":   { pillarKey: "e", fieldKey: "commandments",       canonicalLabel: "Commandements",                    manualSection: "PILIER 4 §4.x" },
  "E-Taboos":         { pillarKey: "e", fieldKey: "taboos",             canonicalLabel: "Tabous",                            manualSection: "PILIER 4 §4.x" },
  "E-Gamification":   { pillarKey: "e", fieldKey: "gamification",       canonicalLabel: "Gamification",                     manualSection: "PILIER 4 §4.x" },
};

/**
 * Resolve a canonical code (A1, D5, …) to its bibliography spec.
 * Returns undefined if the code is unknown OR if the mapped field
 * doesn't exist in the bible (drift).
 */
export function resolveCanonical(code: CanonicalCode): { entry: CanonicalEntry; spec: import("./variable-bible").VariableSpec } | undefined {
  const entry = CANONICAL_MAP[code];
  if (!entry) return undefined;
  const spec = VARIABLE_BIBLE[entry.pillarKey]?.[entry.fieldKey];
  if (!spec) return undefined;
  return { entry, spec };
}

/**
 * Reverse lookup : given a (pillarKey, fieldKey), find the canonical
 * code(s) that map to it. May return multiple codes (e.g. A1 maps to
 * a.nomMarque AND A1bis to a.messieFondateur — disambiguated). Returns
 * an array (often empty for fields without canon counterpart).
 */
export function findCanonicalCodes(pillarKey: string, fieldKey: string): CanonicalCode[] {
  const codes: CanonicalCode[] = [];
  const lkPillar = pillarKey.toLowerCase();
  for (const [code, entry] of Object.entries(CANONICAL_MAP)) {
    if (entry.pillarKey === lkPillar && entry.fieldKey === fieldKey) {
      codes.push(code);
    }
  }
  return codes;
}

/**
 * List all unique canonical codes (sorted by pillar then code).
 * Used by `gen-variable-bible-canon.ts` and the audit test.
 */
export function listCanonicalCodes(): CanonicalCode[] {
  return Object.keys(CANONICAL_MAP).sort((a, b) => {
    const pa = CANONICAL_MAP[a]!.pillarKey;
    const pb = CANONICAL_MAP[b]!.pillarKey;
    if (pa !== pb) return pa.localeCompare(pb);
    return a.localeCompare(b);
  });
}
