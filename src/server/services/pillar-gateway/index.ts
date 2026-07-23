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
 *            ingestion pipeline, quick-intake seed (C1), infer-needs-human (C2)
 *            — tous passent par ici (keystone C5, ADR posé PR #258).
 */

import { db } from "@/lib/db";
import { setNestedValue, tokenizePillarPath, assertSafePillarPath } from "@/lib/pillar-path";
import { coerceValue, applyResolvedRecoOps } from "./apply-resolved-ops";
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
  /**
   * G (ADR-0176) — IntentEmission courante (posée par governedProcedure via
   * `ctx.intentId`). Stampée sur la PillarVersion créée par cette écriture pour
   * permettre un ROLLBACK_PILLAR PRÉCIS (restaurer l'état d'avant CET intent).
   * Optionnel : les écritures non gouvernées / hors requête ne la portent pas.
   */
  intentId?: string;
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
  /**
   * ADR-0063 — When true, schema validation errors block the write instead of
   * being recorded as warnings. Opt-in to preserve back-compat with call sites
   * that intentionally accept partial data (operator drafts, ingestion).
   * RTIS protocols (PROTOCOLE_R/T/I/S) enable this so a malformed LLM payload
   * never silently corrupts the pillar content.
   */
  strictSchemaValidation?: boolean;
  /**
   * ADR-0175/audit adversarial — quand true, bloque UNIQUEMENT la corruption
   * STRUCTURELLE (SHAPE : un objet/tableau attendu là où un scalaire est fourni, qui
   * casse le rendu), en TOLÉRANT les divergences advisory DRAFT (TYPE/ENUM/LENGTH/
   * MISSING). Plus fin que `strictSchemaValidation` (qui bloque tout). Posé sur les
   * chemins d'ÉDITION utilisateur (CRUD item-level, amend) où une valeur libre peut
   * transformer `personas[0]` en scalaire → crash renderer. Le gate seed
   * `assertPillarConforms` ne couvrait PAS le runtime.
   */
  shapeGate?: boolean;
  /**
   * Provenance par champ de l'écriture entrante (path → HUMAN/SOURCE/INFERRED).
   * Le garde de provenance (HUMAIN > SOURCE > INFÉRÉ) l'utilise pour refuser
   * qu'un inféré écrase un humain/source, et pour signaler les conflits
   * source↔humain en CHALLENGE. À défaut, la provenance est déduite de
   * `author.system`. Cf. `provenance-guard.ts` + `domain/field-provenance.ts`.
   */
  fieldProvenance?: Record<string, import("@/domain/field-provenance").FieldProvenance>;
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
  /** Champs où une source contredit une valeur humaine — à remonter en reco CHALLENGE. */
  challenged?: string[];
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

// ── Résolution de chemin pilier (déplacée dans @/lib/pillar-path) ──────
// La mécanique de dot-path profonde (tokenizer + garde proto + set) vit
// désormais dans la feuille pure `@/lib/pillar-path`, partagée par l'assessor
// et l'auto-filler (qui divergeaient en object-only, incapables de lire/écrire
// une cellule de matrice). Re-exportée ici pour la compat des imports
// historiques `@/server/services/pillar-gateway` (tests + pillar.ts router).
export { setNestedValue, tokenizePillarPath, assertSafePillarPath };

// ── Recommendation application (from rtis-cascade.ts, centralized) ───
// `coerceValue` + `applyResolvedRecoOps` vivent dans `./apply-resolved-ops`
// (module PUR, testable sans DB, profondeur-conscient). Cf. import en tête.

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

  // Auto-create pillar row BEFORE the transaction so that createVersion (which
  // uses the global `db` client, not `tx`) can find the row via its id.
  // upsert is race-safe: concurrent writes for the same key both succeed.
  await db.pillar.upsert({
    where: { strategyId_key: { strategyId, key: pillarKey } },
    create: { strategyId, key: pillarKey, content: {}, confidence: 0, currentVersion: 1 },
    update: {},
  });

  try {
    const result = await db.$transaction(async (tx) => {
      // ── Load current pillar ──────────────────────────────────────
      const pillar = await tx.pillar.findUnique({
        where: { strategyId_key: { strategyId, key: pillarKey } },
      });

      if (!pillar) {
        // Should never happen after the upsert above — defensive guard.
        return { success: false, version: 0, previousContent: {}, newContent: {}, stalePropagated: [], warnings: [], error: `Pillar ${pillarKey} not found for strategy ${strategyId} (post-upsert)` };
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
          // Notoria sends pre-resolved operations — no pendingRecos lookup needed.
          // Profondeur-conscient (`apply-resolved-ops`) : une reco ciblant une
          // feuille imbriquée (`prophecy.pioneers`) s'écrit à la bonne feuille au
          // lieu de créer une clé littérale « prophecy.pioneers » no-op.
          const res = applyResolvedRecoOps(previousContent, operation.operations);
          newContent = res.content;
          for (const w of res.warnings) warnings.push(w);
          if (res.appliedCount === 0) warnings.push("APPLY_RECOS_RESOLVED: aucune operation appliquee");
          break;
        }
      }

      // ── VALIDATE: schema check (Zod types) ──────────────────────
      // ADR-0063 — strictSchemaValidation flips warnings into a hard block so
      // RTIS protocols cannot persist malformed LLM output. Default behaviour
      // (warnings-only) is preserved for operator drafts, ingestion, and
      // legacy call sites that knowingly accept partial data.
      if (!options?.skipValidation) {
        // PillarKey from advertis-vector and from pillar-schemas are the same set
        // but typed independently; cast is safe here.
        const validation = validatePillarPartial(pillarKey.toUpperCase() as Parameters<typeof validatePillarPartial>[0], newContent);
        if (!validation.success && validation.errors) {
          for (const err of validation.errors) {
            warnings.push(`Validation: ${err.path} — ${err.message}`);
          }
          if (options?.strictSchemaValidation) {
            const summary = validation.errors.slice(0, 5).map((e) => `${e.path}: ${e.message}`).join(" | ");
            const more = validation.errors.length > 5 ? ` (+${validation.errors.length - 5} more)` : "";
            return {
              success: false,
              version: pillar.currentVersion ?? 0,
              previousContent,
              newContent: previousContent,
              stalePropagated: [],
              warnings,
              error: `Strict schema validation failed (${validation.errors.length} issues): ${summary}${more}`,
            };
          }
        }
      }

      // ── VALIDATE: SHAPE gate (corruption structurelle uniquement) ──────────
      // Bloque un scalaire-là-où-conteneur (casse le rendu) sans toucher aux advisories
      // DRAFT. Couvre le runtime (CRUD/amend) que le gate seed ne voyait pas.
      if (options?.shapeGate) {
        const { classifyPillarConformance } = await import("@/lib/types/pillar-conformance");
        const conf = classifyPillarConformance(
          pillarKey.toUpperCase() as Parameters<typeof classifyPillarConformance>[0],
          newContent,
        );
        if (!conf.ok) {
          const summary = conf.shape.slice(0, 5).map((e) => `${e.path}: ${e.message}`).join(" | ");
          const more = conf.shape.length > 5 ? ` (+${conf.shape.length - 5})` : "";
          return {
            success: false,
            version: pillar.currentVersion ?? 0,
            previousContent,
            newContent: previousContent,
            stalePropagated: [],
            warnings: [...warnings, `SHAPE gate: ${conf.shape.length} corruption(s) structurelle(s)`],
            error: `Édition refusée — corruption structurelle (${conf.shape.length}) : ${summary}${more}`,
          };
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

      // ── PROVENANCE GUARD: HUMAIN > SOURCE > INFÉRÉ (au champ) ─────
      // Inerte tant qu'aucune provenance n'est tracée (champs UNKNOWN → ALLOW).
      // Wrappé : un bug du garde ne doit jamais bloquer une écriture légitime.
      let challenged: string[] = [];
      try {
        const { applyProvenanceGuard, provenanceFromAuthorSystem } = await import("./provenance-guard");
        const existingProvenance = (previousContent._fieldProvenance ?? null) as Record<string, unknown> | null;
        const defaultProv = provenanceFromAuthorSystem(author.system);
        const explicit = options?.fieldProvenance;
        const guard = applyProvenanceGuard({
          previousContent,
          newContent,
          existingProvenance,
          incomingFor: (path) => explicit?.[path] ?? defaultProv,
        });
        // Reverte en place les champs DENY/CHALLENGE sur le contenu candidat.
        for (const key of Object.keys(newContent)) {
          if (key.startsWith("_")) continue;
          if (!(key in guard.content)) delete newContent[key];
          else newContent[key] = guard.content[key];
        }
        newContent._fieldProvenance = guard.provenance;
        challenged = guard.challenged;
        for (const w of guard.warnings) warnings.push(w);
      } catch (err) {
        warnings.push(`Provenance guard skipped: ${err instanceof Error ? err.message : String(err)}`);
      }

      // ── VERSION: create PillarVersion ────────────────────────────
      // La PillarVersion capture le contenu PRÉ-écriture, stampé de l'intent
      // courant → ROLLBACK_PILLAR restaure EXACTEMENT cet état (G, ADR-0176).
      await createVersion({
        pillarId: pillar.id,
        content: newContent,
        author: `${author.system}${author.userId ? `:${author.userId}` : ""}`,
        reason: author.reason,
        intentId: author.intentId,
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

      // ── PERSIST (verrou optimiste — round-12, corrigé round-13a) ──
      // Conditionné à la version LUE (`pillar.currentVersion`, l.336). Sans ce
      // prédicat, deux écritures concurrentes du MÊME pilier (fenêtre findUnique
      // → persist, READ COMMITTED) bumpaient toutes deux N→N+1 en `where:{id}` →
      // perte d'édition silencieuse sur le FONDEMENT ADVE. count≠1 → throw =
      // rollback de toute la tx (cascade + audit inclus), aucune écriture partielle.
      // Round-13a : ce persist est le SEUL à bumper currentVersion. createVersion
      // (l.596, client `db` global HORS de cette tx) le bumpait AUSSI → committait
      // N+1 sur une autre connexion avant ce persist → le prédicat `= N` matchait
      // 0 ligne → throw systématique sur un vrai Postgres. Bump retiré de
      // createVersion : le compteur avance ici et le verrou optimiste est réel.
      const persisted = await tx.pillar.updateMany({
        where: { id: pillar.id, currentVersion: pillar.currentVersion },
        data: {
          content: newContent as Prisma.InputJsonValue,
          confidence: newConfidence,
          validationStatus: targetStatus,
          staleAt: null, // This pillar is now fresh
          currentVersion: newVersion,
        },
      });
      if (persisted.count !== 1) {
        throw new Error(
          `PILLAR_VERSION_CONFLICT: le pilier ${pillarKey} a été modifié en parallèle ` +
            `(version ${pillar.currentVersion ?? "?"} écrasée) — écriture abandonnée, recharger et réappliquer.`,
        );
      }

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
        challenged,
      };
    }, {
      // Supabase EU = latence réseau élevée (cf. DB_POOL_CONN_MS=30000). Le défaut
      // Prisma de 5s pour les transactions interactives expirait sur les écritures
      // RTIS lourdes (gros blob + versioning + staleness propagation) → écriture
      // rejetée → (avant le fix savePillar) perdue en silence → catalogue I perdu,
      // base d'actions vide. 30s de marge ; le scoring reste hors transaction.
      timeout: 30_000,
      maxWait: 15_000,
    });

    // ── STALE: cascade Oracle post-commit (audit 2026-07-13, T5) ─────
    // Un pilier a muté → les OracleSection dérivées ne reflètent plus l'état
    // courant. Vivait dans writePillarAndScore seulement : les callers bare
    // légitimes (intake C1, infer C2, ai-filler) n'invalidaient jamais
    // l'Oracle. Le chemin commun est ici. Idempotent (COMPLETE→STALE
    // uniquement — no-op à l'intake où aucune section n'existe) et
    // conservateur : sur-invalider est sûr, sous-invalider était le bug.
    if (result.success) {
      try {
        const { markAllSectionsStale } = await import("@/server/services/oracle-section");
        await markAllSectionsStale(strategyId);
      } catch {
        // Non-fatal — la staleness Oracle ne doit jamais casser l'écriture pilier.
      }
    }
    return result;
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
    // D-2 — reconcile Pillar.completionLevel cache against the canonical
    // pillar-readiness verdict on every write. Any caller that mutates
    // pillar content goes through this function (LOI 1), so this single
    // point of recompute keeps the cache in sync with the content.
    await reconcileCompletionLevelCache(request.strategyId, request.pillarKey);
    // Cascade staleness Oracle : désormais dans writePillar (chemin commun à
    // TOUS les callers, bare inclus — audit 2026-07-13 T5), plus ici.
    // D-6 — emit a pillar.written event so the phase resolver re-evaluates.
    const { eventBus } = await import("@/server/governance/event-bus");
    eventBus.publish("pillar.written", {
      strategyId: request.strategyId,
      pillarKey: request.pillarKey,
      author:
        typeof request.author === "object" && request.author && "system" in request.author
          ? String((request.author as { system: unknown }).system)
          : "unknown",
    });
  }
  return result;
}

/**
 * Recompute and persist the canonical `completionLevel` cache for a
 * single pillar. Idempotent. Called from `writePillarAndScore`. The
 * cache is a function of (stage, validationStatus) — never invented
 * elsewhere.
 */
export async function reconcileCompletionLevelCache(
  strategyId: string,
  pillarKey: string,
): Promise<void> {
  const { db } = await import("@/lib/db");
  const { evaluatePillarReadiness } = await import("@/server/governance/pillar-readiness");
  const { toCanonical } = await import("@/domain");

  const row = await db.pillar.findUnique({
    where: { strategyId_key: { strategyId, key: pillarKey.toLowerCase() } },
    select: {
      key: true,
      content: true,
      validationStatus: true,
      completionLevel: true,
      staleAt: true,
    },
  });
  if (!row) return;

  const readiness = evaluatePillarReadiness(
    {
      key: row.key,
      content: row.content,
      validationStatus: row.validationStatus,
      completionLevel: row.completionLevel,
      staleAt: row.staleAt,
    },
    toCanonical(pillarKey as Parameters<typeof toCanonical>[0]),
  );
  if (row.completionLevel === readiness.cacheLevel) return;
  await db.pillar.update({
    where: { strategyId_key: { strategyId, key: pillarKey.toLowerCase() } },
    data: { completionLevel: readiness.cacheLevel },
  });
}
