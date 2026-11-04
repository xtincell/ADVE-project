import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCreativeDirectionContext } from "@/server/services/creative-direction/context";
import { CREATIVE_DIRECTION_DOCUMENT_FAMILY as family, CREATIVE_DIRECTION_DOCUMENT_LINK as link } from "@/server/services/creative-direction/document";

const { findPillar, findDocuments } = vi.hoisted(() => ({findPillar: vi.fn(), findDocuments: vi.fn()}));
vi.mock("@/lib/db", () => ({db: {pillar: {findUnique: findPillar}, brandDataSource: {findMany: findDocuments}}}));

const doctrine = {
  schema: "creative-direction/v1", sources: [{id: "guide", label: "Gabarit", locator: "p.3"}],
  families: [{id: "duel", name: "Duel", purpose: "Comparer", signals: ["duel"], requirements: ["Équilibre"], sources: ["guide"]}],
  rules: [{id: "balance", domain: "COMPOSITION", usage: "KEEP", guidance: "Équilibrer les deux choix", sources: ["guide"]}],
};
const rawContent = JSON.stringify(doctrine);
const hash = createHash("sha256").update(rawContent).digest("hex");
const content = {directionArtistique: {univers: "Direction humaine existante"}, _fieldProvenance: {directionArtistique: "HUMAN"}};
function makeRow(id: string, status: string, edition = 1, tags = [link]) {
  return {id, rawContent, sourceType: "FILE", fileType: "JSON", certainty: "DECLARED", rawData: {_document: {
    schema: "document-edition-v1", edition, family, status, label: id, kind: "BRAND_GUIDE", tags,
    recordedAt: "2026-11-04T08:00:00Z", changeSummary: "Original documentaire", sourceRevision: hash,
  }}, originalUpload: {storageReceipt: {state: "STORED", contentHash: hash}}};
}
const run = () => buildCreativeDirectionContext({strategyId: "spawt", target: {theme: "duel", format: "POST"}});
describe("Édition documentaire reliée à D", () => {
  beforeEach(() => {vi.resetAllMocks(); findPillar.mockResolvedValue({content, currentVersion: 34});});
  it("relie la proposition du bon dossier au prompt, conserve l'identité humaine et indique sa provenance", async () => {
    findDocuments.mockResolvedValue([makeRow("suggestion", "PROPOSED")]);
    const result = await run();
    expect(findDocuments.mock.calls[0]?.[0].where).toMatchObject({strategyId: "spawt", rawData: {path: ["_document", "family"], equals: family}});
    expect(result?.context).toMatchObject({identity: {univers: "Direction humaine existante"}, family: {id: "duel"},
      documentEdition: {sourceId: "suggestion", sha256: hash, edition: 1, status: "PROPOSED"}});
    expect(result?.text).toContain("Équilibrer les deux choix");
  });
  it("honore la référence choisie avant une suggestion et ignore les pièces non liées ou archivées", async () => {
    findDocuments.mockResolvedValue([makeRow("sans-raccord", "REFERENCE", 5, []), makeRow("archivée", "ARCHIVED", 4),
      makeRow("suggestion", "PROPOSED", 3), makeRow("référence", "REFERENCE")]);
    expect((await run())?.context.documentEdition?.sourceId).toBe("référence");
  });
  it("refuse une édition dont la lecture et les octets originaux divergent", async () => {
    findDocuments.mockResolvedValue([{...makeRow("altérée", "PROPOSED"), rawContent: rawContent + " "}]);
    await expect(run()).rejects.toThrow(/original/);
  });
  it("respecte la décision explicite sur l’enfant et le D déjà renseigné", async () => {
    findPillar.mockResolvedValue({content: {...content, _fieldProvenance: {"d.directionArtistique.doctrine": "HUMAN"}}, currentVersion: 34});
    expect((await run())?.context.documentEdition).toBeUndefined();
    findPillar.mockResolvedValue({content: {...content, directionArtistique: {...content.directionArtistique, doctrine}}, currentVersion: 34});
    expect((await run())?.context.source).toBe("D.directionArtistique.doctrine");
    expect(findDocuments).not.toHaveBeenCalled();
  });
});
