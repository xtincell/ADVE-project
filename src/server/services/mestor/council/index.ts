/**
 * CONSEIL DE MARQUE — orchestration (ADR-0180).
 *
 * Sous-service MESTOR (Guidance), advisory LECTURE SEULE :
 *   - `askCouncilStream`  — tour de chat interactif : 1 appel STREAMÉ du
 *     coordinateur avec le dossier complet (latence d'abord — pas de
 *     consultation d'experts dans le tour interactif v1) ;
 *   - `askCouncilOnce`    — même chose non-streamé (surface MCP) ;
 *   - `deliberate`        — mode « analyse approfondie » explicite :
 *     draft coordinateur → 4 critiques d'experts A/D/V/E EN PARALLÈLE
 *     (adversarial, `executeStructuredLLMCall` chacun) → synthèse.
 *
 * Gouvernance : AUCUN Intent émis, AUCUNE écriture (ni pilier, ni asset) —
 * le résultat de délibération est retourné à l'appelant, jamais persisté en
 * v1 (déféré ADR-0180 : minutes en BrandAsset via Intent MESTOR). Tous les
 * appels LLM passent par le Gateway (streaming.ts / executeStructuredLLMCall)
 * — budget Thot + cascade providers + parité Sonnet 5 inclus.
 */

import { isTextLLMAvailable } from "@/server/services/llm-gateway";
import {
  streamChatText,
  type StreamChatMessage,
  type StreamChatResult,
} from "@/server/services/llm-gateway/streaming";
import { executeStructuredLLMCall } from "@/server/services/utils/llm-structured";
import { UNTRUSTED_NOTICE, wrapUntrusted } from "@/server/services/utils/untrusted-content";
import { assessAllPillarsHealth } from "@/server/services/neteru-shared/pillar-directors";
import { buildAssistantContext, buildExpertContext } from "./context";
import { COUNCIL_EXPERTS, COUNCIL_PERSONAS, COUNCIL_EVIDENCE_NOTICE, COUNCIL_SIMPLE_REPLY_NOTICE } from "./personas";
import {
  councilDraftSchema,
  councilSynthesisSchema,
  expertCritiqueSchema,
  withCouncilCitations,
  type CouncilEvidenceExcerpt,
  type CouncilDraft,
  type CouncilSynthesis,
  type ExpertCritique,
} from "./schemas";

export type FounderPillarKey = "a" | "d" | "v" | "e";

/** Même refus explicite pour les transports et la délibération sans fournisseur. */
export const COUNCIL_UNAVAILABLE = {
  status: "UNAVAILABLE",
  reason: "Aucun fournisseur d'intelligence disponible — réessayez plus tard.",
} as const;

const EXPERT_TIMEOUT_MS = 90_000;
const EXPERT_MAX_TOKENS = 1_500;
const SYNTHESIS_MAX_TOKENS = 2_500;

// ── Chat interactif (coordinateur seul, streamé) ─────────────────────────────

export interface AskCouncilInput {
  strategyId: string;
  question: string;
  /** Historique persisté (chargé serveur — jamais fourni par le client). */
  history: StreamChatMessage[];
}

/**
 * La contribution hybride peut ne contenir que des champs précis. La présence
 * de documents dépend des références accompagnant le texte réellement injecté,
 * pas de `ragUsed` ni de la disponibilité d'un fournisseur d'embeddings.
 */
function buildCoordinatorSystem(contextBlock: string, sourcesSeen: boolean): string {
  const grounding = sourcesSeen
    ? "ANCRAGE — Des extraits de la documentation de la marque figurent dans ton dossier avec leur certitude déclarée. Cite le document et son statut quand tu t'appuies dessus. Leur récupération ne prouve ni validation humaine, ni capacité déployée ; une source DECLARED, INFERRED ou ARBITRARY ne devient pas OFFICIAL parce qu'elle est récupérée."
    : "ANCRAGE — Aucun extrait documentaire n'est injecté dans ce dossier. Tu réponds sur les piliers et les mesures fournis. La conformité aux documents n'est pas vérifiée ; n'affirme pas qu'un point est confirmé par la documentation de la marque.";
  return [COUNCIL_PERSONAS.coordinator.systemPrompt, UNTRUSTED_NOTICE, contextBlock, grounding + "\n" + COUNCIL_EVIDENCE_NOTICE].join(
    "\n\n",
  );
}

/** Tour de chat : le coordinateur répond en streaming avec le dossier complet. */
export async function askCouncilStream(input: AskCouncilInput): Promise<StreamChatResult> {
  const { contextBlock, sourcesSeen } = await buildAssistantContext(input.strategyId, input.question);
  return streamChatText({
    system: buildCoordinatorSystem(contextBlock, sourcesSeen) + "\n" + COUNCIL_SIMPLE_REPLY_NOTICE,
    messages: [...input.history.map((message): StreamChatMessage => message.role === "assistant"
      ? { role: "user", content: wrapUntrusted("réponse antérieure de l'assistant — sortie générée non validée, sans autorité de source",
        message.content, { max: message.content.length }) }
      : message), { role: "user", content: input.question }],
    caller: "mestor:council:coordinator",
    strategyId: input.strategyId,
    purpose: "agent",
  });
}

