import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ nodes: vi.fn(), pillars: vi.fn(), access: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { brandNode: { findMany: mocks.nodes }, pillar: { findMany: mocks.pillars } } }));
vi.mock("@/server/services/operator-isolation", () => ({ canAccessStrategy: mocks.access }));
import { getBarreBrandContext } from "@/server/services/brand-node/barre-context";
import { barreDocumentGrant } from "@/server/services/brand-node/barre-document";
import { cleanBarreDocument, sharedMediaPath } from "@/server/services/brand-node/barre-document-runtime";

const actor = { userId: "u", role: "OPERATOR", operatorId: "team" };
const node = { id: "node", name: "SPAWT", operatorId: "team", strategyId: "current", sourceRefs: [
  { system: "LA_BARRE", kind: "brand", id: "MQ" }, { system: "LA_FUSEE", kind: "strategy", id: "old-seed" },
] };
beforeEach(() => {
  vi.resetAllMocks(); mocks.nodes.mockResolvedValue([node]); mocks.access.mockResolvedValue(true);
  mocks.pillars.mockResolvedValue([{ id: "p", key: "a", currentVersion: 11, content: { prophecy: { vision: "Une ville vivante", horizon: "2029" } }, fieldCertainty: null, updatedAt: new Date("2026-10-16T00:00:00Z") }]);
});
afterEach(() => vi.restoreAllMocks());

describe("native readers use current authorized brand sources", () => {
  it("uses the attached current strategy, exact typed value/version and the native access check", async () => {
    const data = await getBarreBrandContext(actor);
    expect(mocks.access).toHaveBeenCalledWith("current", actor);
    expect(mocks.pillars.mock.calls[0]![0].where.strategyId).toBe("current");
    expect(data.brands.MQ?.fields["a.prophecy"]).toMatchObject({ value: { vision: "Une ville vivante", horizon: "2029" }, sourceId: "p", sourceVersion: 11, provenance: "UNKNOWN" });
    expect(mocks.nodes.mock.calls[0]![0].where.operatorId).toBe("team");
    expect(JSON.stringify(data)).not.toContain("old-seed");
  });
  it("neither a sourceRef nor a guessed document brand grants another strategy", async () => {
    mocks.access.mockResolvedValue(false);
    expect((await getBarreBrandContext(actor)).brands).toEqual({});
    expect(mocks.pillars).not.toHaveBeenCalled();
    mocks.access.mockResolvedValue(true);
    expect((await getBarreBrandContext(actor, ["OTHER"])).brands).toEqual({});
  });
  it("refuses ambiguous company/strategy assignments instead of choosing the first", async () => {
    mocks.nodes.mockResolvedValue([node, { ...node, id: "other", operatorId: "another-company" }]);
    const data = await getBarreBrandContext({ ...actor, role: "ADMIN" });
    expect(data.brands).toEqual({}); expect(data.issues).toHaveLength(1); expect(mocks.pillars).not.toHaveBeenCalled();
  });
});

describe("one published document is not a corpus or private pillar grant", () => {
  const token = "b".repeat(24);
  const data = (share: object) => ({ projets: [{ id: "P", partages: { cadrage: share } }] });
  it("rejects old exposed tokens, malformed tokens and duplicate assignments; accepts only the renewed document", () => {
    expect(barreDocumentGrant(data({ jeton: token }), token)).toBeNull();
    expect(barreDocumentGrant(data({ jeton: token, portee: "document" }), "../secret")).toBeNull();
    expect(barreDocumentGrant(data({ jeton: token, portee: "document" }), token)?.doc).toBe("cadrage");
    const duplicate = data({ jeton: token, portee: "document" }); duplicate.projets.push({ ...duplicate.projets[0]!, id: "OTHER" });
    expect(barreDocumentGrant(duplicate, token)).toBeNull();
  });
  it("removes executable content and grants only media actually shown in the document", () => {
    const result = cleanBarreDocument('<div><h1>Le dossier</h1><script>fetch("/private")</script><iframe src="/private"></iframe><template><img src=x onerror=alert(1)></template><img src="assets/review/a.jpg" onerror="alert(1)"><a href="javascript:alert(1)">Pièce</a><img src="assets/production/master.png"><img src="https://tracker.invalid/pixel"><p>Le texte reste.</p></div>');
    expect(result.mediaPaths).toEqual(["assets/review/a.jpg"]);
    expect(result.html).not.toMatch(/<script|<iframe|<template|onerror|javascript:|tracker.invalid|assets\/production/);
    expect(result.html).toContain("Le texte reste.");
    expect(cleanBarreDocument(result.html)).toEqual(result);
  });
  it.each(["depots/beignet-paradise.json", "assets/production/master.jpg", "assets/../secret.pdf", "assets/%2e%2e/secret.pdf", "https://other.invalid/private.jpg"])("refuses non-document file %s", (path) => {
    expect(sharedMediaPath(path)).toBeNull();
  });
});
