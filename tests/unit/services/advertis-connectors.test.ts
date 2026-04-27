import { describe, it, expect } from "vitest";
import { MondayConnector } from "@/server/services/advertis-connectors/monday";
import { ZohoConnector } from "@/server/services/advertis-connectors/zoho";
import { tools as advertisInboundTools } from "@/server/mcp/advertis-inbound";
import { PillarSignalSchema } from "@/lib/types/pillar-signal";

// ---------------------------------------------------------------------------
// Pure mapping logic — no DB, no network, no env
// ---------------------------------------------------------------------------

describe("MondayConnector.mapEventToSignals", () => {
  const monday = new MondayConnector();

  function item(overrides: Record<string, unknown> = {}) {
    return {
      id: "item-1",
      name: "Implement feature X",
      state: "active",
      updated_at: new Date().toISOString(),
      column_values: [],
      board: { id: "board-1", name: "Sprint board" },
      ...overrides,
    };
  }

  it("status_change to 'Done' emits velocity signal on pillar e", () => {
    const signals = monday.mapEventToSignals({
      eventType: "status_change",
      item: item({
        column_values: [
          { id: "c1", title: "Status", type: "status", text: "Done", value: null },
        ],
      }),
    });

    expect(signals).toHaveLength(1);
    expect(signals[0]!.pillarKey).toBe("e");
    expect(signals[0]!.driver).toBe("monday-velocity");
    expect(signals[0]!.source).toBe("EXTERNAL_SAAS");
    expect(signals[0]!.externalRef).toBe("monday:item:item-1");
    expect(PillarSignalSchema.safeParse(signals[0]).success).toBe(true);
  });

  it("status_change with French 'terminé' is detected as done", () => {
    const signals = monday.mapEventToSignals({
      eventType: "status_change",
      item: item({
        column_values: [
          { id: "c1", title: "Statut", type: "status", text: "Terminé", value: null },
        ],
      }),
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]!.pillarKey).toBe("e");
  });

  it("status_change to 'In Progress' emits no signal", () => {
    const signals = monday.mapEventToSignals({
      eventType: "status_change",
      item: item({
        column_values: [
          { id: "c1", title: "Status", type: "status", text: "In Progress", value: null },
        ],
      }),
    });
    expect(signals).toHaveLength(0);
  });

  it("timeline_overdue with past date emits blocker signal on pillar r with daysLate", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const signals = monday.mapEventToSignals({
      eventType: "timeline_overdue",
      item: item({
        column_values: [
          { id: "c2", title: "Timeline", type: "timeline", text: "", value: JSON.stringify({ to: tenDaysAgo }) },
        ],
      }),
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]!.pillarKey).toBe("r");
    expect(signals[0]!.driver).toBe("monday-blocker");
    const value = signals[0]!.value as { daysLate: number };
    expect(value.daysLate).toBeGreaterThanOrEqual(9);
  });

  it("timeline_overdue with future date emits no signal", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const signals = monday.mapEventToSignals({
      eventType: "timeline_overdue",
      item: item({
        column_values: [
          { id: "c2", title: "Timeline", type: "timeline", text: "", value: JSON.stringify({ to: tomorrow }) },
        ],
      }),
    });
    expect(signals).toHaveLength(0);
  });

  it("wip_snapshot emits WIP signal on pillar s with parsed count", () => {
    const signals = monday.mapEventToSignals({
      eventType: "wip_snapshot",
      item: item({
        column_values: [
          { id: "c3", title: "WIP", type: "numbers", text: "7", value: null },
        ],
      }),
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]!.pillarKey).toBe("s");
    expect(signals[0]!.driver).toBe("monday-wip");
    expect((signals[0]!.value as { wipCount: number }).wipCount).toBe(7);
  });

  it("wip_snapshot with missing column defaults wipCount to 0", () => {
    const signals = monday.mapEventToSignals({
      eventType: "wip_snapshot",
      item: item({ column_values: [] }),
    });
    expect((signals[0]!.value as { wipCount: number }).wipCount).toBe(0);
  });
});

