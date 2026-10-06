/**
 * SESHAT — Brand Context Indexer (Tier 3)
 *
 * Aggregates per-strategy brand context into BrandContextNode rows.
 * Triggered async via INDEX_BRAND_CONTEXT intent, never blocking
 * the user-facing flow.
 *
 * Input data (per strategy):
 *   - Pillar.content fields (one node per non-empty field)
 *   - QuickIntake.diagnostic.narrativeReport (per ADVE/RTIS paragraph)
 *   - QuickIntake.diagnostic.brandLevel (justification + iconeVision)
 *   - Recommendation rows where status === ACCEPTED
 *   - BrandAsset rows (if any)
 *
 * Output: structured nodes persisted in BrandContextNode with payload
 * but `embedding: []`. A separate embedding worker (Phase 4 P2) calls
 * the LLM gateway to populate the embedding vector. This separation
 * lets us ship indexing today without depending on pgvector.
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import crypto from "crypto";
import { embedBrandContext } from "./embedder";
import { chunkText } from "./chunker";

// ── Types ────────────────────────────────────────────────────────────

export type IndexScope = "INTAKE_ONLY" | "FULL";

export interface IndexedNode {
  kind: string;
  pillarKey?: string | null;
  field?: string | null;
  sourceId?: string | null;
  payload: Record<string, unknown>;
}

export interface IndexResult {
  strategyId: string;
  scope: IndexScope;
  totalNodes: number;
  byKind: Record<string, number>;
  durationMs: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

function hashPayload(payload: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 32);
}

// ── Main entry point ─────────────────────────────────────────────────

export async function indexBrandContext(
  strategyId: string,
  scope: IndexScope = "INTAKE_ONLY",
): Promise<IndexResult> {
  const t0 = Date.now();
  const nodes: IndexedNode[] = [];

  // ── 1. Pillar fields ────────────────────────────────────────────
  const pillars = await db.pillar.findMany({
    where: { strategyId },
    select: { key: true, content: true },
  });
  for (const p of pillars) {
    const content = (p.content as Record<string, unknown> | null) ?? {};
    for (const [field, value] of Object.entries(content)) {
      if (value === null || value === undefined || value === "") continue;
      if (Array.isArray(value) && value.length === 0) continue;
      nodes.push({
        kind: "PILLAR_FIELD",
        pillarKey: p.key,
        field,
        payload: { pillarKey: p.key, field, value },
      });
    }
  }

  // ── 2. Intake diagnostic (narrative + brand level) ──────────────
  const intake = await db.quickIntake.findFirst({
    where: { convertedToId: strategyId },
    select: { id: true, diagnostic: true, companyName: true },
  });
  const diagnostic = (intake?.diagnostic as Record<string, unknown> | null) ?? null;
  if (diagnostic) {
    // Narrative ADVE per pillar
    const narrative = diagnostic.narrativeReport as Record<string, unknown> | undefined;
    if (narrative) {
      const advePillars = (narrative.adve as Array<Record<string, unknown>>) ?? [];
      for (const item of advePillars) {
        if (typeof item.full === "string" && item.full.trim()) {
          nodes.push({
            kind: "NARRATIVE",
            pillarKey: typeof item.key === "string" ? item.key : null,
            sourceId: intake?.id ?? null,
            payload: { source: "narrativeReport.adve", ...item },
          });
        }
      }
      const rtis = narrative.rtis as { framing?: string; pillars?: Array<Record<string, unknown>> } | undefined;
      if (rtis?.pillars) {
        for (const item of rtis.pillars) {
          if (typeof item.full === "string" && item.full.trim()) {
            nodes.push({
              kind: "NARRATIVE",
              pillarKey: typeof item.key === "string" ? item.key : null,
              sourceId: intake?.id ?? null,
              payload: { source: "narrativeReport.rtis", ...item },
            });
          }
        }
      }
      if (typeof narrative.executiveSummary === "string") {
        nodes.push({
          kind: "NARRATIVE",
          sourceId: intake?.id ?? null,
          payload: { source: "narrativeReport.executiveSummary", text: narrative.executiveSummary },
        });
      }
    }

    // Brand level — justification + iconeVision + pathToIcone
    const brandLevel = diagnostic.brandLevel as Record<string, unknown> | undefined;
    if (brandLevel) {
      nodes.push({
        kind: "BRANDLEVEL",
        sourceId: intake?.id ?? null,
        payload: {
          level: brandLevel.level,
          justification: brandLevel.justification,
          iconeVision: brandLevel.iconeVision,
          nextMilestone: brandLevel.nextMilestone,
          pathToIcone: brandLevel.pathToIcone,
          pillarSignals: brandLevel.pillarSignals,
        },
      });
    }
  }

  // ── 3. Accepted recommendations (FULL scope only) ──────────────
  if (scope === "FULL") {
    const recos = await db.recommendation.findMany({
      where: { strategyId, status: { in: ["ACCEPTED", "APPLIED"] } },
      take: 100,
      orderBy: [{ confidence: "desc" }, { impact: "desc" }],
      select: {
        id: true,
        targetPillarKey: true,
        targetField: true,
        proposedValue: true,
        explain: true,
        impact: true,
        urgency: true,
        confidence: true,
        missionType: true,
      },
    });
    for (const r of recos) {
      nodes.push({
        kind: "RECO",
        pillarKey: r.targetPillarKey,
        field: r.targetField,
        sourceId: r.id,
        payload: {
          field: r.targetField,
          proposedValue: r.proposedValue,
          explain: r.explain,
          impact: r.impact,
          urgency: r.urgency,
          confidence: r.confidence,
          missionType: r.missionType,
        },
      });
    }
  }

  // ── 4. Brand assets (FULL scope only) ──────────────────────────
  if (scope === "FULL") {
    const assets = await db.brandAsset.findMany({
      where: { strategyId },
      take: 50,
      select: {
        id: true,
        name: true,
        assetType: true,
        fileUrl: true,
        pillarTags: true,
        sourceExecutionId: true,
      },
    });
    for (const a of assets) {
      nodes.push({
        kind: "ASSET",
        sourceId: a.id,
        payload: {
          name: a.name,
          assetType: a.assetType,
          fileUrl: a.fileUrl,
          pillarTags: a.pillarTags,
          sourceExecutionId: a.sourceExecutionId,
        },
      });
    }
  }

  // Sources use the same atomic writer as single-document preparation.
  // Never recreate their chunks from an earlier snapshot of rawContent here.
  const sources = await db.brandDataSource.findMany({
    where: { strategyId },
    select: { id: true },
  });

  // ── 6. Compute filtering metadata (shared across all nodes) ─────
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { businessContext: true, financialCapacity: true },
  });
  const bizCtx = (strategy?.businessContext as Record<string, unknown> | null) ?? {};
  const finCap = (strategy?.financialCapacity as Record<string, unknown> | null) ?? null;
  const sharedMetadata = {
    sector: bizCtx.sector ?? intake?.companyName ?? null,
    businessModel: bizCtx.businessModel ?? null,
    country: (intake as { country?: string | null } | null)?.country ?? null,
    financialCapacityTier:
      finCap && typeof finCap.reconciled === "number"
        ? finCap.reconciled < 5_000_000
          ? "MICRO"
          : finCap.reconciled < 50_000_000
            ? "SMALL"
            : finCap.reconciled < 500_000_000
              ? "MID"
              : "LARGE"
        : "UNKNOWN",
  };

  // ── 7. Persist nodes (upsert by sourceId+kind+field when possible) ──
  let inserted = 0;
  const byKind: Record<string, number> = {};
  for (const node of nodes) {
    const contentHash = hashPayload(node.payload);
    try {
      await db.brandContextNode.create({
        data: {
          strategyId,
          kind: node.kind,
          pillarKey: node.pillarKey ?? null,
          field: node.field ?? null,
          sourceId: node.sourceId ?? null,
          payload: node.payload as Prisma.InputJsonValue,
          metadata: sharedMetadata as Prisma.InputJsonValue,
          contentHash,
        },
      });
      inserted++;
      byKind[node.kind] = (byKind[node.kind] ?? 0) + 1;
    } catch (err) {
      console.warn(
        `[seshat:indexer] skipping node ${node.kind}/${node.field ?? node.sourceId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  for (const source of sources) {
    const indexed = await writeSourceIndex(source.id);
    byKind.BRAND_SOURCE = (byKind.BRAND_SOURCE ?? 0) + indexed.chunks;
    inserted += indexed.chunks;
  }

  // Fire-and-forget embedding pass (graceful no-op when no embed provider).
  // Static import above — robust across runtimes (Next, tsx, node ESM).
  // The indexing API returns as soon as nodes are persisted; embedding happens
  // in the background and updates BrandContextNode.embedding/embeddedAt.
  if (inserted > 0) {
    void embedBrandContext(strategyId).catch((err) => {
      console.warn(
        "[seshat:indexer] post-index embedding failed (non-blocking):",
        err instanceof Error ? err.message : err,
      );
    });
  }

  return {
    strategyId,
    scope,
    totalNodes: inserted,
    byKind,
    durationMs: Date.now() - t0,
  };
}

// ── Single-source indexing (called by ingestion-pipeline hook) ────────

export interface BrandSourceIndexResult {
  sourceId: string;
  strategyId: string;
  chunks: number;
  durationMs: number;
  /**
   * Vrai quand l'index était déjà à jour pour ce contenu — rien n'a été
   * réécrit, rien n'a été ré-embeddé. Ce qui rend l'appel sûr en boucle.
   */
  alreadyFresh?: boolean;
}

