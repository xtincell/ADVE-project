/**
 * Oracle — composer déterministe du livrable stratégique.
 *
 * Port réduit du legacy : `SECTION_REGISTRY` (35 sections, 3 tiers —
 * `strategy-presentation/types.ts`) devient un registre de 12 sections CORE ;
 * les PURE_MAPPER / composers COMPOSE (ADR-0091 legacy — « l'Oracle doit
 * fonctionner même sans LLM ») deviennent `composeOracle`.
 *
 * Doctrine d'honnêteté (héritée, non négociable) :
 *   - AUCUNE invention : chaque ligne composée cite un champ pilier réel.
 *   - Une donnée absente produit un manque VISIBLE (« insuffisant — compléter
 *     le pilier X »), jamais un contenu halluciné.
 *   - Chaque section déclare ses sources (pilier.champ) — celles utilisées
 *     ET celles manquantes.
 *
 * Pur TS, déterministe : même (brand, pillars) → même document, toujours.
 */
import { type PillarKey } from "./pillars";
import { getFieldDef, PILLAR_FIELDS, PILLAR_LABELS } from "./pillar-fields";
import {
  COMPOSITE_MAX_SCORE,
  isFilled,
  LEVEL_DEFINITIONS,
  PILLAR_MAX_SCORE,
  scoreBrand,
  type BrandPillarsContent,
} from "./scoring";

// ── Registre des sections ─────────────────────────────────────────────

export type OracleTier = "CORE";

export interface OracleSourceRef {
  pillar: PillarKey;
  field: string;
  /** true = sans ce champ la section est « insuffisante ». */
  required?: boolean;
}

export interface OracleSectionDef {
  id: string;
  /** Numéro d'ordre affiché ("01".."12"). */
  number: string;
  titre: string;
  tier: OracleTier;
  /** Une ligne d'intention éditoriale (FR). */
  intent: string;
  /** Champs piliers dont la section se compose. Vide = section calculée (scoring). */
  sources: OracleSourceRef[];
}

/**
 * 12 sections CORE — sous-ensemble des 23 CORE legacy, retenues parce que
 * composables depuis les seuls piliers (pas de campagnes/missions/équipe,
 * qui sont des entités serveur hors domaine). Ids legacy conservés, sauf
 * `realite-marche` (ex `swot-externe`, renommé : la forme réduite n'est
 * plus un SWOT).
 */
