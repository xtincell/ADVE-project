import { PILLAR_STORAGE_KEYS } from "@/domain";

/**
 * SESHAT — Strategy Context Loader (canonical for frameworks)
 *
 * The single source of truth for "what context does Artemis need to run a
 * framework on this strategy". Replaces the ad-hoc `db.strategy.findUnique`
 * + manual context-line construction that lived inside artemis.executeFramework.
 *
 * Hybrid by design (per user constraint: embeddings are lossy → never the
 * sole source for citations or numbers):
 *   - lines     : narrative-style context block — orientation only
 *   - precise   : structured authoritative fields — citation/calculation
 *
 * Feature flag: `process.env.ORACLE_VIA_NETERU` (default OFF).
 *   - OFF (default) : behaves exactly like the legacy executeFramework path
 *                     — direct DB reads, no Seshat enrichment. Zero behavior
 *                     change for any framework caller.
 *   - ON            : adds narrative nodes from BrandContextNode on top of
 *                     the precise fields. Frameworks see richer context.
 *
 * Rollback: flip the env var. Atomic.
 */

import { db } from "@/lib/db";
import type { PreciseField } from "./oracle-augment";

export interface FrameworkStrategyContext {
  /** Plain-text lines for system prompt injection (legacy executeFramework format) */
  lines: string[];
  /** Lossless structured fields for citation/calculation */
  precise: PreciseField[];
  /** True when narrative nodes from Seshat were added (ORACLE_VIA_NETERU=true and nodes exist) */
  augmented: boolean;
  /** Number of narrative nodes that contributed */
  narrativeNodeCount: number;
}

/**
 * Build the strategy context for a framework call.
 *
 * @param strategyId - target strategy
 * @param options.forceAugment - bypass the env flag (for tests / explicit calls)
 */
export async function loadStrategyContextForFramework(
  strategyId: string,
  options: { forceAugment?: boolean } = {},
): Promise<FrameworkStrategyContext> {
  // ── ALWAYS-ON precise reads (replaces inline DB calls in executeFramework) ──
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    include: {
      pillars: { select: { key: true, content: true, updatedAt: true } },
      drivers: {
        where: { deletedAt: null, status: "ACTIVE" },
        select: { id: true, channel: true },
      },
    },
  });

  const lines: string[] = ["--- CONTEXTE STRATEGIE ---"];
  const precise: PreciseField[] = [];

  lines.push(`Marque: ${strategy?.name ?? "N/A"}`);
  lines.push(`Description: ${strategy?.description ?? "N/A"}`);

  // Score vector (precise)
  const vec = strategy?.advertis_vector as Record<string, number> | null;
  if (vec) {
    lines.push(
      `Score ADVE: A=${vec.a ?? 0}, D=${vec.d ?? 0}, V=${vec.v ?? 0}, E=${vec.e ?? 0}, R=${vec.r ?? 0}, T=${vec.t ?? 0}, I=${vec.i ?? 0}, S=${vec.s ?? 0}`,
    );
    lines.push(
      `Score composite: ${[...PILLAR_STORAGE_KEYS]
        .reduce((s, k) => s + (vec[k] ?? 0), 0)
        .toFixed(0)}/200`,
    );
    precise.push({ source: "score", field: "advertisVector", value: vec });
  }

  // Business context (precise)
  const bizCtx = strategy?.businessContext as Record<string, unknown> | null;
  if (bizCtx) {
    lines.push(`Modele d'affaires: ${bizCtx.businessModel ?? "N/A"}`);
    lines.push(`Positionnement: ${bizCtx.positioningArchetype ?? "N/A"}`);
    precise.push({ source: "biz", field: "businessContext", value: bizCtx });
  }

  // Financial capacity (precise — Thot)
  const finCap = strategy?.financialCapacity as Record<string, unknown> | null;
  if (finCap) {
    precise.push({ source: "thot", field: "financialCapacity", value: finCap });
    if (typeof finCap.reconciled === "number") {
      lines.push(`Capacité financière (Thot): ${finCap.reconciled} ${finCap.currency ?? "XAF"} (confiance ${finCap.confidence ?? "?"})`);
    }
  }

  // Pillar summaries (precise — verbatim source)
  if (strategy?.pillars) {
    for (const p of strategy.pillars) {
      const content = p.content as Record<string, unknown> | null;
      if (content?.summary) lines.push(`Pilier ${p.key}: ${content.summary}`);
      // Add full content as precise field so frameworks can cite verbatim
      if (content && Object.keys(content).length > 0) {
        for (const [field, value] of Object.entries(content)) {
          if (value === null || value === undefined || value === "") continue;
          if (Array.isArray(value) && value.length === 0) continue;
          precise.push({
            source: p.key,
            field,
            value,
            lastWrittenAt: p.updatedAt,
          });
        }
      }
    }
  }

  // ── FEATURE-FLAGGED narrative augmentation (Seshat BrandContextNode) ──
  const flagOn = options.forceAugment ?? process.env.ORACLE_VIA_NETERU === "true";
  let narrativeNodeCount = 0;
  let augmented = false;

  if (flagOn) {
    try {
      const nodes = await db.brandContextNode.findMany({
        where: {
          strategyId,
          OR: [{ kind: "NARRATIVE" }, { kind: "BRANDLEVEL" }],
        },
        take: 20,
        orderBy: { createdAt: "desc" },
        select: { kind: true, pillarKey: true, payload: true },
      });

      if (nodes.length > 0) {
        lines.push("");
        lines.push("--- NARRATIF MARQUE (Seshat — orientation, ne pas citer verbatim) ---");
        for (const n of nodes) {
          const p = (n.payload ?? {}) as Record<string, unknown>;
          const tag = n.pillarKey ? `[${n.kind}/${n.pillarKey.toUpperCase()}]` : `[${n.kind}]`;
          const snippet =
            (typeof p.full === "string" && p.full) ||
            (typeof p.justification === "string" && p.justification) ||
            (typeof p.iconeVision === "string" && p.iconeVision) ||
            JSON.stringify(p).slice(0, 400);
          lines.push(`${tag} ${String(snippet).slice(0, 500)}`);
        }
        narrativeNodeCount = nodes.length;
        augmented = true;
      }
    } catch (err) {
      console.warn(
        "[seshat:strategy-context] narrative augmentation failed (non-blocking):",
        err instanceof Error ? err.message : err,
      );
    }
  }

  lines.push("--- FIN CONTEXTE ---");

  return { lines, precise, augmented, narrativeNodeCount };
}
