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
import { composeRtisPropositions } from "./rtis-propositions";

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

/**
 * Champs méta/techniques exclus du rendu verbatim — PARTAGÉ avec le result
 * page (audit 2026-07-16 : la page rendait « Narrative full » dupliqué et du
 * JSON brut « Web presence » dans le PDF payant alors que cette liste existait
 * déjà ici).
 */
export const HIDDEN_FIELDS = new Set([
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
  /** Scores /25 par pilier — fonde les propositions R/T/I/S (ADR-0164). */
  pillarScores?: Record<"a" | "d" | "v" | "e", number>;
  /** Empreinte publique mesurée — cite les preuves dans les propositions. */
  footprint?: import("./footprint-types").EnrichedFootprint | null;
  /** Libellé humain du secteur (jamais le code canon). */
  sectorLabel?: string | null;
}

/**
 * Compose un NarrativeReport complet sans LLM. Chaque section dit ce qu'elle
 * est : une restitution structurée du déclaré + dérivé — pas une analyse.
 */
/** Explication d'une phrase par pilier — le fondateur découvre la méthode. */
const PILLAR_PLAIN: Record<"a" | "d" | "v" | "e", string> = {
  a: "qui vous êtes et d'où vous venez",
  d: "ce qui fait qu'on vous choisit vous",
  v: "ce que vous vendez et à quel prix",
  e: "qui vous suit et où",
};

/** Libellé + explication courte d'un niveau — jamais un code sec. */
const TIER_PLAIN: Record<string, string> = {
  LATENT: "Latent — votre marque existe, mais le marché ne la voit pas encore",
  FRAGILE: "Fragile — les intuitions sont bonnes, la cohérence reste à verrouiller",
  ORDINAIRE: "Ordinaire — la marque fonctionne, mais un concurrent pourrait prendre sa place",
  FORTE: "Forte — la marque est distincte et préférée par une partie du marché",
  CULTE: "Culte — une communauté engagée porte la marque",
  ICONE: "Icône — la référence de son marché",
};

export function composeDeterministicReport(input: ComposeReportInput): NarrativeReport {
  const { companyName, classification, extractedValues, rtisValues, compositeScore, pillarScores, footprint, sectorLabel } = input;

  const adve: AdvePillarReport[] = (Object.keys(PILLAR_LABELS) as Array<"a" | "d" | "v" | "e">).map((key) => {
    const lines = pillarContentLines(extractedValues[key] ?? {});
    const plain = PILLAR_PLAIN[key];
    const preview =
      lines.length > 0
        ? `${PILLAR_LABELS[key]} (${plain}) — ${lines.length} élément(s) dans vos réponses. ${lines[0]!.slice(0, 160)}${lines.length > 1 ? " (…)" : ""}`
        : `${PILLAR_LABELS[key]} (${plain}) — rien de documenté pour l'instant : c'est le premier chantier, et c'est normal à ce stade.`;
    const full =
      lines.length > 0
        ? `Ce que vous nous avez dit sur ${plain}, restitué tel quel :\n${lines.map((l) => `• ${l}`).join("\n")}`
        : `Vous n'avez encore rien déclaré sur ${plain} — et notre collecte publique n'a rien trouvé pour le déduire. Ce n'est pas une faute : c'est l'angle mort à documenter en premier avec votre opérateur.`;
    return { key, name: PILLAR_LABELS[key], preview, full };
  });

  // ── R/T/I/S : le contenu dérivé s'il existe, SINON des propositions
  // concrètes fondées sur les données (ADR-0164) — jamais une carte vide.
  const propositions =
    pillarScores
      ? composeRtisPropositions({
          companyName,
          sectorLabel: sectorLabel ?? null,
          extractedValues,
          pillarScores,
          footprint: footprint ?? null,
        })
      : null;

  const rtisPillars: RtisPillarReport[] = (Object.keys(RTIS_LABELS) as Array<"r" | "t" | "i" | "s">).map((key) => {
    const content = rtisValues?.[key] ?? {};
    const lines = pillarContentLines(content);
    const narrative = typeof content.narrative === "string" ? content.narrative : null;
    const prop = propositions?.[key] ?? null;
    const hasDerived = narrative !== null || lines.length > 0;
    return {
      key,
      name: RTIS_LABELS[key],
      preview:
        narrative ??
        (lines[0] ? lines[0].slice(0, 200) : prop?.preview || `Le volet ${RTIS_LABELS[key]} se construit avec votre opérateur à partir de vos réponses.`),
      full: hasDerived
        ? (narrative ? `${narrative}\n` : "") + lines.map((l) => `• ${l}`).join("\n")
        : prop?.full ||
          `Pas encore assez de matière pour ce volet — il se construit à partir de vos réponses et des données de votre marché.`,
      priority: key === "s" ? "P0" : "P1",
      keyMove: narrative?.slice(0, 120) ?? prop?.keyMove ?? `Construire le volet ${RTIS_LABELS[key]} avec votre opérateur.`,
    };
  });

  const documentedPillars = adve.filter((p) => !p.preview.includes("rien de documenté")).length;

  // ── Synthèse exécutive FONDATEUR : explique l'échelle, cite les faits,
  // zéro jargon (retour opérateur 2026-07-20 : « un jargon fermé qui ne
  // parle à personne »).
  const tierPlain = TIER_PLAIN[classification.toUpperCase()] ?? classification;
  const evidence: string[] = [];
  if (footprint) {
    if (footprint.press.length > 0) evidence.push(`${footprint.press.length} mention(s) presse`);
    const realFollowers = footprint.followerCounts.reduce((n, f) => n + (f.followerCount ?? 0), 0);
    if (realFollowers > 0) evidence.push(`${realFollowers.toLocaleString("fr-FR")} abonnés comptés sur vos réseaux`);
    if (footprint.maps?.status === "LIVE" && footprint.maps.reviewCount)
      evidence.push(`${footprint.maps.reviewCount} avis Google (${footprint.maps.rating ?? "?"}★)`);
    if (footprint.site?.reachable) evidence.push("un site joignable");
  }
  const evidencePhrase =
    evidence.length > 0
      ? ` Côté public, nous avons trouvé : ${evidence.join(", ")}.`
      : " Côté public, notre collecte n'a presque rien trouvé à votre nom — c'est une information en soi : votre marque vit surtout hors ligne pour l'instant.";

  return {
    executiveSummary:
      `${companyName} se situe aujourd'hui au niveau « ${tierPlain} », sur une échelle qui va de Latent à Icône (la référence de son marché). ` +
      `Ce niveau est estimé à partir de vos réponses : ${documentedPillars} de vos 4 fondations de marque sont documentées` +
      (typeof compositeScore === "number" ? ` (score de départ : ${Math.round(compositeScore)}/100)` : "") +
      `.${evidencePhrase} ` +
      `Ce rapport restitue fidèlement ce que vous avez déclaré et ce que le public voit — la lecture stratégique approfondie se fait ensuite avec votre opérateur.`,
    adve,
    rtis: {
      framing:
        "Après les fondations, la méthode regarde quatre volets d'exécution : vos risques (R — ce qui peut vous faire décrocher), la preuve marché (T — ce que le public prouve déjà), les pistes à tester (I) et le plan d'action (S). Voici une première lecture automatique, fondée uniquement sur vos réponses et votre empreinte publique.",
      pillars: rtisPillars,
    },
  };
}
