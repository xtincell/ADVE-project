/**
 * Strategy Presentation — Assembly Service
 * Assembles all 13 sections of the strategic proposal from pillars, Glory outputs, and variables.
 * Strategy invents NOTHING — it only pulls from existing data.
 */

import crypto from "crypto";
import { db } from "@/lib/db";
import { classifyBrand, createEmptyVector, PILLAR_NAMES, sanitizeVector } from "@/lib/types/advertis-vector";
import type { AdvertisVector } from "@/lib/types/advertis-vector";
import {
  mapExecutiveSummary,
  mapContexteDefi,
  mapAuditDiagnostic,
  mapPlateformeStrategique,
  mapTerritoireCreatif,
  mapPlanActivation,
  mapProductionLivrables,
  mapMediasDistribution,
  mapKpisMesure,
  mapBudget,
  mapTimelineGouvernance,
  mapEquipe,
  mapConditionsEtapes,
  mapPropositionValeur,
  mapExperienceEngagement,
  mapSwotInterne,
  mapSwotExterne,
  mapSignauxOpportunites,
  mapCatalogueActions,
  mapFenetreOverton,
  mapProfilSuperfan,
  mapCroissanceEvolution,
  checkSectionCompleteness,
} from "./section-mappers";
import type { StrategyPresentationDocument, CompletenessReport } from "./types";
import { SECTION_REGISTRY } from "./types";

// ─── Evidence multiplier (presentation-time mirror of advertis-scorer) ──────
// Mirrors `computeEvidenceMultiplier` in advertis-scorer/index.ts but reads
// from the already-loaded `strategy` relations instead of querying the DB
// again. Kept in sync deliberately so scored rows and rendered Oracle align.

const EVIDENCE_FLOOR = 0.30;
const SUPERFANS_CAP = 0.30;
const CULT_INDEX_CAP = 0.20;
const AGE_CAP = 0.10;
const TARSIS_CAP = 0.10;
const SUPERFANS_TARGET = 1000;
const CULT_INDEX_TARGET = 80;
const AGE_YEARS_TARGET = 5;
const TARSIS_TARGET = 20;

function computePresentationEvidence(strategy: StrategyWithRelations): number {
  const superfanCount: number = Array.isArray(strategy.superfanProfiles)
    ? strategy.superfanProfiles.length
    : 0;
  const cultSnap = Array.isArray(strategy.cultIndexSnapshots)
    ? strategy.cultIndexSnapshots[0]
    : null;
  const cultScore: number =
    cultSnap && typeof cultSnap.compositeScore === "number" ? cultSnap.compositeScore : 0;
  const tarsisCount: number = Array.isArray(strategy.signals)
    ? strategy.signals.filter((s: { type?: string }) =>
        typeof s.type === "string" && s.type.includes("TARSIS"),
      ).length
    : 0;
  const createdAt = strategy.createdAt instanceof Date ? strategy.createdAt : null;
  const ageMs = createdAt ? Date.now() - createdAt.getTime() : 0;
  const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);

  const superfansFraction = Math.min(1, superfanCount / SUPERFANS_TARGET);
  const cultFraction = Math.min(1, cultScore / CULT_INDEX_TARGET);
  const ageFraction = Math.min(1, Math.max(0, ageYears / AGE_YEARS_TARGET));
  const tarsisFraction = Math.min(1, tarsisCount / TARSIS_TARGET);

  const evidenceVariable =
    superfansFraction * SUPERFANS_CAP +
    cultFraction * CULT_INDEX_CAP +
    ageFraction * AGE_CAP +
    tarsisFraction * TARSIS_CAP;

  return Math.min(1, EVIDENCE_FLOOR + evidenceVariable);
}

// ─── Prisma Include (single comprehensive query) ────────────────────────────

