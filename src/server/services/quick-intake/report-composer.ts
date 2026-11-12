/**
 * Composer déterministe du rapport intake (vague D — « composers »).
 *
 * Fallback ZÉRO-LLM du NarrativeReport : quand la génération LLM échoue
 * (aucun provider, quota, JSON invalide), le payeur reçoit quand même un
 * rapport lisible construit depuis ses piliers extraits et ses
 * réponses — jamais une page vide, jamais du contenu inventé (ADR-0046,
 * doctrine « Fusée non-dépendante du LLM » PR #258).
 *
 * Pur : aucune IO, testé sur fixtures.
 */

import { composeRtisPropositions } from "./rtis-propositions";
import { fieldStatusFor, coerceProvenance, type FieldProvenance } from "@/domain/field-provenance";
import { getFieldLabel } from "@/lib/types/field-labels";
import { measuredScoreCoverage } from "@/domain/brand-scores";

export interface AdvePillarReport {
  /** Lowercase pillar key */
  key: "a" | "d" | "v" | "e";
  /** Human-readable pillar name */
  name: string;
  /** 2–3 sentence verdict that goes in the FREE preview */
  preview: string;
  /** Detailed paragraph (~120 words) shown after paywall unlock */
  full: string;
}

export interface RtisPillarReport {
  /** Lowercase pillar key */
  key: "r" | "t" | "i" | "s";
  /** Human-readable pillar name (Risque / Track / Innovation / Strategie) */
  name: string;
  /** 1–2 sentence summary (FREE preview) */
  preview: string;
  /** Full strategic action paragraph (~120 words) */
  full: string;
  /** Suggested priority for the pillar's main action */
  priority: "P0" | "P1" | "P2";
  /** Single short headline action ("le coup a jouer") */
  keyMove: string;
}

export interface NarrativeReport {
  /** ADVE executive overview (3–4 sentences). Always free. */
  executiveSummary: string;
  /** Per-pillar ADVE diagnostic */
  adve: AdvePillarReport[];
  /** RTIS strategic proposition — one entry per RTIS pillar (R, T, I, S). */
  rtis: {
    /** 2–3 sentence framing */
    framing: string;
    /** Strategic narrative per RTIS pillar */
    pillars: RtisPillarReport[];
  };
}

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
  "_fieldProvenance",
  "score",
  "confidence",
  "validationStatus",
  "currentVersion",
  "id",
  "strategyId",
  "pillarKey",
]);

/** The free screen already shows nine proposal lines; full ADVE stays paid. Pure projection. */
export function previewIntakeDiagnostic<T>(value: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const diagnostic = value as Record<string, unknown>;
  const report = diagnostic.narrativeReport;
  if (!report || typeof report !== "object" || Array.isArray(report)) return value;
  const r = report as Record<string, unknown>;
  const projectSections = (sections: unknown, lines: number) => !Array.isArray(sections) ? sections
    : sections.map(section => {
      if (!section || typeof section !== "object" || Array.isArray(section)) return section;
      const s = section as Record<string, unknown>;
      return { ...s, full: lines && typeof s.full === "string" ? s.full.split("\n").slice(0, lines).join("\n") : "" };
    });
  const rtis = r.rtis && typeof r.rtis === "object" && !Array.isArray(r.rtis) ? r.rtis as Record<string, unknown> : null;
  return { ...diagnostic, narrativeReport: { ...r, adve: projectSections(r.adve, 0),
    ...(rtis ? { rtis: { ...rtis, pillars: projectSections(rtis.pillars, 9) } } : {}) } } as T;
}

/** Filter presentation/technical metadata before counting or projecting a paid field. */
export function intakePillarFields(content: Record<string, unknown>): Array<[string, unknown]> {
  // PostgreSQL JSONB order is not a meaningful preview: mission/offer/channels first.
  const primary = ["missionStatement", "noyauIdentitaire", "valeurs", "positionnement", "promesseMaitre",
    "produitsCatalogue", "businessModel", "promesseExperience", "touchpoints", "aarrr"];
  const rank = (key: string) => { const index = primary.indexOf(key); return index < 0 ? primary.length : index; };
  return Object.entries(content).filter(([key, value]) => !key.startsWith("_") && !HIDDEN_FIELDS.has(key)
    && humanizeValue(value) !== null).sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
}

/** Valeur → texte lisible court (récursif borné, jamais de JSON brut massif). */
export function humanizeValue(v: unknown, depth = 0): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string") return (/^[A-Z][A-Z_]+$/.test(v.trim()) ? getFieldLabel(v.trim()) : v.trim()) || null;
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
      .filter(([key]) => !key.startsWith("_") && !HIDDEN_FIELDS.has(key))
      .map(([k, val]) => {
        const h = humanizeValue(val, depth + 1);
        return h ? `${getFieldLabel(k)}: ${h}` : null;
      })
      .filter(Boolean) as string[];
    if (parts.length === 0) return null;
    return parts.slice(0, 4).join(" · ");
  }
  return null;
}

