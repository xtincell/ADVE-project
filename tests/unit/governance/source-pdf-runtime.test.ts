import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import { extractAuto, extractPDF } from "@/server/services/ingestion-pipeline/extractors";

describe("deterministic document extraction with the installed parser", () => {
  it("reads both pages of a real PDF without a model or a remote service", async () => {
    const doc = new jsPDF();
    doc.text("Source one: budget unknown.", 20, 20);
    doc.addPage();
    doc.text("Source two: no approval inferred.", 20, 20);
    const result = await extractPDF(Buffer.from(doc.output("arraybuffer")));
    expect(result.metadata?.pages).toBe(2);
    expect(result.text).toContain("Source one: budget unknown.");
    expect(result.text).toContain("Source two: no approval inferred.");
  });

  it("rejects an invalid PDF instead of recording a successful empty extraction", async () => {
    await expect(extractPDF(Buffer.from("not a PDF"))).rejects.toThrow();
  });

  it("does not treat page markers in an empty PDF as readable source text", async () => {
    const doc = new jsPDF();
    await expect(extractPDF(Buffer.from(doc.output("arraybuffer")))).rejects.toThrow(/texte lisible/);
  });

  it("explains that a legacy Word document needs conversion", async () => {
    await expect(extractAuto("DOC", "not-a-docx", "fixture")).rejects.toThrow(/\.docx/);
  });
});
