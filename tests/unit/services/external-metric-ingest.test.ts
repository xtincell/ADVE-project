/**
 * ADR-0146 — ingestion de métriques externes agnostique.
 *
 * Verrouille les invariants du chantier « rapport de mission cohérent » :
 *   - le kind est enregistré (governor ANUBIS, handler anubis) + SLO pairé ;
 *   - le contrat d'entrée est agnostique (schéma de l'endpoint) : strategyId +
 *     sourceType requis, metrics non vide, stage borné ;
 *   - le routage par cellule est correct : upsert AARRR IDEMPOTENT (findFirst
 *     → update sinon create), KPI d'activité GARDÉ par portée, provenance
 *     TOUJOURS écrite, garde anti-cross-brand sur campaignId ;
 *   - la voie de dispatch existe (commandant).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

// ── DB mock ─────────────────────────────────────────────────────────────
const campaignFindUnique = vi.fn();
const aarrFindFirst = vi.fn();
const aarrUpdate = vi.fn();
const aarrCreate = vi.fn();
const activityFindUnique = vi.fn();
const activityUpdate = vi.fn();
const signalCreate = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    campaign: { findUnique: (...a: unknown[]) => campaignFindUnique(...a) },
    campaignAARRMetric: {
      findFirst: (...a: unknown[]) => aarrFindFirst(...a),
      update: (...a: unknown[]) => aarrUpdate(...a),
      create: (...a: unknown[]) => aarrCreate(...a),
    },
    missionActivity: {
      findUnique: (...a: unknown[]) => activityFindUnique(...a),
      update: (...a: unknown[]) => activityUpdate(...a),
    },
    signal: { create: (...a: unknown[]) => signalCreate(...a) },
  },
}));

import { ingestExternalMetric } from "@/server/services/anubis/metric-ingest";
import { INTENT_KINDS, INTENT_KIND_BY_NAME } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";
import { IngestSchema } from "@/app/api/ingest/metrics/schema";

const STRAT = "strat-1";
const CAMP = "camp-1";

type IngestIntent = Parameters<typeof ingestExternalMetric>[0];
function intent(over: Partial<IngestIntent> = {}): IngestIntent {
  return {
    kind: "INGEST_EXTERNAL_METRIC",
    strategyId: STRAT,
    operatorId: "op-1",
    sourceType: "QUIZ",
    sourceLabel: "quizz.spawt.online",
    campaignId: CAMP,
    missionId: null,
    period: "2026-07",
    metrics: [{ stage: "ACTIVATION", metric: "quiz_completions", value: 180, target: 250 }],
    ...over,
  } as IngestIntent;
}

afterEach(() => {
  vi.clearAllMocks();
  signalCreate.mockResolvedValue({ id: "sig-1" });
});

describe("ADR-0146 — registration", () => {
  it("INGEST_EXTERNAL_METRIC is registered (ANUBIS / anubis, sync)", () => {
    const k = INTENT_KIND_BY_NAME.get("INGEST_EXTERNAL_METRIC");
    expect(k).toBeDefined();
    expect(k?.governor).toBe("ANUBIS");
    expect(k?.handler).toBe("anubis");
    expect(k?.async).toBe(false);
  });

  it("has a paired SLO (deterministic, zero LLM cost)", () => {
    const slo = INTENT_SLOS.find((s) => s.kind === "INGEST_EXTERNAL_METRIC");
    expect(slo).toBeDefined();
    expect(slo?.costP95Usd).toBe(0);
  });

  it("is dispatched by the Artemis commandant", () => {
    const src = readFileSync("src/server/services/artemis/commandant.ts", "utf8");
    expect(src).toContain('case "INGEST_EXTERNAL_METRIC"');
    expect(src).toContain("metric-ingest");
  });
});

describe("ADR-0146 — agnostic input contract (endpoint schema)", () => {
  it("accepts a full quiz payload", () => {
    const ok = IngestSchema.safeParse({
      strategyId: STRAT,
      sourceType: "QUIZ",
      campaignId: CAMP,
      metrics: [{ stage: "ACQUISITION", metric: "starts", value: 420 }],
    });
    expect(ok.success).toBe(true);
  });

  it("requires strategyId + sourceType + a non-empty metrics array", () => {
    expect(IngestSchema.safeParse({ sourceType: "QUIZ", metrics: [{ metric: "x", value: 1 }] }).success).toBe(false);
    expect(IngestSchema.safeParse({ strategyId: STRAT, metrics: [{ metric: "x", value: 1 }] }).success).toBe(false);
    expect(IngestSchema.safeParse({ strategyId: STRAT, sourceType: "QUIZ", metrics: [] }).success).toBe(false);
  });

  it("rejects an out-of-range AARRR stage but allows a stage-less cell", () => {
    expect(
      IngestSchema.safeParse({ strategyId: STRAT, sourceType: "APP", metrics: [{ stage: "GROWTH", metric: "x", value: 1 }] }).success,
    ).toBe(false);
    expect(
      IngestSchema.safeParse({ strategyId: STRAT, sourceType: "APP", metrics: [{ metric: "dau", value: 1 }] }).success,
    ).toBe(true);
  });
});

describe("ADR-0146 — cell routing", () => {
  it("upserts CampaignAARRMetric idempotently: existing → update, absent → create", async () => {
    campaignFindUnique.mockResolvedValue({ strategyId: STRAT });
    // existing row → update
    aarrFindFirst.mockResolvedValueOnce({ id: "m-1" });
    const r1 = await ingestExternalMetric(intent());
    expect(aarrUpdate).toHaveBeenCalledTimes(1);
    expect(aarrCreate).not.toHaveBeenCalled();
    expect((r1.output as { aarrWritten: number }).aarrWritten).toBe(1);

    vi.clearAllMocks();
    signalCreate.mockResolvedValue({ id: "sig-2" });
    campaignFindUnique.mockResolvedValue({ strategyId: STRAT });
    aarrFindFirst.mockResolvedValueOnce(null);
    await ingestExternalMetric(intent());
    expect(aarrCreate).toHaveBeenCalledTimes(1);
    expect(aarrUpdate).not.toHaveBeenCalled();
  });

  it("refuses AARRR write when campaign is NOT this brand (anti-cross-brand)", async () => {
    campaignFindUnique.mockResolvedValue({ strategyId: "other-brand" });
    const r = await ingestExternalMetric(intent());
    expect(aarrUpdate).not.toHaveBeenCalled();
    expect(aarrCreate).not.toHaveBeenCalled();
    const out = r.output as { aarrWritten: number; skipped: Array<{ reason: string }> };
    expect(out.aarrWritten).toBe(0);
    expect(out.skipped.some((s) => /hors de cette marque/.test(s.reason))).toBe(true);
  });

  it("updates MissionActivity.kpiActual only for an in-brand activity", async () => {
    campaignFindUnique.mockResolvedValue({ strategyId: STRAT });
    activityFindUnique.mockResolvedValueOnce({ id: "act-1", mission: { strategyId: STRAT, id: "mis-1" } });
    await ingestExternalMetric(
      intent({ metrics: [{ metric: "leads", value: 42, kpiActivityId: "act-1" }] }),
    );
    expect(activityUpdate).toHaveBeenCalledWith({ where: { id: "act-1" }, data: { kpiActual: 42 } });
  });

  it("refuses KPI write for an activity of another brand", async () => {
    activityFindUnique.mockResolvedValueOnce({ id: "act-x", mission: { strategyId: "other", id: "mis-x" } });
    const r = await ingestExternalMetric(
      intent({ campaignId: null, metrics: [{ metric: "leads", value: 42, kpiActivityId: "act-x" }] }),
    );
    expect(activityUpdate).not.toHaveBeenCalled();
    const out = r.output as { kpiWritten: number };
    expect(out.kpiWritten).toBe(0);
  });

  it("ALWAYS writes an EXTERNAL_METRIC provenance Signal — even for a provenance-only cell", async () => {
    const r = await ingestExternalMetric(
      intent({ campaignId: null, metrics: [{ metric: "raw_count", value: 7 }] }),
    );
    expect(signalCreate).toHaveBeenCalledTimes(1);
    const arg = signalCreate.mock.calls[0]![0] as { data: { type: string; strategyId: string } };
    expect(arg.data.type).toBe("EXTERNAL_METRIC");
    expect(arg.data.strategyId).toBe(STRAT);
    expect((r.output as { signalId: string }).signalId).toBe("sig-1");
    expect(r.status).toBe("OK");
  });
});
