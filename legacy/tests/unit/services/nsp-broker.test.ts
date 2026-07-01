import { describe, it, expect, beforeEach } from "vitest";
import {
  publish,
  subscribe,
  listenerCount,
  activeUserCount,
  clearAll,
} from "@/server/services/nsp/sse-broker";
import type { NspEvent } from "@/server/services/nsp/event-types";

const sample: NspEvent = {
  kind: "notification",
  id: "n1",
  userId: "u1",
  type: "SYSTEM",
  priority: "NORMAL",
  title: "t",
  body: "b",
  link: null,
  createdAt: new Date().toISOString(),
};

describe("NSP SSE broker (ADR-0025)", () => {
  beforeEach(() => clearAll());

  it("publishes events only to subscribed userId", () => {
    const u1: NspEvent[] = [];
    const u2: NspEvent[] = [];
    subscribe("u1", (e) => u1.push(e));
    subscribe("u2", (e) => u2.push(e));

    expect(publish("u1", sample)).toBe(1);
    expect(u1).toHaveLength(1);
    expect(u2).toHaveLength(0);
  });

  it("supports multiple listeners per userId", () => {
    const a: NspEvent[] = [];
    const b: NspEvent[] = [];
    subscribe("u1", (e) => a.push(e));
    subscribe("u1", (e) => b.push(e));

    expect(listenerCount("u1")).toBe(2);
    expect(publish("u1", sample)).toBe(2);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });

  it("unsubscribe removes the listener and cleans empty sets", () => {
    const a: NspEvent[] = [];
    const off = subscribe("u1", (e) => a.push(e));
    expect(listenerCount("u1")).toBe(1);

    off();
    expect(listenerCount("u1")).toBe(0);
    expect(activeUserCount()).toBe(0);

    expect(publish("u1", sample)).toBe(0);
    expect(a).toHaveLength(0);
  });

  it("swallows listener errors to keep fan-out resilient", () => {
    const ok: NspEvent[] = [];
    subscribe("u1", () => {
      throw new Error("boom");
    });
    subscribe("u1", (e) => ok.push(e));

    expect(() => publish("u1", sample)).not.toThrow();
    // The broker swallows the throwing listener; the healthy one still receives.
    expect(ok).toHaveLength(1);
  });
});
