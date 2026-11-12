/** ADR-0207 — immutable applied delta and three-way compensation, no guessed history. */
import { z } from "zod";
import { SourceReceiptSchema } from "@/domain/source-certainty";
import { isDeepStrictEqual } from "node:util";

const metadataSchema = z.object({
  sources: z.json(), fieldCertainty: z.json(), confidence: z.number().nullable(),
  validationStatus: z.enum(["DRAFT", "AI_PROPOSED", "VALIDATED", "LOCKED"]),
  staleAt: z.string().datetime().nullable(),
});
const slotSchema = z.object({ present: z.boolean(), value: z.json().optional() })
  .refine(s => s.present === Object.hasOwn(s, "value"));
const checkpointSchema = z.object({
  format: z.literal(1), afterVersion: z.number().int().positive(),
  changes: z.array(z.object({ key: z.string(), after: slotSchema })),
  beforeMetadata: metadataSchema, afterMetadata: metadataSchema,
  sourceReceiptsUsed: SourceReceiptSchema.array(),
});
export type PillarMetadata = z.infer<typeof metadataSchema>;
export type PillarCheckpoint = z.infer<typeof checkpointSchema>;
type Slot = { present: boolean; value?: unknown };
const absent: Slot = { present: false };
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function slot(value: Record<string, unknown>, key: string): Slot {
  return Object.hasOwn(value, key) ? { present: true, value: value[key] } : absent;
}
function put(target: Record<string, unknown>, key: string, next: Slot) {
  if (next.present) Object.defineProperty(target, key, { value: structuredClone(next.value), enumerable: true, configurable: true, writable: true });
  else delete target[key];
}
function equal(a: Slot, b: Slot) {
  return a.present === b.present && (!a.present || isDeepStrictEqual(a.value, b.value));
}

/** Missing and null differ. Objects merge by leaf; arrays retain their atomic contract. */
function undo(before: Slot, applied: Slot, current: Slot, path: string): Slot {
  if (equal(before, applied)) return current;
  if (equal(current, applied)) return before;
  if (equal(current, before)) return current;
  if ([before, applied, current].every(s => !s.present || record(s.value))) {
    const b = (before.value ?? {}) as Record<string, unknown>;
    const a = (applied.value ?? {}) as Record<string, unknown>;
    const c = (current.value ?? {}) as Record<string, unknown>;
    const result = structuredClone(c);
    for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
      put(result, key, undo(slot(b, key), slot(a, key), slot(c, key), `${path}.${key}`));
    }
    return !before.present && !Object.keys(result).length ? absent : { present: true, value: result };
  }
  throw new Error(`RESTORE_CONFLICT: ${path} a été modifié depuis cette écriture.`);
}

export function pillarMetadata(pillar: {
  sources: unknown; fieldCertainty: unknown; confidence: number | null;
  validationStatus: string; staleAt: Date | null;
}): PillarMetadata {
  return metadataSchema.parse({ sources: pillar.sources, fieldCertainty: pillar.fieldCertainty,
    confidence: pillar.confidence, validationStatus: pillar.validationStatus, staleAt: pillar.staleAt?.toISOString() ?? null });
}

