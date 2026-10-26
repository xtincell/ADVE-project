/**
 * SESHAT — Embedding Worker
 *
 * Reads BrandContextNode rows where embedding is empty, generates embeddings
 * via the LLM gateway, persists them. Designed to run async (post-intake)
 * or as a periodic cron — idempotent and resumable.
 *
 * En production les embeddings passent par le service d'embedding SELF-HOSTED
 * (`EMBED_SERVICE_URL`, API Ollama-compatible) — souveraineté des données
 * d'abord (cf. `llm-gateway` `selectEmbedProvider`). NB : Ollama Cloud (la clé
 * texte) NE sert AUCUN modèle d'embedding — d'où le self-host dédié. OpenAI /
 * OpenRouter ne sont que des replis. embed() renvoie des vecteurs vides (no-op
 * gracieux, ADR-0108) quand aucun fournisseur n'est configuré ou joignable, et
 * un lot partiel quand l'Ollama natif tombe en cours d'appel. Un vecteur vide
 * n'est JAMAIS enregistré : le fragment garde `embeddedAt: null` et reste dans
 * la file, avec son payload structuré ; seul le chemin vectoriel manque.
 *
 * When pgvector is enabled in production, the `embedding Float[]` column
 * can be migrated to `vector(1536)` via a single raw SQL ALTER. The worker
 * code is unchanged.
 */

import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { embed } from "@/server/services/llm-gateway";

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Flatten a node payload into a short text representation suitable for
 * embedding. Preserves field names and key values; truncates long bodies.
 */
function payloadToText(payload: unknown, kind: string, pillarKey?: string | null, field?: string | null): string {
  if (typeof payload === "string") return payload.slice(0, 2000);
  if (!payload || typeof payload !== "object") return "";

  const p = payload as Record<string, unknown>;
  const parts: string[] = [];
  if (pillarKey) parts.push(`[Pillar ${pillarKey.toUpperCase()}]`);
  if (field) parts.push(`[Field ${field}]`);
  parts.push(`[${kind}]`);

  // Heuristic: prefer common semantic keys
  const semanticKeys = [
    "value",
    "text",
    "full",
    "preview",
    "justification",
    "iconeVision",
    "explain",
    "title",
    "description",
    "name",
  ];
  for (const k of semanticKeys) {
    if (p[k] != null) {
      const s = typeof p[k] === "string" ? (p[k] as string) : JSON.stringify(p[k]);
      parts.push(`${k}: ${s.slice(0, 600)}`);
    }
  }

  // Fallback: dump whatever else (capped)
  const dumped = JSON.stringify(p).slice(0, 1500);
  if (parts.length <= 3) parts.push(dumped);

  return parts.join("\n").slice(0, 2500);
}

// ── Budget, rythme et unicité d'un passage ──────────────────────────
//
// Constaté du 2026-10-19 au 23 en production : l'import du corpus SPAWT a
// écrit ~7 000 fragments `BRAND_SOURCE`, et CHAQUE source indexée lançait son
// propre passage sur toute la file de sa marque. Des dizaines de passages
// calculaient les mêmes fragments en même temps sur l'Ollama CPU du VPS,
// pendant des heures, jusqu'à ce que l'hébergeur bride la machine entière
// (steal ~70 %). Dès lors, chaque appel dépassait le plafond de patience et la
// file ne bougeait plus.
//
// D'où quatre règles :
// - UN passage à la fois par process. Un appel pendant un passage en cours le
//   rejoint et demande une reprise, au lieu d'en lancer un second.
// - Un passage s'arrête au premier vecteur manquant (fournisseur indisponible
//   ou lot partiel) ; les appels suivants attendent `UNAVAILABLE_COOLDOWN_MS`.
// - Un passage est borné en fragments ET en durée, et marque après chaque lot
//   une pause proportionnelle au temps du lot (occupation ≤ 50 % par défaut).
// - Un texte déjà vectorisé n'est pas recalculé : même texte dans le passage,
//   ou fragment déjà vectorisé de même `contentHash`, kind, pilier et champ.

