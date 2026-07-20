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

import { callLLM, extractJSON } from "@/server/services/llm-gateway";
import { wrapUntrusted, sanitizeInline, UNTRUSTED_NOTICE } from "@/server/services/utils/untrusted-content";

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

// Style commun aux 2 sous-rapports (ADVE + RTIS).
const SYSTEM_STYLE = `Style : francais professionnel, direct, sans superlatifs \
vides. Tu ne flattes pas, tu ne gonfles pas le score, tu nommes les manques. \
Tu utilises le tutoiement avec "vous".

LECTEUR : un dirigeant qui DECOUVRE la methode — il n'a jamais entendu parler \
d'ADVE, de piliers ou de paliers. Regles d'ecriture (2026-07-20) :
1. Chaque concept est explique en une phrase simple la premiere fois qu'il \
apparait (ex : "vos fondations de marque : qui vous etes, ce qui vous \
distingue, ce que vous vendez, qui vous suit").
2. Tu CITES ses mots et ses chiffres (reponses declarees, mentions trouvees, \
abonnes comptes) — chaque affirmation s'appuie sur une evidence nommee.
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

Tu produis aussi un "executiveSummary" de 3-4 phrases qui resume globalement \
l'etat ADVE de la marque.

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

${SYSTEM_STYLE}`;

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

  const formatExtracted = () => {
    if (!extractedValues) return "(non disponible)";
    const lines: string[] = [];
    for (const pillar of ADVE_STORAGE_KEYS) {
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

VALEURS EXTRAITES PAR PILIER (a CITER explicitement dans tes commentaires — c'est ce que la marque doit reconnaitre dans ton rapport) :
${wrapUntrusted("VALEURS EXTRAITES PAR PILIER", formatExtracted(), { max: 8000 })}

${wrapUntrusted("REPONSES BRUTES DE LA MARQUE", formatResponses(), { max: 8000 })}`;

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
      purpose: "final-report",
      model: "claude-sonnet-4-20250514",
      maxOutputTokens: 2048,
    }).then(({ text }) => extractJSON(text) as Partial<{ executiveSummary: string; adve: AdvePillarReport[] }>),
    callLLM({
      system: `${UNTRUSTED_NOTICE}\n\n${SYSTEM_PROMPT_RTIS}`,
      prompt: rtisPrompt,
      caller: "quick-intake:narrative-report:rtis",
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
