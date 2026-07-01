/**
 * tests/integration/cascade-full.test.ts — Phase 6.
 *
 * Verifies the *invariant* of the cascade: a FILL_ADVE intent emits
 * progress events through the EventBus in the right phase order. We don't
 * boot a real DB here — we mock the dispatch and assert the bus contract.
 * The proper end-to-end test (with Postgres) lives under tests/e2e/.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { eventBus } from "@/server/governance/event-bus";
import type { IntentPhase } from "@/domain";

describe("cascade — bus phase invariant", () => {
  beforeEach(() => eventBus.reset());

  it("PROPOSED → DISPATCHED → COMPLETED arrives in order", () => {
    const seen: IntentPhase[] = [];
    eventBus.subscribe("intent.proposed", () => {
      seen.push("PROPOSED");
    });
    eventBus.subscribe("intent.dispatched", () => {
      seen.push("DISPATCHED");
    });
    eventBus.subscribe("intent.completed", () => {
      seen.push("COMPLETED");
    });

    eventBus.publish("intent.proposed", { intentId: "x", kind: "FILL_ADVE", ctx: null });
    eventBus.publish("intent.dispatched", { intentId: "x" });
    eventBus.publish("intent.completed", { intentId: "x", result: null, costUsd: 0.1 });

    expect(seen).toEqual(["PROPOSED", "DISPATCHED", "COMPLETED"]);
  });

  it("a Seshat handler that throws does not block COMPLETED for other listeners", () => {
    const errors: unknown[] = [];
    const completed: string[] = [];
    eventBus.onError = (e) => errors.push(e);

    eventBus.subscribe("intent.completed", () => {
      throw new Error("seshat down");
    });
    eventBus.subscribe("intent.completed", (e) => {
      completed.push(e.intentId);
    });

    eventBus.publish("intent.completed", { intentId: "z", result: null });

    expect(errors.length).toBe(1);
    expect(completed).toEqual(["z"]);
  });

  it("Thot DOWNGRADE does not prevent OK completion", () => {
    let downgraded = false;
    let completed = false;
    eventBus.subscribe("intent.downgraded", () => {
      downgraded = true;
    });
    eventBus.subscribe("intent.completed", () => {
      completed = true;
    });
    eventBus.publish("intent.downgraded", { intentId: "y", reason: "budget" });
    eventBus.publish("intent.completed", { intentId: "y", result: null });
    expect(downgraded).toBe(true);
    expect(completed).toBe(true);
  });
});