/** Qualified fields shared by narrative producers and the report projections. */
export function intakeEvidenceEntries(content: Record<string, unknown>, pillarKey = "") {
  const status = fieldStatusFor(content.fieldCertainty as Record<string, string> | undefined,
    pillarKey, content._fieldProvenance);
  return intakePillarFields(content).map(([field, value]) => ({
    field, value, origin: coerceProvenance(status(field)),
  }));
}

/** Read projection only: historical INGESTION/SOURCE did not distinguish generation.
 * A regeneration must not certify those old assignments, nor rewrite their history.
 */
export function intakeReportContent(content: Record<string, unknown>, pillarKey: string, evidenceVersion: unknown): Record<string, unknown> {
  if (evidenceVersion === 1) return content;
  return { ...content, _fieldProvenance: Object.fromEntries(intakeEvidenceEntries(content, pillarKey)
    .map(entry => [entry.field, entry.origin === "HUMAN" ? "HUMAN" : "UNKNOWN"])) };
}

export const INTAKE_ORIGIN_LABELS: Record<FieldProvenance, string> = {
  HUMAN: "Confirmé par l’équipe", SOURCE: "Donnée reçue ou observée",
  INFERRED: "Proposition à valider", UNKNOWN: "Origine non documentée",
};

/** Same contract for every report writer; SOURCE does not imply a literal quote. */
export const INTAKE_EVIDENCE_RULE = `Respecte l’origine de chaque champ. HUMAN est confirmé par l’équipe ; SOURCE est issu d’une donnée reçue ou observée, parfois reformulée lors d’un import : ni SOURCE ni une extraction ne garantit les mots exacts du dirigeant. INFERRED est une proposition à valider, jamais un fait ou des paroles du prospect. UNKNOWN reste non documenté. N’utilise des guillemets que pour un extrait exact du texte original fourni. Les champs générés ne prouvent ni traction, ni concurrence, ni communauté. Le score /100 indique la complétude structurelle du dossier, pas la force publique ni le niveau de marque. Sépare constats, limites et pistes à valider.`;

/** Human labels + bounded values + origins; never technical metadata as evidence. */
export function pillarContentLines(content: Record<string, unknown>, pillarKey = ""): string[] {
  return intakeEvidenceEntries(content, pillarKey).map(({ field, value, origin }) =>
    `${getFieldLabel(field)} [${INTAKE_ORIGIN_LABELS[origin]}] : ${humanizeValue(value)?.slice(0, 400)}`);
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
        ? `${PILLAR_LABELS[key]} (${plain}) — ${lines.length} élément(s) dans le dossier. ${lines[0]!.slice(0, 160)}${lines.length > 1 ? " (…)" : ""}`
        : `${PILLAR_LABELS[key]} (${plain}) — rien de documenté pour l'instant : c'est le premier chantier, et c'est normal à ce stade.`;
    const full =
      lines.length > 0
        ? `Lecture du dossier sur ${plain}. Les propositions restent à valider, les données reçues peuvent être reformulées :\n${lines.map((l) => `• ${l}`).join("\n")}`
        : `Le dossier ne contient pas encore de matière exploitable sur ${plain}. À documenter avec votre opérateur ; cela ne permet pas de conclure à une absence dans votre entreprise ou sur le marché.`;
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
  const coverage = measuredScoreCoverage(footprint?.score?.dimensions ?? []);
  const evidencePhrase =
    evidence.length > 0
      ? ` Côté public, nous avons trouvé : ${evidence.join(", ")}.`
      : coverage > 0
        ? ` Côté public, aucun élément positif n'a été relevé parmi les signaux mesurés (couverture : ${coverage} % du poids total). Les autres signaux restent inconnus. Le résultat porte uniquement sur les dimensions effectivement mesurées.`
        : " L'empreinte publique n'est pas mesurée ici ; aucune conclusion sur votre présence en ligne ne peut en être tirée.";

  return {
    executiveSummary:
      `${companyName} : niveau estimé « ${tierPlain} », à confirmer avec votre équipe, sur une échelle de Latent à Icône (la référence de son marché). ` +
      `Ce niveau est estimé à partir de vos réponses : ${documentedPillars} de vos 4 fondations de marque sont documentées` +
      (typeof compositeScore === "number" ? ` (complétude du dossier : ${Math.round(compositeScore)}/100, distincte de la force de marque)` : "") +
      `.${evidencePhrase} ` +
      `Ce rapport distingue données reçues, observations disponibles et propositions à valider. Les origines non documentées restent signalées ; la lecture stratégique se confirme avec votre opérateur.`,
    adve,
    rtis: {
      framing:
        "Après les fondations, la méthode regarde quatre volets d'exécution : vos risques (R — ce qui peut vous faire décrocher), la preuve marché (T — ce que le public prouve déjà), les pistes à tester (I) et le plan d'action (S). Voici une première lecture automatique, fondée uniquement sur vos réponses et votre empreinte publique.",
      pillars: rtisPillars,
    },
  };
}
