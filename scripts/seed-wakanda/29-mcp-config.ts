/**
 * WAKANDA SEED — Batch 6b: MCP config + billing (ADR-0092 / ADR-0026).
 *
 * Irrigue « billing MCP » : `McpServerConfig` (serveurs agrégés `/api/mcp`),
 * `McpApiKey` (clé facturable d'un partenaire), `McpApiCall` (metering par appel),
 * `McpUsageStatement` (relevé mensuel gelé), `McpRegistry`/`McpToolInvocation`
 * (client MCP entrant bidirectionnel). Invocations externes en MOCK honnête.
 *
 * Déterministe.
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter } from "./helpers";

export async function seedMcpConfig(prisma: PrismaClient) {
  // ── Server configs (serveurs MCP exposés / agrégés) ──────────────────
  const servers: Array<{ id: string; name: string; description: string; enabled: boolean }> = [
    { id: "wk-mcp-srv-higgsfield", name: "higgsfield", description: "Higgsfield MCP (DoP / Soul / Steal) — OAuth device flow.", enabled: true },
    { id: "wk-mcp-srv-slack", name: "slack", description: "Slack MCP entrant (notifications + commandes).", enabled: true },
    { id: "wk-mcp-srv-notion", name: "notion", description: "Notion MCP entrant (sync briefs).", enabled: false },
  ];
  for (const s of servers) {
    await prisma.mcpServerConfig.upsert({
      where: { serverName: s.name },
      update: {},
      create: {
        id: s.id,
        serverName: s.name,
        description: s.description,
        isEnabled: s.enabled,
        config: { _mocked: true } as Prisma.InputJsonValue,
        lastHealthStatus: s.enabled ? "OK" : null,
        lastHealthCheck: s.enabled ? daysAfter(T.now, -1) : null,
      },
    });
    track("McpServerConfig");
  }

  // ── API key facturable (partenaire intégrateur) ──────────────────────
  const apiKey = await prisma.mcpApiKey.upsert({
    where: { keyHash: "wk-mcp-key-hash-partner" },
    update: {},
    create: {
      id: "wk-mcp-key-partner",
      name: "Intégrateur Vibranium Labs",
      keyHash: "wk-mcp-key-hash-partner",
      server: "aggregate",
      permissions: { tools: ["*"], readOnly: false } as Prisma.InputJsonValue,
      isActive: true,
      ratePerCallUsd: 0.002,
      includedMonthlyCalls: 100,
      ownerEmail: "billing@vibraniumlabs.wk",
      lastUsedAt: daysAfter(T.now, -1),
      createdAt: daysAfter(T.now, -45),
    },
  });
  track("McpApiKey");

  // ── API calls (metering) — facturables (apiKey) + admin (gratuits) ───
  const calls: Array<{ id: string; tool: string; status: string; billable: boolean; daysAgo: number }> = [
    { id: "wk-mcp-call-01", tool: "oracle.assembleOracle", status: "OK", billable: true, daysAgo: 30 },
    { id: "wk-mcp-call-02", tool: "campaignTracker.runAttributionCalibration", status: "OK", billable: true, daysAgo: 28 },
    { id: "wk-mcp-call-03", tool: "glory.executeHybrid", status: "OK", billable: true, daysAgo: 20 },
    { id: "wk-mcp-call-04", tool: "notoria.getDashboard", status: "OK", billable: true, daysAgo: 10 },
    { id: "wk-mcp-call-05", tool: "pillar.previewAmend", status: "ERROR", billable: true, daysAgo: 5 },
    { id: "wk-mcp-call-admin", tool: "console.health", status: "OK", billable: false, daysAgo: 2 },
  ];
  let billableCount = 0;
  for (const c of calls) {
    await prisma.mcpApiCall.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        apiKeyId: c.billable ? apiKey.id : null,
        userId: c.billable ? null : IDS.userWkabi,
        server: "aggregate",
        tool: c.tool,
        status: c.status,
        durationMs: 1200 + ((c.daysAgo * 37) % 800),
        costUsd: c.billable && c.status === "OK" ? 0.002 : 0,
        createdAt: daysAfter(T.now, -c.daysAgo),
      },
    });
    if (c.billable && c.status === "OK") billableCount++;
    track("McpApiCall");
  }

  // ── Usage statement (relevé mensuel gelé) ────────────────────────────
  await prisma.mcpUsageStatement.upsert({
    where: { apiKeyId_period: { apiKeyId: apiKey.id, period: "2026-04" } },
    update: {},
    create: {
      id: "wk-mcp-statement-202604",
      apiKeyId: apiKey.id,
      period: "2026-04",
      callCount: calls.filter((c) => c.billable).length,
      billableCalls: billableCount,
      costUsd: billableCount * 0.002,
      currency: "USD",
      status: "ISSUED",
      issuedAt: T.now,
    },
  });
  track("McpUsageStatement");

  // ── Registry (client MCP entrant bidirectionnel) + invocations ───────
  const registry = await prisma.mcpRegistry.upsert({
    where: { operatorId_direction_serverName: { operatorId: IDS.operator, direction: "INBOUND", serverName: "slack" } },
    update: {},
    create: {
      id: "wk-mcp-registry-slack",
      operatorId: IDS.operator,
      direction: "INBOUND",
      serverName: "slack",
      endpoint: "https://slack.example.wk/mcp",
      credentialRef: "wk-connector-slack",
      toolsCache: { tools: ["slack_send_message", "slack_read_channel"], _mocked: true } as Prisma.InputJsonValue,
      status: "ACTIVE",
      lastSyncAt: daysAfter(T.now, -1),
    },
  });
  track("McpRegistry");

  const invocations: Array<{ id: string; tool: string; status: string }> = [
    { id: "wk-mcp-inv-01", tool: "slack_send_message", status: "OK" },
    { id: "wk-mcp-inv-02", tool: "slack_read_channel", status: "OK" },
  ];
  for (const inv of invocations) {
    await prisma.mcpToolInvocation.upsert({
      where: { id: inv.id },
      update: {},
      create: {
        id: inv.id,
        registryId: registry.id,
        toolName: inv.tool,
        inputs: { _mocked: true, channel: "#wakanda-ops" } as Prisma.InputJsonValue,
        output: { ok: true, _mocked: true } as Prisma.InputJsonValue,
        status: inv.status,
        durationMs: 340,
        createdAt: daysAfter(T.now, -1),
      },
    });
    track("McpToolInvocation");
  }

  console.log(
    `[OK] MCP: ${servers.length} servers + 1 API key + ${calls.length} calls + 1 statement + 1 registry + ${invocations.length} invocations`,
  );
}