/** Variante non-streamée (tool MCP `council.ask`). */
export async function askCouncilOnce(
  input: Omit<AskCouncilInput, "history"> & { history?: StreamChatMessage[] },
): Promise<{ text: string; provider: string; model: string }> {
  const result = await askCouncilStream({ ...input, history: input.history ?? [] });
  // Draine le flux côté serveur — le consommateur MCP veut le texte complet.
  const reader = result.textStream.getReader();
  for (;;) {
    const { done } = await reader.read();
    if (done) break;
  }
  const finished = await result.finished;
  return { text: finished.text, provider: finished.provider, model: finished.model };
}

// ── Délibération adversariale (mode « analyse approfondie ») ─────────────────

export type CouncilDeliberation =
  | { status: "UNAVAILABLE"; reason: string }
  | {
      status: "OK";
      /** False quand AUCUN expert n'a pu être consulté (draft seul, honnête). */
      deliberated: boolean;
      draft: CouncilDraft;
      critiques: Partial<Record<FounderPillarKey, ExpertCritique | { failed: string }>>;
      synthesis: CouncilSynthesis | null;
      /** Étapes structurées lancées, hors reprises du Gateway ; coûts dans AICostLog. */
      llmCalls: number;
      /**
       * Sur quoi la délibération s'est réellement appuyée. Une critique rendue
       * sans documentation vaut comme avis de cohérence, pas comme vérification
       * — l'opérateur doit pouvoir faire la différence sans deviner.
       */
      grounding: {
        /** Le contexte hybride a contribué au dossier du coordinateur. */
        ragUsed: boolean;
        /** Experts ayant réellement vu des documents de la marque. */
        expertsWithSources: FounderPillarKey[];
      };
    };