/**
 * Prepare one source using the same writer as full context preparation.
 * Text persistence is atomic; optional embedding starts only after commit.
 */
export async function indexBrandSource(sourceId: string): Promise<BrandSourceIndexResult> {
  const t0 = Date.now();
  const source = await writeSourceIndex(sourceId);
  if (source.chunks > 0) {
    // Even unchanged text can lack vectors after a provider outage. The worker
    // only processes missing vectors; preserve existing ids and embeddings.
    void embedBrandContext(source.strategyId).catch((err) => {
      console.warn(
        "[seshat:indexer] post-source embedding failed (non-blocking):",
        err instanceof Error ? err.message : err,
      );
    });
  }
  return {
    sourceId,
    strategyId: source.strategyId,
    chunks: source.chunks,
    durationMs: Date.now() - t0,
    ...(source.reused ? { alreadyFresh: true } : {}),
  };
}

/**
 * Lock the canonical source BEFORE reading it. An editor updates the same row:
 * either its update commits first and we index the new text, or it runs after
 * this commit and invalidates our chunks. Two preparers cannot interleave.
 * No network work or embedding is held inside this transaction.
 */
async function writeSourceIndex(sourceId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "BrandDataSource" WHERE id = ${sourceId} FOR UPDATE`;
    const source = await tx.brandDataSource.findUnique({
      where: { id: sourceId },
      select: {
        id: true, strategyId: true, sourceType: true, fileName: true,
        fileType: true, rawContent: true, pillarMapping: true, processingStatus: true,
      },
    });
    if (!source) throw new Error(`BrandDataSource ${sourceId} not found`);
    const scope = { strategyId: source.strategyId, sourceId: source.id };
    const readable = source.processingStatus === "EXTRACTED" || source.processingStatus === "PROCESSED";
    const chunks = readable ? chunkText(source.rawContent ?? "") : [];
    const desired = chunks.map((chunk) => {
      const payload = {
        text: chunk.text, fileName: source.fileName, sourceType: source.sourceType,
        fileType: source.fileType, chunkIndex: chunk.index,
        charStart: chunk.charStart, charEnd: chunk.charEnd,
        pillarMapping: source.pillarMapping ?? null,
      };
      return {
        ...scope, kind: "BRAND_SOURCE", pillarKey: null, field: `chunk_${chunk.index}`,
        payload: payload as Prisma.InputJsonValue,
        contentHash: hashPayload(payload),
        metadata: {
          sourceDataSourceId: source.id, sourceType: source.sourceType,
          fileName: source.fileName, fileType: source.fileType,
        } as Prisma.InputJsonValue,
      };
    });
    const existing = await tx.brandContextNode.findMany({
      where: { ...scope, kind: "BRAND_SOURCE" },
      select: { field: true, contentHash: true },
    });
    const current = new Map(existing.map((node) => [node.field, node.contentHash]));
    const reused = existing.length === desired.length && current.size === desired.length
      && desired.every((node) => current.get(node.field) === node.contentHash);

    // Old SOURCE_CHUNK rows remain readable for migration compatibility.
    // Once this source is prepared, retaining those rows would resurrect old text.
    await tx.brandContextNode.deleteMany({ where: { ...scope, kind: "SOURCE_CHUNK" } });
    if (!reused) {
      await tx.brandContextNode.deleteMany({ where: { ...scope, kind: "BRAND_SOURCE" } });
      if (desired.length > 0) await tx.brandContextNode.createMany({ data: desired });
    }
    return { strategyId: source.strategyId, chunks: desired.length, reused };
  }, { maxWait: 10_000, timeout: 30_000 });
}
