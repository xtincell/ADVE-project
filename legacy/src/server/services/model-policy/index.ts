/**
 * model-policy — governed `purpose → model` resolution.
 *
 * Layer 3 (services). Reads the `ModelPolicy` Prisma table and exposes a
 * cached `resolvePolicy(purpose)` to the LLM Gateway. Mutations only happen
 * through `updatePolicy()`, which is invoked by the Artemis dispatcher
 * when an `UPDATE_MODEL_POLICY` Intent fires (so every change is hash-chained).
 *
 * Cache: 60-second LRU per purpose. Invalidated on `updatePolicy()`. The
 * Gateway is on the hot path (every LLM call), so a per-call DB read is a
 * non-starter — but we also can't afford stale policy when an admin flips
 * a model. The 60s window is the explicit balance.
 *
 * Pipeline gating: each policy row carries `pipelineVersion` (V1 default,
 * V2 enables the RAG-augmented two-pass narrative report). `resolvePolicy`
 * exposes this so callers can branch their flow without reading the DB
 * directly.
 *
 * Mission contribution: GROUND_INFRASTRUCTURE — without governed policy,
 * the LLM Gateway would silently drift from the strategic intent (Opus for
 * final reports, Ollama for intake throwaway calls).
 */

import { db } from "@/lib/db";

export type GatewayPurpose =
  | "final-report"
  | "agent"
  | "intermediate"
  | "intake-followup"
  | "extraction";

export type PipelineVersion = "V1" | "V2" | "V3";