export const ORACLE_SECTIONS: readonly OracleSectionDef[] = [
  {
    id: "executive-summary",
    number: "01",
    titre: "Executive Summary",
    tier: "CORE",
    intent: "Score, palier et lecture d'ensemble — entièrement calculés depuis le socle réel.",
    sources: [], // section calculée (scoreBrand)
  },
  {
    id: "contexte-defi",
    number: "02",
    titre: "Contexte & Défi",
    tier: "CORE",
    intent: "Qui est la marque, sur quel marché, pour qui, portée par quelle conviction.",
    sources: [
      { pillar: "A", field: "description", required: true },
      { pillar: "A", field: "secteur", required: true },
      { pillar: "A", field: "publicCible" },
      { pillar: "A", field: "promesseFondamentale" },
    ],
  },
  {
    id: "plateforme-strategique",
    number: "03",
    titre: "Plateforme Stratégique",
    tier: "CORE",
    intent: "Le cœur identitaire croisé au positionnement — l'ossature de toute prise de parole.",
    sources: [
      { pillar: "A", field: "archetype", required: true },
      { pillar: "D", field: "positionnement", required: true },
      { pillar: "D", field: "promesseMaitre", required: true },
      { pillar: "A", field: "valeurs" },
      { pillar: "A", field: "noyauIdentitaire" },
      { pillar: "D", field: "tonDeVoix" },
    ],
  },
  {
    id: "proposition-valeur",
    number: "04",
    titre: "Proposition de Valeur",
    tier: "CORE",
    intent: "Ce que la marque vend, à quel prix, et la preuve que ça vaut le sacrifice.",
    sources: [
      { pillar: "V", field: "promesseDeValeur", required: true },
      { pillar: "V", field: "produitsCatalogue", required: true },
      { pillar: "V", field: "productLadder" },
      { pillar: "V", field: "pricingJustification" },
      { pillar: "V", field: "roiProofs" },
    ],
  },
  {
    id: "territoire-creatif",
    number: "05",
    titre: "Territoire Créatif",
    tier: "CORE",
    intent: "Comment l'identité s'exprime : voix, vocabulaire propriétaire, registre émotionnel.",
    sources: [
      { pillar: "D", field: "tonDeVoix", required: true },
      { pillar: "D", field: "assetsLinguistiques", required: true },
      { pillar: "D", field: "positionnementEmotionnel" },
      { pillar: "A", field: "archetype" },
    ],
  },
  {
    id: "experience-engagement",
    number: "06",
    titre: "Expérience & Engagement",
    tier: "CORE",
    intent: "Les mécaniques relationnelles qui transforment un client en fidèle.",
    sources: [
      { pillar: "E", field: "promesseExperience", required: true },
      { pillar: "E", field: "touchpoints", required: true },
      { pillar: "E", field: "rituels" },
      { pillar: "E", field: "conversionTriggers" },
    ],
  },
  {
    id: "swot-interne",
    number: "07",
    titre: "SWOT Interne (Risque)",
    tier: "CORE",
    intent: "Le diagnostic des risques dérivé du socle : forces déclarées, manques, incohérences.",
    sources: [
      { pillar: "R", field: "globalSwot", required: true },
      { pillar: "R", field: "coherenceRisks" },
      { pillar: "R", field: "mitigationPriorities" },
      { pillar: "R", field: "probabilityImpactMatrix" },
    ],
  },
  {
    id: "realite-marche",
    number: "08",
    titre: "Réalité Marché (Tracking)",
    tier: "CORE",
    intent: "La confrontation du récit interne à la perception et à la taille réelles du marché.",
    sources: [
      { pillar: "T", field: "overtonPosition", required: true },
      { pillar: "T", field: "perceptionGap", required: true },
      { pillar: "T", field: "tamSamSom" },
      { pillar: "T", field: "marketReality" },
    ],
  },
  {
    id: "profil-superfan",
    number: "09",
    titre: "Profil Superfan",
    tier: "CORE",
    intent: "L'évangéliste visé et le chemin qui l'y mène — la mécanique pivot de la méthode.",
    sources: [
      { pillar: "E", field: "superfanPortrait", required: true },
      { pillar: "D", field: "personas", required: true },
      { pillar: "E", field: "conversionTriggers" },
    ],
  },
  {
    id: "catalogue-actions",
    number: "10",
    titre: "Catalogue d'Actions (Innovation)",
    tier: "CORE",
    intent: "Le potentiel d'action de la marque, organisé par canal.",
    sources: [
      { pillar: "I", field: "catalogueParCanal", required: true },
      { pillar: "I", field: "innovationsProduit" },
      { pillar: "I", field: "bigIdea" },
    ],
  },
  {
    id: "fenetre-overton",
    number: "11",
    titre: "Fenêtre d'Overton (Stratégie)",
    tier: "CORE",
    intent: "D'où part la perception, où elle doit aller, et la vision qui justifie le déplacement.",
    sources: [
      { pillar: "T", field: "perceptionGap", required: true },
      { pillar: "S", field: "visionStrategique", required: true },
      { pillar: "T", field: "overtonPosition" },
    ],
  },
  {
    id: "plan-activation",
    number: "12",
    titre: "Plan d'Activation",
    tier: "CORE",
    intent: "Les axes, le sprint 90 jours et la roadmap — la stratégie rendue exécutable.",
    sources: [
      { pillar: "S", field: "axesStrategiques", required: true },
      { pillar: "S", field: "sprint90Days", required: true },
      { pillar: "S", field: "roadmap" },
      { pillar: "E", field: "kpis" },
    ],
  },
];

/** Section par id. `undefined` si inconnue. */
export function getOracleSection(id: string): OracleSectionDef | undefined {
  return ORACLE_SECTIONS.find((s) => s.id === id);
}

