/**
 * Argos — verdict de sûreté DÉTERMINISTE (pur, testable). ADR-0083 §safety.
 * Auto-publish ⇔ PASS. Aucune dépendance LLM : règles explicites.
 */

export type SafetyVerdict = "PASS" | "QUARANTINE" | "REJECT";

export interface DossierDnaLike {
  palette?: string[];
  typography?: string[];
  voice?: string;
  visualCodes?: string[];
  keyPhrases?: string[];
  axes?: string[];
}

export interface DossierEditorialLike {
  sections?: Array<{ title: string; body: string }>;
}

/** Termes qui forcent un REJECT (contenu hors-charte / sensible). */
const FLAGGED = [
  "porn", "pornograph", "nazi", "terror", "incitation à la haine", "hate speech",
  "child sexual", "pédopornographie", "arme à feu illégale",
];

function containsFlagged(text: string): boolean {
  const lower = text.toLowerCase();
  return FLAGGED.some((f) => lower.includes(f));
}

/**
 * Calcule le verdict de sûreté + raisons.
 * - REJECT : contenu signalé (voice/keyPhrases/editorial).
 * - QUARANTINE : DNA incomplète (pas assez exploitable pour publier).
 * - PASS : complet + propre → auto-publiable.
 */
export function computeSafetyVerdict(input: {
  dna: DossierDnaLike;
  editorial?: DossierEditorialLike | null;
}): { verdict: SafetyVerdict; reasons: string[] } {
  const reasons: string[] = [];
  const dna = input.dna ?? {};

  const corpus = [
    dna.voice ?? "",
    ...(dna.keyPhrases ?? []),
    ...(dna.axes ?? []),
    ...(input.editorial?.sections ?? []).flatMap((s) => [s.title, s.body]),
  ].join(" \n ");

  if (containsFlagged(corpus)) {
    reasons.push("Contenu signalé (hors-charte) détecté — rejet automatique.");
    return { verdict: "REJECT", reasons };
  }

  const keyPhrases = dna.keyPhrases ?? [];
  const hasVoice = (dna.voice ?? "").trim().length > 0;
  const hasVisual = (dna.palette ?? []).length > 0 || (dna.visualCodes ?? []).length > 0;

  if (keyPhrases.length < 2) reasons.push("Moins de 2 key phrases — DNA insuffisamment exploitable.");
  if (!hasVoice) reasons.push("Voix de marque absente.");
  if (!hasVisual) reasons.push("Aucun code visuel (palette/visualCodes) renseigné.");

  if (reasons.length > 0) return { verdict: "QUARANTINE", reasons };
  return { verdict: "PASS", reasons: [] };
}