export interface ResolvedPolicy {
  readonly purpose: GatewayPurpose;
  readonly anthropicModel: string;
  readonly ollamaModel: string | null;
  readonly allowOllamaSubstitution: boolean;
  readonly pipelineVersion: PipelineVersion;
  readonly version: number;
  readonly notes: string | null;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<GatewayPurpose, { policy: ResolvedPolicy; expiresAt: number }>();

/**
 * Hard-coded last-resort policy used only when the DB is unreachable. The
 * canonical source of truth is the `ModelPolicy` table.
 */
const FALLBACK: Record<GatewayPurpose, Omit<ResolvedPolicy, "purpose" | "version" | "notes">> = {
  "final-report":    { anthropicModel: "claude-opus-4-20250514",    ollamaModel: null,           allowOllamaSubstitution: false, pipelineVersion: "V1" },
  "agent":           { anthropicModel: "claude-sonnet-4-20250514",  ollamaModel: "llama3.1:70b", allowOllamaSubstitution: true,  pipelineVersion: "V1" },
  "intermediate":    { anthropicModel: "claude-sonnet-4-20250514",  ollamaModel: "llama3.1:70b", allowOllamaSubstitution: true,  pipelineVersion: "V1" },
  "intake-followup": { anthropicModel: "claude-haiku-4-5-20251001", ollamaModel: "llama3.1:8b",  allowOllamaSubstitution: true,  pipelineVersion: "V1" },
  "extraction":      { anthropicModel: "claude-sonnet-4-20250514",  ollamaModel: "llama3.1:70b", allowOllamaSubstitution: true,  pipelineVersion: "V1" },
};

const VALID_PURPOSES = new Set<string>([
  "final-report", "agent", "intermediate", "intake-followup", "extraction",
]);
function isPurpose(s: string): s is GatewayPurpose {
  return VALID_PURPOSES.has(s);
}

/**
 * Read the active policy for a given purpose. Cached 60s in-memory. On DB
 * error (table missing, connection lost, etc.) returns the FALLBACK so the
 * Gateway can keep serving requests during an outage.
 */
export async function resolvePolicy(purpose: GatewayPurpose): Promise<ResolvedPolicy> {
  const now = Date.now();
  const cached = cache.get(purpose);
  if (cached && cached.expiresAt > now) return cached.policy;

  try {
    const row = await (db as unknown as { modelPolicy: { findUnique: (args: { where: { purpose: string } }) => Promise<{
      purpose: string;
      anthropicModel: string;
      ollamaModel: string | null;
      allowOllamaSubstitution: boolean;
      pipelineVersion: string;
      version: number;
      notes: string | null;
    } | null> } }).modelPolicy.findUnique({ where: { purpose } });
    const policy: ResolvedPolicy = row
      ? {
          purpose,
          anthropicModel: row.anthropicModel,
          ollamaModel: row.ollamaModel,
          allowOllamaSubstitution: row.allowOllamaSubstitution,
          pipelineVersion: row.pipelineVersion === "V3" ? "V3" : row.pipelineVersion === "V2" ? "V2" : "V1",
          version: row.version,
          notes: row.notes,
        }
      : { purpose, ...FALLBACK[purpose], version: 0, notes: null };
    cache.set(purpose, { policy, expiresAt: now + CACHE_TTL_MS });
    return policy;
  } catch {
    return { purpose, ...FALLBACK[purpose], version: 0, notes: null };
  }
}

export async function listAllPolicies(): Promise<ResolvedPolicy[]> {
  try {
    const rows = await (db as unknown as { modelPolicy: { findMany: (args: { orderBy: { purpose: "asc" } }) => Promise<Array<{
      purpose: string;
      anthropicModel: string;
      ollamaModel: string | null;
      allowOllamaSubstitution: boolean;
      pipelineVersion: string;
      version: number;
      notes: string | null;
    }>> } }).modelPolicy.findMany({ orderBy: { purpose: "asc" } });
    const seen = new Set<string>();
    const out: ResolvedPolicy[] = rows
      .filter((r) => {
        if (!isPurpose(r.purpose)) return false;
        if (seen.has(r.purpose)) return false;
        seen.add(r.purpose);
        return true;
      })
      .map((r) => ({
        purpose: r.purpose as GatewayPurpose,
        anthropicModel: r.anthropicModel,
        ollamaModel: r.ollamaModel,
        allowOllamaSubstitution: r.allowOllamaSubstitution,
        pipelineVersion: r.pipelineVersion === "V3" ? "V3" : r.pipelineVersion === "V2" ? "V2" : "V1",
        version: r.version,
        notes: r.notes,
      }));
    // Always surface every known purpose, falling back to FALLBACK for
    // unseeded entries so the admin UI can show the "needs seeding" state.
    for (const p of Object.keys(FALLBACK) as GatewayPurpose[]) {
      if (!seen.has(p)) {
        out.push({ purpose: p, ...FALLBACK[p], version: 0, notes: "(default — unseeded)" });
      }
    }
    return out;
  } catch {
    return (Object.keys(FALLBACK) as GatewayPurpose[]).map((p) => ({
      purpose: p, ...FALLBACK[p], version: 0, notes: "(default — DB unreachable)",
    }));
  }
}

export interface UpdatePolicyInput {
  readonly purpose: GatewayPurpose;
  readonly anthropicModel: string;
  readonly ollamaModel: string | null;
  readonly allowOllamaSubstitution: boolean;
  readonly pipelineVersion?: PipelineVersion;
  readonly notes?: string | null;
  readonly updatedBy: string | null;
}

/**
 * Apply a model-policy change. THIS FUNCTION SHOULD NOT BE CALLED DIRECTLY
 * BY ROUTERS — it is invoked by the Artemis dispatcher when an
 * `UPDATE_MODEL_POLICY` Intent fires, so each change goes through the
 * full `mestor.emitIntent → IntentEmission` audit trail.
 */
export async function updatePolicy(input: UpdatePolicyInput): Promise<ResolvedPolicy> {
  const writer = (db as unknown as { modelPolicy: { upsert: (args: unknown) => Promise<unknown>; findUnique: (args: { where: { purpose: string } }) => Promise<unknown> } }).modelPolicy;
  await writer.upsert({
    where: { purpose: input.purpose },
    update: {
      anthropicModel: input.anthropicModel,
      ollamaModel: input.ollamaModel,
      allowOllamaSubstitution: input.allowOllamaSubstitution,
      pipelineVersion: input.pipelineVersion ?? "V1",
      notes: input.notes ?? null,
      updatedBy: input.updatedBy,
      version: { increment: 1 },
    },
    create: {
      purpose: input.purpose,
      anthropicModel: input.anthropicModel,
      ollamaModel: input.ollamaModel,
      allowOllamaSubstitution: input.allowOllamaSubstitution,
      pipelineVersion: input.pipelineVersion ?? "V1",
      notes: input.notes ?? null,
      updatedBy: input.updatedBy,
      version: 1,
    },
  });
  cache.delete(input.purpose);
  return resolvePolicy(input.purpose);
}

export function _purgeCacheForTest(): void {
  cache.clear();
}
