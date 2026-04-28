import { describe, it, expect, beforeEach } from "vitest";
import { eventBus } from "@/server/governance/event-bus";

describe("event-bus", () => {
  beforeEach(() => eventBus.reset());

  it("delivers events to subscribers", () => {
    const seen: string[] = [];
    eventBus.subscribe("intent.proposed", (p) => {
      seen.push(p.intentId);
    });
    eventBus.publish("intent.proposed", { intentId: "x", kind: "FILL_ADVE", ctx: null });
    expect(seen).toEqual(["x"]);
  });

  it("subscribeOnce fires exactly once", () => {
    let n = 0;
    eventBus.subscribeOnce("intent.completed", () => {
      n++;
    });
    eventBus.publish("intent.completed", { intentId: "1", result: null });
    eventBus.publish("intent.completed", { intentId: "2", result: null });
    expect(n).toBe(1);
  });

  it("handler throwing does not break the bus", () => {
    const errors: unknown[] = [];
    eventBus.onError = (err) => errors.push(err);
    eventBus.subscribe("intent.failed", () => {
      throw new Error("kaboom");
    });
    eventBus.subscribe("intent.failed", () => {
      // sibling subscriber still fires
    });
    expect(() =>
      eventBus.publish("intent.failed", { intentId: "z", error: "x" }),
    ).not.toThrow();
    expect(errors.length).toBe(1);
  });

  it("unsubscribe stops further deliveries", () => {
    let n = 0;
    const off = eventBus.subscribe("intent.completed", () => {
      n++;
    });
    eventBus.publish("intent.completed", { intentId: "1", result: null });
    off();
    eventBus.publish("intent.completed", { intentId: "2", result: null });
    expect(n).toBe(1);
  });
});