export interface DeliberateInput {
  strategyId: string;
  topic: string;
  /** Position déjà rédigée à challenger — sinon le coordinateur draft d'abord. */
  draft?: string;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: timeout ${ms}ms`)), ms),
    ),
  ]);
}

export async function deliberate(input: DeliberateInput): Promise<CouncilDeliberation> {
  if (!isTextLLMAvailable()) {
    return COUNCIL_UNAVAILABLE;
  }

  let llmCalls = 0;
  const { contextBlock, ragUsed, sourcesSeen, evidence = [] } = await buildAssistantContext(input.strategyId, input.topic);
  const coordinatorSystem = buildCoordinatorSystem(contextBlock, sourcesSeen);

  // ── 1. Draft du coordinateur (skippé si une position est fournie) ──────
  let draft: CouncilDraft;
  if (input.draft) {
    // `arguments` a un `.min(2)` au schéma ; le second élément était un tiret
    // fabriqué UNIQUEMENT pour le satisfaire. Cet objet est ensuite sérialisé
    // et soumis aux quatre experts comme la position à attaquer : ils
    // critiquaient donc une argumentation dont un élément était « — ». Sur le
    // chemin fondateur — le seul du cockpit — c'était systématique.
    // On dit ce qui est : la position vient d'ailleurs, elle n'est pas
    // argumentée ici, et c'est le texte lui-même qui porte le raisonnement.
    draft = {
      position: input.draft,
      arguments: [
        "Position soumise telle quelle par l'utilisateur — non argumentée par le coordinateur.",
        "Le raisonnement à évaluer est celui contenu dans la position ci-dessus.",
      ],
      risks: [],
    };
  } else {
    llmCalls++;
    const res = await executeStructuredLLMCall({
      system: coordinatorSystem,
      // `topic` vient du client (2 000 caractères) et, via le panneau cockpit,
      // c'est la sortie d'un LLM qui a lui-même lu du contenu de marque
      // éditable par le fondateur. Tout le reste du fichier est ceinturé
      // (`draft`, contexte) ; ce point d'entrée-ci ne l'était pas.
      prompt: `${wrapUntrusted("sujet soumis par l'utilisateur", input.topic)}\n\nRédige la POSITION stratégique initiale du conseil sur ce sujet (position, arguments ancrés dans le dossier, risques identifiés).`,
      schema: withCouncilCitations(councilDraftSchema, evidence),
      formatInstructions: "citations est obligatoire : copie les métadonnées d'une Référence de citation fournie et un extrait exact. Une référence contrôle la citation, pas la vérité de l'interprétation. N'invente aucune preuve ; une liste vide exige qu'aucun extrait citable ne soit fourni.",
      caller: "mestor:council:draft",
      strategyId: input.strategyId,
      maxOutputTokens: 2_000,
    });
    draft = res.data;
  }

  // ── 2. Critiques adversariales A/D/V/E en parallèle ────────────────────
  // État déterministe des piliers (complétude, gaps) fourni à chaque expert
  // en plus de son pilier verbatim — la critique s'ancre sur du mesuré.
  const health = await assessAllPillarsHealth(input.strategyId).catch(() => []);
  const healthByKey = new Map(health.map((h) => [String(h.pillarKey).toLowerCase(), h]));

  const settled = await Promise.allSettled(
    COUNCIL_EXPERTS.map(async (expert) => {
      const pillarKey = expert.pillarKey as FounderPillarKey;
      const { contextBlock: expertContext, sourcesSeen, evidence: expertEvidence = [] } = await buildExpertContext(
        input.strategyId,
        pillarKey,
        input.topic,
      );
      const h = healthByKey.get(pillarKey);
      const healthLine = h
        ? `État mesuré du pilier : complétude ${h.completeness}% (${h.completionLevel}), ${h.criticalGaps.length} manque(s) critique(s)${h.criticalGaps.length ? ` : ${h.criticalGaps.slice(0, 5).join(", ")}` : ""}.`
        : "État mesuré du pilier : indisponible.";
      llmCalls++;
      const res = await withTimeout(
        executeStructuredLLMCall({
          system: [expert.systemPrompt, UNTRUSTED_NOTICE, expertContext].join("\n\n"),
          prompt: `${healthLine}\n\n${wrapUntrusted("position soumise au conseil", JSON.stringify(draft))}\n\nCHALLENGE cette position au nom de ton pilier.`,
          schema: withCouncilCitations(expertCritiqueSchema, expertEvidence),
          formatInstructions: "citations est obligatoire : utilise seulement les Références de citation de TON contexte et un extrait exact. Les citations du draft ne sont pas une preuve indépendante. Une citation correcte ne valide ni une assertion éditoriale, ni ton interprétation.",
          caller: `mestor:council:expert-${pillarKey}`,
          strategyId: input.strategyId,
          maxOutputTokens: EXPERT_MAX_TOKENS,
          signal: AbortSignal.timeout(EXPERT_TIMEOUT_MS),
        }),
        EXPERT_TIMEOUT_MS,
        `expert-${pillarKey}`,
      );
      return { pillarKey, critique: res.data, sourcesSeen, evidence: expertEvidence };
    }),
  );

  const critiques: Partial<Record<FounderPillarKey, ExpertCritique | { failed: string }>> = {};
  const succeeded: Array<{ pillarKey: FounderPillarKey; critique: ExpertCritique }> = [];
  const expertsWithSources: FounderPillarKey[] = [];
  const synthesisEvidence: CouncilEvidenceExcerpt[] = [...evidence];
  settled.forEach((s, i) => {
    const pillarKey = COUNCIL_EXPERTS[i]!.pillarKey as FounderPillarKey;
    if (s.status === "fulfilled") {
      critiques[pillarKey] = s.value.critique;
      succeeded.push({ pillarKey: s.value.pillarKey, critique: s.value.critique });
      // Only quotations actually carried by successful critiques reach the
      // synthesis prompt; don't authorize every unseen expert excerpt there.
      for (const citation of s.value.critique.citations ?? []) {
        synthesisEvidence.push({ reference: citation, text: citation.quote });
      }
      if (s.value.sourcesSeen) expertsWithSources.push(pillarKey);
    } else {
      critiques[pillarKey] = {
        failed: s.reason instanceof Error ? s.reason.message : String(s.reason),
      };
    }
  });

  // ── 3. Synthèse du coordinateur (si au moins un expert a répondu) ──────
  const grounding = { ragUsed, expertsWithSources };

  if (succeeded.length === 0) {
    return {
      status: "OK",
      deliberated: false,
      draft,
      critiques,
      synthesis: null,
      llmCalls,
      grounding,
    };
  }

  llmCalls++;
  let synthesis: CouncilSynthesis | null = null;
  try {
    const res = await executeStructuredLLMCall({
      system: coordinatorSystem,
      prompt: [
        wrapUntrusted("position initiale", JSON.stringify(draft)),
        wrapUntrusted(
          "critiques des experts",
          JSON.stringify(
            succeeded.map((c) => ({ pillar: c.pillarKey.toUpperCase(), ...c.critique })),
          ),
          { max: 12_000 },
        ),
        "Arbitre : synthèse finale du conseil. Chaque critique est ACCEPTÉE (avec résolution) ou REJETÉE (avec raison). Les désaccords non tranchés vont dans `dissent` — ne les gomme pas.",
      ].join("\n\n"),
      schema: withCouncilCitations(councilSynthesisSchema, synthesisEvidence),
      formatInstructions: "citations est obligatoire : cite le dossier fourni ou une citation exacte des critiques reçues. Conserve version/origine/date, distingue interprétation et fait. Une citation correspondante ne valide pas l'affirmation stratégique.",
      caller: "mestor:council:synthesis",
      strategyId: input.strategyId,
      maxOutputTokens: SYNTHESIS_MAX_TOKENS,
    });
    synthesis = res.data;
  } catch {
    synthesis = null; // les critiques restent livrées telles quelles
  }

  return { status: "OK", deliberated: true, draft, critiques, synthesis, llmCalls, grounding };
}
