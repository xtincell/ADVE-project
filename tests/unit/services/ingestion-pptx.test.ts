import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
const market = vi.hoisted(() => ({ extract: vi.fn(async (_input: { text: string }) => ({ ok: false as const, error: "fixture-provider-disabled" })) }));
vi.mock("@/lib/db", () => ({ db: { knowledgeEntry: { findFirst: vi.fn(async () => null) } } }));
vi.mock("@/server/services/seshat/market-study-ingestion/extractor-llm", () => ({ extractMarketStudy: market.extract }));
import { readIntakeDocument } from "@/server/services/quick-intake/document-input";
import { extractAuto, extractReceivedFile } from "@/server/services/ingestion-pipeline/extractors";
import { previewMarketStudy } from "@/server/services/seshat/market-study-ingestion";

const rel = "http://schemas.openxmlformats.org/package/2006/relationships";
const office = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const drawing = "http://schemas.openxmlformats.org/drawingml/2006/main";
const slide = (text: string) => `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="${drawing}"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${text}</a:t></a:r><a:br/><a:r><a:t>À discuter en équipe.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
async function deck(change?: (zip: JSZip) => void) {
  const zip = new JSZip();
  zip.file("ppt/presentation.xml", `<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="${office}"><p:sldIdLst><p:sldId id="256" r:id="later"/><p:sldId id="257" r:id="earlier"/></p:sldIdLst></p:presentation>`);
  zip.file("ppt/_rels/presentation.xml.rels", `<Relationships xmlns="${rel}"><Relationship Id="earlier" Type="${office}/slide" Target="slides/slide1.xml"/><Relationship Id="later" Type="${office}/slide" Target="slides/slide2.xml"/></Relationships>`);
  zip.file("ppt/slides/slide1.xml", slide("Ancienne référence"));
  zip.file("ppt/slides/slide2.xml", slide("Nouvelle piste &amp; position"));
  zip.file("ppt/slides/_rels/slide2.xml.rels", `<Relationships xmlns="${rel}"><Relationship Id="notes" Type="${office}/notesSlide" Target="../notesSlides/notesSlide2.xml"/></Relationships>`);
  zip.file("ppt/notesSlides/notesSlide2.xml", `<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="${drawing}"><a:p><a:r><a:t>Postulat non validé : 60 lieux, pas 60 clients.</a:t></a:r></a:p></p:notes>`);
  // Not a text source and must not be inflated or interpreted.
  zip.file("ppt/media/image1.png", Buffer.alloc(3 * 1024 * 1024));
  change?.(zip);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

describe("PowerPoint reaches the common deterministic document reader", () => {
  it("uses declared presentation order, paragraphs and attributed speaker notes", async () => {
    const bytes = await deck();
    const r = await extractAuto("PPTX", bytes.toString("base64"), "fixture");
    expect(r.text.indexOf("Nouvelle piste & position")).toBeLessThan(r.text.indexOf("Ancienne référence"));
    expect(r.text).toContain("\nÀ discuter en équipe.");
    expect(r.text).toContain("Notes de la diapositive 1");
    expect(r.text).toContain("Postulat non validé : 60 lieux, pas 60 clients.");
    expect(r.metadata).toMatchObject({ pages: 2, extractionScope: "SLIDE_XML_AND_SPEAKER_NOTES", visualContentRead: false });
    expect(r.text).not.toContain(bytes.toString("base64").slice(0, 50));
  });
  it("uses the same reader for intake and refuses binary noise or a bad encoding", async () => {
    const content = (await deck()).toString("base64");
    const text = await readIntakeDocument({ name: "proposition.PPTX", content, type: "application/octet-stream" });
    expect(text).toContain("Postulat non validé : 60 lieux, pas 60 clients.");
    expect(text).toContain("[DOCUMENT: proposition.PPTX]");
    await expect(readIntakeDocument({ name: "opaque.txt", content: Buffer.from([0xff,0x00,0xab]).toString("base64"), type: "text/plain" })).rejects.toThrow();
    await expect(readIntakeDocument({ name: "bad.txt", content: "YWJj=", type: "text/plain" })).rejects.toThrow();
    const long = "Texte de référence — position proposée. ".repeat(1000);
    expect(await readIntakeDocument({ name: "long.txt", content: Buffer.from(long).toString("base64"), type: "text/plain" })).toContain(long.trim());
  });
  it("passes actual presentation text and notes into the existing study preview", async () => {
    const result = await previewMarketStudy({ file: { buffer: await deck(), filename: "hypothese.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }, uploadedBy: "fixture" });
    expect(result).toMatchObject({ ok: false, error: "fixture-provider-disabled" });
    const sent = market.extract.mock.calls.at(-1)![0].text;
    expect(sent).toContain("Nouvelle piste & position");
    expect(sent).toContain("Postulat non validé : 60 lieux, pas 60 clients.");
    expect(sent).toContain("Notes de la diapositive 1");
  });
  it("refuses a missing slide, remote target and malformed XML instead of returning a partial reading", async () => {
    for (const mutate of [
      (z: JSZip) => z.remove("ppt/slides/slide2.xml"),
      (z: JSZip) => z.file("ppt/_rels/presentation.xml.rels", `<Relationships xmlns="${rel}"><Relationship Id="later" Type="${office}/slide" TargetMode="External" Target="https://example.invalid/private"/></Relationships>`),
      (z: JSZip) => z.file("ppt/slides/slide2.xml", "<not-closed>"),
    ]) await expect(extractAuto("PPTX", (await deck(mutate)).toString("base64"), "fixture")).rejects.toThrow();
  });
  it("refuses DTDs and an inflated XML body beyond the reading bound", async () => {
    for (const text of [
      `<!DOCTYPE x [<!ENTITY value SYSTEM "file:///private">]><x>&value;</x>`,
      slide("x".repeat(2 * 1024 * 1024 + 1)),
    ]) await expect(extractAuto("PPTX", (await deck(z => z.file("ppt/slides/slide2.xml", text))).toString("base64"), "fixture")).rejects.toThrow();
  });
  it("does not fabricate a reading for image-only decks or old binary PowerPoint", async () => {
    const bytes = await deck(z => {
      const blank = '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree/></p:cSld></p:sld>';
      z.file("ppt/slides/slide1.xml", blank); z.file("ppt/slides/slide2.xml", blank); z.remove("ppt/slides/_rels/slide2.xml.rels");
    });
    await expect(extractAuto("PPTX", bytes.toString("base64"), "fixture")).rejects.toThrow(/ne contient pas de texte lisible/);
    await expect(extractAuto("PPT", Buffer.from([0xd0, 0xcf, 0x11, 0xe0]).toString("base64"), "fixture")).rejects.toThrow(/pptx/i);
  });
  it("refuses opaque or malformed-text originals, preserving the plain-text path", async () => {
    const opaque = Buffer.from([0x50,0x4b,0x03,0x04,0x00,0xff,0x22]);
    await expect(extractReceivedFile("ZIP", opaque, "fixture")).rejects.toThrow();
    await expect(extractReceivedFile("TXT", opaque, "fixture")).rejects.toThrow();
    await expect(extractReceivedFile("TXT", Buffer.from("texte\u0000inattendu"), "fixture")).rejects.toThrow();
    expect((await extractReceivedFile("TXT", Buffer.from("SPAWT — référence datée, non adoptée."), "fixture")).text).toBe("SPAWT — référence datée, non adoptée.");
  });
});
