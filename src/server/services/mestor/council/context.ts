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
import { getOracleBrandContextByQuery } from "@/server/services/seshat/context-store/oracle-augment";
import { serializePillar } from "@/server/services/mestor/rtis-cascade";
import { wrapUntrusted } from "@/server/services/utils/untrusted-content";

/** Budgets déterministes (caractères) — troncature par bloc, jamais silencieuse. */
const FOUNDER_PILLAR_MAX = 5_000; // A/D/V/E — profondeur prioritaire
const DERIVED_PILLAR_MAX = 1_200; // R/T/I/S — résumé diagnostic
const RAG_BLOCK_MAX = 4_000;
const EXPERT_PILLAR_MAX = 9_000; // l'expert ne voit qu'UN pilier → plus de place

/** Piliers FONDATEURS A/D/V/E (forme stockage) — source canonique du domaine. */
const FOUNDER_KEYS = ADVE_STORAGE_KEYS;

function capBlock(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "\n…[tronqué — budget de contexte]" : text;
}

export interface AssistantContextResult {
  /** Bloc de contexte complet, chaque section déjà wrapUntrusted. */
  contextBlock: string;
  /** True si la recherche sémantique a réellement contribué. */
  ragUsed: boolean;
}

/**
 * Contexte du COORDINATEUR (chat interactif + délibération) : dossier complet.
 */
export async function buildAssistantContext(
  strategyId: string,
  question: string,
): Promise<AssistantContextResult> {
  const [base, pillars, ragBlock, communityBlock] = await Promise.all([
    loadStrategyContextForFramework(strategyId),
    db.pillar.findMany({
      where: { strategyId },
      select: { key: true, content: true, updatedAt: true },
    }),
    getOracleBrandContextByQuery(strategyId, question, { limit: 8, includeSources: true })
      .then((r) => r?.text ?? null)
      .catch(() => null),
    buildCommunityBlock(strategyId),
  ]);

  const byKey = new Map(pillars.map((p) => [p.key.toLowerCase(), p]));
  const sections: string[] = [];

  // Base stratégie (nom, score, business, capacité, résumés) — source canonique.
  sections.push(wrapUntrusted("contexte stratégie", base.lines.join("\n"), { max: 4_000 }));

  // Piliers fondateurs A/D/V/E — profondeur préservée.
  for (const k of FOUNDER_KEYS) {
    const p = byKey.get(k);
    if (!p?.content || Object.keys(p.content as object).length === 0) {
      sections.push(`[Pilier ${k.toUpperCase()}] non renseigné.`);
      continue;
    }
    sections.push(
      wrapUntrusted(
        `pilier ${k.toUpperCase()} (fondateur — verbatim)`,
        capBlock(serializePillar(k, p.content), FOUNDER_PILLAR_MAX),
        { max: FOUNDER_PILLAR_MAX + 200 },
      ),
    );
  }

  // Piliers dérivés R/T/I/S — résumés (diagnostic, pas source d'édition).
  const founderSet: readonly string[] = FOUNDER_KEYS;
  for (const k of [...PILLAR_STORAGE_KEYS].filter((k) => !founderSet.includes(k))) {
    const p = byKey.get(k);
    if (!p?.content || Object.keys(p.content as object).length === 0) continue;
    sections.push(
      wrapUntrusted(
        `pilier ${k.toUpperCase()} (dérivé — résumé)`,
        capBlock(serializePillar(k, p.content), DERIVED_PILLAR_MAX),
        { max: DERIVED_PILLAR_MAX + 200 },
      ),
    );
  }

  // Recherche sémantique ciblée sur la question (peut légitimement être absente).
  if (ragBlock) {
    sections.push(
      wrapUntrusted("extraits pertinents (recherche sémantique)", capBlock(ragBlock, RAG_BLOCK_MAX), {
        max: RAG_BLOCK_MAX + 200,
      }),
    );
  }

  sections.push(communityBlock);

  return { contextBlock: sections.join("\n\n"), ragUsed: !!ragBlock };
}

/**
 * Contexte d'UN expert de pilier fondateur : SON pilier en profondeur + les
 * extraits sémantiques scopés à son pilier. Il ne voit PAS les autres piliers
 * (indépendance des critiques — c'est le coordinateur qui arbitre).
 */
export async function buildExpertContext(
  strategyId: string,
  pillarKey: "a" | "d" | "v" | "e",
  topic: string,
): Promise<string> {
  const [pillar, rag, communityBlock] = await Promise.all([
    db.pillar.findFirst({
      where: { strategyId, key: { in: [pillarKey, pillarKey.toUpperCase()] } },
      select: { content: true, updatedAt: true },
    }),
    getOracleBrandContextByQuery(strategyId, topic, { pillarKey, limit: 6 })
      .then((r) => r?.text ?? null)
      .catch(() => null),
    // L'expert Engagement juge sur la communauté RÉELLE ; les autres l'ignorent.
    pillarKey === "e" ? buildCommunityBlock(strategyId) : Promise.resolve(null),
  ]);

  const sections: string[] = [];
  if (pillar?.content && Object.keys(pillar.content as object).length > 0) {
    sections.push(
      wrapUntrusted(
        `pilier ${pillarKey.toUpperCase()} (verbatim complet)`,
        capBlock(serializePillar(pillarKey, pillar.content), EXPERT_PILLAR_MAX),
        { max: EXPERT_PILLAR_MAX + 200 },
      ),
    );
  } else {
    sections.push(
      `[Pilier ${pillarKey.toUpperCase()}] NON RENSEIGNÉ — c'est en soi une information critique pour ta critique.`,
    );
  }
  if (rag) {
    sections.push(
      wrapUntrusted("extraits pertinents du pilier", capBlock(rag, RAG_BLOCK_MAX), {
        max: RAG_BLOCK_MAX + 200,
      }),
    );
  }
  if (communityBlock) sections.push(communityBlock);

  return sections.join("\n\n");
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
