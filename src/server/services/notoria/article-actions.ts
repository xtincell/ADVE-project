import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AddInitiativePayloadSchema } from "@/lib/types/recommendation-payload";
import { extractJSON } from "@/server/services/utils/llm";
import { untrustedContentBody, wrapUntrusted } from "@/server/services/utils/untrusted-content";
import { NotoriaGenerationFailure } from "./generation-failure";
import type { RawLLMReco } from "./types";
import type { ArticleActionBasis, ArticleBrandInterpretation } from "@/lib/types/jehuty";

import { productionModes } from "@/domain/production-mix";
import { compareArticleAction, type ArticleComparisonScope } from "./article-comparison";

type ArticleInput = {
  observation: string;
  excerpts: Array<{ field: "title" | "summary"; text: string; start: number; end: number }>;
};
type BrandAnchor = ArticleBrandInterpretation["brandContext"][number];
type Model = (system: string, prompt: string) => Promise<string>;

const candidateSchema = z.object({
  field: z.enum(["title", "summary"]),
  quote: z.string().trim().min(12).max(500),
  anchor: z.number().int().nonnegative(),
  brandQuote: z.string().trim().min(8).max(300),
  implication: z.string().trim().min(16).max(700),
  action: z.string().trim().min(12).max(400),
  format: z.string().trim().min(2).max(200),
  objective: z.string().trim().min(8).max(200),
  measure: z.string().trim().min(12).max(400),
  scope: z.number().int().nonnegative().nullable().optional(),
  mode: z.enum(productionModes).nullable().optional(),
}).strict();
const outputSchema = z.object({ actions: z.array(candidateSchema).max(3) }).strict();
const reviewSchema = z.object({ reviews: z.array(z.object({
  index: z.number().int().nonnegative(), supported: z.boolean(), reason: z.string().trim().min(12).max(1200),
  scopeConfirmed: z.boolean().optional(), equivalentActionId: z.string().optional().nullable(),
}).strict()).max(3) }).strict();

const AUTHOR = `Propose de zéro à trois initiatives de marque réellement motivées par cette actualité précise. Le titre ou l’extrait est un fait RAPPORTÉ. Un repère de marque est un contexte, pas une mesure du marché. Cite mot pour mot un passage disponible et un repère numéroté. Explique ce que leur rapprochement change comme QUESTION pour cette marque. Propose un geste concret et comment en vérifier le résultat. Supprime toute proposition qui se justifierait tout aussi bien sans cet article. Ne complète aucun champ de marque, prix, budget ou persona. Aucun résultat, partenariat ou part de marché supposé. Une source trop pauvre ou hors sujet appelle {"actions":[]}. Retourne uniquement {"actions":[{"field":"title" ou "summary","quote":"citation exacte de cet extrait","anchor":0,"brandQuote":"citation exacte du repère","implication":"hypothèse propre à la marque","action":"action concrète à proposer","format":"format","objective":"objectif","measure":"comment l’équipe vérifiera le résultat"}]}.`;
const REVIEWER = `Examine chaque initiative indépendamment de son auteur. Une citation exacte peut être hors sujet. Appuie-toi UNIQUEMENT sur l’article et les repères fournis. Retourne supported=true seulement si le passage cité porte bien le fait rapporté, que le repère cité et ce fait expliquent ensemble l’implication propre à la marque, que l’action vérifie cette implication et que la mesure permettra d’apprendre quelque chose. Une donnée partagée comme « Abidjan » ou « restaurants » ne suffit pas. Refuse les réécritures générales de marque, tarifs hors sujet, partenariats supposés, inférences présentées comme constats et conclusions dépassant le texte disponible. Retourne un avis par index, même en cas de refus : {"reviews":[{"index":0,"supported":false,"reason":"raison spécifique et vérifiable"}]}. Ces avis sont des contrôles de pertinence générés, pas une validation humaine.`;

async function readOutput<T>(model: Model, system: string, prompt: string, schema: z.ZodType<T>): Promise<T> {
  let raw: string;
  try { raw = await model(system, prompt); }
  catch (cause) { throw new NotoriaGenerationFailure("MODEL_CALL_FAILED", cause); }
  try { return schema.parse(extractJSON(raw)); }
  catch (cause) { throw new NotoriaGenerationFailure("INVALID_MODEL_OUTPUT", cause); }
}

export interface PreparedArticleAction {
  initiativeId: string;
  basis: ArticleActionBasis;
  recommendation: RawLLMReco;
}

