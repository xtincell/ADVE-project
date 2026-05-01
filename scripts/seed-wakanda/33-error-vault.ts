/**
 * WAKANDA SEED — Error vault (Phase 11 wake-up)
 *
 * Réveille Seshat sur l'observabilité runtime via le vault d'erreurs :
 *  - ErrorEvent (~28) : 8 sources × sévérités variées, dont clusters dédupés
 *    (multi-occurrences) et résolus pour exercer le triage admin.
 *  - Couvre : SERVER, CLIENT, PRISMA, NSP, PTAH, STRESS_TEST, CRON, WEBHOOK.
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter, hoursAfter } from "./helpers";

interface Brands {
  bliss: { strategy: { id: string } };
  vibranium: { strategy: { id: string } };
  brew: { strategy: { id: string } };
  panther: { strategy: { id: string } };
  shuri: { strategy: { id: string } };
  jabari: { strategy: { id: string } };
}

function pseudoSig(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return `sig_${(Math.abs(h).toString(16) + "00000000").slice(0, 12)}`;
}

export async function seedErrorVault(prisma: PrismaClient, brands: Brands) {
  const blissId = brands.bliss.strategy.id;
  const vibraniumId = brands.vibranium.strategy.id;

  type ErrorSeverityT = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
  type ErrorSourceT = "SERVER" | "CLIENT" | "PRISMA" | "NSP" | "PTAH" | "STRESS_TEST" | "CRON" | "WEBHOOK" | "UNKNOWN";

  const errors: Array<{
    id: string;
    source: ErrorSourceT;
    severity: ErrorSeverityT;
    code: string;
    message: string;
    route?: string;
    trpcProcedure?: string;
    componentPath?: string;
    occurrences: number;
    firstSeenOffset: number; // hours from T.now
    lastSeenOffset: number;
    resolved?: boolean;
    resolvedReason?: string;
    knownFalsePositive?: boolean;
    operatorId?: string;
    strategyId?: string;
    intentId?: string;
    context?: object;
    stack?: string;
  }> = [
    // SERVER errors
    { id: "wk-err-zod-001", source: "SERVER", severity: "WARN", code: "ZOD_VALIDATION", message: "Invalid input on quickIntake.complete: missing 'businessModel'", route: "/api/trpc/quickIntake.complete", trpcProcedure: "quickIntake.complete", occurrences: 14, firstSeenOffset: -240, lastSeenOffset: -3, context: { fieldPath: "businessModel" } },
    { id: "wk-err-mestor-veto-001", source: "SERVER", severity: "WARN", code: "MESTOR_VETO", message: "Intent PTAH_MATERIALIZE_BRIEF vetoed: MANIPULATION_COHERENCE — mode peddler hors mix [facilitator,entertainer]", route: "/api/trpc/ptah.materialize", trpcProcedure: "ptah.materialize", strategyId: blissId, occurrences: 3, firstSeenOffset: -120, lastSeenOffset: -48, intentId: "wk-intent-bliss-038", context: { vetoReason: "MANIPULATION_COHERENCE", attemptedMode: "peddler" } },
    { id: "wk-err-thot-veto-001", source: "SERVER", severity: "INFO", code: "THOT_DOWNGRADE", message: "Intent EXECUTE_GLORY_SEQUENCE downgraded PRO→BASE: budget cap reached", route: "/api/trpc/artemis.execute", trpcProcedure: "artemis.execute", strategyId: blissId, occurrences: 2, firstSeenOffset: -100, lastSeenOffset: -36, context: { from: "PRO", to: "BASE", remainingUsd: 12.5 } },
    { id: "wk-err-next-500-001", source: "SERVER", severity: "ERROR", code: "NEXT_500", message: "Unhandled error in /cockpit/bliss/oracle: Cannot read property 'sections' of undefined", route: "/cockpit/bliss/oracle", occurrences: 5, firstSeenOffset: -72, lastSeenOffset: -2, resolved: true, resolvedReason: "Fixed in PR #92 — null check added", stack: "TypeError: Cannot read property 'sections' of undefined\n  at OracleView (oracle.tsx:42)\n  at renderToString (server.js:1025)" },

    // PRISMA errors
    { id: "wk-err-prisma-p2002-001", source: "PRISMA", severity: "ERROR", code: "PRISMA_P2002", message: "Unique constraint failed on Strategy.name (operatorId,name)", trpcProcedure: "strategy.create", operatorId: IDS.operator, occurrences: 1, firstSeenOffset: -200, lastSeenOffset: -200, resolved: true, resolvedReason: "User retried with different name" },
    { id: "wk-err-prisma-p2025-001", source: "PRISMA", severity: "ERROR", code: "PRISMA_P2025", message: "Record to update not found: Pillar where strategyId=? key=?", trpcProcedure: "pillar.write", strategyId: vibraniumId, occurrences: 2, firstSeenOffset: -48, lastSeenOffset: -2 },
    { id: "wk-err-prisma-timeout", source: "PRISMA", severity: "WARN", code: "PRISMA_QUERY_TIMEOUT", message: "Query took >5s on IntentEmission scan", occurrences: 7, firstSeenOffset: -160, lastSeenOffset: -1, context: { suggestedIndex: "intentEmission(strategyId, emittedAt)" } },

    // PTAH errors
    { id: "wk-err-ptah-magnific-502", source: "PTAH", severity: "ERROR", code: "PTAH_PROVIDER_502", message: "Magnific returned 502 after 30s timeout — task expired", strategyId: blissId, occurrences: 4, firstSeenOffset: -96, lastSeenOffset: -6, context: { provider: "magnific", taskId: "magnific_task_abc123", forgeKind: "video" } },
    { id: "wk-err-ptah-canva-circuit", source: "PTAH", severity: "CRITICAL", code: "PTAH_CIRCUIT_OPEN", message: "Canva provider circuit breaker OPEN — 5 consecutive failures, cooldown 24h", occurrences: 5, firstSeenOffset: -28, lastSeenOffset: -1, context: { provider: "canva", lastSuccessAt: hoursAfter(T.now, -240).toISOString() } },
    { id: "wk-err-ptah-webhook-bad-secret", source: "PTAH", severity: "WARN", code: "PTAH_WEBHOOK_INVALID_SECRET", message: "Webhook callback rejected — secret mismatch (replay attempt?)", occurrences: 2, firstSeenOffset: -50, lastSeenOffset: -12, knownFalsePositive: false },
    { id: "wk-err-ptah-cdn-download-fail", source: "PTAH", severity: "WARN", code: "PTAH_CDN_DOWNLOAD_FAIL", message: "Failed to download asset from provider before 12h expiry", strategyId: blissId, occurrences: 1, firstSeenOffset: -80, lastSeenOffset: -80, resolved: true, resolvedReason: "Cron download-before-expire repaired" },

    // NSP errors
    { id: "wk-err-nsp-disconnect", source: "NSP", severity: "INFO", code: "NSP_CLIENT_DISCONNECT", message: "Client disconnected mid-stream during EXECUTE_GLORY_SEQUENCE", strategyId: blissId, occurrences: 18, firstSeenOffset: -200, lastSeenOffset: -1, knownFalsePositive: true, resolvedReason: "Network flaps expected" },
    { id: "wk-err-nsp-stream-timeout", source: "NSP", severity: "WARN", code: "NSP_STREAM_TIMEOUT", message: "Stream timeout after 60s with no events emitted", strategyId: vibraniumId, occurrences: 3, firstSeenOffset: -36, lastSeenOffset: -8 },

    // CLIENT errors
    { id: "wk-err-client-csp", source: "CLIENT", severity: "WARN", code: "CSP_VIOLATION", message: "Refused to load https://magnific.example/preview.jpg — img-src directive violated", componentPath: "PtahForgeRunner", occurrences: 6, firstSeenOffset: -90, lastSeenOffset: -12, context: { directive: "img-src", blockedURI: "https://magnific.example/preview.jpg" } },
    { id: "wk-err-client-react-render", source: "CLIENT", severity: "ERROR", code: "REACT_RENDER_ERROR", message: "Hydration mismatch on /cockpit/bliss — server rendered different markup", route: "/cockpit/bliss", componentPath: "BlissDashboard", occurrences: 3, firstSeenOffset: -48, lastSeenOffset: -10, resolved: true, resolvedReason: "Removed Date.now() from initial render" },
    { id: "wk-err-client-trpc-network", source: "CLIENT", severity: "WARN", code: "TRPC_NETWORK_ERROR", message: "Network error contacting trpc — retrying with backoff", route: "/cockpit/bliss/glory", trpcProcedure: "glory.invoke", componentPath: "GloryRunner", occurrences: 22, firstSeenOffset: -180, lastSeenOffset: -1 },

    // STRESS_TEST events
    { id: "wk-err-stress-rate-limit", source: "STRESS_TEST", severity: "WARN", code: "STRESS_RATE_LIMIT", message: "Rate limit hit: 1000 RPS exceeded for 30s window on /api/trpc/seshat.search", trpcProcedure: "seshat.search", occurrences: 1, firstSeenOffset: -10, lastSeenOffset: -10, context: { rps: 1100, window: "30s" } },
    { id: "wk-err-stress-bliss-success", source: "STRESS_TEST", severity: "INFO", code: "STRESS_BLISS_PASS", message: "Stress test BLISS forges passed: 50 forges queued, 49 completed, 1 vetoed (expected)", strategyId: blissId, occurrences: 1, firstSeenOffset: -8, lastSeenOffset: -8, context: { passed: 49, vetoed: 1, failed: 0 } },

    // CRON errors
    { id: "wk-err-cron-jehuty", source: "CRON", severity: "WARN", code: "CRON_JEHUTY_OVERRUN", message: "Jehuty refresh cron took 110s (target <60s)", occurrences: 4, firstSeenOffset: -120, lastSeenOffset: -24, context: { duration: 110_000, target: 60_000 } },
    { id: "wk-err-cron-ptah-expire", source: "CRON", severity: "INFO", code: "CRON_PTAH_DOWNLOAD_OK", message: "Pre-expire download cron: 4 assets downloaded successfully", occurrences: 12, firstSeenOffset: -200, lastSeenOffset: -2, knownFalsePositive: true, resolvedReason: "Informational success log" },

    // WEBHOOK errors
    { id: "wk-err-webhook-stripe-sig", source: "WEBHOOK", severity: "ERROR", code: "WEBHOOK_INVALID_SIGNATURE", message: "Stripe webhook rejected: invalid signature 't,v1' tolerance exceeded", route: "/api/payment/webhook/stripe", occurrences: 2, firstSeenOffset: -200, lastSeenOffset: -120, resolved: true, resolvedReason: "Clock drift — NTP fixed" },
    { id: "wk-err-webhook-cinetpay-replay", source: "WEBHOOK", severity: "WARN", code: "WEBHOOK_REPLAY_DETECTED", message: "CinetPay webhook duplicate event detected — already processed", route: "/api/payment/webhook/cinetpay", occurrences: 5, firstSeenOffset: -150, lastSeenOffset: -36, knownFalsePositive: true, resolvedReason: "CinetPay retries are normal" },

    // CRITICAL recent
    { id: "wk-err-llm-budget-cap", source: "SERVER", severity: "CRITICAL", code: "LLM_BUDGET_CAP", message: "Operator budget cap reached: 250 USD/day exceeded — Thot blocking all costed intents", operatorId: IDS.operator, occurrences: 1, firstSeenOffset: -2, lastSeenOffset: -2 },
    { id: "wk-err-anthropic-overloaded", source: "SERVER", severity: "ERROR", code: "ANTHROPIC_OVERLOADED_529", message: "Anthropic returned 529 Overloaded — failing over to OpenAI cascade", trpcProcedure: "artemis.invoke", occurrences: 8, firstSeenOffset: -50, lastSeenOffset: -1 },
    { id: "wk-err-rag-no-results", source: "SERVER", severity: "INFO", code: "RAG_EMPTY_RESULT", message: "RAG search returned 0 results for 'expansion Lagos' — fallback to LLM-only", trpcProcedure: "seshat.search", strategyId: blissId, occurrences: 6, firstSeenOffset: -60, lastSeenOffset: -3, knownFalsePositive: true, resolvedReason: "RAG hot-warm-up phase, expected" },
    { id: "wk-err-pillar-stale", source: "SERVER", severity: "WARN", code: "PILLAR_STALE", message: "Pillar V on strategy=jabari is stale (>30 days unchanged)", strategyId: brands.jabari.strategy.id, occurrences: 1, firstSeenOffset: -24, lastSeenOffset: -24, context: { pillarKey: "v", lastUpdate: daysAfter(T.now, -34).toISOString() } },
  ];

  for (const e of errors) {
    const sig = pseudoSig(`${e.source}|${e.code}|${e.message}`);
    const firstSeenAt = hoursAfter(T.now, e.firstSeenOffset);
    const lastSeenAt = hoursAfter(T.now, e.lastSeenOffset);
    await prisma.errorEvent.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        source: e.source,
        severity: e.severity,
        code: e.code,
        message: e.message,
        stack: e.stack ?? null,
        route: e.route ?? null,
        userId: null,
        operatorId: e.operatorId ?? IDS.operator,
        strategyId: e.strategyId ?? null,
        intentId: e.intentId ?? null,
        trpcProcedure: e.trpcProcedure ?? null,
        componentPath: e.componentPath ?? null,
        userAgent: e.source === "CLIENT" ? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/121.0" : null,
        signature: sig,
        occurrences: e.occurrences,
        firstSeenAt,
        lastSeenAt,
        resolved: e.resolved ?? false,
        resolvedAt: e.resolved ? lastSeenAt : null,
        resolvedById: e.resolved ? IDS.userAmara : null,
        resolvedReason: e.resolvedReason ?? null,
        knownFalsePositive: e.knownFalsePositive ?? false,
        context: (e.context ?? null) as Prisma.InputJsonValue | null,
        createdAt: firstSeenAt,
      },
    });
    track("ErrorEvent");
  }

  console.log(`  [OK] Error vault: ${errors.length} events across 8 sources, dedup signatures wired`);
}
