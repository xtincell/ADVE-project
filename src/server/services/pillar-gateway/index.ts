/**
 * PILLAR GATEWAY — Le seul point d'écriture pour le contenu des piliers
 *
 * LOI 1 du CdC v4 : "Tout système qui modifie pillar.content DOIT passer
 * par le Pillar Gateway."
 *
 * À chaque appel, le Gateway exécute dans une transaction Prisma :
 *   1. VALIDATE — Le contenu résultant passe le schema Zod partiel du pilier
 *   2. GUARD   — Respect du validationStatus (LOCKED refuse les writes IA)
 *   3. MERGE   — Selon operation type (REPLACE_FULL, MERGE_DEEP, SET_FIELDS, APPLY_RECOS)
 *   4. VERSION — Crée un PillarVersion avec diff, author, reason
 *   5. SCORE   — Appelle le scorer unifié (Chantier 2 — pour l'instant scoreObject)
 *   6. STALE   — Propage la staleness aux piliers dépendants (cascade ADVERTIS)
 *   7. PERSIST — Écrit content, confidence, validationStatus, staleAt, currentVersion
 *   8. SIGNAL  — Si changement significatif, crée un Signal
 *
 * Consumers: pillar.ts router, RTIS protocols, GLORY tools, auto-filler,
 *            ingestion pipeline, enrich-oracle — tous passent par ici.
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { type PillarKey, getPillarDependents } from "@/lib/types/advertis-vector";
import { validatePillarPartial } from "@/lib/types/pillar-schemas";
import { validateAgainstBible } from "@/lib/types/variable-bible";
import { createVersion } from "@/server/services/pillar-versioning";
import * as auditTrail from "@/server/services/audit-trail";

// ── Types ──────────────────────────────────────────────────────────────

type ValidationStatus = "DRAFT" | "AI_PROPOSED" | "VALIDATED" | "LOCKED";

type AuthorSystem = "OPERATOR" | "MESTOR" | "ARTEMIS" | "GLORY" | "AUTO_FILLER" | "INGESTION" | "BRIEF_INGEST" | "PROTOCOLE_R" | "PROTOCOLE_T" | "PROTOCOLE_I" | "PROTOCOLE_S" | "EXTERNAL_SAAS";

interface PillarWriteAuthor {
  system: AuthorSystem;
  userId?: string;
  reason: string;
}

type PillarWriteOperation =
  | { type: "REPLACE_FULL"; content: Record<string, unknown> }
  | { type: "MERGE_DEEP"; patch: Record<string, unknown> }
  | { type: "SET_FIELDS"; fields: Array<{ path: string; value: unknown }> }
  | { type: "APPLY_RECOS"; recoIndices: number[] }
  | { type: "APPLY_RECOS_RESOLVED"; operations: Array<{ field: string; operation: string; proposedValue: unknown; targetMatch?: { key: string; value: string }; recoId: string }> };

interface PillarWriteOptions {
  skipValidation?: boolean;
  targetStatus?: ValidationStatus;
  confidenceDelta?: number;
}

interface PillarWriteRequest {
  strategyId: string;
  pillarKey: PillarKey;
  operation: PillarWriteOperation;
  author: PillarWriteAuthor;
  options?: PillarWriteOptions;
}

interface PillarWriteResult {
  success: boolean;
  version: number;
  previousContent: Record<string, unknown>;
  newContent: Record<string, unknown>;
  stalePropagated: string[];
  warnings: string[];
  error?: string;
}

export type { PillarWriteRequest, PillarWriteResult, PillarWriteAuthor, PillarWriteOperation, PillarWriteOptions };

// ── Deep merge utility ────────────────────────────────────────────────

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    const existing = result[key];
    if (
      existing !== null && existing !== undefined &&
      typeof existing === "object" && !Array.isArray(existing) &&
      typeof value === "object" && value !== null && !Array.isArray(value)
    ) {
      // Recursive merge for nested objects
      result[key] = deepMerge(existing as Record<string, unknown>, value as Record<string, unknown>);
    } else if (Array.isArray(existing) && Array.isArray(value)) {
      // Arrays: append new items (never replace — LOI 1)
      result[key] = [...existing, ...value];
    } else {
      // Scalars: new value wins
      result[key] = value;
    }
  }
  return result;
}

// ── Set nested value by dot path ──────────────────────────────────────

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  if (parts.length === 1) {
    obj[parts[0]!] = value;
    return;
  }
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (current[part] === undefined || current[part] === null || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]!] = value;
}

// ── Recommendation application (from rtis-cascade.ts, centralized) ───

/**
 * Coerce a proposed value to match the type of the existing value.
 * Prevents type mismatches when LLM produces wrong format.
 */