export function createCheckpoint(before: Record<string, unknown>, after: Record<string, unknown>,
  beforeMetadata: PillarMetadata, afterMetadata: PillarMetadata, afterVersion: number,
  sourceReceiptsUsed: PillarCheckpoint["sourceReceiptsUsed"],
): PillarCheckpoint {
  return checkpointSchema.parse({ format: 1, afterVersion, beforeMetadata, afterMetadata, sourceReceiptsUsed,
    changes: [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .filter(key => !equal(slot(before, key), slot(after, key)))
      .map(key => ({ key, after: slot(after, key) })) });
}

export function readCheckpoint(value: unknown, beforeVersion: number): PillarCheckpoint {
  const parsed = checkpointSchema.safeParse(value);
  if (!parsed.success || parsed.data.afterVersion !== beforeVersion + 1 ||
      new Set(parsed.data.changes.map(c => c.key)).size !== parsed.data.changes.length) {
    throw new Error("RESTORE_CHECKPOINT_UNAVAILABLE: archive sans état appliqué vérifiable ; aucune restauration devinée.");
  }
  return parsed.data;
}

function indexedSources(value: unknown): Map<string, unknown> | null {
  if (!Array.isArray(value)) return null;
  const pairs = value.map(s => record(s) && typeof s.sourceId === "string" ? [s.sourceId, s] as const : null);
  if (pairs.some(p => !p)) return null;
  const result = new Map(pairs as Array<readonly [string, unknown]>);
  return result.size === value.length ? result : null;
}

function undoSources(before: unknown, applied: unknown, current: unknown, later: PillarCheckpoint[]) {
  if (isDeepStrictEqual(before, applied)) return current;
  // The first attachment may start at SQL NULL. It is not a legacy receipt.
  const b = indexedSources(before ?? []), a = indexedSources(applied ?? []), c = indexedSources(current ?? []);
  if (!b || !a || !c) return undo({ present: true, value: before }, { present: true, value: applied }, { present: true, value: current }, "sources").value;
  const result = new Map(c);
  for (const id of new Set([...b.keys(), ...a.keys()])) {
    const get = (m: Map<string, unknown>): Slot => m.has(id) ? { present: true, value: m.get(id) } : absent;
    if (equal(get(b), get(a))) continue;
    const usedLater = later.some(cp => cp.sourceReceiptsUsed.some(r => r.sourceId === id));
    if (usedLater && a.has(id)) {
      if (b.has(id)) throw new Error(`RESTORE_SOURCE_IN_USE: la version de ${id} est encore utilisée par une décision ultérieure.`);
      continue; // Retain the context of the independent later decision.
    }
    const restored = undo(get(b), get(a), get(c), `sources.${id}`);
    if (restored.present) result.set(id, restored.value); else result.delete(id);
  }
  return !result.size && before === null ? null : [...result.values()];
}

export function planCompensation(args: {
  beforeContent: unknown; checkpoint: PillarCheckpoint; currentContent: unknown;
  currentMetadata: PillarMetadata; currentVersion: number; later: PillarCheckpoint[];
}): { content: Record<string, unknown>; metadata: PillarMetadata } {
  const { checkpoint: cp, currentMetadata, currentVersion, later } = args;
  if (!record(args.beforeContent) || !record(args.currentContent) || currentVersion < cp.afterVersion) {
    throw new Error("RESTORE_CHECKPOINT_UNAVAILABLE: état de pilier incompatible avec cette archive.");
  }
  const content = structuredClone(args.currentContent);
  for (const change of cp.changes) {
    put(content, change.key, undo(slot(args.beforeContent, change.key), change.after,
      slot(args.currentContent, change.key), `content.${change.key}`));
  }
  const latest = currentVersion === cp.afterVersion;
  const metadata = structuredClone(currentMetadata);
  // SQL NULL means no certainty registry; a later independent entry is still a leaf.
  const certaintySlot = (value: unknown): Slot => value === null ? absent : { present: true, value };
  const certainty = undo(certaintySlot(cp.beforeMetadata.fieldCertainty), certaintySlot(cp.afterMetadata.fieldCertainty),
    certaintySlot(currentMetadata.fieldCertainty), "fieldCertainty");
  metadata.fieldCertainty = certainty.present ? certainty.value as PillarMetadata["fieldCertainty"] : null;
  metadata.sources = undoSources(cp.beforeMetadata.sources, cp.afterMetadata.sources, currentMetadata.sources, later) as PillarMetadata["sources"];
  if (latest) {
    for (const key of ["confidence", "validationStatus", "staleAt"] as const) {
      const restored = undo({ present: true, value: cp.beforeMetadata[key] }, { present: true, value: cp.afterMetadata[key] },
        { present: true, value: currentMetadata[key] }, key);
      Object.defineProperty(metadata, key, { value: restored.value, enumerable: true, writable: true, configurable: true });
    }
  }
  return { content, metadata: metadataSchema.parse(metadata) };
}
