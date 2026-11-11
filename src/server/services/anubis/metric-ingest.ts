/** ADR-0146: deterministic, scoped metric admission. No pillar mutation or LLM. */
import { createHash } from "node:crypto";
import { z } from "zod";
import type { IntentResult, Intent } from "@/server/services/mestor/intents";
import { db } from "@/lib/db";
import { IngestSchema, metricObservationTime } from "@/domain/external-metric";

type IngestIntent = Extract<Intent, { kind: "INGEST_EXTERNAL_METRIC" }>;
type HandlerResult = Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">;
const RetainedOutcome = z.object({
  aarrWritten: z.number().int().nonnegative(), kpiWritten: z.number().int().nonnegative(),
  skipped: z.array(z.object({ metric: z.string(), reason: z.string() })),
});
export interface IngestOutcome {
  sourceType: string;
  period: string;
  aarrWritten: number;
  kpiWritten: number;
  skipped: Array<{ metric: string; reason: string }>;
  signalId: string;
  /** Legacy sources have no producer identity/version/observation date. */
  observationId: string | null;
  sourceVersion: string | null;
  observedAt: string | null;
  replayed: boolean;
}
function refused(reason: string): HandlerResult {
  return { status: "VETOED", reason, summary: `Observation refusée : ${reason}` };
}
function periodOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function ingestExternalMetric(intent: IngestIntent): Promise<HandlerResult> {
  const raw = Object.fromEntries(Object.entries(intent).filter(([key]) => key !== "kind" && key !== "operatorId"));
  const parsed = IngestSchema.safeParse(raw);
  if (!parsed.success) return refused("OBSERVATION_INVALID");
  const receivedAt = new Date();
  const input = parsed.data;
  const observedAt = input.observedAt ? new Date(input.observedAt) : null;
  if (observedAt && observedAt.getTime() > receivedAt.getTime()) return refused("OBSERVATION_IN_FUTURE");
  const cellTimes = [...input.metrics, ...(input.unobserved ?? [])].map((cell) => cell.observedAt).filter((v): v is string => v !== undefined);
  if (cellTimes.some((time) => new Date(time).getTime() > receivedAt.getTime())) return refused("OBSERVATION_IN_FUTURE");
  const { strategyId, sourceType, campaignId, missionId, metrics } = input;
  const period = input.period ?? periodOf(observedAt ?? receivedAt);
  // Cell provenance, absences and the producer digest are added only when sent:
  // a receipt without them keeps the exact hash it was admitted with (replay).
  const cellProvenance = (cell: { source?: string; subject?: string; unit?: string; observedAt?: string; note?: string }) => ({
    ...(cell.source !== undefined ? { source: cell.source } : {}),
    ...(cell.subject !== undefined ? { subject: cell.subject } : {}),
    ...(cell.unit !== undefined ? { unit: cell.unit } : {}),
    ...(cell.observedAt !== undefined ? { observedAt: cell.observedAt } : {}),
    ...(cell.note !== undefined ? { note: cell.note } : {}),
  });
  const byKey = (key: (cell: Record<string, unknown>) => unknown[]) => (a: Record<string, unknown>, b: Record<string, unknown>) => {
    // A receipt must keep the same hash when the host's locale changes.
    const left = JSON.stringify(key(a)), right = JSON.stringify(key(b));
    return left < right ? -1 : left > right ? 1 : 0;
  };
  const normalized = {
    sourceType, sourceLabel: input.sourceLabel ?? null,
    observationId: input.observationId ?? null, sourceVersion: input.sourceVersion ?? null,
    observedAt: observedAt?.toISOString() ?? null,
    campaignId: campaignId ?? null, missionId: missionId ?? null, period,
    metrics: metrics.map((m) => ({
      stage: m.stage ?? null, metric: m.metric, value: m.value,
      // Omission never means erase the operator's existing objective.
      ...(m.target !== undefined ? { target: m.target } : {}),
      kpiActivityId: m.kpiActivityId ?? null,
      ...cellProvenance(m),
    })).sort(byKey((c) => [c.stage, c.metric, c.kpiActivityId])),
    // Declared without a value: retained as such, never routed, never zero.
    ...(input.unobserved !== undefined ? { unobserved: input.unobserved.map((m) => ({
      metric: m.metric, state: m.state, ...(m.errorCode !== undefined ? { errorCode: m.errorCode } : {}), ...cellProvenance(m),
    })).sort(byKey((c) => [c.source ?? null, c.metric, c.subject ?? null])) } : {}),
    ...(input.sourceDigest !== undefined ? { sourceDigest: input.sourceDigest } : {}),
  };
  const payloadHash = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");

  // The spine's emission lock closes before dispatch. It cannot dedup effects.
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`external-metric:${strategyId}`}))`;
    // An unknown brand used to surface as a foreign-key failure (HTTP 500).
    if (!await tx.strategy.findUnique({ where: { id: strategyId }, select: { id: true } })) return refused("STRATEGY_NOT_FOUND");
    const outcome: IngestOutcome = {
      sourceType, period, aarrWritten: 0, kpiWritten: 0, skipped: [], signalId: "",
      observationId: normalized.observationId, sourceVersion: normalized.sourceVersion,
      observedAt: normalized.observedAt, replayed: false,
    };
    if (input.observationId) {
      const retained = await tx.signal.findMany({
        where: { strategyId, type: "EXTERNAL_METRIC", AND: [
          { data: { path: ["sourceType"], equals: sourceType } },
          { data: { path: ["observationId"], equals: input.observationId } },
        ] }, select: { id: true, data: true }, take: 2,
      });
      if (retained.length > 1) return refused("OBSERVATION_RECEIPT_AMBIGUOUS");
      if (retained[0]) {
        const data = record(retained[0].data);
        if (data.payloadHash !== payloadHash) return refused("OBSERVATION_CONFLICT");
        const saved = RetainedOutcome.safeParse(data.outcome);
        if (!saved.success) return refused("OBSERVATION_RECEIPT_UNREADABLE");
        return { status: "OK", summary: `Observation déjà reçue : ${input.observationId}`, output: {
          ...outcome, ...saved.data, signalId: retained[0].id, replayed: true,
        } };
      }
    }
    const campaign = campaignId ? await tx.campaign.findUnique({
      where: { id: campaignId }, select: { strategyId: true },
    }) : null;
    const applied: Array<{ route: "AARRR" | "KPI"; entityId: string; metric: string; observedAt: string | null }> = [];
    for (const cell of metrics) {
      if (cell.stage) {
        if (!campaignId) outcome.skipped.push({ metric: cell.metric, reason: "AARRR requiert campaignId" });
        else if (campaign?.strategyId !== strategyId) outcome.skipped.push({ metric: cell.metric, reason: "campaignId hors de cette marque" });
        else {
          // Manual writers may have created several rows. Never pick one or
          // discard historical observations to force uniqueness.
          const existing = await tx.campaignAARRMetric.findMany({
            where: { campaignId, stage: cell.stage, metric: cell.metric, period }, take: 2,
            select: { id: true, value: true, measuredAt: true },
          });
          const row = existing[0];
          const previousReceipt = row && !observedAt ? await tx.signal.findFirst({
            where: { strategyId, type: "EXTERNAL_METRIC", data: { path: ["applied"], array_contains: [{ route: "AARRR", entityId: row.id }] } },
            select: { data: true }, orderBy: { createdAt: "desc" },
          }) : null;
          if (existing.length > 1) outcome.skipped.push({ metric: cell.metric, reason: "point AARRR ambigu — plusieurs mesures existantes" });
          else if (!observedAt && metricObservationTime(previousReceipt?.data)) outcome.skipped.push({ metric: cell.metric, reason: "date d'observation inconnue — mesure datée conservée" });
          else if (row && observedAt && row.measuredAt > observedAt) outcome.skipped.push({ metric: cell.metric, reason: "observation antérieure à la mesure retenue" });
          else if (row && observedAt && row.measuredAt.getTime() === observedAt.getTime() && row.value !== cell.value) {
            outcome.skipped.push({ metric: cell.metric, reason: "mesure différente au même instant — arbitrage requis" });
          } else {
            const data = { value: cell.value, ...(cell.target !== undefined ? { target: cell.target } : {}), measuredAt: observedAt ?? receivedAt };
            const written = row
              ? await tx.campaignAARRMetric.update({ where: { id: row.id }, data, select: { id: true } })
              : await tx.campaignAARRMetric.create({ data: { campaignId, stage: cell.stage, metric: cell.metric, period, ...data }, select: { id: true } });
            outcome.aarrWritten += 1;
            applied.push({ route: "AARRR", entityId: written.id, metric: cell.metric, observedAt: normalized.observedAt });
          }
        }
      }
      if (cell.kpiActivityId) {
        const activity = await tx.missionActivity.findUnique({
          where: { id: cell.kpiActivityId }, select: { id: true, mission: { select: { strategyId: true, id: true } } },
        });
        if (!activity) outcome.skipped.push({ metric: cell.metric, reason: "activité KPI introuvable" });
        else if (activity.mission.strategyId !== strategyId) outcome.skipped.push({ metric: cell.metric, reason: "activité KPI hors de cette marque" });
        else if (missionId && activity.mission.id !== missionId) outcome.skipped.push({ metric: cell.metric, reason: "activité KPI hors de cette mission" });
        else {
          const lastApplied = await tx.signal.findFirst({
            where: { strategyId, type: "EXTERNAL_METRIC", data: { path: ["applied"], array_contains: [{ route: "KPI", entityId: activity.id }] } },
            select: { data: true }, orderBy: { createdAt: "desc" },
          });
          const previous = metricObservationTime(lastApplied?.data);
          if (previous && (!observedAt || previous >= observedAt)) {
            outcome.skipped.push({ metric: cell.metric, reason: "date inconnue ou observation non postérieure au KPI retenu" });
          } else {
            await tx.missionActivity.update({ where: { id: activity.id }, data: { kpiActual: cell.value } });
            outcome.kpiWritten += 1;
            applied.push({ route: "KPI", entityId: activity.id, metric: cell.metric, observedAt: normalized.observedAt });
          }
        }
      }
      if (!cell.stage && !cell.kpiActivityId) outcome.skipped.push({ metric: cell.metric, reason: "sans stage AARRR ni kpiActivityId — provenance seule" });
    }
    const signal = await tx.signal.create({
      data: { strategyId, type: "EXTERNAL_METRIC", data: {
        ...normalized, payloadHash, ingestedAt: receivedAt.toISOString(), applied,
        outcome: { aarrWritten: outcome.aarrWritten, kpiWritten: outcome.kpiWritten, skipped: outcome.skipped },
      } }, select: { id: true },
    });
    outcome.signalId = signal.id;
    const absent = input.unobserved?.length ? `, ${input.unobserved.length} mesure(s) sans valeur conservée(s)` : "";
    return { status: "OK", summary: `Métriques ${sourceType} reçues (${period}) : ${outcome.aarrWritten} AARRR, ${outcome.kpiWritten} KPI activité, ${outcome.skipped.length} non écrite(s)${absent}`, output: outcome };
  }, { maxWait: 10_000, timeout: 30_000 });
}