describe("ZohoConnector.mapEventToSignals", () => {
  const zoho = new ZohoConnector();

  function deal(overrides: Record<string, unknown> = {}) {
    return {
      id: "deal-42",
      Deal_Name: "Acme — POC",
      Stage: "Qualification",
      Amount: 5000,
      Probability: 30,
      Closing_Date: "2026-06-01",
      Modified_Time: "2026-04-27 12:00:00",
      Owner: { id: "user-1", name: "Sales Rep" },
      ...overrides,
    };
  }

  it("deal_won emits high-confidence verified signal on pillar t", () => {
    const signals = zoho.mapEventToSignals({
      eventType: "deal_won",
      deal: deal({ Stage: "Closed Won", Amount: 12000 }),
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]!.pillarKey).toBe("t");
    expect(signals[0]!.driver).toBe("zoho-conversion");
    expect(signals[0]!.confidence).toBe(0.85);
    expect((signals[0]!.value as { amount: number }).amount).toBe(12000);
    expect(PillarSignalSchema.safeParse(signals[0]).success).toBe(true);
  });

  it("deal_lost emits loss signal on pillar r with reason", () => {
    const signals = zoho.mapEventToSignals({
      eventType: "deal_lost",
      deal: deal({ Stage: "Closed Lost", Lost_Reason: "Budget" }),
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]!.pillarKey).toBe("r");
    expect(signals[0]!.driver).toBe("zoho-loss");
    expect((signals[0]!.value as { reason: string }).reason).toBe("Budget");
  });

  it("deal_lost without Lost_Reason falls back to 'Non spécifié'", () => {
    const signals = zoho.mapEventToSignals({
      eventType: "deal_lost",
      deal: deal({ Stage: "Closed Lost", Lost_Reason: undefined }),
    });
    expect((signals[0]!.value as { reason: string }).reason).toBe("Non spécifié");
  });

  it("stage_change emits pipeline signal on pillar v with stage + amount + probability", () => {
    const signals = zoho.mapEventToSignals({
      eventType: "stage_change",
      deal: deal({ Stage: "Negotiation", Amount: 8000, Probability: 75 }),
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]!.pillarKey).toBe("v");
    expect(signals[0]!.driver).toBe("zoho-pipeline");
    const v = signals[0]!.value as { stage: string; probability: number };
    expect(v.stage).toBe("Negotiation");
    expect(v.probability).toBe(75);
  });

  it("amount=null defaults to 0 in emitted signal", () => {
    const signals = zoho.mapEventToSignals({
      eventType: "deal_won",
      deal: deal({ Amount: null, Stage: "Closed Won" }),
    });
    expect((signals[0]!.value as { amount: number }).amount).toBe(0);
  });
});

describe("advertis-inbound MCP tools", () => {
  it("exposes the four expected tools", () => {
    const names = advertisInboundTools.map((t) => t.name).sort();
    expect(names).toEqual([
      "getConnectorStatus",
      "ingestBatch",
      "ingestPillarSignal",
      "listPillarMappings",
    ]);
  });

  it("listPillarMappings returns Monday + Zoho mappings", async () => {
    const tool = advertisInboundTools.find((t) => t.name === "listPillarMappings");
    expect(tool).toBeDefined();
    const result = (await tool!.handler({})) as {
      pillarKeys: readonly string[];
      supportedConnectors: { type: string; mappings: { pillarKey: string; driver: string }[] }[];
    };

    const mondayDrivers = result.supportedConnectors
      .find((c) => c.type === "monday")!
      .mappings.map((m) => m.driver);
    expect(mondayDrivers).toContain("monday-velocity");
    expect(mondayDrivers).toContain("monday-blocker");
    expect(mondayDrivers).toContain("monday-wip");

    const zohoDrivers = result.supportedConnectors
      .find((c) => c.type === "zoho")!
      .mappings.map((m) => m.driver);
    expect(zohoDrivers).toContain("zoho-pipeline");
    expect(zohoDrivers).toContain("zoho-conversion");
    expect(zohoDrivers).toContain("zoho-loss");

    // Every mapping pillarKey must be a valid PILLAR_KEYS entry
    for (const conn of result.supportedConnectors) {
      for (const m of conn.mappings) {
        expect(result.pillarKeys).toContain(m.pillarKey);
      }
    }
  });

  it("ingestPillarSignal tool has a Zod input schema that validates a sample signal", () => {
    const tool = advertisInboundTools.find((t) => t.name === "ingestPillarSignal");
    expect(tool).toBeDefined();
    const sample = {
      pillarKey: "e",
      driver: "monday-velocity",
      value: { completed: true },
      source: "EXTERNAL_SAAS",
      confidence: 0.7,
      strategyId: "strategy-1",
    };
    expect(tool!.inputSchema.safeParse(sample).success).toBe(true);
  });
});