// ── Document composé ──────────────────────────────────────────────────

export type OracleSectionStatus = "ok" | "insuffisant";

export interface OracleSection {
  id: string;
  number: string;
  titre: string;
  status: OracleSectionStatus;
  /** Markdown court composé depuis les données réelles (ou constat de manque). */
  markdown: string;
  /** Sources réellement utilisées ("D.positionnement", …). */
  sources: string[];
  /** Sources déclarées mais vides ("A.noyauIdentitaire", …). */
  missing: string[];
}

export interface OracleBrandInfo {
  name: string;
  sector?: string;
}

export interface OracleDocument {
  brand: OracleBrandInfo;
  /** Score composite /200 + palier — calculés, donc toujours réels. */
  score: { total: number; max: number; level: string; levelLabel: string };
  sections: OracleSection[];
}

// ── Rendu de valeurs (déterministe, sans invention) ───────────────────

const LABEL_KEYS = [
  "nom", "name", "titre", "title", "label", "action", "axe", "canal",
  "valeur", "value", "risk", "claim", "competence", "slogan", "phase",
] as const;

function truncate(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Libellé court d'un item de liste — première string exploitable, jamais inventé. */
function itemLabel(item: unknown): string | null {
  if (typeof item === "string" && item.trim()) return truncate(item, 90);
  if (typeof item === "number") return String(item);
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    for (const key of LABEL_KEYS) {
      const v = record[key];
      if (typeof v === "string" && v.trim()) return truncate(v, 90);
    }
    for (const v of Object.values(record)) {
      if (typeof v === "string" && v.trim()) return truncate(v, 90);
    }
  }
  return null;
}

/** Rendu texte court d'une valeur de champ — uniquement ce qui existe. */
export function renderValue(value: unknown, max = 300): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() ? truncate(value, max) : null;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "boolean") return value ? "oui" : "non";
  if (Array.isArray(value)) {
    const labels = value.map(itemLabel).filter((l): l is string => l !== null);
    if (labels.length === 0) return null;
    const shown = labels.slice(0, 5);
    const rest = labels.length - shown.length;
    return truncate(shown.join(" · ") + (rest > 0 ? ` (+${rest})` : ""), max);
  }
  if (typeof value === "object") {
    const parts: string[] = [];
    for (const [key, v] of Object.entries(value)) {
      if (key.startsWith("_")) continue; // métadonnées draft
      const rendered = renderValue(v, 90);
      if (rendered) parts.push(`${key} : ${rendered}`);
      if (parts.length >= 5) break;
    }
    return parts.length > 0 ? truncate(parts.join(" · "), max) : null;
  }
  return null;
}

// ── Composition ───────────────────────────────────────────────────────

function sourceRef(src: OracleSourceRef): string {
  return `${src.pillar}.${src.field}`;
}

function fieldLabel(src: OracleSourceRef): string {
  return getFieldDef(src.pillar, src.field)?.label ?? src.field;
}

