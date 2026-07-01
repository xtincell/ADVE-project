/**
 * Phase 18-A1-δ — Extractor heuristique d'un IngestedSource → BriefIngestionDraft.
 *
 * Pour MVP shippé sans LLM obligatoire, l'extractor produit un draft "pré-rempli"
 * que l'opérateur édite dans le middle portal. Le LLM peut être branché Phase 2
 * via `extractFromSource({ useLlm: true })` qui appelle Claude pour structurer
 * automatiquement.
 *
 * Output : payload structuré { title, summary, briefType, urgency, deadline,
 * deliverables[], notes } + classification heuristique + confidence.
 */

import type { BriefIngestionClassification } from "@prisma/client";
import type { RawSource } from "./splitter";

export interface ExtractedBriefDraft {
  classification: BriefIngestionClassification;
  classificationReason: string | null;
  resolvedNodeId: string | null;
  resolvedNodePath: string[];
  resolvedCampaignId: string | null;
  resolvedCampaignName: string | null;
  payload: {
    title: string;
    summary: string;
    briefType: string | null; // CREATIVE | MEDIA | PRODUCTION | VENDOR | EVENT | DIGITAL | RP | OPS | UNKNOWN
    urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    deadline: string | null; // ISO
    deliverables: string[];
    notes: string;
  };
  confidence: number; // 0..1
}

// Heuristiques classification — privilégier la prudence (préférer AMBIGUOUS quand doute)
const POSITIVE_FEEDBACK_RE = /\b(merci|bravo|parfait|génial|on adore|impeccable|nickel|au top|perfect|great)\b/i;
const QUESTION_RE = /[?]/;
const CHANGE_REQUEST_RE = /\b(refaire|modifier|changer|ajuster|corriger|retravailler|redo|revise|update)\b/i;
const NEW_PROJECT_RE = /\b(nouveau|nouvelle|launch|lancement|lancer|prévoir|brief|propose|nous voudrions|would like|need)\b/i;
const OPS_VERB_RE = /\b(envoie|envoyer|relance|relancer|confirme|confirmer|prépare|prépare-toi|book|schedule|forward|transmettre)\b/i;
const URGENCY_HIGH_RE = /\b(urgent|asap|aujourd'hui|today|critique|critical|immédiat|tout de suite)\b/i;
const URGENCY_MEDIUM_RE = /\b(cette semaine|this week|d'ici|by\s+\w+|deadline)\b/i;

function classifyHeuristically(rawText: string): {
  classification: BriefIngestionClassification;
  reason: string | null;
  confidence: number;
} {
  const lower = rawText.toLowerCase();

  // Cas 1 : feedback positif sans question/demande → NON_BRIEF
  if (POSITIVE_FEEDBACK_RE.test(rawText) && !QUESTION_RE.test(rawText) && !CHANGE_REQUEST_RE.test(rawText) && !NEW_PROJECT_RE.test(rawText)) {
    return { classification: "NON_BRIEF", reason: "Feedback positif sans demande explicite", confidence: 0.85 };
  }

  // Cas 2 : verbe ops impératif vers Matanga (envoie, relance, confirme) sans demande créative
  if (OPS_VERB_RE.test(rawText) && !NEW_PROJECT_RE.test(rawText)) {
    return { classification: "OPS_ACTION", reason: "Verbe ops impératif (envoyer/relancer/confirmer) sans demande créative", confidence: 0.7 };
  }

  // Cas 3 : verbe de modification sur projet existant → UPDATE_OF_BRIEF
  if (CHANGE_REQUEST_RE.test(rawText)) {
    return { classification: "UPDATE_OF_BRIEF", reason: "Verbe de modification détecté", confidence: 0.6 };
  }

  // Cas 4 : nouveau projet → NEW_BRIEF
  if (NEW_PROJECT_RE.test(rawText)) {
    return { classification: "NEW_BRIEF", reason: "Vocabulaire nouveau projet détecté", confidence: 0.65 };
  }

  // Cas 5 : ambigü
  return { classification: "AMBIGUOUS", reason: "Pas de pattern dominant détecté — review manuelle requise", confidence: 0.3 };
}

function extractUrgency(rawText: string): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (URGENCY_HIGH_RE.test(rawText)) return "HIGH";
  if (URGENCY_MEDIUM_RE.test(rawText)) return "MEDIUM";
  return "LOW";
}

function extractDeliverables(rawText: string): string[] {
  // Patterns simples : "OOH 12m²", "TV Spot", "Poster 60x40", "POSM", etc.
  const patterns = [
    /\bOOH\s+\d+m²?/gi,
    /\bPOSTER\s+\d+x\d+/gi,
    /\bPOSM\b/gi,
    /\b(?:TV|Radio|Digital)\s+(?:Spot|Ad)s?\b/gi,
    /\b(?:Banderole|Wobbler|T-shirt|Présentoir|Chevalet)\b/gi,
  ];
  const found = new Set<string>();
  for (const re of patterns) {
    const matches = rawText.match(re);
    if (matches) for (const m of matches) found.add(m.trim());
  }
  return [...found];
}

function extractTitle(rawText: string, subject: string | null | undefined): string {
  if (subject) return subject.slice(0, 120);
  // Première phrase non-vide tronquée
  const firstLine = rawText.split(/[\n\r]/).find((l) => l.trim().length > 5)?.trim() ?? rawText.slice(0, 80);
  return firstLine.slice(0, 120);
}

function buildSummary(rawText: string): string {
  // Prend les 2 premières phrases non-triviales, max 400 chars
  const sentences = rawText.split(/[.!?]\s+/).filter((s) => s.trim().length > 20);
  const summary = sentences.slice(0, 2).join(". ").trim();
  return summary.length > 400 ? summary.slice(0, 397) + "..." : summary;
}

export function extractFromSource(source: RawSource): ExtractedBriefDraft {
  const { classification, reason, confidence } = classifyHeuristically(source.rawText);

  return {
    classification,
    classificationReason: reason,
    resolvedNodeId: null, // brand-resolver-tree.ts résoudra ensuite
    resolvedNodePath: [],
    resolvedCampaignId: null,
    resolvedCampaignName: null,
    payload: {
      title: extractTitle(source.rawText, source.subject),
      summary: buildSummary(source.rawText),
      briefType: classification === "OPS_ACTION" ? "OPS" : classification === "NEW_BRIEF" ? "CREATIVE" : null,
      urgency: extractUrgency(source.rawText),
      deadline: null, // parsing date avancé hors scope MVP
      deliverables: extractDeliverables(source.rawText),
      notes: "",
    },
    confidence,
  };
}
