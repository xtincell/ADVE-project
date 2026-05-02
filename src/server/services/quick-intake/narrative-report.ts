// ============================================================================
// MODULE — Intake Narrative Report
// Produces a written ADVE diagnostic + RTIS strategic proposition
// ============================================================================
//
// Used by the public intake result page (/intake/[token]/result) to render
// human-readable text the user actually wants to read — not a dashboard of
// metrics. One LLM call returns both reports in a structured JSON envelope.
// ============================================================================

import { callLLM, extractJSON } from "@/server/services/llm-gateway";
import { ADVE_STORAGE_KEYS } from "@/domain";

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

const SYSTEM_PROMPT = `Tu es Mestor, le strategiste senior de La Fusee. Tu produis pour la marque \
qui vient de finaliser son auto-diagnostic ADVE deux livrables :

1) RAPPORT ADVE : un diagnostic narratif honnete pilier par pilier (Authenticite, \
Distinction, Valeur, Engagement). Pour CHAQUE pilier tu donnes :
   - "preview" : 2-3 phrases qui resument l'etat actuel du pilier en CITANT au \
moins une valeur concrete extraite (mots-cles entre guillemets ou nom de champ).
   - "full" : un paragraphe detaille (100-140 mots) qui CITE explicitement les \
valeurs extraites (ex : "Votre mission '...' positionne...") et nomme les \
champs MANQUANTS (ex : "L'archetype n'a pas ete renseigne, ce qui...").

REGLE D'OR : le client doit reconnaitre SES MOTS et SES CHAMPS dans ton commentaire. \
Sans citation explicite des valeurs extraites, tu retravailles. Tu ne parles \
JAMAIS d'un pilier en abstraction.

Si un pilier a peu de champs remplis : tu commentes la pauvrete reelle de \
l'extraction sans rien inventer pour combler. Pas de score genereux, pas de \
flatterie.

2) PROPOSITION STRATEGIQUE RTIS : un narratif strategique pour CHACUN des 4 \
piliers RTIS — Risque (r), Track (t), Innovation (i), Strategie (s). Pour \
chaque pilier RTIS :
   - "key" : "r" | "t" | "i" | "s"
   - "name" : "Risque" | "Track" | "Innovation" | "Strategie"
   - "preview" : 1-2 phrases (cite la valeur ADVE extraite pertinente quand utile)
   - "full" : paragraphe d'action (100-130 mots) avec mecanique concrete reliee \
aux valeurs extraites
   - "priority" : "P0" (urgent, bloquant), "P1" (sous 30 jours), "P2" (roadmap)
   - "keyMove" : une phrase percutante qui resume le coup a jouer (max 12 mots)

Style : francais professionnel, direct, sans superlatifs vides. Tu ne flattes \
pas, tu ne gonfles pas le score, tu nommes les manques. Tu utilises le \
tutoiement avec "vous".

Reponds UNIQUEMENT avec un objet JSON valide, pas de texte autour, pas de \
balises markdown.`;