const DEFAULT_SAFETY_LIMIT = 1000;
const DEFAULT_CHUNK = 200;
const DEFAULT_BATCH = 8;
const DEFAULT_MAX_DURATION_MS = 20 * 60 * 1000;
/** Pause après un lot = durée du lot × ce ratio (1 → service occupé ≤ 50 %). */
const DEFAULT_PACE_RATIO = 1;
const UNAVAILABLE_COOLDOWN_MS = 10 * 60 * 1000;

export interface EmbedWorkerResult {
  scanned: number;
  embedded: number;
  skipped: number;
  failed: number;
  durationMs: number;
  /** Vrai quand l'appel a rejoint un passage déjà en cours au lieu d'en lancer un. */
  coalesced?: boolean;
  /** Pourquoi le passage s'est arrêté avant d'avoir vidé sa file, le cas échéant. */
  stoppedBy?: "safety-limit" | "time-budget" | "provider-unavailable" | "cooldown";
}

export interface EmbedWorkerOptions {
  /** Plafond de fragments traités par passage. */
  safetyLimit?: number;
  /** Fragments lus par requête. */
  chunk?: number;
  /** Fragments envoyés au Gateway par appel. */
  batch?: number;
  /** Plafond de durée d'un passage. */
  maxDurationMs?: number;
  /** Pause après un lot, en multiple de la durée du lot (0 = aucune pause). */
  paceRatio?: number;
}

interface WorkerState {
  running: Promise<EmbedWorkerResult> | null;
  /** Périmètre demandé pendant le passage en cours. */
  followUp: { all: boolean; strategyIds: Set<string> } | null;
  unavailableUntil: number;
}

// Un seul état par process, y compris après rechargement à chaud (dev).
const g = globalThis as unknown as { __seshatEmbedWorker?: WorkerState };

function workerState(): WorkerState {
  return (g.__seshatEmbedWorker ??= { running: null, followUp: null, unavailableUntil: 0 });
}

export function _resetEmbedWorkerForTest(): void {
  delete g.__seshatEmbedWorker;
}

/** Attend la fin du passage en cours et de ses reprises. */
export async function _drainEmbedWorkerForTest(): Promise<void> {
  while (g.__seshatEmbedWorker?.running) {
    await g.__seshatEmbedWorker.running.catch(() => undefined);
  }
}

// ── Main entry point ─────────────────────────────────────────────────

/**
 * Embed BrandContextNodes with empty embedding for the given strategy.
 * Set strategyId=null to process the global queue (cron mode).
 *
 * One pass at a time per process: a call made while a pass is running joins
 * it (`coalesced: true`) and asks for a follow-up pass on its scope, run only
 * if the current pass drained its queue. A pass stops at its fragment or time
 * budget, or at the first missing vector; what remains waits for the next
 * trigger (source indexing, ops-sweep).
 *
 * Returns aggregate counts for telemetry.
 */
export function embedBrandContext(
  strategyId: string | null,
  options: EmbedWorkerOptions = {},
): Promise<EmbedWorkerResult> {
  const state = workerState();

  if (state.running) {
    const followUp = (state.followUp ??= { all: false, strategyIds: new Set() });
    if (strategyId === null) followUp.all = true;
    else followUp.strategyIds.add(strategyId);
    return state.running.then((result) => ({ ...result, coalesced: true }));
  }

  if (Date.now() < state.unavailableUntil) {
    return Promise.resolve({ scanned: 0, embedded: 0, skipped: 0, failed: 0, durationMs: 0, stoppedBy: "cooldown" });
  }

  const run = drainQueue(strategyId, options).then(
    (result) => {
      settle(state, result);
      return result;
    },
    (err: unknown) => {
      settle(state, null);
      throw err;
    },
  );
  state.running = run;
  return run;
}

