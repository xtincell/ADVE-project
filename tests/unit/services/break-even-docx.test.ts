import { expect, it } from "vitest";
import JSZip from "jszip";
import { JSDOM } from "jsdom";
import { composeBreakEvenDocument } from "@/server/services/financial-brain/break-even-document";
import { exportBreakEvenDocx } from "@/server/services/financial-brain/break-even-docx";
import type { SourcedBreakEvenDocument } from "@/server/services/financial-brain/break-even-source";

it("exports the modular Word form with all controls filled, the actual sensitivity and an embedded graph", async () => {
  const amount = (value: number) => ({ value, qualification: "ASSUMPTION" as const, note: "Donnée synthétique, pas un réel.", sources: [] });
  const doc: SourcedBreakEvenDocument = { ...composeBreakEvenDocument("Marque de recette", {
    schema: "adve-break-even-model-v1", title: "Scénario de recette", currency: "XOF", period: "MONTH", payer: "Professionnel",
    unit: "abonnement", taxBasis: "HT", scope: "Recette synthétique", price: amount(15000), fixedCosts: [{ label: "CF", ...amount(315000) }],
    variableCosts: [{ label: "CV", ...amount(8000) }], assumptions: ["Sans ventes reçues"], exclusions: ["Trésorerie"],
  }), evidence: [{ sourceId: "model", contentHash: "a".repeat(64), fileName: "Modèle de recette.json", document: null, historical: false }],
  pillarVersions: { v: 1 }, sourceReceipt: { sourceId: "model", contentHash: "a".repeat(64) } };
  const bytes = await exportBreakEvenDocx(doc, new Date("2026-10-21T00:00:00Z"));
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("word/document.xml")!.async("string");
  const dom = new JSDOM(xml, { contentType: "application/xml" });
  const text = dom.window.document.documentElement.textContent!;
  expect(text).toContain("Marque de recette");
  expect(text).toContain("675");
  expect(text).toContain("Non déterminable"); // No invented growth or sales.
  expect(text).not.toContain("À renseigner");
  expect(text).not.toContain("FreshBox");
  expect(zip.file("word/media/break-even.png")).not.toBeNull();
  expect((await zip.file("word/media/break-even.png")!.async("nodebuffer")).subarray(1, 4).toString()).toBe("PNG");
  expect(dom.window.document.getElementsByTagNameNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "sdt").length).toBe(37);
  dom.window.close();
});
