// ============================================================================
// MODULE M16 — Quick Intake Engine
// Score: 100/100 | Priority: P0 | Status: FUNCTIONAL
// Spec: §2.2.12 + §4.1 + §5.2 | Division: L'Oracle
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  start(input) → creates QuickIntake with shareToken, returns first questions
// [x] REQ-2  advance(token, responses) → merges answers, returns next pillar questions
// [x] REQ-3  complete(token) → scores all 8 pillars, classifies brand, creates temp Strategy
// [x] REQ-4  Score /200 with AdvertisVector (composite across 8 pillars)
// [x] REQ-5  Classification Zombie→Icône with severity-based diagnostics per pillar
// [x] REQ-6  Shareable link (shareToken) — no auth required
// [x] REQ-7  Auto-create Deal in CRM on completion (Quick Intake → Deal pipeline)
// [x] REQ-8  Knowledge capture on completion (KnowledgeEntry with sector/market data)
// [x] REQ-9  AI-guided adaptive questions (Mestor-powered, conversational tone via question-bank)
// [x] REQ-10 Business context → pillar weight modifiers (via scorer + getPillarWeightsForContext)
// [x] REQ-11 Radar 8 piliers visualization data in result payload (vector has all 8 scores)
// [x] REQ-12 CTA vers IMPULSION™ (handled in M35 result page)
// [x] REQ-13 Notification to fixer on intake completion (AuditLog + knowledge event)
// [x] REQ-14 convert(intakeId, userId) → creates full Strategy from intake
// [x] REQ-15 AI-extracted structured pillar content from raw Q&A (more atoms for scorer)
//
// EXPORTS: start, advance, complete
// FLOW: Landing → Questions (biz→A→D→V→E→R→T→I→S) → AI Extract → Score → Classification → CRM Deal
// ============================================================================

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { callLLM } from "@/server/services/llm-gateway";
import * as mestor from "@/server/services/mestor";
import { scoreObject } from "@/server/services/advertis-scorer";
import { normalizePillarForIntake } from "@/server/services/pillar-normalizer";
import { classifyBrand } from "@/lib/types/advertis-vector";

/**
 * Classify brand based on ADVE-only composite score (/100).
 * Thresholds scaled from the full /200 classification.
 */
function classifyIntakeBrand(score: number): string {
  if (score <= 40) return "ZOMBIE";
  if (score <= 50) return "FRAGILE";
  if (score <= 60) return "ORDINAIRE";
  if (score <= 80) return "FORTE";
  if (score <= 90) return "CULTE";
  return "ICONE";
}
import { getFormatInstructions } from "@/lib/types/variable-bible";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import { getAdaptiveQuestions, getBusinessContextQuestions } from "./question-bank";
import * as auditTrail from "@/server/services/audit-trail";
import type { BusinessContext, BusinessModelKey, BrandNatureKey, EconomicModelKey, PositioningArchetypeKey, SalesChannel, PremiumScope } from "@/lib/types/business-context";
import { POSITIONING_ARCHETYPES, BRAND_NATURES } from "@/lib/types/business-context";

export type IntakeMethodType = "GUIDED" | "IMPORT" | "LONG" | "SHORT" | "INGEST" | "INGEST_PLUS";

export interface QuickIntakeStartInput {
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  companyName: string;
  sector?: string;
  country?: string;
  businessModel?: string;
  economicModel?: string;
  positioning?: string;
  source?: string;
  method?: IntakeMethodType;
}

export interface QuickIntakeAdvanceInput {
  token: string;
  responses: Record<string, unknown>;
}

/**
 * Canonical declared business facts captured at intake-start. Used to seal
 * pillar fields and constrain LLM extraction so the analysis cannot drift
 * into a different sector/business-model than the one the founder declared.
 */
interface CanonicalIntakeContext {
  companyName: string;
  sector: string | null;
  country: string | null;
  businessModel: string | null;
  economicModel: string | null;
  positioning: string | null;
}

/**
 * Overlays the intake's declared canonical fields onto a pillar content
 * object, replacing any LLM-generated value that contradicts the declaration.
 *
 * Why: the LLM extraction step is prone to drift when free-form responses are
 * sparse (e.g. user mentions "beauté" → LLM hallucinates a cosmetics catalog
 * for a brand actually declared as `sector=IMMOBILIER`). Canonical fields
 * are the founder's ground truth — they are not LLM territory.
 */
