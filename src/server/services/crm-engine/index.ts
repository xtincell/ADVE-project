/**
 * CRM Engine — Deal management, funnel tracking, Quick Intake conversion,
 * revenue forecasting, notes/activities, conversion metrics.
 *
 * CdC: Annexe E §4.2 — Pipeline commercial (Quick Intake → Deal → Brand Instance)
 */

import { TRPCError } from "@trpc/server";
import { createHash } from "node:crypto";
import { advanceSale, salesStateSchema, saleStage, type SalesStep, type SalesActor } from "./commercial";
import { db } from "@/lib/db";
import { scopeStrategies } from "@/server/services/operator-isolation";

export type DealStage = "LEAD" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";

const STAGE_ORDER: DealStage[] = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"];

/** Weighted probability per stage for revenue forecasting */
const STAGE_PROBABILITY: Record<DealStage, number> = {
  LEAD: 0.1,
  QUALIFIED: 0.25,
  PROPOSAL: 0.5,
  NEGOTIATION: 0.75,
  WON: 1.0,
  LOST: 0,
};

// ============================================================================
// DEAL LIFECYCLE
// ============================================================================

/**
 * Auto-create a Deal from a completed Quick Intake
 */
export async function createDealFromIntake(intakeId: string): Promise<string> {
  const intake = await db.quickIntake.findUniqueOrThrow({ where: { id: intakeId } });

  const deal = await db.deal.create({
    data: {
      contactName: intake.contactName,
      contactEmail: intake.contactEmail,
      companyName: intake.companyName,
      stage: "LEAD",
      source: "QUICK_INTAKE",
      intakeId: intake.id,
      value: estimateDealValue(intake.sector, intake.businessModel),
      currency: "XAF",
    },
  });

  // Track funnel entry
  await db.funnelMapping.create({
    data: { dealId: deal.id, step: "LEAD" },
  });

  // Auto-log the creation activity
  await db.cRMActivity.create({
    data: {
      dealId: deal.id,
      activityType: "DEAL_CREATED",
      description: `Deal créé automatiquement depuis Quick Intake (${intake.companyName})`,
      metadata: { source: "QUICK_INTAKE", intakeId },
    },
  }).catch(() => {});

  return deal.id;
}

/**
 * Create a manual deal (not from intake)
 */
export async function createDeal(data: {
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  operatorId?: string;
  sellerStrategyId?: string;
  companyName: string;
  value?: number;
  currency?: string;
  source?: string;
  notes?: string;
}): Promise<string> {
  return db.$transaction(async tx => {
  const deal = await tx.deal.create({
    data: {
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      companyName: data.companyName,
      stage: "LEAD",
      source: data.source ?? "MANUAL",
      value: data.value,
      currency: data.currency ?? "XAF",
      notes: data.notes,
      contactPhone: data.contactPhone,
      operatorId: data.operatorId,
      sellerStrategyId: data.sellerStrategyId,
    },
  });

  await tx.funnelMapping.create({
    data: { dealId: deal.id, step: "LEAD" },
  });

  await tx.cRMActivity.create({
    data: {
      dealId: deal.id,
      activityType: "DEAL_CREATED",
      description: `Deal créé manuellement (${data.companyName})`,
      metadata: { source: data.source ?? "MANUAL" },
    },
  });

  return deal.id;
  });
}

/**
 * Update deal fields (value, contact info, notes)
 */
export async function updateDeal(
  dealId: string,
  data: {
    contactName?: string;
    contactEmail?: string;
    companyName?: string;
    value?: number;
    notes?: string;
  }
): Promise<void> {
  await db.deal.update({ where: { id: dealId }, data });
}

/**
 * Advance a Deal to the next stage
 */
