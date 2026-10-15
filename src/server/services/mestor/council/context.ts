/**
 * CONSEIL DE MARQUE — construction du contexte (ADR-0180).
 *
 * Remplace le `loadStrategyContext` du chat (/api/chat) qui n'injectait que
 * 8 chiffres et un nom : l'assistant ne pouvait littéralement PAS lire l'ADVE
 * de la marque. Ici, le contexte est le dossier réel :
 *   - base stratégie (nom, score, business, capacité) via
 *     `loadStrategyContextForFramework` (source canonique Seshat) ;
 *   - piliers FONDATEURS A/D/V/E en profondeur préservée (`serializePillar`,
 *     projection récursive — chaque produit, chaque persona, chaque cellule) ;
 *   - piliers dérivés R/T/I/S résumés (budget court — diagnostic, pas source) ;
 *   - extraits pertinents par recherche sémantique (RAG hybride Seshat,
 *     dégrade seul en champs précis quand aucun provider d'embeddings) ;
 *   - état RÉEL de la communauté (dernier CommunitySnapshot par plateforme —
 *     « non mesuré » quand absent, jamais un zéro fabriqué).
 *
 * SÉCURITÉ : chaque bloc passe par `wrapUntrusted` (pattern
 * i-pillar-sequenced) — le contenu de marque est founder-writable, c'est une
 * DONNÉE, jamais une instruction. L'appelant ajoute UNTRUSTED_NOTICE en tête
 * de son system prompt.
 */

import { db } from "@/lib/db";
import { ADVE_STORAGE_KEYS, PILLAR_STORAGE_KEYS } from "@/domain";
import { loadStrategyContextForFramework } from "@/server/services/seshat/context-store/strategy-context";
import { getOracleBrandContextByQuery, formatSourceReferences, type OracleContextBlock } from "@/server/services/seshat/context-store/oracle-augment";
import { serializePillar } from "@/server/services/mestor/rtis-cascade";
import { untrustedContentBody, wrapUntrusted } from "@/server/services/utils/untrusted-content";
import { signalObservation } from "@/domain/signal-observation";
import { metricObservationTime } from "@/domain/external-metric";
import { SourceReceiptSchema } from "@/domain/source-certainty";
import { COUNCIL_EVIDENCE_NOTICE } from "./personas";
import { coerceProvenance, fieldStatusFor } from "@/domain/field-provenance";
import type { CouncilEvidenceExcerpt } from "./schemas";

/** Budgets déterministes (caractères) — troncature par bloc, jamais silencieuse. */
const FOUNDER_PILLAR_MAX = 5_000; // A/D/V/E — profondeur prioritaire
const DERIVED_PILLAR_MAX = 1_200; // R/T/I/S — résumé diagnostic
const RAG_BLOCK_MAX = 4_000;
const EXPERT_PILLAR_MAX = 9_000; // l'expert ne voit qu'UN pilier → plus de place
const OBSERVATIONS_MAX = 6_000;

/** Piliers FONDATEURS A/D/V/E (forme stockage) — source canonique du domaine. */
const FOUNDER_KEYS = ADVE_STORAGE_KEYS;

function capBlock(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "\n…[tronqué — budget de contexte]" : text;
}

/** Membership is about this supplied block, after the shared security wrapper. */
function includedEvidence(contextBlock: string, evidence: CouncilEvidenceExcerpt[]) {
  return evidence.filter((item) => contextBlock.includes(item.text)
    && contextBlock.includes(JSON.stringify(item.reference)));
}