function settle(state: WorkerState, result: EmbedWorkerResult | null): void {
  state.running = null;
  if (result && (result.scanned > 0 || result.stoppedBy)) {
    console.info(
      `[seshat:embedder] passage : ${result.embedded}/${result.scanned} vectorisés, ${result.skipped} sans vecteur, ${result.failed} en échec, ${result.durationMs} ms${result.stoppedBy ? `, arrêt ${result.stoppedBy}` : ""}`,
    );
  }
  if (result?.stoppedBy === "provider-unavailable") {
    state.unavailableUntil = Date.now() + UNAVAILABLE_COOLDOWN_MS;
  }
  const followUp = state.followUp;
  state.followUp = null;
  // Reprise seulement si le passage a vidé sa file : un passage arrêté par son
  // budget ou par le fournisseur laisse la suite au prochain déclencheur.
  if (!followUp || !result || result.stoppedBy) return;
  const scope = !followUp.all && followUp.strategyIds.size === 1 ? [...followUp.strategyIds][0]! : null;
  void embedBrandContext(scope).catch((err) => {
    console.warn("[seshat:embedder] follow-up pass failed:", err instanceof Error ? err.message : err);
  });
}

type Candidate = {
  id: string;
  kind: string;
  pillarKey: string | null;
  field: string | null;
  payload: unknown;
  contentHash: string | null;
};

type KnownVector = { vector: number[]; provider: string; model: string };