export async function advanceDeal(dealId: string, notes?: string): Promise<{ stage: DealStage; success: boolean }> {
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
  const currentIndex = STAGE_ORDER.indexOf(deal.stage as DealStage);

  if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
    return { stage: deal.stage as DealStage, success: false };
  }

  const nextStage = STAGE_ORDER[currentIndex + 1] as DealStage;
  const now = new Date();

  // Close current funnel step and compute duration
  const currentMapping = await db.funnelMapping.findFirst({
    where: { dealId, step: deal.stage, exitedAt: null },
  });
  if (currentMapping) {
    const durationMs = now.getTime() - new Date(currentMapping.enteredAt).getTime();
    const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));
    await db.funnelMapping.update({
      where: { id: currentMapping.id },
      data: { exitedAt: now, duration: durationDays },
    });
  }

  // Update deal
  await db.deal.update({
    where: { id: dealId },
    data: {
      stage: nextStage,
      notes: notes ?? deal.notes,
      ...(nextStage === "WON" ? { wonAt: now } : {}),
    },
  });

  // Create new funnel step
  await db.funnelMapping.create({
    data: { dealId, step: nextStage },
  });

  // Log activity
  await db.cRMActivity.create({
    data: {
      dealId,
      activityType: "STAGE_CHANGE",
      description: `Progression: ${deal.stage} → ${nextStage}`,
      metadata: { from: deal.stage, to: nextStage, notes },
    },
  }).catch(() => {});

  return { stage: nextStage, success: true };
}

/**
 * Move a deal to a specific stage (forward or backward)
 */
export async function moveDealToStage(dealId: string, targetStage: DealStage, notes?: string): Promise<void> {
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
  const now = new Date();

  // Close current funnel step
  const currentMapping = await db.funnelMapping.findFirst({
    where: { dealId, step: deal.stage, exitedAt: null },
  });
  if (currentMapping) {
    const durationMs = now.getTime() - new Date(currentMapping.enteredAt).getTime();
    await db.funnelMapping.update({
      where: { id: currentMapping.id },
      data: { exitedAt: now, duration: Math.round(durationMs / (1000 * 60 * 60 * 24)) },
    });
  }

  await db.deal.update({
    where: { id: dealId },
    data: {
      stage: targetStage,
      notes: notes ?? deal.notes,
      ...(targetStage === "WON" ? { wonAt: now } : {}),
      ...(targetStage === "LOST" ? { lostReason: notes } : {}),
    },
  });

  await db.funnelMapping.create({
    data: { dealId, step: targetStage },
  });

  await db.cRMActivity.create({
    data: {
      dealId,
      activityType: "STAGE_CHANGE",
      description: `Déplacé: ${deal.stage} → ${targetStage}`,
      metadata: { from: deal.stage, to: targetStage, notes },
    },
  }).catch(() => {});
}

/**
 * Mark deal as lost
 */
export async function loseDeal(dealId: string, reason: string): Promise<void> {
  const now = new Date();
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });

  // Close current funnel step
  const currentMapping = await db.funnelMapping.findFirst({
    where: { dealId, step: deal.stage, exitedAt: null },
  });
  if (currentMapping) {
    const durationMs = now.getTime() - new Date(currentMapping.enteredAt).getTime();
    await db.funnelMapping.update({
      where: { id: currentMapping.id },
      data: { exitedAt: now, duration: Math.round(durationMs / (1000 * 60 * 60 * 24)) },
    });
  }

  await db.deal.update({
    where: { id: dealId },
    data: { stage: "LOST", lostReason: reason },
  });

  await db.cRMActivity.create({
    data: {
      dealId,
      activityType: "DEAL_LOST",
      description: `Deal perdu: ${reason}`,
      metadata: { reason },
    },
  }).catch(() => {});
}

/**
 * Convert a Deal to a Strategy (Brand Instance)
 */
export async function convertDealToStrategy(
  dealId: string,
  userId: string,
  operatorId?: string
): Promise<string> {
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });

  const strategy = await db.strategy.create({
    data: {
      name: deal.companyName,
      userId,
      operatorId,
      status: "ACTIVE",
    },
  });

  // Link deal to strategy
  await db.deal.update({
    where: { id: dealId },
    data: { strategyId: strategy.id, stage: "WON", wonAt: new Date() },
  });

  // If there was an intake, link it too
  if (deal.intakeId) {
    await db.quickIntake.update({
      where: { id: deal.intakeId },
      data: { convertedToId: strategy.id, status: "CONVERTED" },
    });
  }

  await db.cRMActivity.create({
    data: {
      dealId,
      activityType: "DEAL_CONVERTED",
      description: `Converti en Brand Instance: ${strategy.id}`,
      metadata: { strategyId: strategy.id, userId, operatorId },
    },
  }).catch(() => {});

  return strategy.id;
}