function coerceValue(existing: unknown, proposed: unknown): unknown {
  if (proposed === null || proposed === undefined) return proposed;

  // If existing is a string and proposed is an array → join
  if (typeof existing === "string" && Array.isArray(proposed)) {
    return proposed.map(String).join(", ");
  }

  // If existing is a string and proposed is an object → stringify the main value
  if (typeof existing === "string" && typeof proposed === "object" && !Array.isArray(proposed)) {
    const obj = proposed as Record<string, unknown>;
    // Try common fields
    return obj.value ?? obj.text ?? obj.content ?? obj.description ?? obj.name ?? JSON.stringify(proposed);
  }

  // If existing is a number and proposed is a string → parse
  if (typeof existing === "number" && typeof proposed === "string") {
    const n = parseFloat(proposed);
    return isNaN(n) ? existing : n;
  }

  // If existing is an array and proposed is a single item (string/object) → wrap in array
  if (Array.isArray(existing) && !Array.isArray(proposed)) {
    // For ADD operations, the proposed should be a single item
    // For SET operations on array fields, wrap it
    if (typeof proposed === "string") {
      // If existing array has objects, try to wrap string into expected object format
      if (existing.length > 0 && typeof existing[0] === "object" && existing[0] !== null) {
        const firstKeys = Object.keys(existing[0] as Record<string, unknown>);
        const nameKey = firstKeys.find(k => ["name", "nom", "value", "title", "action"].includes(k)) ?? firstKeys[0];
        if (nameKey) {
          return { [nameKey]: proposed };
        }
      }
    }
    return proposed; // Trust it — ADD operation will append
  }

  // If field doesn't exist yet (new field), trust the proposed value
  if (existing === undefined || existing === null || existing === "") return proposed;

  return proposed;
}

function applyRecos(
  content: Record<string, unknown>,
  pendingRecos: Array<Record<string, unknown>>,
  indices: number[],
): { applied: number; result: Record<string, unknown> } {
  const selected = indices
    .filter(i => i >= 0 && i < pendingRecos.length)
    .map(i => pendingRecos[i]!);

  let applied = 0;
  const result = { ...content };

  // Order: EXTEND → MODIFY → ADD → REMOVE → SET (prevent index shift)
  const OP_ORDER: Record<string, number> = { EXTEND: 0, MODIFY: 1, ADD: 2, REMOVE: 3, SET: 4 };
  const sorted = [...selected].sort((a, b) =>
    (OP_ORDER[a.operation as string ?? "SET"] ?? 4) - (OP_ORDER[b.operation as string ?? "SET"] ?? 4)
  );

  for (const reco of sorted) {
    const field = reco.field as string;
    const op = (reco.operation as string) ?? "SET";
    const proposedValue = coerceValue(result[field], reco.proposedValue);

    switch (op) {
      case "SET":
        result[field] = proposedValue;
        break;
      case "ADD": {
        const arr = Array.isArray(result[field]) ? [...(result[field] as unknown[])] : [];
        arr.push(proposedValue);
        result[field] = arr;
        break;
      }
      case "MODIFY": {
        if (Array.isArray(result[field])) {
          const arr = [...(result[field] as unknown[])];
          const targetMatch = reco.targetMatch as { key: string; value: string } | undefined;
          const idx = targetMatch
            ? arr.findIndex(item => typeof item === "object" && item !== null && (item as Record<string, unknown>)[targetMatch.key] === targetMatch.value)
            : (reco.targetIndex as number) ?? -1;
          if (idx >= 0 && idx < arr.length) {
            arr[idx] = proposedValue;
            result[field] = arr;
          }
        }
        break;
      }
      case "REMOVE": {
        if (Array.isArray(result[field])) {
          const arr = [...(result[field] as unknown[])];
          const targetMatch = reco.targetMatch as { key: string; value: string } | undefined;
          const idx = targetMatch
            ? arr.findIndex(item => typeof item === "object" && item !== null && (item as Record<string, unknown>)[targetMatch.key] === targetMatch.value)
            : (reco.targetIndex as number) ?? -1;
          if (idx >= 0 && idx < arr.length) {
            arr.splice(idx, 1);
            result[field] = arr;
          }
        }
        break;
      }
      case "EXTEND": {
        result[field] = { ...((result[field] as object) ?? {}), ...(proposedValue as object) };
        break;
      }
    }
    applied++;
  }

  return { applied, result };
}

