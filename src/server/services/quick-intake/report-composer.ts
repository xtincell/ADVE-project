/**
 * Composer déterministe du rapport intake (vague D — « composers »).
 *
 * Fallback ZÉRO-LLM du NarrativeReport : quand la génération LLM échoue
 * (aucun provider, quota, JSON invalide), le payeur reçoit quand même un
 * rapport lisible construit VERBATIM depuis ses piliers extraits et ses
 * réponses — jamais une page vide, jamais du contenu inventé (ADR-0046,
 * doctrine « Fusée non-dépendante du LLM » PR #258).
 *
 * Pur : aucune IO, testé sur fixtures.
 */

import type { NarrativeReport, AdvePillarReport, RtisPillarReport } from "./narrative-report";

const PILLAR_LABELS: Record<"a" | "d" | "v" | "e", string> = {
  a: "Authenticité",
  d: "Distinction",
  v: "Valeur",
  e: "Engagement",
};

const RTIS_LABELS: Record<"r" | "t" | "i" | "s", string> = {
  r: "Risque",
  t: "Track",
  i: "Innovation",
  s: "Stratégie",
};

/** Champs méta/techniques exclus du rendu verbatim. */
const HIDDEN_FIELDS = new Set([
  "narrativePreview",
  "narrativeFull",
  "webPresence",
  "footprintScore",
  "fieldCertainty",
]);

/** Valeur → texte lisible court (récursif borné, jamais de JSON brut massif). */
export function humanizeValue(v: unknown, depth = 0): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    const parts = v.map((item) => humanizeValue(item, depth + 1)).filter(Boolean) as string[];
    if (parts.length === 0) return null;
    return parts.slice(0, 6).join(" · ");
  }
  if (typeof v === "object" && depth < 2) {
    const obj = v as Record<string, unknown>;
    // Objets nommés fréquents : {nom|name|title|label} porte l'essentiel.
    const label = obj.nom ?? obj.name ?? obj.title ?? obj.label;
    if (typeof label === "string" && label.trim()) return label.trim();
    const parts = Object.entries(obj)
      .map(([k, val]) => {
        const h = humanizeValue(val, depth + 1);
        return h ? `${k}: ${h}` : null;
      })
      .filter(Boolean) as string[];
    if (parts.length === 0) return null;
    return parts.slice(0, 4).join(" · ");
  }
  return null;
}

/** Lignes lisibles d'un contenu pilier (champ → valeur humanisée). */
export function pillarContentLines(content: Record<string, unknown>): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(content)) {
    if (HIDDEN_FIELDS.has(key)) continue;
    const h = humanizeValue(value);
    if (h) lines.push(`${key} : ${h.slice(0, 300)}`);
  }
  return lines;
}

export interface ComposeReportInput {
  companyName: string;
  classification: string;
  /** Contenus ADVE extraits (Pillar.content). */
  extractedValues: Record<"a" | "d" | "v" | "e", Record<string, unknown>>;
  /** Contenus RTIS si le draft V3 a tourné (Pillar.content r/t/i/s), sinon absents. */
  rtisValues?: Partial<Record<"r" | "t" | "i" | "s", Record<string, unknown>>>;
  /** Score composite /100 (ADVE). */
  compositeScore?: number;
}

/**
 * Compose un NarrativeReport complet sans LLM. Chaque section dit ce qu'elle
 * est : une restitution structurée du déclaré + dérivé — pas une analyse.
 */
export function composeDeterministicReport(input: ComposeReportInput): NarrativeReport {
  const { companyName, classification, extractedValues, rtisValues, compositeScore } = input;

  const adve: AdvePillarReport[] = (Object.keys(PILLAR_LABELS) as Array<"a" | "d" | "v" | "e">).map((key) => {
    const lines = pillarContentLines(extractedValues[key] ?? {});
    const preview =
      lines.length > 0
        ? `${PILLAR_LABELS[key]} — ${lines.length} élément(s) documenté(s). ${lines[0]!.slice(0, 160)}${lines.length > 1 ? " (…)" : ""}`
        : `${PILLAR_LABELS[key]} — aucun élément documenté pour l'instant : c'est le premier chantier de ce pilier.`;
    const full =
      lines.length > 0
        ? `Ce que votre diagnostic ${PILLAR_LABELS[key]} contient, restitué tel quel :\n${lines.map((l) => `• ${l}`).join("\n")}`
        : `Aucune matière déclarée ou détectée sur ce pilier. Un pilier ${PILLAR_LABELS[key]} vide n'est pas une faiblesse morale — c'est un angle mort à documenter en priorité avec votre opérateur.`;
    return { key, name: PILLAR_LABELS[key], preview, full };
  });

  const rtisPillars: RtisPillarReport[] = (Object.keys(RTIS_LABELS) as Array<"r" | "t" | "i" | "s">).map((key) => {
    const content = rtisValues?.[key] ?? {};
    const lines = pillarContentLines(content);
    const narrative = typeof content.narrative === "string" ? content.narrative : null;
    return {
      key,
      name: RTIS_LABELS[key],
      preview: narrative ?? (lines[0] ? lines[0].slice(0, 200) : `Le volet ${RTIS_LABELS[key]} sera dérivé de votre ADVE par l'analyse complète.`),
      full:
        lines.length > 0
          ? lines.map((l) => `• ${l}`).join("\n")
          : `Pas encore de contenu ${RTIS_LABELS[key]} dérivé — il se construit à partir de vos piliers ADVE et des données marché.`,
      priority: key === "s" ? "P0" : "P1",
      keyMove:
        narrative?.slice(0, 120) ??
        `Dériver le volet ${RTIS_LABELS[key]} depuis l'ADVE documenté.`,
    };
  });

  const documentedPillars = adve.filter((p) => !p.preview.includes("aucun élément documenté")).length;

  return {
    executiveSummary:
      `${companyName} ressort au niveau ${classification}` +
      (typeof compositeScore === "number" ? ` avec un score ADVE de ${Math.round(compositeScore)}/100` : "") +
      `. ${documentedPillars}/4 piliers fondateurs sont documentés. ` +
      `Ce rapport restitue fidèlement votre diagnostic déclaré et les données publiques collectées — ` +
      `la lecture stratégique approfondie est produite avec votre opérateur.`,
    adve,
    rtis: {
      framing:
        "Les volets R/T/I/S sont dérivés de vos piliers fondateurs. Ci-dessous : l'état actuel de cette dérivation, restitué sans interprétation.",
      pillars: rtisPillars,
    },
  };
}