function sealCanonicalPillarFields(
  pillar: "a" | "d" | "v" | "e",
  content: Record<string, unknown>,
  ctx: CanonicalIntakeContext,
): Record<string, unknown> {
  const sealed: Record<string, unknown> = { ...content };
  if (pillar === "a") {
    if (!sealed.nomMarque) sealed.nomMarque = ctx.companyName;
    if (ctx.sector) sealed.secteur = ctx.sector;
    if (ctx.country) sealed.pays = ctx.country;
  }
  if (pillar === "v") {
    if (ctx.businessModel) sealed.businessModel = ctx.businessModel;
    if (ctx.positioning) sealed.positioningArchetype = ctx.positioning;
    if (ctx.economicModel) {
      sealed.economicModels = ctx.economicModel
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  if (pillar === "d" && ctx.positioning) {
    const archetype = POSITIONING_ARCHETYPES[ctx.positioning as PositioningArchetypeKey];
    // Only seed the textual `positionnement` field if the LLM did not already
    // capture a richer narrative — sealing must not overwrite real founder voice.
    if (!sealed.positionnement && archetype?.label) {
      sealed.positionnement = `Positionnement ${archetype.label} dans le secteur ${ctx.sector ?? "déclaré"}`;
    }
  }
  return sealed;
}

export async function start(input: QuickIntakeStartInput) {
  const intake = await db.quickIntake.create({
    data: {
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      companyName: input.companyName,
      sector: input.sector,
      country: input.country,
      businessModel: input.businessModel,
      economicModel: input.economicModel,
      positioning: input.positioning,
      source: input.source,
      method: input.method ?? "LONG",
      responses: {} as Prisma.InputJsonValue,
      status: "IN_PROGRESS",
    },
  });

  // Start with business context questions, then move to ADVE pillars
  const firstQuestions = getBusinessContextQuestions();

  return {
    token: intake.shareToken,
    questions: firstQuestions,
    currentPillar: "biz",
    progress: 0,
  };
}

/**
 * A response slice (e.g. for pillar "a") only counts as "answered" when it has
 * at least one *substantive* answer. An empty `{}`, an object whose values are
 * all empty strings, empty arrays, null, or whitespace — none of those count.
 *
 * Without this guard the form could ship `{ a: {} }` (whether by user clicking
 * "Suivant" without filling anything, by an auto-save firing on phase switch,
 * or by a defensive code path) and `advance()` would happily mark phase "a" as
 * done. That class of bug is exactly what produced
 * `responses = { a: {}, d: {}, v: {}, e: {}, biz: {} }` in production.
 */
function hasSubstantiveAnswer(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some((v) => hasSubstantiveAnswer(v));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((v) => hasSubstantiveAnswer(v));
  }
  return false;
}

/**
 * Reject silently-empty payloads at the boundary. The form is the canonical
 * gate, but we re-validate on the server so any other client (including
 * future automation) cannot bypass.
 */
class EmptyAdvanceError extends Error {
  constructor(public readonly phase: string) {
    super(
      `[quick-intake.advance] rejected: phase '${phase}' has no substantive answer. ` +
        `The form must collect at least one non-empty field before advancing.`,
    );
    this.name = "EmptyAdvanceError";
  }
}

export async function advance(input: QuickIntakeAdvanceInput) {
  const intake = await db.quickIntake.findUnique({
    where: { shareToken: input.token },
  });

  if (!intake) throw new Error("Intake not found");
  if (intake.status !== "IN_PROGRESS") throw new Error("Intake already completed");

  // Validate every phase slice in the incoming payload. Refusing here means
  // the DB never sees an empty `{ a: {} }` slice, which in turn means
  // `answeredSteps` (below) cannot mistakenly mark a pillar done.
  for (const [phase, slice] of Object.entries(input.responses)) {
    if (!hasSubstantiveAnswer(slice)) {
      throw new EmptyAdvanceError(phase);
    }
  }

  // Merge new responses with existing
  const existingResponses = (intake.responses as Record<string, unknown>) ?? {};
  const mergedResponses = { ...existingResponses, ...input.responses };

  // Determine next pillar based on progress (biz first, then ADVE pillars)
  // Intake covers biz + 4 ADVE pillars only (RTIS = paid version).
  // A phase only counts as "answered" if its stored slice has substantive
  // content — see hasSubstantiveAnswer above. This complements the boundary
  // guard, defending the system against legacy rows persisted before the
  // guard existed.
  const allSteps = ["biz", "a", "d", "v", "e"];
  const answeredSteps = new Set(
    Object.entries(mergedResponses)
      .filter(([, v]) => hasSubstantiveAnswer(v))
      .map(([key]) => key.split("_")[0]),
  );
  const nextPillar = allSteps.find((p) => !answeredSteps.has(p));
  const progress = answeredSteps.size / allSteps.length;

  // If biz step just completed, persist business context fields on the intake
  if (answeredSteps.has("biz") && mergedResponses.biz_model) {
    const bizModel = extractKeyFromOption(mergedResponses.biz_model as string);
    const bizPositioning = extractKeyFromOption(mergedResponses.biz_positioning as string);
    const bizNature = mergedResponses.biz_nature
      ? extractKeyFromOption(mergedResponses.biz_nature as string)
      : undefined;
    const bizRevenue = Array.isArray(mergedResponses.biz_revenue)
      ? (mergedResponses.biz_revenue as string[]).map(extractKeyFromOption).join(",")
      : typeof mergedResponses.biz_revenue === "string"
        ? extractKeyFromOption(mergedResponses.biz_revenue)
        : undefined;

    await db.quickIntake.update({
      where: { id: intake.id },
      data: {
        businessModel: bizModel,
        economicModel: bizRevenue,
        positioning: bizPositioning,
        brandNature: bizNature,
      },
    });
  }

  await db.quickIntake.update({
    where: { id: intake.id },
    data: { responses: mergedResponses as Prisma.InputJsonValue },
  });

  if (!nextPillar) {
    // All pillars covered, ready to complete
    return {
      token: input.token,
      questions: [],
      currentPillar: null,
      progress: 1,
      readyToComplete: true,
    };
  }

  // Resolve brandNature for conditional questions (e.g., festival E questions)
  const resolvedBrandNature = mergedResponses.biz_nature
    ? extractKeyFromOption(mergedResponses.biz_nature as string)
    : (intake as { brandNature?: string | null }).brandNature ?? undefined;

  const questions = await getAdaptiveQuestions(nextPillar, mergedResponses, {
    sector: intake.sector ?? undefined,
    positioning: intake.positioning ?? undefined,
    brandNature: resolvedBrandNature,
  });

  return {
    token: input.token,
    questions,
    currentPillar: nextPillar,
    progress,
    readyToComplete: false,
  };
}

/**
 * Thrown by `complete()` when an intake has no substantive content across
 * any of its phases. Surfaced to the form so the user can be redirected
 * back to the questionnaire.
 */
export class IncompleteIntakeError extends Error {
  constructor(public readonly phasesWithContent: string[]) {
    super(
      `[quick-intake.complete] rejected: no phase has substantive answers (had ${phasesWithContent.length === 0 ? "none" : phasesWithContent.join(",")}). ` +
        `Refusing to score an empty intake.`,
    );
    this.name = "IncompleteIntakeError";
  }
}

export async function complete(token: string) {
  const intake = await db.quickIntake.findUnique({
    where: { shareToken: token },
  });

  if (!intake) throw new Error("Intake not found");

  // Refuse to score an intake that has no substantive answer in any phase.
  // This is the second line of defence: `advance()` already rejects empty
  // slices at the boundary, but legacy rows persisted before that guard
  // existed (or rows whose only writes happened through other code paths)
  // would otherwise reach `complete()` and produce a vector-of-zeros report
  // — exactly the empty-ADVE bug.
  const incomingResponses = (intake.responses as Record<string, unknown>) ?? {};
  const phasesWithContent = Object.entries(incomingResponses)
    .filter(([, v]) => hasSubstantiveAnswer(v))
    .map(([k]) => k.split("_")[0] ?? k);
  if (phasesWithContent.length === 0) {
    throw new IncompleteIntakeError(phasesWithContent);
  }

  // Build BusinessContext from intake responses
  const businessContext = buildBusinessContext(intake);

  // Ensure a system user exists for auto-generated strategies
  const systemUser = await db.user.upsert({
    where: { email: "system@lafusee.io" },
    update: {},
    create: {
      email: "system@lafusee.io",
      name: "System",
      role: "ADMIN",
    },
  });

  // Resolve brand nature and primary channel
  const brandNatureKey = (intake as { brandNature?: string | null }).brandNature as BrandNatureKey | null;
  const brandNatureDef = brandNatureKey ? BRAND_NATURES[brandNatureKey] : null;
  const primaryChannel = brandNatureDef?.primaryChannel ?? null;

  // Resolve country/currency from the intake declaration so every
  // downstream service (Notoria, financial-engine, UI cards) reads the
  // canonical denormalised columns. country-registry handles ISO-2 codes
  // OR exact names ("Cameroun", "Wakanda" …) — we never silently default
  // to Cameroun anymore.
  let countryCode: string | null = null;
  let currencyCode: string | null = null;
  if (intake.country) {
    try {
      const { lookupCountry } = await import("@/server/services/country-registry");
      const c = await lookupCountry(intake.country);
      if (c) {
        countryCode = c.code;
        currencyCode = c.currencyCode;
      } else {
        console.warn(
          `[quick-intake] unknown country '${intake.country}' — countryCode/currencyCode left null. Add to prisma/seed-countries.ts.`,
        );
      }
    } catch (err) {
      console.warn(
        "[quick-intake] country-registry lookup failed (non-blocking):",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Create a temporary strategy for scoring
  const strategy = await db.strategy.create({
    data: {
      name: `Quick Intake: ${intake.companyName}`,
      description: `Auto-generated from Quick Intake ${intake.id}`,
      userId: systemUser.id,
      status: "QUICK_INTAKE",
      businessContext: businessContext as unknown as Prisma.InputJsonValue,
      ...(brandNatureKey ? { brandNature: brandNatureKey } : {}),
      ...(primaryChannel ? { primaryChannel } : {}),
      ...(countryCode ? { countryCode } : {}),
      ...(currencyCode ? { currencyCode } : {}),
    },
  });

  // Responses are structured as { "biz": {...}, "a": { "a_vision": "...", ... }, "d": { ... }, ... }
  const responses = intake.responses as Record<string, Record<string, unknown>>;
  // Intake creates only ADVE pillars (RTIS are paid, created during boot-sequence)
  const pillars = ["a", "d", "v", "e"] as const;

  // ─────────────────────────────────────────────────────────────────────────
  // AI EXTRACTION: Transform raw Q&A into structured pillar content
  // This produces more "atoms" for the structural scorer, improving scoring
  // accuracy. Falls back to raw responses if AI extraction fails.
  //
  // Canonical context (sector, businessModel, positioning, country) is passed
  // as HARD CONSTRAINT — the LLM must not generate content that contradicts
  // declared facts. Post-extraction we also seal these fields with the
  // declared values, so the LLM cannot drift the pillar away from intake.
  // ─────────────────────────────────────────────────────────────────────────
  const canonicalContext: CanonicalIntakeContext = {
    companyName: intake.companyName,
    sector: intake.sector,
    country: intake.country,
    businessModel: intake.businessModel,
    economicModel: intake.economicModel,
    positioning: intake.positioning,
  };
  const structuredContents = await extractStructuredPillarContent(responses, canonicalContext);

  // Pre-create empty pillar rows so the Gateway can find them
  for (const p of pillars) {
    await db.pillar.create({
      data: { strategyId: strategy.id, key: p, content: {} as Prisma.InputJsonValue, confidence: 0 },
    });
  }

  // Helper — `{}` is a defined object so the previous `??` fallback never
  // kicked in when the AI extractor returned an empty shape (silent loss
  // of user data → "pillar empty" complaints downstream).
  const isEmptyObject = (o: unknown): boolean =>
    !o || typeof o !== "object" || Object.keys(o as Record<string, unknown>).length === 0;

  for (const pillar of pillars) {
    const rawResponses = responses[pillar];
    const structuredContent = structuredContents[pillar];
    // Prefer AI-extracted structured content, fallback to raw responses
    // when extraction returns an empty object.
    const baseContent = isEmptyObject(structuredContent) ? rawResponses : structuredContent;
    // Seal declared canonical fields so LLM cannot drift the pillar away
    // from the intake (e.g. businessModel:"SERVICES" when declared RAZOR_BLADE).
    const sealedContent = sealCanonicalPillarFields(
      pillar,
      (baseContent as Record<string, unknown> | undefined) ?? {},
      canonicalContext,
    );

    if (sealedContent && Object.keys(sealedContent).length > 0) {
      // Normalize content conservatively to avoid type-shape mismatches (arrays vs objects)
      const normalized = normalizePillarForIntake(pillar, sealedContent);
      // Persist via Gateway — full replace for initial intake conversion
      const { writePillar } = await import("@/server/services/pillar-gateway");
      await writePillar({
        strategyId: strategy.id,
        pillarKey: pillar as import("@/lib/types/advertis-vector").PillarKey,
        operation: { type: "REPLACE_FULL", content: normalized as Record<string, unknown> },
        author: { system: "INGESTION", reason: `Quick intake conversion: pillar ${pillar}` },
        options: { confidenceDelta: 0.05 },
      });
    }
  }

  // Score the strategy — ADVE only for intake, composite /100
  // NOTE: this is the COMPLETION score (form-fill rate). The brand-level
  // evaluator below produces the actual ladder placement (ZOMBIE → ICONE)
  // based on substance — that's what the user sees, not this number.
  const vector = await scoreObject("strategy", strategy.id);
  const adveComposite = (vector.a ?? 0) + (vector.d ?? 0) + (vector.v ?? 0) + (vector.e ?? 0);
  vector.composite = adveComposite;
  // Threshold-based classification kept as a fallback only — overridden by
  // the LLM-based brand-level evaluator below.
  let classification = classifyIntakeBrand(adveComposite);

  if (adveComposite === 0) {
    console.warn(`[quick-intake] scoring produced zero composite for strategy ${strategy.id} — possible empty pillar content or AI extraction failure`);
  }

  // Generate diagnostic based on actual responses
  const diagnostic = generateDiagnostic(
    vector,
    classification,
    responses as Record<string, Record<string, string>> | null,
    intake.companyName,
  );

  // ── NETERU INTENT EMISSION ──
  // Phase 2: route through Mestor.emitIntent → Artemis.commandant.execute.
  // Artemis routes FILL_ADVE × INTAKE to the right Notoria mission
  // (ADVE_INTAKE_PARTIAL — does NOT require R+T) and spawns:
  //   - INDEX_BRAND_CONTEXT (Seshat async indexing)
  //   - PRODUCE_DELIVERABLE × 4 PILLAR sequences (preview)
  // The intake page does not wait for spawned intents — they run in background.
  let notoriaPreview: { batchId?: string; totalRecos: number; recosByPillar: Record<string, number> } | null = null;
  try {
    const { emitIntent } = await import("@/server/services/mestor/intents");
    const intentResult = await emitIntent(
      {
        kind: "FILL_ADVE",
        phase: "INTAKE",
        strategyId: strategy.id,
        sources: { responses, extractedValues: structuredContents as never },
      },
      { caller: "quick-intake" },
    );
    const batch = intentResult.output as
      | { batchId?: string; totalRecos?: number; recosByPillar?: Record<string, number> }
      | undefined;
    if (batch) {
      notoriaPreview = {
        batchId: batch.batchId,
        totalRecos: batch.totalRecos ?? 0,
        recosByPillar: batch.recosByPillar ?? {},
      };
    }
  } catch (err) {
    console.warn(
      "[quick-intake] FILL_ADVE intent failed (non-blocking):",
      err instanceof Error ? err.message : err,
    );
  }

  // Pull the actual extracted values once — used by both the narrative
  // report generator and the brand-level evaluator below.
  const extractedRows = await db.pillar.findMany({
    where: { strategyId: strategy.id, key: { in: ["a", "d", "v", "e"] } },
    select: { key: true, content: true },
  });
  const extractedValues = extractedRows.reduce<Record<"a" | "d" | "v" | "e", Record<string, unknown>>>(
    (acc, row) => {
      acc[row.key as "a" | "d" | "v" | "e"] = (row.content as Record<string, unknown> | null) ?? {};
      return acc;
    },
    { a: {}, d: {}, v: {}, e: {} },
  );

  // ── NARRATIVE REPORT: written ADVE diagnostic + RTIS proposition ──
  // Drives the public result page (replaces the metric-heavy view).
  let narrativeReport: import("./narrative-report").NarrativeReport | null = null;
  try {
    const { generateNarrativeReport } = await import("./narrative-report");

    // Recos: prefer RTIS-target ones — they are what the narrative
    // RTIS section actually reasons about. The previous query took the
    // 8 most impactful regardless of target → ADVE recos crowded out
    // R/T/I/S, leaving the RTIS narrative un-grounded.
    const rtisRecos = await db.recommendation.findMany({
      where: { strategyId: strategy.id, status: "PENDING", targetPillarKey: { in: ["r", "t", "i", "s"] } },
      orderBy: [{ impact: "desc" }, { confidence: "desc" }],
      take: 8,
      select: { targetPillarKey: true, targetField: true, explain: true },
    });
    // Top up with high-impact ADVE recos when RTIS recos are sparse
    // (typical for fresh intakes).
    const need = Math.max(0, 8 - rtisRecos.length);
    const adveRecos = need > 0
      ? await db.recommendation.findMany({
          where: { strategyId: strategy.id, status: "PENDING", targetPillarKey: { in: ["a", "d", "v", "e"] } },
          orderBy: [{ impact: "desc" }, { confidence: "desc" }],
          take: need,
          select: { targetPillarKey: true, targetField: true, explain: true },
        })
      : [];
    const recos = [...rtisRecos, ...adveRecos];

    // Ground RTIS on Seshat references when the sector/country is
    // known. Without this, the RTIS narrative was generated cold by
    // the LLM and produced generic copy. We pull up to 6 references
    // (best-effort; failure is non-blocking — the narrative still
    // generates from ADVE alone).
    let seshatGrounding: string | undefined;
    if (intake.sector || intake.country) {
      try {
        const seshat = await import("@/server/services/seshat");
        const refs = await seshat.queryReferences({
          topic: intake.sector ?? "RTIS_PATTERNS",
          sector: intake.sector ?? undefined,
          market: intake.country ?? undefined,
          limit: 6,
        });
        if (refs.length > 0) {
          seshatGrounding = refs
            .map((r: { title?: string; summary?: string; content?: string }) =>
              `- ${r.title ?? "(ref)"} — ${(r.summary ?? r.content ?? "").slice(0, 280)}`,
            )
            .join("\n");
        }
      } catch (err) {
        console.warn(
          "[quick-intake] Seshat grounding skipped:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Pipeline selection — governed via ModelPolicy.pipelineVersion.
    //   V1 = direct Sonnet (legacy default — fast, ADVE-anchored)
    //   V2 = sync index + hybrid retrieval + Sonnet brief + Opus final
    //        (deprecated by V3; kept for parity until removed)
    //   V3 = RTIS-first: sync index → 4× Sonnet RTIS draft (RAG hybride)
    //        → re-index → Sonnet tension synthesis → Opus single pass
    //        emitting BOTH diagnostic + recommendation blocks
    // The flip is in /console/governance/model-policy for purpose="final-report".
    const { resolvePolicy } = await import("@/server/services/model-policy");
    const reportPolicy = await resolvePolicy("final-report").catch(
      () => ({ pipelineVersion: "V1" as const }),
    );

    if (reportPolicy.pipelineVersion === "V3") {
      // V3: ADVE narration (deterministic, from DB verbatim) → initial index
      // → RTIS draft → re-index → final synthesis.
      const { indexBrandContext } = await import("@/server/services/seshat/context-store");
      const { narrateAdvePillars } = await import("./narrate-adve");
      const { generateAndPersistRtisDraft } = await import("./rtis-draft");
      const { generateNarrativeReportV3 } = await import("./narrative-report-v3");

      // Step 1 — narrate ADVE ONCE from the founder's verbatim values, persist
      // {narrativePreview, narrativeFull} to Pillar.content. Read at restitution
      // time without further LLM calls. Idempotent.
      try {
        await narrateAdvePillars({
          strategyId: strategy.id,
          companyName: intake.companyName,
        });
      } catch (err) {
        console.warn(
          "[quick-intake:v3] ADVE narration failed (non-blocking):",
          err instanceof Error ? err.message : err,
        );
      }

      // Initial index — now includes the freshly-narrated ADVE paragraphs.
      await indexBrandContext(strategy.id, "INTAKE_ONLY").catch((err) => {
        console.warn(
          "[quick-intake:v3] initial index failed (non-blocking):",
          err instanceof Error ? err.message : err,
        );
      });

      // RTIS draft (R/T/I parallel, S after — see rtis-draft.ts).
      await generateAndPersistRtisDraft({
        strategyId: strategy.id,
        companyName: intake.companyName,
        sector: intake.sector,
        market: intake.country,
      });

      // Re-index FULL so RTIS draft content is now embedded too.
      await indexBrandContext(strategy.id, "FULL").catch((err) => {
        console.warn(
          "[quick-intake:v3] post-RTIS reindex failed (non-blocking):",
          err instanceof Error ? err.message : err,
        );
      });

      narrativeReport = await generateNarrativeReportV3({
        strategyId: strategy.id,
        companyName: intake.companyName,
        sector: intake.sector,
        country: intake.country,
        classification,
        vector,
        recoSummaries: recos.map((r) => ({
          pillar: r.targetPillarKey,
          field: r.targetField,
          explain: r.explain,
        })),
      });
    } else if (reportPolicy.pipelineVersion === "V2") {
      const { generateNarrativeReportV2 } = await import("./narrative-report-v2");
      narrativeReport = await generateNarrativeReportV2({
        strategyId: strategy.id,
        companyName: intake.companyName,
        sector: intake.sector,
        country: intake.country,
        classification,
        vector,
        recoSummaries: recos.map((r) => ({
          pillar: r.targetPillarKey,
          field: r.targetField,
          explain: r.explain,
        })),
        seshatGrounding,
      });
    } else {
      narrativeReport = await generateNarrativeReport({
        companyName: intake.companyName,
        sector: intake.sector,
        country: intake.country,
        classification,
        vector,
        responses: responses as Record<string, Record<string, string>> | null,
        extractedValues,
        recoSummaries: recos.map((r) => ({
          pillar: r.targetPillarKey,
          field: r.targetField,
          explain: r.explain,
        })),
        seshatGrounding,
      });
    }

    // Persist the premium ADVE paragraphs into each pillar under
    // `content.narrativeFull/Preview` so they survive the intake → strategy
    // conversion. V3 has already done this upstream via `narrateAdvePillars`
    // (deterministic, before final synthesis), so this block is a V1/V2-only
    // back-fill that re-uses the LLM-regenerated paragraphs.
    if (narrativeReport && reportPolicy.pipelineVersion !== "V3") {
      const { writePillar } = await import("@/server/services/pillar-gateway");
      for (const section of narrativeReport.adve) {
        try {
          await writePillar({
            strategyId: strategy.id,
            pillarKey: section.key as import("@/lib/types/advertis-vector").PillarKey,
            operation: {
              type: "MERGE_DEEP",
              patch: {
                narrativeFull: section.full,
                narrativePreview: section.preview,
              } as Record<string, unknown>,
            },
            author: { system: "MESTOR", reason: `Quick intake narrative ${section.key.toUpperCase()}` },
            options: { confidenceDelta: 0.03 },
          });
        } catch (err) {
          console.warn(
            `[quick-intake] could not persist narrativeFull for pillar ${section.key}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    }
  } catch (err) {
    console.warn("[quick-intake] Narrative report failed (non-blocking):", err instanceof Error ? err.message : err);
  }

  // ── BRAND-LEVEL EVALUATOR: substance-based placement on the ladder ──
  // This is THE deliverable for the MVP pre-evaluation: where the brand sits
  // (Zombie → Icone) based on what was said + the trajectory toward Culte.
  // Overrides the threshold-based classification.
  let brandLevel: import("./brand-level-evaluator").BrandLevelEvaluation | null = null;
  try {
    const { evaluateBrandLevel } = await import("./brand-level-evaluator");
    const completionByPillar: Record<"a" | "d" | "v" | "e", number> = {
      a: (vector.a ?? 0) / 25,
      d: (vector.d ?? 0) / 25,
      v: (vector.v ?? 0) / 25,
      e: (vector.e ?? 0) / 25,
    };
    brandLevel = await evaluateBrandLevel({
      companyName: intake.companyName,
      sector: intake.sector,
      country: intake.country,
      responses: responses as Record<string, Record<string, string>> | null,
      extractedValues: {
        a: (extractedValues.a ?? {}) as Record<string, unknown>,
        d: (extractedValues.d ?? {}) as Record<string, unknown>,
        v: (extractedValues.v ?? {}) as Record<string, unknown>,
        e: (extractedValues.e ?? {}) as Record<string, unknown>,
      },
      completionByPillar,
    });
    // Override the threshold-based classification with the LLM verdict
    classification = brandLevel.level;
  } catch (err) {
    console.warn("[quick-intake] Brand level evaluation failed (non-blocking):", err instanceof Error ? err.message : err);
  }

  // ── FINANCIAL CAPACITY (Thot) — extract direct anchors + persist ─────
  // Snapshot financial answers from biz responses into a structured column
  // so Thot doesn't have to re-parse responses.biz on every read.
  const bizResponses = (responses.biz as Record<string, unknown> | undefined) ?? {};
  const financialResponses: Record<string, unknown> = {};
  for (const k of [
    "biz_revenue_range",
    "biz_marketing_budget_last",
    "biz_marketing_budget_intent",
    "biz_team_size",
  ]) {
    if (bizResponses[k] != null) financialResponses[k] = bizResponses[k];
  }

  // Persist financial answers on the intake (column added in Phase 1 schema)
  if (Object.keys(financialResponses).length > 0) {
    try {
      await db.quickIntake.update({
        where: { id: intake.id },
        data: { financialResponses: financialResponses as Prisma.InputJsonValue },
      });
    } catch (err) {
      console.warn("[quick-intake] could not persist financialResponses:", err instanceof Error ? err.message : err);
    }

    // Mirror financial answers into Pillar V (Valeur) so the cascade has
    // them — previously they were captured in `intake.financialResponses`
    // but never written to a pillar, so the user's effort was lost as
    // soon as the intake was converted.
    try {
      const { writePillar } = await import("@/server/services/pillar-gateway");
      await writePillar({
        strategyId: strategy.id,
        pillarKey: "v" as import("@/lib/types/advertis-vector").PillarKey,
        operation: {
          type: "MERGE_DEEP",
          patch: {
            financialAnchors: {
              revenueRange: financialResponses.biz_revenue_range ?? null,
              marketingBudgetLast: financialResponses.biz_marketing_budget_last ?? null,
              marketingBudgetIntent: financialResponses.biz_marketing_budget_intent ?? null,
              teamSize: financialResponses.biz_team_size ?? null,
            },
          } as Record<string, unknown>,
        },
        author: { system: "INGESTION", reason: "Quick intake: mirror financial anchors into V" },
        options: { confidenceDelta: 0.02 },
      });
    } catch (err) {
      console.warn("[quick-intake] could not mirror financial anchors into V:", err instanceof Error ? err.message : err);
    }
  }

  // Compute Thot financial capacity (Phase 1: real assessment from intake + benchmarks)
  let financialCapacity: import("@/server/services/financial-brain/capacity").FinancialCapacity | null = null;
  try {
    const { assessCapacity } = await import("@/server/services/financial-brain/capacity");
    financialCapacity = await assessCapacity(strategy.id);
    await db.strategy.update({
      where: { id: strategy.id },
      data: { financialCapacity: financialCapacity as unknown as Prisma.InputJsonValue },
    });
  } catch (err) {
    console.warn("[quick-intake] Thot capacity assessment failed (non-blocking):", err instanceof Error ? err.message : err);
  }

  // Update the intake with results (diagnostic + notoria preview + narrative)
  await db.quickIntake.update({
    where: { id: intake.id },
    data: {
      advertis_vector: vector,
      classification,
      diagnostic: { ...diagnostic, notoriaPreview, narrativeReport, brandLevel, financialCapacity } as Prisma.InputJsonValue,
      convertedToId: strategy.id,
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  // Auto-create CRM Deal from intake — Thot-grounded value
  const { computeDealValue } = await import("@/server/services/financial-brain/capacity");
  const dealValue = await computeDealValue({
    strategyId: strategy.id,
    sector: intake.sector,
    businessModel: intake.businessModel,
  });

  const deal = await db.deal.create({
    data: {
      contactName: intake.contactName,
      contactEmail: intake.contactEmail,
      companyName: intake.companyName,
      stage: "LEAD",
      source: "QUICK_INTAKE",
      intakeId: intake.id,
      strategyId: strategy.id,
      value: dealValue,
      currency: "XAF",
    },
  });

  // Track funnel entry
  await db.funnelMapping.create({
    data: { dealId: deal.id, step: "LEAD" },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // NOTIFICATION: Alert fixer (Alexandre) that a new intake was completed.
  // Creates an AuditLog entry + KnowledgeEntry for the dashboard.
  // ─────────────────────────────────────────────────────────────────────────
  await notifyFixerOnCompletion(intake, vector, classification, deal.id);

  return {
    token,
    vector,
    classification,
    diagnostic,
    strategyId: strategy.id,
    dealId: deal.id,
  };
}

// ============================================================================
// REGENERATE — Re-run analysis for an existing intake
// ============================================================================

/**
 * Discards the current temp Strategy + Pillar rows + diagnostic that an
 * intake's `complete()` call produced, then re-runs `complete()` on the
 * same responses to regenerate clean analysis.
 *
 * Use case: an intake whose persisted analysis drifted (LLM hallucination,
 * stale logic, schema migration) and the founder needs a coherent rerun.
 *
 * Safe only when the temp Strategy is still in `QUICK_INTAKE` status (i.e.
 * not yet activated by `activateBrand`). Activation promotes the Strategy
 * to `ACTIVE` with a real Client/User, at which point regeneration would
 * destroy founder-owned work.
 */
export async function regenerateAnalysis(
  token: string,
): Promise<Awaited<ReturnType<typeof complete>>> {
  const intake = await db.quickIntake.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      status: true,
      convertedToId: true,
      responses: true,
      companyName: true,
    },
  });
  if (!intake) throw new Error("Intake not found");

  // Status sanity — regeneration only runs over a finalised intake.
  if (intake.status !== "COMPLETED" && intake.status !== "CONVERTED") {
    throw new Error(`Cannot regenerate intake in status ${intake.status} — must be COMPLETED or CONVERTED`);
  }

  // Drop the previous temp Strategy if it still exists. Cascade rules in
  // schema.prisma clean up Pillar/AICostLog/Recommendation rows. Activated
  // Strategies (status === "ACTIVE") are protected — we refuse to wipe them.
  if (intake.convertedToId) {
    const existing = await db.strategy.findUnique({
      where: { id: intake.convertedToId },
      select: { id: true, status: true },
    });
    if (existing && existing.status !== "QUICK_INTAKE") {
      throw new Error(
        `Refusing to regenerate: strategy ${existing.id} is in status ${existing.status} (already activated by the founder).`,
      );
    }
    if (existing) {
      await db.strategy.delete({ where: { id: existing.id } });
    }
  }

  // Reset pointers + status so `complete()` re-creates a fresh strategy.
  // `advertis_vector`, `diagnostic`, `classification` are overwritten at the
  // end of `complete()`, so we don't bother clearing them up-front.
  await db.quickIntake.update({
    where: { id: intake.id },
    data: {
      status: "IN_PROGRESS",
      convertedToId: null,
    },
  });

  return complete(token);
}

// ============================================================================
// AI EXTRACTION — Transform raw Q&A into structured pillar content
// ============================================================================

/**
 * Maps raw Q&A responses to structured pillar fields using Claude.
 * This dramatically improves scoring accuracy because the structural scorer
 * counts filled fields (atoms): raw Q&A gives ~3-5 atoms per pillar, while
 * structured extraction can produce 8-15 atoms that map to the pillar schema.
 *
 * Falls back gracefully if AI call fails (returns empty map, raw responses used).
 */
async function extractStructuredPillarContent(
  responses: Record<string, Record<string, unknown>>,
  ctx: CanonicalIntakeContext,
): Promise<Record<string, Record<string, unknown>>> {
  const { extractJSON } = await import("@/server/services/llm-gateway");

  const bizContext = responses.biz
    ? Object.entries(responses.biz)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : "Non fourni";

  const system = mestor.getSystemPrompt("intake");
  const advePillars = ["a", "d", "v", "e"] as const;

  // Canonical declared facts — these are HARD CONSTRAINTS, not suggestions.
  // The LLM must produce content coherent with this context. The post-call
  // `sealCanonicalPillarFields` step still overwrites if the LLM ignores it.
  const declaredFacts = [
    `MARQUE         : ${ctx.companyName}`,
    `SECTEUR        : ${ctx.sector ?? "Non précisé"}`,
    `PAYS / MARCHÉ  : ${ctx.country ?? "Non précisé"}`,
    `MODÈLE BUSINESS: ${ctx.businessModel ?? "Non précisé"}`,
    `POSITIONNEMENT : ${ctx.positioning ?? "Non précisé"}`,
    `MODÈLE ÉCO     : ${ctx.economicModel ?? "Non précisé"}`,
  ].join("\n");

  // 4 parallel LLM calls — 1 per pillar. Smaller JSON = more reliable parsing.
  const results = await Promise.allSettled(
    advePillars.map(async (pillarKey) => {
      const upperK = pillarKey.toUpperCase() as keyof typeof PILLAR_SCHEMAS;
      const schema = PILLAR_SCHEMAS[upperK];
      const fieldKeys = schema ? Object.keys((schema as { shape?: Record<string, unknown> }).shape ?? {}) : [];
      const instructions = getFormatInstructions(pillarKey, fieldKeys);

      // Build pillar-specific response summary
      const pillarResponses = responses[pillarKey];
      const answersText = pillarResponses
        ? Object.entries(pillarResponses)
            .filter(([, v]) => v != null && String(v).trim())
            .map(([qId, v]) => `  ${qId}: ${String(v)}`)
            .join("\n")
        : "Aucune reponse directe";

      const prompt = `Extrais du contenu structure pour le pilier ${upperK} a partir des reponses brutes.

REGLES STRICTES :
1. N'inclus un champ QUE s'il est explicitement supporte par les reponses fournies. Si la marque n'a rien dit sur un champ, OMETS-LE (ne l'invente pas, ne le devine pas, ne l'extrapole pas).
2. Si une reponse est trop vague pour produire une valeur fiable, OMETS le champ.
3. Une marque qui repond peu doit produire un objet JSON avec PEU de champs (3-4 champs max possible). C'est attendu et honnete.
4. Reproduis FIDELEMENT les mots de la marque quand c'est possible. Pas de synonymes "ameliores".
5. Le score depend de la quantite reelle de matiere fournie — ne le gonfle pas en remplissant des champs inventes.
6. CONTRAINTE DURE — la marque opère dans le secteur, pays et modèle business déclarés ci-dessous. Tout produit, persona, concurrent, exemple ou narrative DOIT être cohérent avec ces faits. Une marque immobilière ne vend pas de cosmétiques. Un razor-blade ne s'invente pas en pure services. Si une réponse libre suggère un autre univers, IGNORE-LA — les faits déclarés priment toujours.
7. Ne génère PAS les champs canoniques suivants : \`secteur\`, \`pays\`, \`businessModel\`, \`positioningArchetype\`, \`economicModels\`. Ils sont scellés par le système après ton extraction.

FAITS DÉCLARÉS (CONTRAINTE) :
${declaredFacts}

CONTEXTE BUSINESS LIBRE: ${bizContext}

${instructions ? `FORMAT ATTENDU (champs possibles, tous OPTIONNELS) :\n${instructions}\n` : ""}
REPONSES BRUTES DU PILIER ${upperK}:
${answersText}

Reponds UNIQUEMENT avec un objet JSON contenant SEULEMENT les champs du pilier ${upperK} qui sont DIRECTEMENT supportes par les reponses ET cohérents avec les faits déclarés. Pas de texte autour.`;

      const { text } = await callLLM({
        system,
        prompt,
        caller: `quick-intake:extract-${pillarKey}`,
        purpose: "extraction",
        maxOutputTokens: 4096,
      });

      const parsed = extractJSON(text.trim()) as Record<string, unknown>;

      // Sparse extraction is now expected — the strict prompt may produce 0-3
      // fields when the brand said little. Persist whatever we got (including
      // an empty object if the LLM was honest about the lack of input).
      if (parsed && typeof parsed === "object") {
        return { key: pillarKey, content: parsed };
      }
      return null;
    }),
  );

  // Collect successful extractions
  const result: Record<string, Record<string, unknown>> = {};
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      result[r.value.key] = r.value.content;
    } else if (r.status === "rejected") {
      console.warn("[quick-intake] Pillar extraction failed:", r.reason instanceof Error ? r.reason.message : r.reason);
    }
  }

  return result;
}

// ============================================================================
// NOTIFICATION — Alert fixer on intake completion
// ============================================================================

/**
 * Creates audit trail entry + knowledge event for fixer notification.
 * The fixer console dashboard reads from AuditLog for recent alerts.
 */
async function notifyFixerOnCompletion(
  intake: { id: string; contactName: string; contactEmail: string; companyName: string; sector: string | null; country: string | null },
  vector: Record<string, number>,
  classification: string,
  dealId: string,
): Promise<void> {
  try {
    // Audit trail entry — visible in fixer console alerts
    await auditTrail.log({
      action: "CREATE",
      entityType: "QuickIntake",
      entityId: intake.id,
      newValue: {
        type: "intake_completed",
        companyName: intake.companyName,
        contactName: intake.contactName,
        contactEmail: intake.contactEmail,
        sector: intake.sector,
        country: intake.country,
        composite: vector.composite,
        classification,
        dealId,
        alert: true, // Flagged for fixer dashboard notification
      },
    });

    // Knowledge event — feeds into analytics + fixer console "Quick Intakes recents"
    await db.knowledgeEntry.create({
      data: {
        entryType: "DIAGNOSTIC_RESULT",
        sector: intake.sector,
        market: intake.country,
        data: {
          type: "quick_intake_completed",
          intakeId: intake.id,
          dealId,
          classification,
          composite: vector.composite,
          contactName: intake.contactName,
          contactEmail: intake.contactEmail,
          companyName: intake.companyName,
          completedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        sourceHash: `intake-${intake.id}`.slice(0, 16),
      },
    });
  } catch (err) {
    console.warn(
      "[quick-intake] notification failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

// estimateDealValue — removed in Phase 1.
// Replaced by `thot.computeDealValue` (financial-brain/capacity.ts) which
// reads Strategy.financialCapacity and grounds the deal value in real
// brand financial signals instead of hard-coded multipliers.

/**
 * Extracts the key portion from "KEY::Label" format options.
 */
function extractKeyFromOption(option: string): string {
  const parts = option.split("::");
  return parts[0] ?? option;
}

/**
 * Builds a BusinessContext from a QuickIntake record's responses and fields.
 */
function buildBusinessContext(
  intake: { businessModel: string | null; economicModel: string | null; positioning: string | null; brandNature?: string | null; responses: unknown }
): BusinessContext | null {
  if (!intake.businessModel) return null;

  const responses = (intake.responses ?? {}) as Record<string, unknown>;
  const salesChannelRaw = extractKeyFromOption((responses.biz_sales_channel as string) ?? "HYBRID");
  const premiumScopeRaw = extractKeyFromOption((responses.biz_premium_scope as string) ?? "NONE");
  const freeElementRaw = extractKeyFromOption((responses.biz_free_element as string) ?? "NONE");

  const positioningKey = (intake.positioning ?? "MAINSTREAM") as PositioningArchetypeKey;
  const archetype = POSITIONING_ARCHETYPES[positioningKey];
  const isPositionalGood = archetype?.positionalGood === true;

  const economicModels = intake.economicModel
    ? intake.economicModel.split(",") as EconomicModelKey[]
    : ["VENTE_DIRECTE" as EconomicModelKey];

  const ctx: BusinessContext = {
    businessModel: intake.businessModel as BusinessModelKey,
    economicModels,
    positioningArchetype: positioningKey,
    salesChannel: salesChannelRaw as SalesChannel,
    positionalGoodFlag: isPositionalGood,
    premiumScope: premiumScopeRaw as PremiumScope,
    ...(intake.brandNature ? { brandNature: intake.brandNature as BrandNatureKey } : {}),
  };

  // Build free layer if applicable
  if (freeElementRaw !== "NONE") {
    const freeDetail = (responses.biz_free_detail as string) ?? "";
    ctx.freeLayer = {
      whatIsFree: freeElementRaw,
      whatIsPaid: freeDetail || "Non précisé",
      conversionLever: freeElementRaw === "FREEMIUM" ? "feature_gate" : freeElementRaw === "CONTENT" ? "content_upsell" : "ad_conversion",
    };
  }

  return ctx;
}

/**
 * Analyse les réponses réelles du prospect pour générer des recommandations
 * contextuelles et spécifiques — pas des templates génériques.
 */
function generateDiagnostic(
  vector: Record<string, number>,
  classification: string,
  responses?: Record<string, Record<string, string>> | null,
  companyName?: string
) {
  // Intake diagnostic covers ADVE only (RTIS = paid version)
  const pillars = [
    { key: "a", name: "Authenticite", score: vector.a ?? 0 },
    { key: "d", name: "Distinction", score: vector.d ?? 0 },
    { key: "v", name: "Valeur", score: vector.v ?? 0 },
    { key: "e", name: "Engagement", score: vector.e ?? 0 },
  ];

  const sorted = [...pillars].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 2);
  const weaknesses = sorted.slice(-2).reverse();

  // Analyse each weak pillar based on actual responses
  const recommendations = weaknesses.map((w) => {
    const weakPillarData = responses?.[w.key];
    const analysis = analyzePillarResponses(w.key, w.name, w.score, weakPillarData);
    return analysis;
  });

  // Build contextual summary
  const strongNames = strengths.map((p) => p.name).join(", ");
  const weakNames = weaknesses.map((p) => p.name).join(", ");
  const brand = companyName || "Votre marque";

  let summaryIntro: string;
  if (classification === "ZOMBIE") {
    summaryIntro = `${brand} presente des fondations fragiles. Les piliers fondamentaux de la marque sont absents ou sous-developpes, ce qui la rend vulnerable et invisible sur son marche.`;
  } else if (classification === "FRAGILE") {
    summaryIntro = `${brand} a des bases mais elles manquent de coherence. L'identite de marque est en construction — il faut consolider avant de pouvoir se differencier.`;
  } else if (classification === "ORDINAIRE") {
    summaryIntro = `${brand} possede une base fonctionnelle mais manque d'elements differenciants. Elle risque d'etre substituable par n'importe quel concurrent.`;
  } else if (classification === "FORTE") {
    summaryIntro = `${brand} a des fondations solides avec des forces reelles en ${strongNames}. L'enjeu est maintenant de combler les lacunes pour passer au niveau superieur.`;
  } else if (classification === "CULTE") {
    summaryIntro = `${brand} approche le statut culte avec une communaute naissante. Les piliers ${strongNames} sont vos moteurs. Optimiser ${weakNames} peut declencher un mouvement.`;
  } else {
    summaryIntro = `${brand} transcende son marche. Focus sur la perennite et la transmission.`;
  }

  return {
    classification,
    strengths: strengths.map((p) => ({
      pillar: p.name,
      key: p.key,
      score: p.score,
      insight: generateStrengthInsight(p.key, pillarResponses(responses, p.key)),
    })),
    weaknesses: weaknesses.map((p) => ({
      pillar: p.name,
      key: p.key,
      score: p.score,
    })),
    summary: summaryIntro,
    recommendations,
  };
}

function pillarResponses(
  responses: Record<string, Record<string, string>> | null | undefined,
  key: string
): Record<string, string> | undefined {
  return responses?.[key] ?? undefined;
}

function generateStrengthInsight(
  key: string,
  responses?: Record<string, string>
): string {
  if (!responses) return "Ce pilier montre de bonnes fondations.";

  const answers = Object.values(responses).filter((v) => v?.trim());
  const totalLength = answers.reduce((sum, a) => sum + a.length, 0);

  // Richer answers = stronger signal
  if (totalLength > 200) {
    return "Vos reponses detaillees montrent une vraie maturite sur ce pilier. Capitalisez dessus dans votre communication.";
  }
  return "Ce pilier montre du potentiel. Approfondissez-le pour en faire un vrai avantage concurrentiel.";
}

/**
 * Analyse les réponses d'un pilier faible pour générer une recommandation
 * basée sur le contenu réel — pas un template.
 */
function analyzePillarResponses(
  key: string,
  name: string,
  score: number,
  responses?: Record<string, string>
): { pillar: string; key: string; score: number; diagnostic: string; actions: string[] } {
  const answers = responses
    ? Object.values(responses).map((v) => String(v ?? "")).filter((v) => v.trim())
    : [];
  const totalContent = answers.join(" ").toLowerCase();
  const hasSubstance = totalContent.length > 50;
  const isVague = answers.some((a) => a.length < 15);
  const saysNo = answers.some((a) => /^(non|no|aucun|pas encore|rien|0|nope)/i.test(a.trim()));

  // Pillar-specific analysis
  switch (key) {
    case "a": {
      const noStory = saysNo || totalContent.includes("pas d'histoire") || !hasSubstance;
      const noValues = answers.length < 3 || isVague;
      return {
        pillar: name, key, score,
        diagnostic: noStory
          ? "Votre marque n'a pas de mythologie fondatrice articulee. Sans histoire, il n'y a pas d'emotion, et sans emotion, pas de connexion avec votre audience."
          : noValues
            ? "Vous avez une histoire mais vos valeurs restent floues. Une marque authentique doit pouvoir articuler clairement ce en quoi elle croit."
            : "Votre authenticite existe mais manque de structure. Elle doit etre codifiee pour devenir un outil strategique.",
        actions: noStory
          ? [
              "Documenter votre histoire fondatrice : le moment declencheur, le probleme que vous avez voulu resoudre, votre transformation personnelle",
              "Identifier votre archetype de marque (Heros, Sage, Rebelle...) pour ancrer votre narration",
              "Formuler 3 valeurs non-negociables qui guident chaque decision",
            ]
          : [
              "Structurer votre narration fondatrice en un recit de 90 secondes",
              "Decliner vos valeurs en comportements observables par vos clients",
              "Creer un manifeste de marque d'une page",
            ],
      };
    }
    case "d": {
      const noDiff = saysNo || totalContent.includes("pas de difference") || totalContent.includes("inexistant");
      const noVisual = answers.length >= 2 && answers[1] && answers[1].length < 20;
      return {
        pillar: name, key, score,
        diagnostic: noDiff
          ? "Vous n'avez pas identifie ce qui vous rend unique. Sur un marche competitif, l'absence de distinction signifie l'invisibilite."
          : noVisual
            ? "Votre positionnement verbal existe mais votre identite visuelle est sous-developpee. Le visuel represente 80% de la premiere impression."
            : "Votre distinction a du potentiel mais n'est pas assez tranchante pour marquer les esprits.",
        actions: noDiff
          ? [
              "Cartographier 5 concurrents directs et identifier les espaces non occupes",
              "Definir votre 'Only Statement' : Nous sommes les seuls a [X] pour [Y] parce que [Z]",
              "Tester votre proposition aupres de 10 clients : peuvent-ils vous decrire en une phrase ?",
            ]
          : [
              "Creer un moodboard de direction artistique avec codes couleurs, typographies, imagerie",
              "Definir votre ton de voix : 3 mots qu'on utilise, 3 mots qu'on n'utilise jamais",
              "Auditer la coherence visuelle sur tous vos points de contact",
            ],
      };
    }
    case "v": {
      const noPromise = saysNo || !hasSubstance;
      const weakOffer = totalContent.includes("service") && totalContent.length < 100;
      return {
        pillar: name, key, score,
        diagnostic: noPromise
          ? "Votre promesse de valeur n'est pas articulee. Sans promesse claire, vos clients ne savent pas pourquoi acheter chez vous plutot qu'ailleurs."
          : weakOffer
            ? "Vous avez une offre mais elle n'est pas structuree en proposition de valeur. Il y a une difference entre decrire ce que vous faites et promettre un resultat."
            : "Votre proposition de valeur existe mais manque de precision. Passez du vague au mesurable.",
        actions: noPromise
          ? [
              "Formuler votre promesse en une phrase : 'Pour [cible], nous promettons [resultat] grace a [methode]'",
              "Lister les 3 resultats concrets que vos clients obtiennent en travaillant avec vous",
              "Definir votre pricing ladder : offre d'appel, offre principale, offre premium",
            ]
          : [
              "Quantifier votre impact : delais, pourcentages, montants concrets",
              "Creer un catalogue structure avec benefices clients (pas juste des features)",
              "Mettre en place un systeme de temoignages clients pour prouver votre promesse",
            ],
      };
    }
    case "e": {
      const noCommunity = saysNo || totalContent.includes("pas de communaut");
      const passiveEngagement = !totalContent.includes("interag") && !totalContent.includes("echange");
      return {
        pillar: name, key, score,
        diagnostic: noCommunity
          ? "Aucune communaute active. Votre marque parle mais personne ne repond. L'engagement est le carburant de la croissance organique."
          : passiveEngagement
            ? "Vous avez une audience mais pas une communaute. La difference : une audience consomme, une communaute participe et evangelise."
            : "Votre engagement existe mais n'est pas structure en rituels repetables.",
        actions: noCommunity
          ? [
              "Choisir UN canal principal et publier 3x/semaine pendant 90 jours sans interruption",
              "Creer un rituel de marque hebdomadaire (live, rubrique, challenge)",
              "Repondre a 100% des commentaires et DMs pendant 30 jours",
            ]
          : [
              "Mettre en place une Devotion Ladder : identifier vos spectateurs, participants, ambassadeurs",
              "Creer un programme de referral pour transformer vos clients satisfaits en apporteurs d'affaires",
              "Lancer un format de contenu UGC pour que vos clients deviennent co-createurs",
            ],
      };
    }
    case "r": {
      const noRiskMgmt = saysNo || totalContent.includes("pas de plan") || totalContent.includes("ignore");
      return {
        pillar: name, key, score,
        diagnostic: noRiskMgmt
          ? "Aucune gestion de risque structuree. Vous naviguez a vue. Un seul evenement negatif pourrait detruire des mois de travail sans plan de contingence."
          : "Vous etes conscient de certains risques mais il manque un cadre structure pour les anticiper et les mitiger.",
        actions: noRiskMgmt
          ? [
              "Realiser une analyse SWOT honnete : 3 forces, 3 faiblesses, 3 opportunites, 3 menaces",
              "Identifier votre 'Sheitan' — l'ennemi existentiel de votre marque (pas un concurrent, une force)",
              "Rediger un protocole de crise en une page : qui fait quoi quand ca deraille",
            ]
          : [
              "Prioriser vos risques avec une matrice probabilite x impact",
              "Mettre en place une veille concurrentielle mensuelle",
              "Preparer 3 scenarios de reponse pour les types de crises les plus probables",
            ],
      };
    }
    case "t": {
      const noKPIs = saysNo || totalContent.includes("pas de kpi") || !hasSubstance;
      return {
        pillar: name, key, score,
        diagnostic: noKPIs
          ? "Aucun systeme de mesure en place. Sans donnees, vous prenez des decisions a l'aveugle et ne pouvez pas prouver votre valeur."
          : "Vous mesurez certaines choses mais il manque un tableau de bord structure avec des KPIs actionables.",
        actions: noKPIs
          ? [
              "Definir 5 KPIs vitaux : 2 d'acquisition, 1 de retention, 1 de revenue, 1 de satisfaction",
              "Mettre en place Google Analytics + un outil de social listening basique",
              "Creer un rapport mensuel de 1 page avec vos metriques cles et tendances",
            ]
          : [
              "Automatiser votre reporting avec un dashboard unifie",
              "Ajouter des metriques de Brand-Market Fit : NPS, brand recall, part de voix",
              "Faire une etude de marche TAM/SAM/SOM pour quantifier votre potentiel",
            ],
      };
    }
    case "i": {
      const noRoadmap = saysNo || totalContent.includes("aucune structure") || totalContent.includes("0 fcfa") || totalContent.includes("0 cfa");
      const noBudget = totalContent.includes("0") || totalContent.includes("aucun") || totalContent.includes("pas de budget");
      return {
        pillar: name, key, score,
        diagnostic: noRoadmap
          ? "Aucune structure d'execution. Vous avez peut-etre des idees mais sans roadmap, equipe, ni budget, rien ne se materialise."
          : noBudget
            ? "Vous avez une idee de votre direction mais pas de ressources allouees. Une strategie sans budget est un souhait, pas un plan."
            : "Votre implementation est en cours mais manque de rigueur operationnelle.",
        actions: noRoadmap
          ? [
              "Creer une roadmap 90 jours avec 3 objectifs maximum et des jalons hebdomadaires",
              "Allouer un budget minimum viable : meme 50K FCFA/mois est un debut si c'est constant",
              "Identifier une personne responsable du marketing, meme a temps partiel",
            ]
          : [
              "Structurer vos campagnes en sprints de 2 semaines avec objectifs mesurables",
              "Mettre en place un calendrier editorial 30 jours a l'avance",
              "Definir un processus de validation clair : qui decide quoi et en combien de temps",
            ],
      };
    }
    case "s": {
      const noStrategy = saysNo || totalContent.includes("freestyle") || !hasSubstance;
      return {
        pillar: name, key, score,
        diagnostic: noStrategy
          ? "Pas de strategie documentee. Vous improvisez. Le 'freestyle' n'est pas une strategie — c'est l'absence de strategie deguisee en agilite."
          : "Vous avez des elements strategiques mais ils ne forment pas un tout coherent. La strategie, c'est le liant entre tous les autres piliers.",
        actions: noStrategy
          ? [
              "Rediger un document strategique d'une page : vision, mission, positionnement, 3 priorites",
              "Creer des guidelines de marque meme basiques : logo usage, couleurs, ton de voix",
              "Planifier une session de reflexion strategique trimestrielle (meme 2h suffit)",
            ]
          : [
              "Auditer la coherence entre vos canaux : le meme message est-il porte partout ?",
              "Creer un score de coherence interne : vos equipes peuvent-elles pitcher la marque de la meme facon ?",
              "Documenter vos apprentissages : qu'est-ce qui a marche, qu'est-ce qui a echoue, pourquoi",
            ],
      };
    }
    default:
      return {
        pillar: name, key, score,
        diagnostic: "Ce pilier necessite un renforcement.",
        actions: ["Approfondir l'analyse avec un diagnostic complet IMPULSION."],
      };
  }
}