const PRESENTATION_INCLUDE = {
  user: { select: { name: true, email: true, image: true } },
  operator: { select: { name: true, slug: true } },
  client: { select: { id: true, name: true, sector: true, country: true, contactName: true, contactEmail: true } },
  pillars: true,
  drivers: { where: { deletedAt: null } },
  campaigns: {
    include: {
      actions: true,
      executions: true,
      teamMembers: { include: { user: { select: { name: true, email: true, image: true } } } },
      milestones: { orderBy: { dueDate: "asc" as const } },
      budgetLines: true,
      aarrMetrics: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
  missions: {
    include: {
      deliverables: true,
      driver: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
  signals: { orderBy: { createdAt: "desc" as const }, take: 20 },
  gloryOutputs: { orderBy: { createdAt: "desc" as const } },
  devotionSnapshots: { orderBy: { measuredAt: "desc" as const }, take: 5 },
  cultIndexSnapshots: { orderBy: { measuredAt: "desc" as const }, take: 5 },
  superfanProfiles: { orderBy: { engagementDepth: "desc" as const }, take: 20 },
  communitySnapshots: { orderBy: { measuredAt: "desc" as const }, take: 10 },
  scoreSnapshots: { orderBy: { measuredAt: "desc" as const }, take: 12 },
  contracts: { orderBy: { createdAt: "desc" as const } },
  brandVariables: true,
  frameworkResults: {
    include: { framework: { select: { slug: true, name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StrategyWithRelations = any;

// ─── Assembly ────────────────────────────────────────────────────────────────

export async function assemblePresentation(strategyId: string): Promise<StrategyPresentationDocument> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: PRESENTATION_INCLUDE,
  });

  // Sanitize vector at load time — source-of-truth fix for the Makrea audit
  // (ADR-0045 + ADR-0046). Schema enforces .max(25) per pillar / .max(200)
  // composite on writes, but legacy dirty rows (Distinction 27.33, Strategy
  // 25.93 observed) bypass write-time validation. `sanitizeVector` clamps and
  // logs a warning so the UI never receives out-of-range data even if a
  // stale row exists in DB.
  const rawVector = strategy.advertis_vector ?? createEmptyVector();
  const { vector: sanitized } = sanitizeVector(rawVector, { strategyId });

  // Ensure confidence is always a valid number — older records may lack it.
  // sanitizeVector already clamps confidence to [0, 1] but we keep the legacy
  // semantic (default to composite/200 when confidence is missing entirely).
  const baseVector: AdvertisVector = {
    ...sanitized,
    confidence:
      sanitized.confidence > 0
        ? sanitized.confidence
        : sanitized.composite > 0
          ? Math.min(sanitized.composite / 200, 1)
          : 0,
  };

  // Evidence-adjust the legacy stored composite. The advertis-scorer source-fix
  // applies the multiplier at write time, but rows scored before the fix carry
  // unweighted "potential" composites (e.g. Makrea 200/200 ICONE without a
  // single superfan). We re-derive the evidence factor from the freshly loaded
  // strategy relations and clamp the visible composite — so the Oracle never
  // overpromises ICONE on a brand with zero proven cultural mass. Once
  // scoreObject re-runs (next pillar amend or rescoring cron), DB and rendering
  // converge on the same value.
  const evidenceMult = computePresentationEvidence(strategy);
  const evidenceComposite = Math.round(baseVector.composite * evidenceMult * 100) / 100;
  const vector: AdvertisVector = {
    ...baseVector,
    composite: Math.min(200, Math.max(0, evidenceComposite)),
  };
  const classification = classifyBrand(vector.composite);

  // Phase 13 (B5/B6) — charger les BrandAssets des 14 sections étendues
  // (BIG4 + DISTINCTIFS + DORMANTS) pour exposer leur content dans
  // `doc.sections[sectionId]`. Sans ce merge, presentation-layout reçoit
  // `sectionData = undefined` et le composant Phase 13 crash sur
  // `data.<field>`. Cf. SECTION_DATA_MAP qui mappe sectionId → identité.
  //
  // ACTIVE preferred, DRAFT as fallback. The Glory sequences write back
  // BrandAsset.state="DRAFT" (cf. promoteSectionToBrandAsset). Promotion
  // DRAFT → ACTIVE is a separate quality gate (brand-vault/engine.ts).
  // Filtering on ACTIVE only meant the founder Oracle showed empty
  // sections even after enrich-oracle ran successfully (CIMENCAM 2026-05-06:
  // BCG_PORTFOLIO content present in DRAFT — bcgPortfolio.stars,
  // cash_cows, question_marks fully populated — but Oracle rendered
  // "Portfolio non encore tracé"). Falling back to DRAFT closes that gap.
  const phase13Sections = SECTION_REGISTRY.filter((s) => s.tier && s.tier !== "CORE");
  const phase13Kinds = [
    ...new Set(
      phase13Sections.map((s) => s.brandAssetKind).filter(Boolean) as string[],
    ),
  ];
  const phase13AssetsRaw = phase13Kinds.length > 0
    ? await db.brandAsset.findMany({
        where: {
          strategyId,
          kind: { in: phase13Kinds },
          state: { in: ["ACTIVE", "DRAFT"] },
        },
        select: { kind: true, content: true, metadata: true, state: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];
  // For each (kind, sectionId) pair, prefer ACTIVE over DRAFT. We pick the
  // most recent ACTIVE; if no ACTIVE row exists, fall back to most recent
  // DRAFT. This keeps the published Oracle stable when an operator promotes
  // ACTIVE while a fresher DRAFT is being written by enrich-oracle.
  const phase13Assets = (() => {
    const byKey = new Map<string, typeof phase13AssetsRaw[number]>();
    for (const a of phase13AssetsRaw) {
      const md = (a.metadata ?? {}) as Record<string, unknown>;
      const sectionKey = `${a.kind}::${md.sectionId ?? ""}`;
      const existing = byKey.get(sectionKey);
      if (!existing) {
        byKey.set(sectionKey, a);
        continue;
      }
      // Prefer ACTIVE; if both same state, the orderBy desc already gave us the most recent.
      if (existing.state !== "ACTIVE" && a.state === "ACTIVE") {
        byKey.set(sectionKey, a);
      }
    }
    return [...byKey.values()];
  })();

  // Strip internal markers (_truncatedAt, _originalKeys, _capped, _adveVector,
  // _strategyId, _meta, _glorySequence, _brandAssetKind, etc.) recursively.
  // These keys leak into Oracle UI as raw JSON otherwise — observed on Makrea
  // 2026-05-06 where Deloitte Greenhouse rendered "_strategyId: cmo7...,
  // _truncatedAt: 2026-05-05T08:53:38.760Z, _originalKeys: 292" to the
  // founder. Source fix on the cap function is paired with this defensive
  // strip on the read path so legacy DB rows surface clean too.
  function stripInternalKeys(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stripInternalKeys);
    if (value !== null && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (k.startsWith("_")) continue;
        out[k] = stripInternalKeys(v);
      }
      return out;
    }
    return value;
  }

  const phase13ByIdRaw: Record<string, unknown> = {};
  for (const section of phase13Sections) {
    if (!section.brandAssetKind) {
      phase13ByIdRaw[section.id] = {};
      continue;
    }
    const matching = phase13Assets.find((a) => {
      const md = (a.metadata ?? {}) as Record<string, unknown>;
      if (md.sectionId === section.id) return true;
      if (md.sectionId === undefined && a.kind === section.brandAssetKind) return true;
      return false;
    });
    const raw = (matching?.content as Record<string, unknown> | undefined) ?? {};
    phase13ByIdRaw[section.id] = stripInternalKeys(raw);
  }

  return {
    meta: {
      strategyId: strategy.id,
      brandName: strategy.name,
      operatorName: strategy.operator?.name ?? null,
      generatedAt: new Date().toISOString(),
      vector,
      classification,
    },
    sections: {
      // Phase 1: ADVE
      executiveSummary: mapExecutiveSummary(strategy, vector, classification),
      contexteDefi: mapContexteDefi(strategy),
      plateformeStrategique: mapPlateformeStrategique(strategy),
      propositionValeur: mapPropositionValeur(strategy),
      territoireCreatif: mapTerritoireCreatif(strategy),
      experienceEngagement: mapExperienceEngagement(strategy),
      // Phase 2: R+T
      swotInterne: mapSwotInterne(strategy),
      swotExterne: mapSwotExterne(strategy),
      signaux: mapSignauxOpportunites(strategy),
      // Phase 3: I+S
      catalogueActions: mapCatalogueActions(strategy),
      planActivation: mapPlanActivation(strategy),
      fenetreOverton: mapFenetreOverton(strategy),
      mediasDistribution: mapMediasDistribution(strategy),
      productionLivrables: mapProductionLivrables(strategy),
      // Mesure & Superfan
      profilSuperfan: mapProfilSuperfan(strategy),
      kpisMesure: mapKpisMesure(strategy),
      croissanceEvolution: mapCroissanceEvolution(strategy),
      // Operationnel
      budget: mapBudget(strategy),
      timelineGouvernance: mapTimelineGouvernance(strategy),
      equipe: mapEquipe(strategy),
      conditionsEtapes: mapConditionsEtapes(strategy),
      // Legacy
      auditDiagnostic: mapAuditDiagnostic(strategy),
      // Phase 13 — 14 sections étendues exposées par sectionId direct.
      // Le composant React lit `data.<field>` (ex: data.mckinsey7s) avec
      // fallback `?? data`. La shape arrive depuis BrandAsset.content.
      ...phase13ByIdRaw,
    } as StrategyPresentationDocument["sections"],
  };
}

// ─── Token Management ────────────────────────────────────────────────────────

export async function getShareToken(strategyId: string): Promise<{ token: string; url: string }> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    select: { businessContext: true },
  });

  const ctx = (strategy.businessContext as Record<string, unknown>) ?? {};
  const existing = ctx.presentationShareToken as string | undefined;

  if (existing) {
    return { token: existing, url: `/shared/strategy/${existing}` };
  }

  const token = crypto.randomBytes(24).toString("hex");
  await db.strategy.update({
    where: { id: strategyId },
    data: {
      businessContext: { ...ctx, presentationShareToken: token },
    },
  });

  return { token, url: `/shared/strategy/${token}` };
}

export async function resolveShareToken(token: string): Promise<string | null> {
  // Search across all strategies for the token in businessContext
  const strategies = await db.strategy.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, businessContext: true },
  });

  for (const s of strategies) {
    const ctx = s.businessContext as Record<string, unknown> | null;
    if (ctx?.presentationShareToken === token) {
      return s.id;
    }
  }

  return null;
}