async function drainQueue(strategyId: string | null, options: EmbedWorkerOptions): Promise<EmbedWorkerResult> {
  const t0 = Date.now();
  const safetyLimit = options.safetyLimit ?? DEFAULT_SAFETY_LIMIT;
  const chunk = options.chunk ?? DEFAULT_CHUNK;
  const batch = options.batch ?? DEFAULT_BATCH;
  const deadline = t0 + (options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS);
  const paceRatio = options.paceRatio ?? DEFAULT_PACE_RATIO;

  const totals = { scanned: 0, embedded: 0, skipped: 0, failed: 0 };
  // Fragments déjà tentés dans ce passage : un échec ne revient pas en tête de file.
  const attempted: string[] = [];
  // Vecteurs connus dans ce passage, par texte envoyé au modèle.
  const known = new Map<string, KnownVector>();
  let stoppedBy: EmbedWorkerResult["stoppedBy"];

  drain: while (true) {
    if (totals.scanned >= safetyLimit) {
      stoppedBy = "safety-limit";
      break;
    }
    const candidates: Candidate[] = await db.brandContextNode.findMany({
      where: {
        ...(strategyId ? { strategyId } : {}),
        embeddedAt: null,
        ...(attempted.length > 0 ? { id: { notIn: attempted } } : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: Math.min(chunk, safetyLimit - totals.scanned),
      select: { id: true, kind: true, pillarKey: true, field: true, payload: true, contentHash: true },
    });
    if (candidates.length === 0) break;

    for (let i = 0; i < candidates.length; i += batch) {
      if (Date.now() >= deadline) {
        stoppedBy = "time-budget";
        break drain;
      }
      const slice = candidates.slice(i, i + batch);
      totals.scanned += slice.length;
      for (const node of slice) attempted.push(node.id);

      const startedAt = Date.now();
      const outcome = await processSlice(slice, known);
      totals.embedded += outcome.embedded;
      totals.skipped += outcome.skipped;
      totals.failed += outcome.failed;
      if (outcome.providerUnavailable) {
        stoppedBy = "provider-unavailable";
        break drain;
      }

      const pause = (Date.now() - startedAt) * paceRatio;
      if (pause > 0) await new Promise((resolve) => setTimeout(resolve, pause));
    }
  }

  return {
    ...totals,
    durationMs: Date.now() - t0,
    ...(stoppedBy ? { stoppedBy } : {}),
  };
}

interface SliceResult {
  embedded: number;
  skipped: number;
  failed: number;
  providerUnavailable: boolean;
}

function textKey(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function processSlice(slice: Candidate[], known: Map<string, KnownVector>): Promise<SliceResult> {
  const texts = slice.map((n) => payloadToText(n.payload, n.kind, n.pillarKey, n.field));
  const keys = texts.map(textKey);

  await adoptExistingVectors(slice, keys, known);

  const toEmbed = new Map<string, string>();
  keys.forEach((key, j) => {
    if (!known.has(key)) toEmbed.set(key, texts[j]!);
  });

  let providerUnavailable = false;
  if (toEmbed.size > 0) {
    try {
      const result = await embed({
        input: [...toEmbed.values()],
        caller: "seshat:embed-brand-context",
      });
      [...toEmbed.keys()].forEach((key, k) => {
        const vector = result.embeddings[k];
        // Vecteur vide = fournisseur indisponible (no-op ADR-0108 ou lot partiel) :
        // rien n'est enregistré, le fragment reste dans la file.
        if (vector && vector.length > 0) known.set(key, { vector, provider: result.provider, model: result.model });
        else providerUnavailable = true;
      });
    } catch (err) {
      console.warn(`[seshat:embedder] batch failed:`, err instanceof Error ? err.message : err);
      return { embedded: 0, skipped: 0, failed: slice.length, providerUnavailable: false };
    }
  }

  let embedded = 0;
  let skipped = 0;
  let failed = 0;
  for (let j = 0; j < slice.length; j++) {
    const node = slice[j]!;
    const hit = known.get(keys[j]!);
    if (!hit) {
      skipped++;
      continue;
    }
    try {
      await db.brandContextNode.update({
        where: { id: node.id },
        data: {
          embedding: hit.vector,
          embeddingProvider: hit.provider,
          embeddingModel: hit.model,
          embeddingDim: hit.vector.length,
          embeddedAt: new Date(),
        },
      });
      embedded++;
    } catch (err) {
      failed++;
      console.warn(`[seshat:embedder] update failed for node ${node.id}:`, err instanceof Error ? err.message : err);
    }
  }

  return { embedded, skipped, failed, providerUnavailable };
}

/**
 * Reprend le vecteur d'un fragment déjà vectorisé au contenu identique : même
 * `contentHash` (empreinte du payload, posée par l'indexeur), même kind, pilier
 * et champ — donc même texte envoyé au modèle. Le fournisseur et le modèle
 * d'origine sont recopiés tels quels.
 */
async function adoptExistingVectors(
  slice: Candidate[],
  keys: string[],
  known: Map<string, KnownVector>,
): Promise<void> {
  const hashes = [
    ...new Set(slice.filter((n, j) => n.contentHash && !known.has(keys[j]!)).map((n) => n.contentHash!)),
  ];
  if (hashes.length === 0) return;
  const donors = await db.brandContextNode.findMany({
    where: { contentHash: { in: hashes }, embeddedAt: { not: null }, embedding: { isEmpty: false } },
    select: {
      contentHash: true,
      kind: true,
      pillarKey: true,
      field: true,
      embedding: true,
      embeddingProvider: true,
      embeddingModel: true,
    },
  });
  slice.forEach((node, j) => {
    const key = keys[j]!;
    if (known.has(key)) return;
    const donor = donors.find(
      (d) =>
        d.contentHash === node.contentHash &&
        d.kind === node.kind &&
        d.pillarKey === node.pillarKey &&
        d.field === node.field,
    );
    if (donor) {
      known.set(key, {
        vector: donor.embedding,
        provider: donor.embeddingProvider ?? "unknown",
        model: donor.embeddingModel ?? "unknown",
      });
    }
  });
}

/**
 * Cosine similarity between two vectors. Used by similarity search until
 * pgvector is enabled (then we'll switch to the native operator).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