export async function prepareArticleActions(input: ArticleInput, brandContext: BrandAnchor[], model: Model, scopes: ArticleComparisonScope[] = []) {
  const anchors = brandContext.filter(anchor => !anchor.stale).map(anchor => ({
    ...anchor, text: untrustedContentBody(anchor.text.slice(0, 600), { max: 600 }),
  })).filter(anchor => anchor.text.length >= 8);
  if (!anchors.length || !input.excerpts.some(excerpt => excerpt.text.length >= 12)) {
    return { actions: [], rejected: 0 };
  }
  // Send only complete scopes. A truncated list of adopted actions would corrupt the denominator.
  const offered: ArticleComparisonScope[] = [];
  let remaining = 18000;
  for (const scope of scopes) {
    const size = JSON.stringify(scope).length + 100;
    if (size > remaining) continue;
    offered.push(scope);
    remaining -= size;
  }
  const prompt = [
    wrapUntrusted("Article reçu", input.observation, { max: 4000 }),
    wrapUntrusted("Repères de la marque", JSON.stringify(anchors.map((a, index) => ({ index, key: a.pillarKey, field: a.field, text: a.text, certainty: a.certainty }))), { max: 24000 }),
    ...(offered.length ? [wrapUntrusted("Décisions adoptées à comparer", JSON.stringify(offered.map((scope, index) => ({ index, ...scope }))), { max: 24000 })] : []),
  ].join("\n");
  const { actions: raw } = await readOutput(model, offered.length ? AUTHOR + " Si et seulement si l’action vise exactement l’objectif, le public, le canal et la période d’une décision fournie, reprends cet objectif mot pour mot et indique scope (index), et mode (peddler, dealer, facilitator ou entertainer) uniquement pour une répartition éditoriale. Sinon laisse scope et mode vides. Aucun chiffre de performance à inventer." : AUTHOR, prompt, outputSchema);
  const checked = raw.flatMap(candidate => {
    const anchor = anchors[candidate.anchor];
    const excerpt = input.excerpts.find(ex => ex.field === candidate.field);
    const offset = excerpt?.text.indexOf(candidate.quote) ?? -1;
    if (!anchor?.text.includes(candidate.brandQuote) || !excerpt || offset < 0) return [];
    return [{ candidate, anchor, start: excerpt.start + offset }];
  });
  if (!checked.length) return { actions: [], rejected: raw.length };
  const { reviews } = await readOutput(model, offered.length ? REVIEWER + " Vérifie que la proposition est praticable dans le même public, canal et période pour le même objectif exact. Pour un mix éditorial, vérifie aussi que son mode proposé correspond à son geste et que le respect de la répartition est bien l’objectif concerné. scopeConfirmed=true uniquement si ces conditions sont remplies. Si une action existante fait déjà exactement le même travail pour ce périmètre, cite son identifiant equivalentActionId. Ne confonds pas une autre manière d’atteindre le même objectif avec un doublon." : REVIEWER, prompt + "\n" + wrapUntrusted("Initiatives à examiner",
    JSON.stringify(checked.map(({ candidate }, index) => ({ index, ...candidate }))), { max: 16000 }), reviewSchema);
  if (reviews.length !== checked.length || new Set(reviews.map(v => v.index)).size !== checked.length
    || reviews.some(v => v.index >= checked.length)) throw new NotoriaGenerationFailure("INVALID_MODEL_OUTPUT");

  const actions: PreparedArticleAction[] = [];
  for (const { index, supported, reason, scopeConfirmed, equivalentActionId } of reviews) {
    if (!supported) continue;
    const { candidate, anchor, start } = checked[index]!;
    const scope = candidate.scope != null && scopeConfirmed ? offered[candidate.scope] : undefined;
    const comparison = compareArticleAction(candidate, scope, candidate.mode ?? undefined, equivalentActionId ?? undefined);
    if (comparison.verdict === "DUPLICATE" || comparison.verdict === "BELOW") continue;
    const id = randomUUID();
    const proposedValue = AddInitiativePayloadSchema.parse({ kind: "ADD_INITIATIVE", pillar: "i", initiative: {
      id, status: "DRAFT", action: candidate.action, format: candidate.format, objectif: candidate.objective,
    } });
    actions.push({ initiativeId: id, basis: {
      field: candidate.field, quote: candidate.quote, start, end: start + candidate.quote.length,
      anchor: { pillarKey: anchor.pillarKey, field: anchor.field, quote: candidate.brandQuote, ...(anchor.certainty ? { certainty: anchor.certainty } : {}) },
      comparison, action: candidate.action, implication: candidate.implication, measure: candidate.measure, reviewReason: reason,
    }, recommendation: {
      field: "catalogueParCanal", operation: "ADD", proposedValue, source: "SESHAT", impact: "MEDIUM",
      justification: [candidate.action, candidate.implication, candidate.measure].join("\n\n"),
    } });
  }
  return { actions, rejected: raw.length - actions.length };
}