// ─── Completeness ────────────────────────────────────────────────────────────

/**
 * Returns a 35-entry completeness report. Phase 1-3 (21 CORE sections) are
 * derived from the assembled presentation document. Phase 13 (14 BIG4 /
 * DISTINCTIVE / DORMANT sections) are derived from BrandAsset state lookups
 * since they are materialized via Glory sequences and promoted in the
 * BrandVault (cf. ADR-0012, ADR-0014, [enrich-oracle.ts:promoteSectionToBrandAsset]).
 *
 * Without the Phase 13 augment, the UI counter is stuck at 21/35 even when
 * the Oracle has compiled (or never compiles), creating a misleading score.
 */
export async function checkCompleteness(strategyId: string): Promise<CompletenessReport> {
  const doc = await assemblePresentation(strategyId);
  const baseReport = checkSectionCompleteness(doc);

  const phase13Sections = SECTION_REGISTRY.filter((s) => s.tier && s.tier !== "CORE");
  if (phase13Sections.length === 0) return baseReport;

  const { db } = await import("@/lib/db");
  const kinds = [
    ...new Set(
      phase13Sections.map((s) => s.brandAssetKind).filter(Boolean) as string[],
    ),
  ];
  const assets = kinds.length > 0
    ? await db.brandAsset.findMany({
        where: { strategyId, kind: { in: kinds } },
        select: { kind: true, state: true, metadata: true },
      })
    : [];

  for (const section of phase13Sections) {
    // Don't overwrite an entry already produced by the CORE check (rare
    // overlap when a Phase 13 id collides with a Phase 1-3 id).
    if (section.id in baseReport) continue;
    if (!section.brandAssetKind) {
      baseReport[section.id] = "empty";
      continue;
    }
    // Prefer metadata.sectionId when set (Oracle-promoted assets carry it,
    // cf. promoteSectionToBrandAsset). Fall back to kind-only match for
    // legacy assets that pre-date the metadata.sectionId convention.
    const matching = assets.filter((a) => {
      const md = (a.metadata ?? {}) as Record<string, unknown>;
      if (md.sectionId === section.id) return true;
      if (md.sectionId === undefined && a.kind === section.brandAssetKind) return true;
      return false;
    });
    if (matching.some((a) => a.state === "ACTIVE")) {
      baseReport[section.id] = "complete";
    } else if (matching.some((a) => a.state === "DRAFT")) {
      baseReport[section.id] = "partial";
    } else {
      baseReport[section.id] = "empty";
    }
  }

  return baseReport;
}

// ─── Helpers exposed for tRPC ────────────────────────────────────────────────

export { PILLAR_NAMES };