function composeSection(
  def: OracleSectionDef,
  pillars: BrandPillarsContent,
): OracleSection {
  const usedSources: string[] = [];
  const missingSources: string[] = [];
  const missingRequired: OracleSourceRef[] = [];
  const lines: string[] = [];

  for (const src of def.sources) {
    const value = pillars[src.pillar]?.[src.field];
    const rendered = isFilled(value) ? renderValue(value) : null;
    if (rendered) {
      usedSources.push(sourceRef(src));
      lines.push(`- **${fieldLabel(src)}** — ${rendered}`);
    } else {
      missingSources.push(sourceRef(src));
      if (src.required) missingRequired.push(src);
    }
  }

  const header = `## ${def.number} · ${def.titre}`;

  if (missingRequired.length > 0) {
    // Insuffisant : constat de manque explicite, aucun contenu de remplacement.
    const byPillar = new Map<PillarKey, string[]>();
    for (const src of missingRequired) {
      const list = byPillar.get(src.pillar) ?? [];
      list.push(`« ${fieldLabel(src)} »`);
      byPillar.set(src.pillar, list);
    }
    const consignes = [...byPillar.entries()]
      .map(([pillar, fields]) => `compléter le pilier ${PILLAR_LABELS[pillar]} (${fields.join(", ")})`)
      .join(" ; ");
    const partial = lines.length > 0
      ? `\n\nDonnées déjà disponibles :\n${lines.join("\n")}`
      : "";
    return {
      id: def.id,
      number: def.number,
      titre: def.titre,
      status: "insuffisant",
      markdown: `${header}\n\nDonnées insuffisantes pour composer cette section — ${consignes}.${partial}`,
      sources: usedSources,
      missing: missingSources,
    };
  }

  const missingNote = missingSources.length > 0
    ? `\n\n_Données manquantes (optionnelles) : ${missingSources
        .map((ref) => `\`${ref}\``)
        .join(", ")}._`
    : "";

  return {
    id: def.id,
    number: def.number,
    titre: def.titre,
    status: "ok",
    markdown: `${header}\n\n_${def.intent}_\n\n${lines.join("\n")}${missingNote}`,
    sources: usedSources,
    missing: missingSources,
  };
}

/** Executive summary — section calculée : le scoring EST la donnée. */
function composeExecutiveSummary(
  def: OracleSectionDef,
  brand: OracleBrandInfo,
  pillars: BrandPillarsContent,
): OracleSection {
  const score = scoreBrand(pillars);
  const levelDef = LEVEL_DEFINITIONS[score.level];
  const pillarLines = (Object.keys(PILLAR_FIELDS) as PillarKey[]).map((key) => {
    const p = score.byPillar[key];
    return `- ${PILLAR_LABELS[key]} : ${p.score25}/${PILLAR_MAX_SCORE} (${p.filled.length}/${PILLAR_FIELDS[key].length} champs)`;
  });

  const sorted = (Object.keys(score.byPillar) as PillarKey[]).sort(
    (a, b) => score.byPillar[b].score25 - score.byPillar[a].score25,
  );
  const best = sorted[0]!;
  const worst = sorted[sorted.length - 1]!;
  const reading =
    score.total === 0
      ? "Aucune donnée déclarée — le diagnostic commence par le pilier Authenticité."
      : `Pilier le plus avancé : ${PILLAR_LABELS[best]} (${score.byPillar[best].score25}/${PILLAR_MAX_SCORE}). Pilier le plus faible : ${PILLAR_LABELS[worst]} (${score.byPillar[worst].score25}/${PILLAR_MAX_SCORE}).`;

  const markdown = [
    `## ${def.number} · ${def.titre}`,
    "",
    `**${brand.name}**${brand.sector ? ` — ${brand.sector}` : ""}`,
    "",
    `Score structurel : **${score.total}/${COMPOSITE_MAX_SCORE}** · Palier : **${levelDef.label}** — ${levelDef.tagline}.`,
    "",
    reading,
    "",
    ...pillarLines,
  ].join("\n");

  return {
    id: def.id,
    number: def.number,
    titre: def.titre,
    status: "ok",
    markdown,
    sources: ["scoring:scoreBrand"],
    missing: [],
  };
}

/**
 * Compose l'Oracle complet (12 sections CORE) depuis les données piliers
 * réelles. Déterministe — même entrée, même document. Les sections dont les
 * champs requis manquent sont marquées `insuffisant` avec la consigne de
 * complétion ; rien n'est inventé pour boucher les trous.
 */
export function composeOracle(
  brand: OracleBrandInfo,
  pillars: BrandPillarsContent,
): OracleDocument {
  const score = scoreBrand(pillars);
  const sections = ORACLE_SECTIONS.map((def) =>
    def.id === "executive-summary"
      ? composeExecutiveSummary(def, brand, pillars)
      : composeSection(def, pillars),
  );

  return {
    brand,
    score: {
      total: score.total,
      max: COMPOSITE_MAX_SCORE,
      level: score.level,
      levelLabel: LEVEL_DEFINITIONS[score.level].label,
    },
    sections,
  };
}
