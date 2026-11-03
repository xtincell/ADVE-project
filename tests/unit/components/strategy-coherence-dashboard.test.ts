// @vitest-environment jsdom
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PillarSFields } from "@/components/cockpit/pillars/pillar-s-fields";

describe("readable calculated coherence", () => {
  it("shows the current calculation and all excluded checks instead of a stale legacy score", () => {
    const content = { coherenceScore: 99, computed: { coherenceScore: 50, selectedRouteKey: "TARGET",
      coherenceIssueCount: 10, coherenceSummary: { total: 3, valid: 1, invalid: 1, skipped: 1, score: 50 },
      coherenceChecks: [{ ruleId: 1, rule: "Budget cohérent", status: "INVALID", message: "Budget à réconcilier" },
        { ruleId: 2, rule: "Lien aux objectifs", status: "SKIPPED", message: "Prémisse à compléter" }] } };
    const html = renderToStaticMarkup(React.createElement(PillarSFields, { content, certainty: null }));
    const dom = new DOMParser().parseFromString(html, "text/html");
    expect(dom.querySelector(".ck-s-computed__ring")?.textContent).toBe("50/100");
    expect(dom.querySelector(".ck-s-computed__lbl")?.textContent).toContain("1 contrôles conformes · 1 écarts · 1 non évalués");
    expect(dom.querySelector(".ck-s-computed details")?.textContent).toContain("Prémisse à compléter");
    expect(dom.querySelector(".ck-s-computed details")?.textContent).toContain("ce score ne mesure pas les résultats");
  });
});