export async function generateNarrativeReport(input: {
  companyName: string;
  sector: string | null;
  country: string | null;
  classification: string;
  vector: Record<string, number>;
  responses: Record<string, Record<string, string>> | null;
  /** Structured per-pillar content extracted from responses (the values shown
   *  to the client). The narrative MUST cite these explicitly. */
  extractedValues?: Record<"a" | "d" | "v" | "e", Record<string, unknown>>;
  /** When provided, used to ground the RTIS axes in real recommendations */
  recoSummaries?: Array<{ pillar: string; field: string; explain: string }>;
  /** Seshat sector / market references that ground the RTIS narrative
   *  in real patterns instead of leaving the LLM to invent generic copy. */
  seshatGrounding?: string;
}): Promise<NarrativeReport> {
  const { companyName, sector, country, classification, vector, responses, extractedValues, recoSummaries, seshatGrounding } = input;

  const formatResponses = () => {
    if (!responses) return "Aucune reponse disponible";
    const lines: string[] = [];
    for (const [pillar, answers] of Object.entries(responses)) {
      const text = Object.values(answers ?? {})
        .filter((v) => typeof v === "string" && v.trim())
        .join(" | ");
      if (text) lines.push(`[${pillar.toUpperCase()}] ${text.slice(0, 600)}`);
    }
    return lines.join("\n") || "Aucune reponse texte";
  };

  const formatExtracted = () => {
    if (!extractedValues) return "(non disponible)";
    const lines: string[] = [];
    for (const pillar of [...ADVE_STORAGE_KEYS]) {
      const fields = extractedValues[pillar] ?? {};
      // Skip narrative meta-fields written by this same module — they
      // should not be exposed as "extracted user content".
      const filled = Object.entries(fields).filter(
        ([k, v]) =>
          v != null &&
          v !== "" &&
          k !== "narrativeFull" &&
          k !== "narrativePreview",
      );
      if (filled.length === 0) {
        // Constructive message, not accusatory. The downstream fallback
        // in quick-intake/index.ts now writes raw responses when the
        // extractor returns an empty shape, so reaching this branch
        // means the user truly did not say anything for this pillar.
        lines.push(`[${pillar.toUpperCase()}] Pilier à enrichir post-paywall (phase BOOT) — aucune valeur exploitable extraite à ce stade.`);
      } else {
        lines.push(`[${pillar.toUpperCase()}] (${filled.length} champ(s) extrait(s)) :`);
        for (const [k, v] of filled) {
          const display = typeof v === "string" ? v : JSON.stringify(v);
          lines.push(`  - ${k}: ${display.slice(0, 200)}`);
        }
      }
    }
    return lines.join("\n");
  };

  const recoText = (recoSummaries ?? [])
    .slice(0, 8)
    .map((r) => `- (${r.pillar}.${r.field}) ${r.explain}`)
    .join("\n");

  const prompt = `MARQUE : ${companyName}
SECTEUR : ${sector ?? "non precis"}
PAYS : ${country ?? "non precis"}
CLASSIFICATION ADVE : ${classification}
SCORES /25 PAR PILIER :
- Authenticite (A) : ${(vector.a ?? 0).toFixed(1)}
- Distinction (D)  : ${(vector.d ?? 0).toFixed(1)}
- Valeur (V)       : ${(vector.v ?? 0).toFixed(1)}
- Engagement (E)   : ${(vector.e ?? 0).toFixed(1)}

VALEURS EXTRAITES PAR PILIER (a CITER explicitement dans tes commentaires — c'est ce que la marque doit reconnaitre dans ton rapport) :
${formatExtracted()}

REPONSES BRUTES DE LA MARQUE :
${formatResponses()}
${recoText ? `\nRECOMMANDATIONS NOTORIA DEJA GENEREES (a utiliser pour calibrer les axes RTIS) :\n${recoText}` : ""}${seshatGrounding ? `\nREFERENCES SECTORIELLES SESHAT (a utiliser comme grounding pour la proposition RTIS) :\n${seshatGrounding}` : ""}

Produis le JSON avec cette forme exacte :
{
  "executiveSummary": "<3-4 phrases globales>",
  "adve": [
    { "key": "a", "name": "Authenticite", "preview": "...", "full": "..." },
    { "key": "d", "name": "Distinction",  "preview": "...", "full": "..." },
    { "key": "v", "name": "Valeur",       "preview": "...", "full": "..." },
    { "key": "e", "name": "Engagement",   "preview": "...", "full": "..." }
  ],
  "rtis": {
    "framing": "<2-3 phrases>",
    "pillars": [
      { "key": "r", "name": "Risque",     "preview": "...", "full": "...", "priority": "P0", "keyMove": "..." },
      { "key": "t", "name": "Track",      "preview": "...", "full": "...", "priority": "P1", "keyMove": "..." },
      { "key": "i", "name": "Innovation", "preview": "...", "full": "...", "priority": "P1", "keyMove": "..." },
      { "key": "s", "name": "Strategie",  "preview": "...", "full": "...", "priority": "P2", "keyMove": "..." }
    ]
  }
}`;

  // The intake narrative IS the public deliverable — what the user receives
  // and decides to convert on. Routes through `final-report` so the policy
  // (Opus today, configurable via UPDATE_MODEL_POLICY) is honoured.
  const { text } = await callLLM({
    system: SYSTEM_PROMPT,
    prompt,
    caller: "quick-intake:narrative-report",
    purpose: "final-report",
    maxOutputTokens: 4096,
  });

  const parsed = extractJSON(text) as Partial<NarrativeReport>;

  if (
    !parsed ||
    typeof parsed.executiveSummary !== "string" ||
    !Array.isArray(parsed.adve) ||
    parsed.adve.length !== 4 ||
    !parsed.rtis ||
    !Array.isArray(parsed.rtis.pillars) ||
    parsed.rtis.pillars.length !== 4
  ) {
    throw new Error("Narrative report: shape invalide retournee par le LLM");
  }

  return parsed as NarrativeReport;
}
