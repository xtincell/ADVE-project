export const dynamic = "force-dynamic";
/**
 * Endpoint d'ingestion de métriques externes AGNOSTIQUE (ADR-0146).
 *
 * POST /api/ingest/metrics — une source d'activité (quiz, app, CRM, newsletter,
 * terrain, webhook) pousse des chiffres RÉELS dans La Fusée. Le contrat est
 * générique : n'importe quelle marque, n'importe quel canal.
 *
 * Auth (précédence) :
 *   1. Token MCP scopé `x-api-key` (serveur `ingest` ou `*`) OU session ADMIN
 *      → `authenticateMcpRequest`. Un token BRAND ne pousse QUE sa marque
 *      (fail-closed : SCOPE_DENIED si strategyId ≠ portée). Call FACTURÉ (metering).
 *   2. Sinon `Authorization: Bearer <CRON_SECRET>` → source interne SYSTEM
 *      (cron/pull). Non facturé.
 *
 * Zéro LLM, zéro fabrication. La route ne fait qu'authentifier + garder la
 * portée + émettre l'Intent gouverné `INGEST_EXTERNAL_METRIC` (spine + audit).
 */

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  authenticateMcpRequest,
  meterAndRun,
  type McpAuthResult,
} from "@/server/services/anubis/mcp-billing";
import { IngestSchema } from "./schema";

export async function POST(request: Request) {
  // 1) Corps
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = IngestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_FAILED", issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // 2) Auth — token MCP scopé / ADMIN d'abord ; sinon CRON_SECRET interne.
  let scopeKind: "SYSTEM" | "BRAND" = "SYSTEM";
  let scopeStrategyId: string | null = null;
  let operatorId = "cron:ingest";
  let gate: McpAuthResult | null = await authenticateMcpRequest(request, "ingest");
  if (gate.ok) {
    scopeKind = gate.scopeKind ?? "SYSTEM";
    scopeStrategyId = gate.scopeStrategyId ?? null;
    operatorId = gate.userId ? gate.userId : gate.apiKeyId ? `mcp:${gate.apiKeyId}` : "mcp:agent";
  } else if (verifyCronSecret(request)) {
    gate = null; // source interne, non facturée
  } else {
    return gate.response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3) Garde de portée — un token BRAND ne pousse QUE sa marque (fail-closed).
  if (scopeKind === "BRAND" && scopeStrategyId !== body.strategyId) {
    return NextResponse.json(
      { error: "SCOPE_DENIED", detail: "Ce token est limité à une autre marque." },
      { status: 403 },
    );
  }

  // 4) Émission gouvernée (spine + cost-gate + audit). Metering si clé API.
  const emit = async () => {
    const { emitIntentTyped } = await import("@/server/services/mestor/intents");
    return emitIntentTyped(
      {
        kind: "INGEST_EXTERNAL_METRIC",
        strategyId: body.strategyId,
        operatorId,
        sourceType: body.sourceType,
        sourceLabel: body.sourceLabel ?? null,
        campaignId: body.campaignId ?? null,
        missionId: body.missionId ?? null,
        period: body.period ?? null,
        metrics: body.metrics.map((m) => ({
          stage: m.stage ?? null,
          metric: m.metric,
          value: m.value,
          target: m.target ?? null,
          kpiActivityId: m.kpiActivityId ?? null,
        })),
      },
      { caller: "api:ingest:metrics" },
    );
  };

  if (gate?.apiKeyId) {
    return meterAndRun(gate, "ingest", "metrics", emit);
  }
  try {
    const result = await emit();
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