// ============================================================================
// NOTES & ACTIVITIES
// ============================================================================

/**
 * Add a note to a deal
 */
export async function addNote(
  dealId: string,
  authorId: string,
  content: string,
  noteType: string = "GENERAL"
): Promise<string> {
  const note = await db.cRMNote.create({
    data: { dealId, authorId, content, noteType },
  });

  await db.cRMActivity.create({
    data: {
      dealId,
      activityType: "NOTE_ADDED",
      description: `Note ajoutée (${noteType})`,
      performedBy: authorId,
      metadata: { noteId: note.id, noteType },
    },
  }).catch(() => {});

  return note.id;
}

/**
 * List notes for a deal
 */
export async function listNotes(dealId: string) {
  return db.cRMNote.findMany({
    where: { dealId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Add an activity to a deal
 */
export async function addActivity(
  dealId: string,
  activityType: string,
  description: string,
  performedBy?: string
): Promise<string> {
  const activity = await db.cRMActivity.create({
    data: { dealId, activityType, description, performedBy },
  });
  return activity.id;
}

/**
 * List activities for a deal (chronological timeline)
 */
export async function listActivities(dealId: string) {
  return db.cRMActivity.findMany({
    where: { dealId },
    orderBy: { performedAt: "desc" },
  });
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get full deal details with notes, activities, and funnel history
 */
export async function getDealDetails(dealId: string) {
  const deal = await db.deal.findUniqueOrThrow({
    where: { id: dealId },
    include: {
      strategy: { select: { id: true, name: true, status: true, advertis_vector: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const [notes, activities, funnelHistory] = await Promise.all([
    db.cRMNote.findMany({ where: { dealId }, orderBy: { createdAt: "desc" } }),
    db.cRMActivity.findMany({ where: { dealId }, orderBy: { performedAt: "desc" } }),
    db.funnelMapping.findMany({ where: { dealId }, orderBy: { enteredAt: "asc" } }),
  ]);

  // Compute total time in pipeline (days)
  const createdAt = new Date(deal.createdAt).getTime();
  const endedAt = deal.wonAt ? new Date(deal.wonAt).getTime() : Date.now();
  const totalDays = Math.round((endedAt - createdAt) / (1000 * 60 * 60 * 24));

  return {
    ...deal,
    notes,
    activities,
    funnelHistory,
    totalDaysInPipeline: totalDays,
    weightedValue: (deal.value ?? 0) * STAGE_PROBABILITY[deal.stage as DealStage],
  };
}

/**
 * Get pipeline overview with counts and values per stage
 */
export async function getPipelineOverview(operatorId?: string | null, currency = "XAF") {
  // Ownership exists before conversion. Preserve only attributable legacy history.
  const strategyScope = operatorId
    ? { OR: [{ operatorId }, { operatorId: null, strategy: scopeStrategies({ operatorId, userId: "", role: "FIXER" }) }] }
    : {};
  const deals = await db.deal.findMany({
    where: { ...strategyScope, currency },
    orderBy: { createdAt: "desc" },
    include: {
      strategy: { select: { id: true, name: true } },
    },
  });

  const pipeline: Record<DealStage, { count: number; totalValue: number; deals: typeof deals }> = {
    LEAD: { count: 0, totalValue: 0, deals: [] },
    QUALIFIED: { count: 0, totalValue: 0, deals: [] },
    PROPOSAL: { count: 0, totalValue: 0, deals: [] },
    NEGOTIATION: { count: 0, totalValue: 0, deals: [] },
    WON: { count: 0, totalValue: 0, deals: [] },
    LOST: { count: 0, totalValue: 0, deals: [] },
  };

  for (const deal of deals) {
    const stage = deal.stage as DealStage;
    pipeline[stage].count++;
    pipeline[stage].totalValue += deal.value ?? 0;
    pipeline[stage].deals.push(deal);
  }

  return pipeline;
}

/**
 * List deals with optional stage filter (operator-scoped via strategy relation)
 */
export async function listDeals(options?: {
  stage?: DealStage;
  operatorId?: string | null;
  limit?: number;
}) {
  // Preserve the operator scope before and after conversion.
  const strategyScope = options?.operatorId
    ? { OR: [{ operatorId: options.operatorId }, { operatorId: null, strategy: scopeStrategies({ operatorId: options.operatorId, userId: "", role: "FIXER" }) }] }
    : {};

  return db.deal.findMany({
    where: {
      ...(options?.stage ? { stage: options.stage } : {}),
      ...strategyScope,
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 200,
    include: {
      strategy: { select: { id: true, name: true } },
    },
  });
}

// ============================================================================
// REVENUE FORECASTING (CdC Annexe E §4.2)
// ============================================================================

/**
 * Revenue forecast: weighted pipeline value by stage probability.
 * Shows: total pipeline, weighted forecast, average deal size, win rate.
 */
export async function getRevenueForecast(operatorId?: string | null, currency = "XAF") {
  // Anti-IDOR (audit 2026-07-22) : scope opérateur (prévisions = valeurs des deals).
  // Cf. getPipelineOverview : deals pré-conversion (strategyId null) inclus.
  const strategyScope = operatorId
    ? { OR: [{ operatorId }, { operatorId: null, strategy: scopeStrategies({ operatorId, userId: "", role: "FIXER" }) }] }
    : {};
  const deals = await db.deal.findMany({
    where: { stage: { notIn: ["LOST"] }, ...strategyScope, currency },
  });

  const wonDeals = await db.deal.findMany({
    where: { stage: "WON", ...strategyScope, currency },
  });

  const lostDeals = await db.deal.count({
    where: { stage: "LOST", ...strategyScope, currency },
  });

  // Weighted pipeline
  let totalPipeline = 0;
  let weightedForecast = 0;
  const byStage: Record<string, { count: number; value: number; weighted: number }> = {};

  for (const deal of deals) {
    const stage = deal.stage as DealStage;
    const value = deal.value ?? 0;
    const weighted = value * STAGE_PROBABILITY[stage];

    totalPipeline += value;
    weightedForecast += weighted;

    if (!byStage[stage]) byStage[stage] = { count: 0, value: 0, weighted: 0 };
    byStage[stage].count++;
    byStage[stage].value += value;
    byStage[stage].weighted += weighted;
  }

  // Win rate
  const totalClosed = wonDeals.length + lostDeals;
  // lafusee:allow-adhoc-completion: CRM deal funnel conversion ratio (deal count ratio, not pillar)
  const winRate = totalClosed > 0 ? (wonDeals.length / totalClosed) * 100 : 0;

  // Average deal size (from WON deals)
  const avgDealSize = wonDeals.length > 0
    ? wonDeals.reduce((sum, d) => sum + (d.value ?? 0), 0) / wonDeals.length
    : 0;

  // Average time to close (WON deals)
  const avgCloseTime = wonDeals.length > 0
    ? wonDeals.reduce((sum, d) => {
        if (!d.wonAt) return sum;
        const days = (new Date(d.wonAt).getTime() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / wonDeals.length
    : 0;

  return {
    totalPipeline: Math.round(totalPipeline),
    weightedForecast: Math.round(weightedForecast),
    currency,
    byStage,
    winRate: Math.round(winRate * 10) / 10,
    avgDealSize: Math.round(avgDealSize),
    avgCloseTimeDays: Math.round(avgCloseTime),
    activeDeals: deals.length,
    wonDeals: wonDeals.length,
    lostDeals,
  };
}

// ============================================================================
// CONVERSION METRICS
// ============================================================================

/**
 * Conversion metrics: stage-by-stage rates, average durations, bottleneck detection.
 */
export async function getConversionMetrics(operatorId?: string | null) {
  const deals = await db.deal.findMany({ where: operatorId
    ? { OR: [{ operatorId }, { operatorId: null, strategy: scopeStrategies({ operatorId, userId: "", role: "FIXER" }) }] }
    : {}, select: { id: true } });
  const dealFilter = { dealId: { in: deals.map(deal => deal.id) } };
  const funnelData = await db.funnelMapping.findMany({
    where: { ...dealFilter, exitedAt: { not: null } },
  });

  // Group by step
  const stageMetrics: Record<string, { count: number; totalDays: number; avgDays: number }> = {};

  for (const mapping of funnelData) {
    const step = mapping.step;
    if (!stageMetrics[step]) stageMetrics[step] = { count: 0, totalDays: 0, avgDays: 0 };
    stageMetrics[step].count++;
    stageMetrics[step].totalDays += mapping.duration ?? 0;
  }

  // Calculate averages
  for (const step of Object.keys(stageMetrics)) {
    const m = stageMetrics[step]!;
    m.avgDays = m.count > 0 ? Math.round(m.totalDays / m.count) : 0;
  }

  // Stage-to-stage conversion rates
  const conversionRates: Record<string, number> = {};
  for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
    const from = STAGE_ORDER[i]!;
    const to = STAGE_ORDER[i + 1]!;
    const enteredFrom = await db.funnelMapping.count({ where: { ...dealFilter, step: from } });
    const enteredTo = await db.funnelMapping.count({ where: { ...dealFilter, step: to } });
    conversionRates[`${from}_to_${to}`] = enteredFrom > 0 ? Math.round((enteredTo / enteredFrom) * 100) : 0;
  }

  // Bottleneck = stage with longest average time
  let bottleneck: string | null = null;
  let maxAvg = 0;
  for (const [step, m] of Object.entries(stageMetrics)) {
    if (m.avgDays > maxAvg) {
      maxAvg = m.avgDays;
      bottleneck = step;
    }
  }

  return {
    stageMetrics,
    conversionRates,
    bottleneck,
    bottleneckAvgDays: maxAvg,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Estimate deal value based on sector and business model
 */
function estimateDealValue(sector?: string | null, businessModel?: string | null): number {
  const baseValues: Record<string, number> = {
    FMCG: 5000000,
    BANQUE: 15000000,
    STARTUP: 2000000,
    TECH: 8000000,
    RETAIL: 4000000,
    HOSPITALITY: 6000000,
    EDUCATION: 3000000,
  };

  const modelMultiplier: Record<string, number> = {
    B2C: 1.0,
    B2B: 1.5,
    B2B2C: 1.3,
    D2C: 0.8,
    MARKETPLACE: 1.2,
  };

  const base = baseValues[sector ?? ""] ?? 5000000;
  const multiplier = modelMultiplier[businessModel ?? ""] ?? 1.0;

  return Math.round(base * multiplier);
}


/** A decision, its state and its journal commit together or not at all. */
export async function applySalesStep(dealId: string, step: SalesStep, actor: SalesActor) {
  const fingerprint = createHash("sha256").update(JSON.stringify(step)).digest("hex");
  return db.$transaction(async tx => {
    const deal = await tx.deal.findUniqueOrThrow({ where: { id: dealId } });
    const replay = await tx.cRMActivity.findFirst({
      where: { dealId, metadata: { path: ["salesRequestId"], equals: step.requestId } },
    });
    if (replay) {
      const metadata = replay.metadata as { fingerprint?: string; actorId?: string };
      if (metadata.fingerprint !== fingerprint || metadata.actorId !== actor.id) {
        throw new TRPCError({ code: "CONFLICT", message: "Référence déjà utilisée pour une autre décision." });
      }
      return deal;
    }
    if (deal.revision !== step.expectedRevision) {
      throw new TRPCError({ code: "CONFLICT", message: "Le dossier a évolué. Relire avant de décider." });
    }
    const previous = salesStateSchema.parse(deal.commercial ?? {});
    const command = step.command;
    const branchAcceptance = command.type === "BRANCH" &&
      previous.mandate?.conversationTree?.nodes.find(node => node.id === previous.treeNodeId)?.choices.find(choice => choice.id === command.choiceId)?.decision?.type === "ACCEPT";
    if (actor.id.startsWith("mcp:") && (command.type === "ACCEPT" || branchAcceptance)) {
      const messageId = (command.type === "ACCEPT" || command.type === "BRANCH") ? command.customerMessageId : undefined;
      const message = messageId ? await tx.crmMessage.findUnique({
        where: { id: messageId }, include: { contact: { select: { strategyId: true, email: true } } },
      }) : null;
      if (!message || message.direction !== "IN" || message.status !== "RECEIVED" ||
          (message.salesDealId ? message.salesDealId !== deal.id :
            (message.contact?.strategyId !== deal.sellerStrategyId || !deal.contactEmail || message.contact?.email.toLowerCase() !== deal.contactEmail.toLowerCase()))) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "L’agent doit référencer une réponse reçue de cet acheteur pour cette marque." });
      }
    }
    let next;
    try {
      next = advanceSale(previous, step, actor, new Date());
    } catch (error) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: (error as Error).message });
    }
    const stage = saleStage(next);
    const changed = await tx.deal.updateMany({
      where: { id: dealId, revision: step.expectedRevision },
      data: {
        commercial: JSON.parse(JSON.stringify(next)), paymentReference: next.mandate?.intakePaymentReference ?? null, stage, revision: { increment: 1 },
        wonAt: stage === "WON" ? (deal.wonAt ?? new Date()) : deal.wonAt,
        value: ["PARTNER", "AUDIENCE"].includes(next.node) ? 0 : (next.mandate?.amount ?? deal.value),
        currency: next.mandate?.currency ?? deal.currency,
      },
    });
    if (changed.count !== 1) throw new TRPCError({ code: "CONFLICT", message: "Une autre décision vient d’être enregistrée." });
    await tx.cRMActivity.create({ data: {
      dealId, performedBy: actor.id, activityType: "SALES_DECISION",
      description: step.command.type,
      metadata: { salesRequestId: step.requestId, fingerprint, actorId: actor.id, channel: step.channel,
        command: JSON.parse(JSON.stringify(step.command)), from: previous.node, to: next.node },
    } });
    return tx.deal.findUniqueOrThrow({ where: { id: dealId } });
  });
}


/** Reserve before transport. An uncertain attempt is retained for reconciliation. */
export async function sendSalesEmail(dealId: string, actor: SalesActor, input: { requestId: string; subject: string; text: string }) {
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
  const state = salesStateSchema.parse(deal.commercial);
  const mandate = state.mandate;
  if (!mandate || mandate.sellerId !== actor.id || !mandate.outboundEmailEnabled ||
      !mandate.channels.includes("EMAIL") || new Date(mandate.expiresAt) <= new Date() ||
      state.contactStopped || state.node === "STOPPED" || !deal.contactEmail || !deal.sellerStrategyId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "L’envoi exige un destinataire et un mandat email actif." });
  }
  const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const existing = await db.cRMActivity.findUnique({ where: { id: input.requestId } });
  if (existing) {
    const saved = existing.metadata as { fingerprint?: string };
    if (existing.dealId !== dealId || existing.performedBy !== actor.id || saved.fingerprint !== fingerprint) {
      throw new TRPCError({ code: "CONFLICT", message: "Référence d’envoi déjà utilisée." });
    }
    return existing;
  }
  // A unique primary key also serializes two simultaneous attempts with the same reference.
  await db.cRMActivity.create({ data: {
    id: input.requestId, dealId, performedBy: actor.id, activityType: "SALES_EMAIL_PENDING",
    description: input.subject, metadata: { fingerprint, to: deal.contactEmail, body: input.text },
  } });
  const { sendBrandEmail } = await import("@/server/services/anubis/brand-email");
  const htmlEscapes: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  const html = input.text.replace(/[&<>"]/g, char => htmlEscapes[char]!).replace(/\n/g, "<br>");
  let result;
  try {
    result = await sendBrandEmail(deal.sellerStrategyId, { to: deal.contactEmail, subject: input.subject, text: input.text, html, tag: "sales", allowFallback: false });
  } catch {
    return db.cRMActivity.update({ where: { id: input.requestId }, data: { activityType: "SALES_EMAIL_UNCERTAIN" } });
  }
  return db.cRMActivity.update({ where: { id: input.requestId }, data: {
    activityType: result.ok ? "SALES_EMAIL_SENT" : "SALES_EMAIL_UNCERTAIN",
    metadata: { fingerprint, to: deal.contactEmail, body: input.text,
      provider: result.provider, providerRef: result.ok ? result.providerRef : null },
  } });
}
