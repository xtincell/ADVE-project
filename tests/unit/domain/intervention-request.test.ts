import { describe, expect, it } from "vitest";
import { interventionState, readInterventionRequest } from "@/domain/intervention-request";
import { INTERVENTION_STATE_CONFIG } from "@/lib/operate-config";

describe("request receipt projection", () => {
  it.each([null, undefined, [], "pending", 42, { status: "CUSTOM" }, { status: 1 }])(
    "does not turn malformed or unknown history into an actionable request: %j", (data) => {
      expect(readInterventionRequest(data).status).toBe("UNKNOWN");
    },
  );
  it("reads existing case variants without rewriting the source receipt", () => {
    const receipt = { status: "pending", retainedEvidence: { source: "old" } };
    expect(readInterventionRequest(receipt).status).toBe("PENDING");
    expect(receipt.status).toBe("pending");
    expect(interventionState("converted")).toBe("CONVERTED");
  });
  it("keeps conversion distinct from historical resolution", () => {
    const converted = readInterventionRequest({ status: "CONVERTED", missionId: "mission-1" });
    expect(converted.status).not.toBe(interventionState("resolved"));
    expect(INTERVENTION_STATE_CONFIG[converted.status].label).toBe("Mission préparée");
    expect(converted.missionId).toBe("mission-1");
    expect(readInterventionRequest({ status: "RESOLVED" }).missionId).toBeNull();
  });
  it("refuses objects as titles, actors and linked mission identities", () => {
    const receipt = readInterventionRequest({ status: "PENDING", title: {}, description: [], missionId: 1, requestedBy: {} });
    expect(receipt).toMatchObject({ title: null, description: null, missionId: null, requestedBy: null });
  });
  it("does not render inherited object keys as urgency or request type labels", () => {
    expect(readInterventionRequest({ status: "PENDING", urgency: "toString", requestType: "__proto__" }))
      .toMatchObject({ urgency: null, requestType: null });
  });
});
