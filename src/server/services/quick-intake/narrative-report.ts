import { ADVE_STORAGE_KEYS } from "@/domain";

// ============================================================================
// MODULE — Intake Narrative Report
// Produces a written ADVE diagnostic + RTIS strategic proposition
// ============================================================================
//
// Used by the public intake result page (/intake/[token]/result) to render
// human-readable text the user actually wants to read — not a dashboard of
// metrics. One LLM call returns both reports in a structured JSON envelope.
// ============================================================================

import { pillarContentLines, INTAKE_EVIDENCE_RULE } from "./report-composer";
import { callLLM, extractJSON } from "@/server/services/llm-gateway";
import { wrapUntrusted, sanitizeInline, UNTRUSTED_NOTICE } from "@/server/services/utils/untrusted-content";

import type { NarrativeReport, AdvePillarReport, RtisPillarReport } from "./report-composer";
export type { NarrativeReport, AdvePillarReport, RtisPillarReport } from "./report-composer";

// Style commun aux 2 sous-rapports (ADVE + RTIS).
const SYSTEM_STYLE = `Style : francais professionnel, direct, sans superlatifs \
vides. Tu ne flattes pas, tu ne gonfles pas le score, tu nommes les manques. \
Tu utilises le tutoiement avec "vous".

LECTEUR : un dirigeant qui DECOUVRE la methode — il n'a jamais entendu parler \
d'ADVE, de piliers ou de paliers. Regles d'ecriture (2026-07-20) :
1. Chaque concept est explique en une phrase simple la premiere fois qu'il \
apparait (ex : "vos fondations de marque : qui vous etes, ce qui vous \
distingue, ce que vous vendez, qui vous suit").
2. Chaque affirmation s’appuie sur une donnée nommée avec son origine. Une extraction reformulée n’est pas une citation du dirigeant.
3. Zero jargon interne (pas de "pilier ADVE", "RTIS", "cascade", "vecteur" — \
dis "fondation", "volet", "votre score").
4. Chaque section se termine par du concret : ce que ca change pour lui.

Reponds UNIQUEMENT avec un objet JSON valide, pas de texte autour, pas de \
balises markdown.`;

const SYSTEM_PROMPT_ADVE = `Tu es Mestor, le strategiste senior de La Fusee. Tu produis pour la marque \
qui vient de finaliser son auto-diagnostic ADVE :

RAPPORT ADVE : un diagnostic narratif honnête pilier par pilier (Authenticité, \
Distinction, Valeur, Engagement). Pour CHAQUE pilier tu donnes :
   - "preview" : 2-3 phrases qui resument l'etat actuel du pilier en CITANT au \
moins une donnée qualifiée, sans attribuer une proposition au dirigeant.
   - "full" : un paragraphe detaille (100-140 mots) qui CITE explicitement les \
données qualifiées (reçues, observées ou proposées) et nomme les \
champs MANQUANTS (ex : "L'archetype n'a pas ete renseigne, ce qui...").

REGLE D’OR : le client reconnaît les données reçues et distingue les propositions. Ne transforme aucune valeur générée en paroles du client. Respecte les origines ; ne parle jamais d’une fondation en abstraction.

Si un pilier a peu de champs remplis : tu commentes la pauvrete reelle de \
l'extraction sans rien inventer pour combler. Pas de score genereux, pas de \
flatterie.

Tu produis aussi un "executiveSummary" de 3-4 phrases qui resume globalement \
l'etat ADVE de la marque.

${INTAKE_EVIDENCE_RULE}
${SYSTEM_STYLE}`;

