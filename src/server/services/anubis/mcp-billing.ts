/**
 * ANUBIS — MCP Billing (Vague 5 mégasprint : « les serveurs MCP doivent être
 * armés et billable : je dois pouvoir facturer ma plateforme via les calls
 * d'API »).
 *
 * Trois briques, toutes déterministes (aucun LLM dans le chemin de
 * facturation — invariant I-22 du Cahier des charges Ch.6 transposé à l'API) :
 *
 *   1. `authenticateMcpRequest` — gate dual unique pour TOUTES les routes
 *      /api/mcp/* : session ADMIN (usage interne, tracé non facturé) OU
 *      `x-api-key` (client externe, facturé). Mutualise la validation qui
 *      vivait en local dans advertis-inbound.
 *   2. `recordMcpCall` — metering à la frontière HTTP : 1 row `McpApiCall`
 *      par invocation (Q1 traçabilité). Source de vérité UNIQUE du billing.
 *   3. Relevés (`getCurrentUsage` / `issueStatement` / `settleStatement`) —
 *      billable = max(0, calls − franchise mensuelle) × tarif par call,
 *      gelé à l'émission dans `McpUsageStatement`.
 *
 * Le règlement d'un relevé passe par les payment providers existants
 * (CinetPay/Stripe/PayPal) — `paymentRef` relie le relevé au paiement.
 */

import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";

// ── Auth ───────────────────────────────────────────────────────────────

export interface McpAuthResult {
  ok: boolean;
  response?: NextResponse;
  /** Présent si authentifié par x-api-key (call FACTURABLE). */
  apiKeyId?: string;
  /** Tarif par call de la clé (évite une relecture au metering). */
  ratePerCallUsd?: number;
  /** Présent si authentifié par session ADMIN (call interne, non facturé). */
  userId?: string;
  /** Portée d'accès (ADR-0145). SYSTEM = tout l'OS ; BRAND = une seule marque. */
  scopeKind?: "SYSTEM" | "BRAND";
  /** Si scopeKind=BRAND : la seule stratégie touchable (sinon null/absent). */
  scopeStrategyId?: string | null;
}

/**
 * Gate dual session-ADMIN | x-api-key pour toutes les routes /api/mcp/*.
 * `serverName` scope la clé ("*" = wildcard). Les clés expirées/inactives
 * sont refusées. `lastUsedAt` est rafraîchi best-effort.
 */
export async function authenticateMcpRequest(
  request: Request,
  serverName: string,
): Promise<McpAuthResult> {
  // 1) Session ADMIN (Console / opérateur interne)
  const session = await auth();
  if (session?.user?.role === "ADMIN") {
    return { ok: true, userId: session.user.id, scopeKind: "SYSTEM" };
  }

  // 2) x-api-key (client externe facturé)
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    const keyHash = createHash("sha256").update(apiKey).digest("hex");
    const record = await db.mcpApiKey.findUnique({ where: { keyHash } });
    if (
      record &&
      record.isActive &&
      (record.server === serverName || record.server === "*") &&
      (!record.expiresAt || record.expiresAt > new Date())
    ) {
      db.mcpApiKey
        .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});
      return {
        ok: true,
        apiKeyId: record.id,
        ratePerCallUsd: record.ratePerCallUsd,
        scopeKind: record.scopeKind === "BRAND" ? "BRAND" : "SYSTEM",
        scopeStrategyId: record.scopeStrategyId,
      };
    }
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: "Unauthorized — requires ADMIN session or valid x-api-key for this server" },
      { status: 401 },
    ),
  };
}

// ── Metering ───────────────────────────────────────────────────────────

export interface RecordMcpCallInput {
  apiKeyId?: string;
  userId?: string;
  ratePerCallUsd?: number;
  server: string;
  tool: string;
  status: "OK" | "ERROR" | "DENIED";
  durationMs?: number;
}