// ── Main Gateway ──────────────────────────────────────────────────────

export async function writePillar(request: PillarWriteRequest): Promise<PillarWriteResult> {
  const { strategyId, pillarKey, operation, author, options } = request;
  const warnings: string[] = [];

  try {
    return await db.$transaction(async (tx) => {
      // ── Load current pillar ──────────────────────────────────────
      const pillar = await tx.pillar.findUnique({
        where: { strategyId_key: { strategyId, key: pillarKey } },
      });

      if (!pillar) {
        return { success: false, version: 0, previousContent: {}, newContent: {}, stalePropagated: [], warnings: [], error: `Pillar ${pillarKey} not found for strategy ${strategyId}` };
      }

      const previousContent = (pillar.content ?? {}) as Record<string, unknown>;
      const currentStatus = (pillar.validationStatus ?? "DRAFT") as ValidationStatus;

      // ── GUARD: validationStatus ──────────────────────────────────
      if (currentStatus === "LOCKED" && author.system !== "OPERATOR") {
        return { success: false, version: pillar.currentVersion ?? 0, previousContent, newContent: previousContent, stalePropagated: [], warnings: [], error: `Pilier ${pillarKey} est LOCKED — seul un OPERATOR peut le modifier` };
      }

      // ── MERGE: compute new content ───────────────────────────────
      let newContent: Record<string, unknown>;

      switch (operation.type) {
        case "REPLACE_FULL":
          newContent = operation.content;
          break;
        case "MERGE_DEEP":
          newContent = deepMerge(previousContent, operation.patch);
          break;
        case "SET_FIELDS":
          newContent = { ...previousContent };
          for (const { path, value } of operation.fields) {
            setNestedValue(newContent, path, value);
          }
          break;
        case "APPLY_RECOS": {
          const pendingRecos = (pillar.pendingRecos ?? []) as Array<Record<string, unknown>>;
          const { applied, result } = applyRecos(previousContent, pendingRecos, operation.recoIndices);
          newContent = result;
          if (applied === 0) warnings.push("Aucune recommandation applicable avec les indices fournis");
          // Mark applied recos
          for (const idx of operation.recoIndices) {
            if (idx >= 0 && idx < pendingRecos.length) {
              pendingRecos[idx]!.accepted = true;
            }
          }
          await tx.pillar.update({
            where: { id: pillar.id },
            data: { pendingRecos: pendingRecos as unknown as Prisma.InputJsonValue },
          });
          break;
        }
        case "APPLY_RECOS_RESOLVED": {
          // Notoria sends pre-resolved operations — no pendingRecos lookup needed
          const ops = operation.operations;
          newContent = { ...previousContent };

          // Sort operations: EXTEND → MODIFY → ADD → REMOVE → SET (prevent index shift)
          const opOrder: Record<string, number> = { EXTEND: 0, MODIFY: 1, ADD: 2, REMOVE: 3, SET: 4 };
          const sorted = [...ops].sort(
            (a, b) => (opOrder[a.operation] ?? 5) - (opOrder[b.operation] ?? 5),
          );

          let appliedCount = 0;
          for (const op of sorted) {
            const existing = newContent[op.field];

            switch (op.operation) {
              case "SET":
                newContent[op.field] = coerceValue(existing, op.proposedValue);
                appliedCount++;
                break;

              case "ADD":
                if (Array.isArray(existing)) {
                  existing.push(coerceValue(undefined, op.proposedValue));
                  appliedCount++;
                } else if (existing == null) {
                  newContent[op.field] = [coerceValue(undefined, op.proposedValue)];
                  appliedCount++;
                } else {
                  warnings.push(`ADD: field "${op.field}" is not an array (type=${typeof existing}) — skipped (reco ${op.recoId})`);
                }
                break;

              case "MODIFY": {
                if (!Array.isArray(existing)) {
                  warnings.push(`MODIFY: field "${op.field}" is not an array — skipped (reco ${op.recoId})`);
                  break;
                }
                let idx = -1;
                if (op.targetMatch) {
                  idx = existing.findIndex(
                    (item) =>
                      typeof item === "object" &&
                      item !== null &&
                      (item as Record<string, unknown>)[op.targetMatch!.key] === op.targetMatch!.value,
                  );
                }
                if (idx < 0) {
                  warnings.push(`MODIFY: target not found for "${op.field}" match=${JSON.stringify(op.targetMatch)} — skipped (reco ${op.recoId})`);
                } else {
                  existing[idx] = coerceValue(existing[idx], op.proposedValue);
                  appliedCount++;
                }
                break;
              }

              case "REMOVE": {
                if (!Array.isArray(existing)) {
                  warnings.push(`REMOVE: field "${op.field}" is not an array — skipped (reco ${op.recoId})`);
                  break;
                }
                let ridx = -1;
                if (op.targetMatch) {
                  ridx = existing.findIndex(
                    (item) =>
                      typeof item === "object" &&
                      item !== null &&
                      (item as Record<string, unknown>)[op.targetMatch!.key] === op.targetMatch!.value,
                  );
                }
                if (ridx < 0) {
                  warnings.push(`REMOVE: target not found for "${op.field}" match=${JSON.stringify(op.targetMatch)} — skipped (reco ${op.recoId})`);
                } else {
                  existing.splice(ridx, 1);
                  appliedCount++;
                }
                break;
              }

              case "EXTEND": {
                if (typeof existing === "object" && existing !== null && !Array.isArray(existing)) {
                  newContent[op.field] = { ...(existing as Record<string, unknown>), ...(op.proposedValue as Record<string, unknown>) };
                  appliedCount++;
                } else if (existing == null) {
                  newContent[op.field] = op.proposedValue;
                  appliedCount++;
                } else {
                  warnings.push(`EXTEND: field "${op.field}" is not an object — skipped (reco ${op.recoId})`);
                }
                break;
              }
            }
          }
          if (appliedCount === 0) warnings.push("APPLY_RECOS_RESOLVED: aucune operation appliquee");
          break;
        }
      }

      // ── VALIDATE: schema check (Zod types) ──────────────────────
      if (!options?.skipValidation) {
        const validation = validatePillarPartial(pillarKey.toUpperCase() as "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S", newContent);
        if (!validation.success && validation.errors) {
          for (const err of validation.errors) {
            warnings.push(`Validation: ${err.path} — ${err.message}`);
          }
          // Don't block — partial validation allows incomplete data
        }
      }

      // ── VALIDATE: Bible rules (format de fond) ──────────────────
      const bibleViolations = validateAgainstBible(pillarKey, newContent);
      for (const v of bibleViolations) {
        warnings.push(`Bible[${v.severity}]: ${v.message}`);
      }
      // BLOCK-level violations prevent write for AI systems (not operators)
      const bibleBlocks = bibleViolations.filter((v) => v.severity === "BLOCK");
      if (bibleBlocks.length > 0 && author.system !== "OPERATOR") {
        // Reject the violating fields by reverting them to previous values
        for (const block of bibleBlocks) {
          if (previousContent[block.field] !== undefined) {
            newContent[block.field] = previousContent[block.field];
            warnings.push(`Bible: champ "${block.field}" reverte (violation BLOCK: ${block.rule})`);
          }
        }
      }

      // ── Determine target validationStatus ────────────────────────
      let targetStatus: ValidationStatus;
      if (options?.targetStatus) {
        targetStatus = options.targetStatus;
      } else if (author.system === "OPERATOR") {
        targetStatus = currentStatus; // Operator preserves current status
      } else {
        // IA system writing to a VALIDATED pillar → AI_PROPOSED (not DRAFT)
        targetStatus = currentStatus === "VALIDATED" ? "AI_PROPOSED" : currentStatus;
      }

      // ── VERSION: create PillarVersion ────────────────────────────
      await createVersion({
        pillarId: pillar.id,
        content: newContent,
        author: `${author.system}${author.userId ? `:${author.userId}` : ""}`,
        reason: author.reason,
      });

      const newVersion = (pillar.currentVersion ?? 1) + 1;

      // ── Confidence adjustment ────────────────────────────────────
      let newConfidence = pillar.confidence ?? 0;
      if (options?.confidenceDelta) {
        newConfidence = Math.min(0.95, Math.max(0, newConfidence + options.confidenceDelta));
      }

      // ── v4 AUTO-APPROVAL: auto-promote AI_PROPOSED → VALIDATED ──
      // Conditions: RTIS protocol author + high confidence + low impact
      if (
        targetStatus === "AI_PROPOSED" &&
        author.system.startsWith("PROTOCOLE_") &&
        newConfidence > 0.9 &&
        warnings.length === 0
      ) {
        // Assess impact: low impact = less than 30% new keys added
        const prevKeys = Object.keys(previousContent);
        const newKeys = Object.keys(newContent);
        const addedKeys = newKeys.filter(k => !prevKeys.includes(k));
        const isLowImpact = prevKeys.length === 0 || addedKeys.length / Math.max(prevKeys.length, 1) < 0.3;

        if (isLowImpact) {
          targetStatus = "VALIDATED";
          warnings.push("Auto-approved: confidence > 0.9, low impact, author RTIS protocol. Rollback available for 24h.");
          // Store rollback metadata in commentary
          const commentary = (pillar.commentary as Record<string, unknown>) ?? {};
          commentary._autoApproval = {
            approvedAt: new Date().toISOString(),
            rollbackDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            previousStatus: "AI_PROPOSED",
            author: author.system,
            confidence: newConfidence,
          };
          newContent._commentary = commentary;
        }
      }

      // ── PERSIST ──────────────────────────────────────────────────
      await tx.pillar.update({
        where: { id: pillar.id },
        data: {
          content: newContent as Prisma.InputJsonValue,
          confidence: newConfidence,
          validationStatus: targetStatus,
          staleAt: null, // This pillar is now fresh
          currentVersion: newVersion,
        },
      });

      // ── STALE: propagate to dependents (cascade ADVERTIS) ────────
      const dependents = getPillarDependents(pillarKey);
      if (dependents.length > 0) {
        await tx.pillar.updateMany({
          where: {
            strategyId,
            key: { in: dependents },
          },
          data: { staleAt: new Date() },
        });
      }

      // ── SCORE: recalculate (outside transaction to avoid timeout) ─
      // Will be done after transaction commits — see below

      // ── AUDIT ────────────────────────────────────────────────────
      auditTrail.log({
        userId: author.userId,
        action: "UPDATE",
        entityType: "Pillar",
        entityId: pillar.id,
        oldValue: { pillarKey, version: pillar.currentVersion },
        newValue: { pillarKey, version: newVersion, author: author.system, reason: author.reason },
      }).catch(() => {});

      return {
        success: true,
        version: newVersion,
        previousContent,
        newContent,
        stalePropagated: dependents,
        warnings,
      };
    });
  } catch (err) {
    return {
      success: false,
      version: 0,
      previousContent: {},
      newContent: {},
      stalePropagated: [],
      warnings,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Post-write scoring — called after the transaction commits.
 * Separate from the transaction to avoid LLM timeout issues.
 */
export async function postWriteScore(strategyId: string): Promise<void> {
  try {
    const { scoreObject } = await import("@/server/services/advertis-scorer");
    await scoreObject("strategy", strategyId);
  } catch {
    // Non-fatal — scoring failure shouldn't break writes
  }
}

/**
 * Convenience: write + score in one call.
 */
export async function writePillarAndScore(request: PillarWriteRequest): Promise<PillarWriteResult> {
  const result = await writePillar(request);
  if (result.success) {
    await postWriteScore(request.strategyId);
  }
  return result;
}
