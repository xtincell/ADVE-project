// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { PillarIFields } from "@/components/cockpit/pillars/pillar-i-fields";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("catalogue I — identities come from the three collections", () => {
  it("counts all three collections and removes the repeated identity instead of using a stale total", () => {
    const { container } = render(React.createElement(PillarIFields, { certainty: null, content: {
      totalActions: 99,
      catalogueParCanal: { DIGITAL: [{ id: "one", action: "Première" }] },
      actionsByDevotionLevel: { FAN: [{ id: "one", action: "Première" }, { id: "two", action: "Deuxième" }] },
      actionsByOvertonPhase: [{ phase: "POPULAR", actions: [{ id: "three", action: "Troisième" }] }],
    } }));
    expect(container.querySelector(".ck-a-foot")?.textContent).toContain("3 actions au catalogue");
    expect(container.textContent).not.toContain("99 actions");
  });

  it.each([
    { catalogueParCanal: { DIGITAL: ["Premier geste"] } },
    { actionsByDevotionLevel: { FAN: ["Premier geste"] } },
    { actionsByOvertonPhase: [{ phase: "POPULAR", actions: ["Premier geste"] }] },
  ])("counts compact actions in each existing collection", (content) => {
    const { container } = render(React.createElement(PillarIFields, { content, certainty: null }));
    expect(container.querySelector(".ck-a-foot")?.textContent).toContain("1 action au catalogue");
  });

  it("does not report zero when no collection was read", () => {
    const { container } = render(React.createElement(PillarIFields, { content: {}, certainty: null }));
    expect(container.querySelector(".ck-a-foot")?.textContent).toContain("Nombre d’actions à vérifier");
    expect(container.textContent).not.toContain("0 actions au catalogue");
  });

  it("preserves zero for an explicitly empty catalogue", () => {
    const { container } = render(React.createElement(PillarIFields, { content: { catalogueParCanal: {} }, certainty: null }));
    expect(container.querySelector(".ck-a-foot")?.textContent).toContain("0 actions au catalogue");
  });
});