/** Carry the existing field authority before the prose can consume its budget. */
function qualifiedPillar(key: string, pillar: {
  id?: string; currentVersion?: number; content: unknown; fieldCertainty?: unknown; updatedAt?: Date;
}, max: number): { text: string; evidence: CouncilEvidenceExcerpt[] } {
  const content = pillar.content && typeof pillar.content === "object" && !Array.isArray(pillar.content)
    ? pillar.content as Record<string, unknown> : {};
  const certainty = pillar.fieldCertainty && typeof pillar.fieldCertainty === "object" && !Array.isArray(pillar.fieldCertainty)
    ? Object.fromEntries(Object.entries(pillar.fieldCertainty).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
    : null;
  const status = fieldStatusFor(certainty, key, content._fieldProvenance);
  const date = pillar.updatedAt?.toISOString() ?? "non renseignée";
  const lines = [
    `Pilier ${key.toUpperCase()} — ${date} (date d’édition, pas une date de mesure).`,
    `Référence du pilier : ${pillar.id || "non renseignée"}. Version d’édition : ${pillar.currentVersion ?? "inconnue"}.`,
    "Qualification des champs : origine/autorité d’édition, pas une mesure ni une validation du résultat.",
  ];
  const evidence: CouncilEvidenceExcerpt[] = [];
  let remaining = max - lines.join("\n").length;
  let omitted = 0;
  for (const [field, value] of Object.entries(content).filter(([field]) => !field.startsWith("_"))) {
    const provenance = coerceProvenance(status(field));
    const reference = { kind: "FIELD" as const, sourceId: pillar.id ?? "",
      sourceVersion: pillar.currentVersion ?? null, source: key, field, provenance,
      editedAt: pillar.updatedAt?.toISOString() ?? null };
    // Keep each field packet atomic. A clipped leaf/absent packet cannot be
    // cited as an entire original field, and a status table must not eat the
    // whole excerpt budget before any values have reached the caller.
    const serialized = serializePillar(key, { [field]: value }, (path) => coerceProvenance(status(path)));
    const packet = `${field} : ${provenance}\nRéférence de citation : ${JSON.stringify(reference)}\n${serialized}`;
    if (packet.length + 1 > remaining) { omitted++; continue; }
    remaining -= packet.length + 1;
    lines.push(packet);
    if (pillar.id) {
      // The serializer already produced the actual JSON excerpt between its
      // two framing lines. Keep that exact body, including its leaf clipping.
      const body = serialized.slice(serialized.indexOf("\n") + 1, serialized.lastIndexOf("\n"));
      evidence.push({ reference, text: untrustedContentBody(body, { max: body.length }) });
    }
  }
  if (omitted) lines.push(`…[tronqué — budget de contexte] ${omitted} champ(s) non fourni(s), aucune absence métier déduite.`);
  return { text: lines.join("\n"), evidence };
}

/** Source packets and citations share the same bounded, sanitized excerpt. */
function qualifiedRag(rag: OracleContextBlock | null): { text: string; evidence: CouncilEvidenceExcerpt[] } {
  if (!rag) return { text: "", evidence: [] };
  const blocks: string[] = [];
  const evidence: CouncilEvidenceExcerpt[] = [];
  let remaining = RAG_BLOCK_MAX;
  for (const ref of rag.sourceReferences ?? []) {
    if (!SourceReceiptSchema.safeParse(ref).success || typeof ref.text !== "string" || !ref.text.trim()) continue;
    const reference = { kind: "DOCUMENT" as const, sourceId: ref.sourceId, contentHash: ref.contentHash,
      certainty: ref.certainty, chunkIndex: ref.chunkIndex };
    const header = `Référence de citation : ${JSON.stringify(reference)}\n${formatSourceReferences([{ ...ref, text: "" }])}\n`;
    if (remaining <= header.length + 60) break;
    const text = untrustedContentBody(capBlock(ref.text, remaining - header.length - 50), { max: remaining });
    const block = `${header}${text}`;
    blocks.push(block); remaining -= block.length + 2;
    evidence.push({ reference, text });
  }
  // Orientation remains advisory. It never authorizes a documentary citation.
  if (remaining > 60 && rag.text) blocks.push(capBlock(rag.narrativeBlock || rag.text, remaining - 50));
  return { text: blocks.join("\n\n"), evidence };
}

export interface AssistantContextResult {
  /** Bloc de contexte complet, chaque section déjà wrapUntrusted. */
  contextBlock: string;
  /** True si le contexte documentaire hybride a réellement contribué. */
  ragUsed: boolean;
  /** True si des références documentaires accompagnent le texte injecté. */
  sourcesSeen: boolean;
  /** Only the excerpts actually supplied, never the full selected records. */
  evidence: CouncilEvidenceExcerpt[];
}

/** Contexte d'un expert + ce qu'il a réellement pu lire. */
export interface ExpertContextResult {
  contextBlock: string;
  /** True si le contexte documentaire hybride a réellement contribué. */
  ragUsed: boolean;
  /**
   * True si au moins un document de la marque figure dans le contexte. Un
   * expert qui critique SANS documentation le dit ; il ne fait pas passer une
   * opinion pour une vérification.
   */
  sourcesSeen: boolean;
  evidence: CouncilEvidenceExcerpt[];
}

/**
 * Contexte du COORDINATEUR : extraits bornés du dossier réellement sélectionné.
 */
export async function buildAssistantContext(
  strategyId: string,
  question: string,
): Promise<AssistantContextResult> {
  let ragUnavailable = false;
  const [base, pillars, rag, communityBlock, observationsBlock] = await Promise.all([
    loadStrategyContextForFramework(strategyId),
    db.pillar.findMany({
      where: { strategyId },
      select: { id: true, key: true, currentVersion: true, content: true, fieldCertainty: true, updatedAt: true },
    }),
    getOracleBrandContextByQuery(strategyId, question, { limit: 8, includeSources: true })
      .catch(() => { ragUnavailable = true; return null; }),
    buildCommunityBlock(strategyId),
    buildObservationsBlock(strategyId),
  ]);

  const byKey = new Map(pillars.map((p) => [p.key.toLowerCase(), p]));
  const sections: string[] = [];
  const evidence: CouncilEvidenceExcerpt[] = [...observationsBlock.evidence];

  // Base stratégie (nom, score, business, capacité, résumés) — source canonique.
  sections.push(wrapUntrusted("contexte stratégie", base.lines.join("\n"), { max: 4_000 }));
  sections.push(observationsBlock.text);

  // Piliers fondateurs A/D/V/E — profondeur préservée.
  for (const k of FOUNDER_KEYS) {
    const p = byKey.get(k);
    if (!p?.content || Object.keys(p.content as object).length === 0) {
      sections.push(`[Pilier ${k.toUpperCase()}] non renseigné.`);
      continue;
    }
    const qualified = qualifiedPillar(k, p, FOUNDER_PILLAR_MAX);
    evidence.push(...qualified.evidence);
    sections.push(
      wrapUntrusted(
        `pilier ${k.toUpperCase()} (fondateur — valeurs avec leur origine ; pas une mesure reçue)`,
        qualified.text,
        { max: FOUNDER_PILLAR_MAX + 200 },
      ),
    );
  }

  // Piliers dérivés R/T/I/S — résumés (diagnostic, pas source d'édition).
  const founderSet: readonly string[] = FOUNDER_KEYS;
  for (const k of [...PILLAR_STORAGE_KEYS].filter((k) => !founderSet.includes(k))) {
    const p = byKey.get(k);
    if (!p?.content || Object.keys(p.content as object).length === 0) continue;
    const qualified = qualifiedPillar(k, p, DERIVED_PILLAR_MAX);
    evidence.push(...qualified.evidence);
    sections.push(
      wrapUntrusted(
        `pilier ${k.toUpperCase()} (dérivé — résumé ; diagnostic, pas une mesure reçue)`,
        qualified.text,
        { max: DERIVED_PILLAR_MAX + 200 },
      ),
    );
  }

  // The metadata fallback contributes without pretending to be a semantic match.
  const qualified = qualifiedRag(rag);
  evidence.push(...qualified.evidence);
  if (qualified.text) {
    sections.push(
      wrapUntrusted(rag?.usedVectorSearch
        ? "extraits pertinents (recherche sémantique)"
        : "contexte disponible (sélection par métadonnées)", qualified.text, {
        max: RAG_BLOCK_MAX + 200,
      }),
    );
  }
  if (ragUnavailable) sections.push("[Documentation] lecture documentaire indisponible — conformité aux sources non vérifiée.");

  sections.push(communityBlock);

  const contextBlock = sections.join("\n\n");
  const supplied = includedEvidence(contextBlock, evidence);
  return {
    contextBlock,
    ragUsed: !!qualified.text,
    sourcesSeen: supplied.some((item) => item.reference.kind === "DOCUMENT"),
    evidence: supplied,
  };
}

/** Même projection factuelle que les lecteurs ; aucune mesure/KPI n'est écrite. */
async function buildObservationsBlock(strategyId: string): Promise<{ text: string; evidence: CouncilEvidenceExcerpt[] }> {
  try {
    const rows = await db.signal.findMany({
      where: { strategyId, type: "EXTERNAL_METRIC" },
      orderBy: { createdAt: "desc" }, take: 5,
      select: { id: true, type: true, data: true, createdAt: true },
    });
    if (!rows.length) return { text: "[Observations] aucune observation externe reçue pour cette marque ; aucune valeur zéro déduite.", evidence: [] };
    const evidence: CouncilEvidenceExcerpt[] = [];
    const blocks: string[] = [];
    let remaining = OBSERVATIONS_MAX;
    for (const row of rows) {
      const { title, observation } = signalObservation(row);
      const data = row.data && typeof row.data === "object" && !Array.isArray(row.data)
        ? row.data as Record<string, unknown> : {};
      const reference = { kind: "OBSERVATION" as const, sourceId: row.id,
        sourceVersion: typeof data.sourceVersion === "string" ? data.sourceVersion : null,
        observationId: typeof data.observationId === "string" ? data.observationId : null,
        observedAt: metricObservationTime(data)?.toISOString() ?? null };
      const header = `${title}\nRéférence interne : ${row.id}.\nReçu : ${row.createdAt.toISOString()}.\nRéférence de citation : ${JSON.stringify(reference)}\n`;
      if (remaining <= header.length + 60) break;
      const text = untrustedContentBody(capBlock(observation, remaining - header.length - 50), { max: remaining });
      blocks.push(`${header}${text}`); remaining -= header.length + text.length + 2;
      evidence.push({ reference, text });
    }
    return { text: wrapUntrusted("observations externes reçues — origine déclarée par la source, pas une validation",
      blocks.join("\n\n"), { max: OBSERVATIONS_MAX + 200 }), evidence };
  } catch {
    return { text: "[Observations] lecture des observations indisponible ; résultats non vérifiés.", evidence: [] };
  }
}

/**
 * Contexte d'UN expert de pilier fondateur : extrait borné de SON pilier + les
 * extraits sémantiques scopés à son pilier + **la documentation de la marque**.
 * Il ne voit PAS les autres piliers (indépendance des critiques — c'est le
 * coordinateur qui arbitre).
 *
 * `includeSources` manquait ici alors que le coordinateur le passait : sans ce
 * drapeau, `oracle-augment` réduit le filtre à `[{pillarKey}, {BRANDLEVEL}]` et
 * **exclut les chunks `BRAND_SOURCE` du pool**. Les quatre experts adversariaux
 * n'ont donc jamais vu un seul document — ils vérifiaient des piliers contre
 * des piliers. L'asymétrie était accidentelle, pas doctrinale.
 */
export async function buildExpertContext(
  strategyId: string,
  pillarKey: "a" | "d" | "v" | "e",
  topic: string,
): Promise<ExpertContextResult> {
  let ragUnavailable = false;
  const [pillar, rag, communityBlock, observationsBlock] = await Promise.all([
    db.pillar.findFirst({
      where: { strategyId, key: { in: [pillarKey, pillarKey.toUpperCase()] } },
      select: { id: true, currentVersion: true, content: true, fieldCertainty: true, updatedAt: true },
    }),
    getOracleBrandContextByQuery(strategyId, topic, {
      pillarKey,
      limit: 6,
      includeSources: true,
    })
      .catch(() => { ragUnavailable = true; return null; }),
    // L'expert Engagement juge sur la communauté RÉELLE ; les autres l'ignorent.
    pillarKey === "e" ? buildCommunityBlock(strategyId) : Promise.resolve(null),
    buildObservationsBlock(strategyId),
  ]);

  const qualified = qualifiedRag(rag);
  const sourcesSeen = qualified.evidence.length > 0;
  const sections: string[] = [];
  const evidence = [...observationsBlock.evidence, ...qualified.evidence];
  sections.push(observationsBlock.text);
  if (pillar?.content && Object.keys(pillar.content as object).length > 0) {
    const qualified = qualifiedPillar(pillarKey, pillar, EXPERT_PILLAR_MAX);
    evidence.push(...qualified.evidence);
    sections.push(
      wrapUntrusted(
        `pilier ${pillarKey.toUpperCase()} (extrait verbatim borné)`,
        qualified.text,
        { max: EXPERT_PILLAR_MAX + 200 },
      ),
    );
  } else {
    sections.push(
      `[Pilier ${pillarKey.toUpperCase()}] NON RENSEIGNÉ — c'est en soi une information critique pour ta critique.`,
    );
  }
  if (qualified.text) {
    sections.push(
      wrapUntrusted(rag?.usedVectorSearch
        ? "extraits pertinents du pilier (recherche sémantique)"
        : "contexte du pilier (sélection par métadonnées)", qualified.text, {
        max: RAG_BLOCK_MAX + 200,
      }),
    );
  }
  if (communityBlock) sections.push(communityBlock);
  sections.push(COUNCIL_EVIDENCE_NOTICE);

  // Dit à l'expert ce qu'il a — et surtout ce qu'il n'a pas. Une critique sans
  // documentation reste recevable ; se prétendre vérifié sans elle, non.
  sections.push(
    ragUnavailable
      ? "[Documentation] lecture documentaire indisponible — ta critique porte sur la cohérence interne ; la conformité aux sources n'a pas pu être vérifiée."
      : sourcesSeen
        ? "[Documentation] Des extraits des documents de la marque figurent ci-dessus avec leur certitude déclarée. Cite l'extrait et son statut pour signaler une contradiction ; n'en déduis ni validation humaine, ni capacité déployée. Une source DECLARED, INFERRED ou ARBITRARY ne devient pas OFFICIAL parce qu'elle est récupérée."
        : "[Documentation] AUCUN document de la marque n'a été retrouvé par cette sélection. Ta critique porte donc sur la cohérence interne, pas sur la conformité aux sources — dis-le explicitement plutôt que d'affirmer qu'un point est vérifié.",
  );

  const contextBlock = sections.join("\n\n");
  const supplied = includedEvidence(contextBlock, evidence);
  return { contextBlock, ragUsed: !!qualified.text,
    sourcesSeen: supplied.some((item) => item.reference.kind === "DOCUMENT"), evidence: supplied };
}

/**
 * État réel de la communauté — dernier snapshot par plateforme. Absence de
 * mesure = « non mesuré » explicite, JAMAIS un zéro fabriqué (doctrine circuit).
 */
async function buildCommunityBlock(strategyId: string): Promise<string> {
  try {
    const snaps = await db.communitySnapshot.findMany({
      where: { strategyId },
      orderBy: { measuredAt: "desc" },
      take: 12,
      select: { platform: true, size: true, health: true, velocity: true, measuredAt: true },
    });
    if (snaps.length === 0) {
      return "[Communauté] non mesurée (aucun réseau connecté ou aucune collecte encore effectuée).";
    }
    const latestByPlatform = new Map<string, (typeof snaps)[number]>();
    for (const s of snaps) {
      if (!latestByPlatform.has(s.platform)) latestByPlatform.set(s.platform, s);
    }
    const lines = [...latestByPlatform.values()].map((s) => {
      const health = s.health == null ? "engagement non mesuré" : `engagement ${(s.health * 100).toFixed(1)}%`;
      const velocity = s.velocity == null ? "" : `, croissance ~30j ${(s.velocity * 100).toFixed(1)}%`;
      return `${s.platform}: ${s.size} abonnés (${health}${velocity}) — mesuré le ${s.measuredAt.toISOString().slice(0, 10)}`;
    });
    return wrapUntrusted("communauté (mesures réelles)", lines.join("\n"), { max: 1_200 });
  } catch {
    return "[Communauté] mesure momentanément indisponible.";
  }
}
