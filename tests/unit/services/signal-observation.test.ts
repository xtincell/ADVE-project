import { describe, expect, it } from "vitest";
import { signalObservation } from "@/domain/signal-observation";
import { mapSignalToFeedItem } from "@/server/services/jehuty/mappers";
describe("signal observation shared by manual reading and assisted request", () => {
  it("renders score-change data as the same factual observation consumed by the assisted path", () => {
    const signal = { id: "event", strategyId: "brand", createdAt: new Date(), type: "SCORE_DECLINE", data: {
      scoredType: "strategy", changedPillars: [{ key: "a", prev: 20, curr: 8, pct: 60 }],
      compositeDelta: { previous: 140, current: 128 },
    } };
    const observed = signalObservation(signal);
    expect(observed.title).toBe("Baisse du score calculé");
    expect(observed.observation).toContain("A : 20/25 → 8/25.");
    expect(observed.observation).toContain("140/200 → 128/200");
    expect(mapSignalToFeedItem(signal, undefined).summary).toBe(observed.observation.slice(0, 300));
    expect(mapSignalToFeedItem(signal, undefined).confidence).toBeNull();
  });
  it("preserves real zero and rejects missing, unbounded and string numbers", () => {
    const data = { changedPillars: [
      { key: "a", prev: 0, curr: 5 }, { key: "d", prev: "15", curr: 8 },
      { key: "e", prev: 40, curr: 8 }, { key: "v", curr: 8 },
    ] };
    const result = signalObservation({ type: "SCORE_IMPROVEMENT", data });
    expect(result.observation).toContain("A : 0/25 → 5/25");
    expect(result.observation).not.toMatch(/D :|E :|V :/);
    expect(signalObservation({ type: "SCORE_DECLINE", data: {} }).observation).toBe("");
  });
  it("retains existing textual observations and distinguishes a campaign score", () => {
    expect(signalObservation({ type: "METRIC", data: { title: "Observation", content: "Contenu reçu", brandImpact: { invalid: true } } }).observation).toBe("Observation\n\nContenu reçu");
    expect(signalObservation({ type: "SCORE_DECLINE", data: { scoredType: "campaign", changedPillars: [{ key: "a", prev: 20, curr: 8 }] } }).observation).toContain("de la campagne");
  });
  it("keeps a declared zero confidence and refuses an invalid one", () => {
    const signal = { id: "event", strategyId: "brand", createdAt: new Date(), type: "METRIC", data: { confidence: 0 } };
    expect(mapSignalToFeedItem(signal, undefined).confidence).toBe(0);
    expect(mapSignalToFeedItem({ ...signal, data: { confidence: 4 } }, undefined).confidence).toBeNull();
  });
});