/**
 * Écrit la row de metering. Best-effort assumé côté caller (le metering ne
 * doit jamais faire échouer un call métier) — mais la fonction elle-même ne
 * masque pas ses erreurs : c'est au call-site de décider.
 *
 * costUsd par call = tarif de la clé pour les calls API-key (la franchise
 * mensuelle s'applique au RELEVÉ, pas au call) ; 0 pour les calls session.
 */
export async function recordMcpCall(input: RecordMcpCallInput): Promise<void> {
  await db.mcpApiCall.create({
    data: {
      apiKeyId: input.apiKeyId ?? null,
      userId: input.userId ?? null,
      server: input.server,
      tool: input.tool,
      status: input.status,
      durationMs: input.durationMs ?? null,
      costUsd: input.apiKeyId ? input.ratePerCallUsd ?? 0 : 0,
    },
  });
}

/**
 * Exécute + mètre un call MCP déjà authentifié (succès comme échec).
 * Retourne la NextResponse prête. Usage type dans une route :
 *
 *   const gate = await authenticateMcpRequest(request, "artemis");
 *   if (!gate.ok) return gate.response!;
 *   ...lookup handler (400 si inconnu)...
 *   return meterAndRun(gate, "artemis", tool, () => handler(params ?? {}));
 */
export async function meterAndRun(
  gate: McpAuthResult,
  server: string,
  tool: string,
  fn: () => Promise<unknown>,
): Promise<NextResponse> {
  const started = Date.now();
  try {
    const result = await fn();
    recordMcpCall({
      apiKeyId: gate.apiKeyId,
      userId: gate.userId,
      ratePerCallUsd: gate.ratePerCallUsd,
      server,
      tool,
      status: "OK",
      durationMs: Date.now() - started,
    }).catch((err) => console.warn("[mcp-billing] metering failed:", err instanceof Error ? err.message : err));
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recordMcpCall({
      apiKeyId: gate.apiKeyId,
      userId: gate.userId,
      ratePerCallUsd: gate.ratePerCallUsd,
      server,
      tool,
      status: "ERROR",
      durationMs: Date.now() - started,
    }).catch(() => {});
    console.error(`[mcp/${server}] error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Période courante (UTC, déterministe) ───────────────────────────────

export function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodBounds(period: string): { start: Date; end: Date } {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) throw new Error(`Période invalide: ${period} (attendu YYYY-MM)`);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}

// ── Relevés ────────────────────────────────────────────────────────────

export interface UsageSummary {
  apiKeyId: string;
  period: string;
  callCount: number;
  includedMonthlyCalls: number;
  billableCalls: number;
  ratePerCallUsd: number;
  costUsd: number;
}

/** Usage live d'une clé sur une période — agrégat des McpApiCall (OK+ERROR). */
export async function getCurrentUsage(apiKeyId: string, period = currentPeriod()): Promise<UsageSummary> {
  const key = await db.mcpApiKey.findUniqueOrThrow({ where: { id: apiKeyId } });
  const { start, end } = periodBounds(period);
  const callCount = await db.mcpApiCall.count({
    where: { apiKeyId, createdAt: { gte: start, lt: end }, status: { in: ["OK", "ERROR"] } },
  });
  const billableCalls = Math.max(0, callCount - key.includedMonthlyCalls);
  const costUsd = Math.round(billableCalls * key.ratePerCallUsd * 10000) / 10000;
  return {
    apiKeyId,
    period,
    callCount,
    includedMonthlyCalls: key.includedMonthlyCalls,
    billableCalls,
    ratePerCallUsd: key.ratePerCallUsd,
    costUsd,
  };
}

/**
 * Gèle le relevé d'une période (idempotent : refuse si déjà émis).
 * À appeler en début de mois suivant pour le mois clos — déclencheur
 * opérateur Console (pas de cron sur le plan Vercel).
 */
export async function issueStatement(apiKeyId: string, period: string): Promise<{ id: string; costUsd: number }> {
  const existing = await db.mcpUsageStatement.findUnique({
    where: { apiKeyId_period: { apiKeyId, period } },
  });
  if (existing) throw new Error(`Relevé déjà émis pour ${period} (status ${existing.status}).`);

  const usage = await getCurrentUsage(apiKeyId, period);
  const statement = await db.mcpUsageStatement.create({
    data: {
      apiKeyId,
      period,
      callCount: usage.callCount,
      billableCalls: usage.billableCalls,
      costUsd: usage.costUsd,
      status: usage.costUsd > 0 ? "ISSUED" : "WAIVED",
    },
  });
  return { id: statement.id, costUsd: statement.costUsd };
}

/** Marque un relevé réglé en le reliant à sa référence de paiement. */
export async function settleStatement(statementId: string, paymentRef: string): Promise<void> {
  const st = await db.mcpUsageStatement.findUniqueOrThrow({ where: { id: statementId } });
  if (st.status === "SETTLED") throw new Error("Relevé déjà réglé.");
  await db.mcpUsageStatement.update({
    where: { id: statementId },
    data: { status: "SETTLED", settledAt: new Date(), paymentRef },
  });
}

// ── Gestion des clés ───────────────────────────────────────────────────

/**
 * Crée une clé API : retourne le secret EN CLAIR UNE SEULE FOIS (seul le
 * hash SHA-256 est persisté). Format `lfk_<48 hex>`.
 */
export async function createApiKey(input: {
  name: string;
  server: string; // nom de serveur MCP ou "*"
  ratePerCallUsd?: number;
  includedMonthlyCalls?: number;
  ownerEmail?: string;
  expiresAt?: Date;
  scopeKind?: "SYSTEM" | "BRAND";
  scopeStrategyId?: string | null;
}): Promise<{ id: string; plaintextKey: string }> {
  const plaintextKey = `lfk_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(plaintextKey).digest("hex");
  const scopeKind = input.scopeKind === "BRAND" ? "BRAND" : "SYSTEM";
  const record = await db.mcpApiKey.create({
    data: {
      name: input.name,
      keyHash,
      server: input.server,
      ratePerCallUsd: input.ratePerCallUsd ?? 0.002,
      includedMonthlyCalls: input.includedMonthlyCalls ?? 100,
      ownerEmail: input.ownerEmail ?? null,
      expiresAt: input.expiresAt ?? null,
      scopeKind,
      // BRAND sans marque = incohérent → on refuse silencieusement le scope (reste SYSTEM serait pire) ;
      // le routeur valide la présence de scopeStrategyId AVANT d'appeler (source de vérité de la garde).
      scopeStrategyId: scopeKind === "BRAND" ? input.scopeStrategyId ?? null : null,
    },
  });
  return { id: record.id, plaintextKey };
}

/**
 * Rotation (ADR-0145) : mint un NOUVEAU secret en copiant la config de l'ancien
 * (name/server/scope/billing/expiry), puis désactive l'ancien et inscrit son
 * lineage (rotatedToId/rotatedAt). Le nouveau secret n'est retourné qu'UNE fois.
 * Transaction — jamais deux clés actives pour la même rotation.
 */
export async function rotateApiKey(keyId: string): Promise<{ id: string; plaintextKey: string }> {
  const old = await db.mcpApiKey.findUniqueOrThrow({ where: { id: keyId } });
  const plaintextKey = `lfk_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(plaintextKey).digest("hex");
  const created = await db.$transaction(async (tx) => {
    const fresh = await tx.mcpApiKey.create({
      data: {
        name: old.name,
        keyHash,
        server: old.server,
        ratePerCallUsd: old.ratePerCallUsd,
        includedMonthlyCalls: old.includedMonthlyCalls,
        ownerEmail: old.ownerEmail,
        expiresAt: old.expiresAt,
        scopeKind: old.scopeKind,
        scopeStrategyId: old.scopeStrategyId,
      },
    });
    await tx.mcpApiKey.update({
      where: { id: old.id },
      data: { isActive: false, rotatedToId: fresh.id, rotatedAt: new Date() },
    });
    return fresh;
  });
  return { id: created.id, plaintextKey };
}