const SYSTEM_PROMPT_RTIS = `Tu es Mestor, le strategiste senior de La Fusee. La marque vient de \
finaliser son auto-diagnostic ADVE et tu produis sa PROPOSITION STRATEGIQUE RTIS : \
un narratif strategique pour CHACUN des 4 piliers RTIS — Risque (r), Track (t), \
Innovation (i), Stratégie (s). Pour chaque pilier RTIS :
   - "key" : "r" | "t" | "i" | "s"
   - "name" : "Risque" | "Track" | "Innovation" | "Stratégie"
   - "preview" : 1-2 phrases (cite la valeur ADVE extraite pertinente quand utile)
   - "full" : paragraphe d'action (100-130 mots) avec mecanique concrete reliee \
aux valeurs extraites
   - "priority" : "P0" (urgent, bloquant), "P1" (sous 30 jours), "P2" (roadmap)
   - "keyMove" : une phrase percutante qui resume le coup a jouer (max 12 mots)

Tu produis aussi un "framing" de 2-3 phrases qui pose le cadre strategique RTIS.

${INTAKE_EVIDENCE_RULE}
${SYSTEM_STYLE}`;

export async function generateNarrativeReport(input: {
  /** Existing brand for cost attribution; unbranded benchmarks have none. */
  strategyId?: string;
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
    if (!responses) return "Aucune réponse disponible";
    const lines: string[] = [];
    for (const [pillar, answers] of Object.entries(responses)) {
      const text = Object.values(answers ?? {})
        .filter((v) => typeof v === "string" && v.trim())
        .join(" | ");
      if (text) lines.push(`[${pillar.toUpperCase()}] ${text.slice(0, 600)}`);
    }
    return lines.join("\n") || "Aucune réponse texte";
  };

  const formatExtracted = () => ADVE_STORAGE_KEYS.map(pillar => {
    const lines = pillarContentLines(extractedValues?.[pillar] ?? {}, pillar);
    return `[${pillar.toUpperCase()}]\n${lines.join("\n") || "Dossier à documenter"}`;
  }).join("\n");

  const recoText = (recoSummaries ?? [])
    .slice(0, 8)
    .map((r) => `- (${r.pillar}.${r.field}) ${r.explain}`)
    .join("\n");

  // Contexte commun aux 2 sous-rapports parallèles (ADVE + RTIS).
  // LOT 1e — entrées non fiables neutralisées (anti-injection). Nom/secteur/pays
  // inline ; valeurs extraites + réponses brutes (texte founder) balisées en bloc.
  // classification/scores sont calculés par nous (données internes, non balisées).
  const ctxBlock = `MARQUE : ${sanitizeInline(companyName, { max: 120 })}
SECTEUR : ${sanitizeInline(sector ?? "non precis", { max: 80 })}
PAYS : ${sanitizeInline(country ?? "non precis", { max: 60 })}
CLASSIFICATION ADVE : ${classification}
SCORES /25 PAR PILIER :
- Authenticité (A) : ${(vector.a ?? 0).toFixed(1)}
- Distinction (D)  : ${(vector.d ?? 0).toFixed(1)}
- Valeur (V)       : ${(vector.v ?? 0).toFixed(1)}
- Engagement (E)   : ${(vector.e ?? 0).toFixed(1)}

${INTAKE_EVIDENCE_RULE}

DONNÉES PAR PILIER AVEC ORIGINE :
${wrapUntrusted("VALEURS EXTRAITES PAR PILIER", formatExtracted(), { max: 8000 })}

${wrapUntrusted("RÉPONSES REÇUES OU EXTRAITES DES DOCUMENTS — PAS NÉCESSAIREMENT VERBATIM", formatResponses(), { max: 8000 })}`;

  // Optimisation 2026-05-11 (commit c2d872d + post) : on splite le single-shot
  // Opus ~4k tokens en 2 calls parallèles ~2k tokens chacun (ADVE + RTIS).
  // Gain mesuré attendu : ~30-50% sur le narrative-report.
  //
  // L'executive summary va avec ADVE (il décrit l'état ADVE).
  // Le framing RTIS va avec RTIS (il pose le cadre stratégique).
  // Les 2 calls partagent ctxBlock mais ont des system prompts focalisés.

  const advePrompt = `${ctxBlock}

Produis le JSON avec cette forme exacte :
{
  "executiveSummary": "<3-4 phrases globales sur l'état ADVE de la marque>",
  "adve": [
    { "key": "a", "name": "Authenticité", "preview": "...", "full": "..." },
    { "key": "d", "name": "Distinction",  "preview": "...", "full": "..." },
    { "key": "v", "name": "Valeur",       "preview": "...", "full": "..." },
    { "key": "e", "name": "Engagement",   "preview": "...", "full": "..." }
  ]
}`;

  // LOT 1e — recoText (dérivé du contenu founder) + seshatGrounding (réfs marché
  // externes) sont des entrées non fiables → balisées en bloc « donnée ».
  const rtisPrompt = `${ctxBlock}
${recoText ? `\nRECOMMANDATIONS NOTORIA DEJA GENEREES (a utiliser pour calibrer les axes RTIS) :\n${wrapUntrusted("RECOMMANDATIONS NOTORIA", recoText, { max: 4000 })}` : ""}${seshatGrounding ? `\nREFERENCES SECTORIELLES SESHAT (a utiliser comme grounding pour la proposition RTIS) :\n${wrapUntrusted("REFERENCES SECTORIELLES SESHAT", seshatGrounding, { max: 6000 })}` : ""}

Produis le JSON avec cette forme exacte :
{
  "framing": "<2-3 phrases qui posent le cadre strategique RTIS>",
  "pillars": [
    { "key": "r", "name": "Risque",     "preview": "...", "full": "...", "priority": "P0", "keyMove": "..." },
    { "key": "t", "name": "Track",      "preview": "...", "full": "...", "priority": "P1", "keyMove": "..." },
    { "key": "i", "name": "Innovation", "preview": "...", "full": "...", "priority": "P1", "keyMove": "..." },
    { "key": "s", "name": "Stratégie",  "preview": "...", "full": "...", "priority": "P2", "keyMove": "..." }
  ]
}`;

  // Promise.all car si l'un fail, on veut le throw (le outer catch dans
  // quick-intake/index.ts gère narrativeReport=null). Pas d'utilité à
  // returner un narrative partiel.
  //
  // **Model split per call** (2026-05-11) :
  // - ADVE call → Sonnet (3x plus rapide qu'Opus, suffisant pour narration
  //   pilier-par-pilier ancrée sur valeurs extraites)
  // - RTIS call → Opus (default policy `final-report`) — proposition stratégique
  //   premium qui justifie le tier supérieur
  //
  // Override via options.model (cf. llm-gateway/index.ts:425). Si la qualité
  // ADVE régresse en prod, revert l'override → re-policy Opus.
  const [adveResult, rtisResult] = await Promise.all([
    callLLM({
      system: `${UNTRUSTED_NOTICE}\n\n${SYSTEM_PROMPT_ADVE}`,
      prompt: advePrompt,
      caller: "quick-intake:narrative-report:adve",
      strategyId: input.strategyId,
      purpose: "final-report",
      model: "claude-sonnet-4-20250514",
      maxOutputTokens: 2048,
    }).then(({ text }) => extractJSON(text) as Partial<{ executiveSummary: string; adve: AdvePillarReport[] }>),
    callLLM({
      system: `${UNTRUSTED_NOTICE}\n\n${SYSTEM_PROMPT_RTIS}`,
      prompt: rtisPrompt,
      caller: "quick-intake:narrative-report:rtis",
      strategyId: input.strategyId,
      purpose: "final-report",
      maxOutputTokens: 2048,
    }).then(({ text }) => extractJSON(text) as Partial<{ framing: string; pillars: RtisPillarReport[] }>),
  ]);

  if (
    !adveResult ||
    typeof adveResult.executiveSummary !== "string" ||
    !Array.isArray(adveResult.adve) ||
    adveResult.adve.length !== 4
  ) {
    throw new Error("Narrative report (ADVE): shape invalide retournee par le LLM");
  }
  if (
    !rtisResult ||
    typeof rtisResult.framing !== "string" ||
    !Array.isArray(rtisResult.pillars) ||
    rtisResult.pillars.length !== 4
  ) {
    throw new Error("Narrative report (RTIS): shape invalide retournee par le LLM");
  }

  return {
    executiveSummary: adveResult.executiveSummary,
    adve: adveResult.adve,
    rtis: { framing: rtisResult.framing, pillars: rtisResult.pillars },
  };
}
