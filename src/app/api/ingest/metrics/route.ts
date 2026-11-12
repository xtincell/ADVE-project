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
 * Corps accepté : le contrat ADR-0146, ou `{ strategyId, receipt }` pour un reçu
 * DataCollector exporté (vérifié, puis converti dans ce même contrat).
 */

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  authenticateMcpRequest,
  meterMcp,
  type McpAuthResult,
} from "@/server/services/anubis/mcp-billing";
import { IngestSchema, type IngestPayload } from "./schema";
import {
  DatacollectorDepositSchema, datacollectorReceiptToIngest, readDatacollectorReceipt,
} from "@/domain/datacollector-receipt";

/**
 * Dépôt d'un reçu DataCollector exporté (`{ strategyId, receipt }`, DC3 Shinkiro) :
 * enveloppe et empreinte vérifiées, puis même contrat et même Intent que les autres
 * sources. Aucun service DataCollector n'est appelé.
 */
function readBody(raw: unknown): { ok: true; body: IngestPayload } | { ok: false; response: Response } {
  const issues = (list: ReadonlyArray<{ path: PropertyKey[]; message: string }>) => list.map((i) => ({ path: i.path, message: i.message }));
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw) && "receipt" in raw) {
    const deposit = DatacollectorDepositSchema.safeParse(raw);
    if (!deposit.success) {
      return { ok: false, response: NextResponse.json({ error: "VALIDATION_FAILED", issues: issues(deposit.error.issues) }, { status: 400 }) };
    }
    const reading = readDatacollectorReceipt(deposit.data.receipt);
    if (!reading.ok) {
      return { ok: false, response: NextResponse.json(
        { error: reading.code, detail: reading.detail, ...(reading.issues ? { issues: reading.issues } : {}) },
        { status: 400 },
      ) };
    }
    try {
      return { ok: true, body: datacollectorReceiptToIngest(deposit.data.strategyId, reading.receipt) };
    } catch {
      return { ok: false, response: NextResponse.json({ error: "RECEIPT_INVALID", detail: "Reçu non convertible dans le contrat d'observation." }, { status: 400 }) };
    }
  }
  const parsed = IngestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: NextResponse.json({ error: "VALIDATION_FAILED", issues: issues(parsed.error.issues) }, { status: 400 }) };
  }
  return { ok: true, body: parsed.data };
}

export async function POST(request: Request) {
  // 1) Auth — token MCP scopé / ADMIN d'abord ; sinon CRON_SECRET interne.
  // Avant toute lecture du corps : un appelant anonyme reçoit 401 et
  // n'apprend rien du contrat par les messages de validation.
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

  // 2) Corps — lu et validé seulement pour un appelant authentifié.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const read = readBody(raw);
  if (!read.ok) return read.response;
  const body = read.body;

  // 3) Garde de portée — un token BRAND ne pousse QUE sa marque (fail-closed).
  if (scopeKind === "BRAND" && scopeStrategyId !== body.strategyId) {
    return NextResponse.json(
      { error: "SCOPE_DENIED", detail: "Ce token est limité à une autre marque." },
      { status: 403 },
    );
  }

  // 4) Émission gouvernée (spine + cost-gate + audit). Metering si clé API.
  const emit = async () => {
    const { emitIntent } = await import("@/server/services/mestor/intents");
    const result = await emitIntent(
      {
        ...body,
        kind: "INGEST_EXTERNAL_METRIC",
        operatorId,
      },
      { caller: "api:ingest:metrics" },
    );
    if (result.status !== "OK") return {
      httpStatus: result.reason === "STRATEGY_NOT_FOUND" ? 404 : result.status === "VETOED" ? 409 : 500,
      error: result.reason ?? result.status, detail: result.summary,
    };
    return { httpStatus: 200, result: result.output };
  };

  try {
    const { httpStatus, ...result } = gate?.apiKeyId
      ? await meterMcp(gate, "ingest", "metrics", emit)
      : await emit();
    return NextResponse.json(result, { status: httpStatus });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
