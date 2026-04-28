import { describe, it, expect } from "vitest";
import { getAllManifests, auditManifests, findCapability } from "@/server/governance/registry";

describe("governance registry", () => {
  it("registers at least the 14 core manifests", () => {
    expect(getAllManifests().length).toBeGreaterThanOrEqual(14);
  });

  it("audit reports no issues", () => {
    const audit = auditManifests();
    if (!audit.ok) {
      // Surface the first issues so the failure message is actionable.
      console.error(audit.issues.slice(0, 5));
    }
    expect(audit.ok).toBe(true);
  });

  it("findCapability resolves the V5.4 ranker intents", () => {
    expect(findCapability("RANK_PEERS")?.service).toBe("seshat");
    expect(findCapability("JEHUTY_FEED_REFRESH")?.service).toBe("jehuty");
    expect(findCapability("ENRICH_ORACLE")?.service).toBe("strategy-presentation");
    expect(findCapability("EXPORT_ORACLE")?.service).toBe("strategy-presentation");
  });

  it("every manifest declares a known governor", () => {
    const ok = new Set(["MESTOR", "ARTEMIS", "SESHAT", "THOT", "INFRASTRUCTURE"]);
    for (const m of getAllManifests()) {
      expect(ok.has(m.governor)).toBe(true);
    }
  });
});
