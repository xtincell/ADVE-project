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

export interface RtisAxis {
  /** Short title (3–5 words) */
  title: string;
  /** 1–2 sentence summary (FREE preview) */
  preview: string;
  /** Full strategic action paragraph (~100 words, behind paywall) */
  full: string;
  /** Suggested priority */
  priority: "P0" | "P1" | "P2";
}

export interface NarrativeReport {
  /** ADVE executive overview (3–4 sentences). Always free. */
  executiveSummary: string;
  /** Per-pillar diagnostic */
  adve: AdvePillarReport[];
  /** RTIS strategic proposition: 3 axes, written. */
  rtis: {
    /** 2–3 sentence framing — free preview */
    framing: string;
    /** 3 strategic axes */
    axes: RtisAxis[];
  };
}

const SYSTEM_PROMPT = `Tu es Mestor, le strategiste senior de La Fusee. Tu produis pour la marque \
qui vient de finaliser son auto-diagnostic ADVE deux livrables :

1) RAPPORT ADVE : un diagnostic narratif honnete pilier par pilier (Authenticite, \
Distinction, Valeur, Engagement). Pour CHAQUE pilier tu donnes :
   - "preview" : 2-3 phrases qui resument l'etat actuel du pilier sans rien \
edulcorer (visible gratuitement)
   - "full" : un paragraphe detaille (100-140 mots) avec contexte sectoriel, \
risques concrets et levier d'action principal (visible apres paywall)

2) PROPOSITION STRATEGIQUE RTIS : 3 axes strategiques ecrits qui adressent les \
plus gros leviers detectes dans le diagnostic. Pour chaque axe :
   - "title" : 3-5 mots, percutant
   - "preview" : 1-2 phrases (visible gratuitement)
   - "full" : paragraphe d'action (80-110 mots) avec mecanique concrete (visible \
apres paywall)
   - "priority" : "P0" (urgent, bloquant), "P1" (important, sous 30 jours), \
"P2" (a inscrire dans la roadmap)

Style : francais professionnel, direct, sans superlatifs vides. Tu ne flattes \
pas, tu ne gonfles pas le score, tu nommes les manques. Si un pilier est faible, \
tu le dis. Tu utilises le tutoiement pour parler a la marque ("vous" ou direct).

Reponds UNIQUEMENT avec un objet JSON valide, pas de texte autour, pas de \
balises markdown.`;

export async function generateNarrativeReport(input: {
  companyName: string;
  sector: string | null;
  country: string | null;
  classification: string;
  vector: Record<string, number>;
  responses: Record<string, Record<string, string>> | null;
  /** When provided, used to ground the RTIS axes in real recommendations */
  recoSummaries?: Array<{ pillar: string; field: string; explain: string }>;
}): Promise<NarrativeReport> {
  const { companyName, sector, country, classification, vector, responses, recoSummaries } = input;

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

REPONSES DE LA MARQUE :
${formatResponses()}
${recoText ? `\nRECOMMANDATIONS NOTORIA DEJA GENEREES (a utiliser pour calibrer les axes RTIS) :\n${recoText}` : ""}

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
    "axes": [
      { "title": "...", "preview": "...", "full": "...", "priority": "P0" },
      { "title": "...", "preview": "...", "full": "...", "priority": "P1" },
      { "title": "...", "preview": "...", "full": "...", "priority": "P2" }
    ]
  }
}`;

  const { text } = await callLLM({
    system: SYSTEM_PROMPT,
    prompt,
    caller: "quick-intake:narrative-report",
    maxTokens: 4096,
  });

  const parsed = extractJSON(text) as Partial<NarrativeReport>;

  if (
    !parsed ||
    typeof parsed.executiveSummary !== "string" ||
    !Array.isArray(parsed.adve) ||
    parsed.adve.length !== 4 ||
    !parsed.rtis ||
    !Array.isArray(parsed.rtis.axes) ||
    parsed.rtis.axes.length === 0
  ) {
    throw new Error("Narrative report: shape invalide retournee par le LLM");
  }

  return parsed as NarrativeReport;
}
