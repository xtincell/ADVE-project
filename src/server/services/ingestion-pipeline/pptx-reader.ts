/** Bounded OOXML text reading in the existing ingestion module. No rendering or code execution. */
import JSZip from "jszip";
import { posix } from "node:path";
import type { ExtractionResult } from "./types";

const DRAWING = new Set(["http://schemas.openxmlformats.org/drawingml/2006/main", "http://purl.oclc.org/ooxml/drawingml/main"]);
const PRESENTATION = new Set(["http://schemas.openxmlformats.org/presentationml/2006/main", "http://purl.oclc.org/ooxml/presentationml/main"]);
const OFFICE_REL = ["http://schemas.openxmlformats.org/officeDocument/2006/relationships", "http://purl.oclc.org/ooxml/officeDocument/relationships"];
// JSZip documents this public interface, but 3.10.1 omits it from JSZipObject types.
interface XmlStream {
  on(event: "data", callback: (data: Uint8Array) => void): unknown;
  on(event: "error", callback: (error: Error) => void): unknown;
  on(event: "end", callback: () => void): unknown;
  pause(): void;
  resume(): void;
}
const XML_LIMIT = 2 * 1024 * 1024, TOTAL_XML_LIMIT = 32 * 1024 * 1024;

function target(base: string, value: string, kind: "slide" | "notesSlide") {
  if (/[\\\u0000:?#]/.test(value)) throw new Error("Relation PowerPoint non locale.");
  const path = posix.normalize(value.startsWith("/") ? value.slice(1) : posix.join(posix.dirname(base), value));
  const prefix = kind === "slide" ? "ppt/slides/" : "ppt/notesSlides/";
  if (!path.startsWith(prefix) || !/^[^/]+\.xml$/.test(path.slice(prefix.length))) throw new Error("Relation PowerPoint hors du document.");
  return path;
}
function relationships(doc: Document) {
  if (doc.documentElement.localName !== "Relationships") throw new Error("Relations PowerPoint invalides.");
  return Array.from(doc.documentElement.children).filter(e => e.localName === "Relationship");
}
function paragraphs(doc: Document) {
  const output: string[] = [];
  for (const p of Array.from(doc.getElementsByTagNameNS("*", "p"))) {
    if (!DRAWING.has(p.namespaceURI ?? "")) continue;
    const pieces: string[] = [];
    const walk = (node: Element) => {
      if (DRAWING.has(node.namespaceURI ?? "")) {
        if (node.localName === "t") { pieces.push(node.textContent ?? ""); return; }
        if (node.localName === "br") { pieces.push("\n"); return; }
        if (node.localName === "tab") { pieces.push("\t"); return; }
      }
      for (const child of Array.from(node.children)) walk(child);
    };
    walk(p); output.push(pieces.join(""));
  }
  return output.join("\n").trim();
}

export async function readPptxText(bytes: Buffer): Promise<ExtractionResult> {
  const zip = await JSZip.loadAsync(bytes);
  const entries = Object.values(zip.files);
  if (entries.length > 5000 || entries.some(e => (e as typeof e & { unsafeOriginalName?: string }).unsafeOriginalName && (e as typeof e & { unsafeOriginalName?: string }).unsafeOriginalName !== e.name)) {
    throw new Error("Archive PowerPoint hors limites ou chemins invalides.");
  }
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM(""); // Scripts and external resources remain disabled.
  const parser = new dom.window.DOMParser();
  let total = 0;
  async function xml(path: string): Promise<Document> {
    const entry = zip.file(path);
    if (!entry) throw new Error(`Pièce PowerPoint absente : ${path}`);
    const chunks: Uint8Array[] = []; let size = 0;
    // The public stream interface pauses inflation at the limit, before concatenation.
    const bytes = await new Promise<Buffer>((resolve, reject) => {
      const stream = (entry as unknown as { internalStream(type: "uint8array"): XmlStream }).internalStream("uint8array"); let stopped = false;
      stream.on("data", data => {
        if (stopped) return;
        size += data.length; total += data.length;
        if (size > XML_LIMIT || total > TOTAL_XML_LIMIT) {
          stopped = true; stream.pause(); reject(new Error("Texte XML PowerPoint trop volumineux.")); return;
        }
        chunks.push(data);
      });
      stream.on("error", reject);
      stream.on("end", () => { if (!stopped) resolve(Buffer.concat(chunks)); });
      stream.resume();
    });
    const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le" : bytes[0] === 0xfe && bytes[1] === 0xff ? "utf-16be" : "utf-8";
    const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("Déclarations externes PowerPoint non prises en charge.");
    const doc = parser.parseFromString(text, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("XML PowerPoint invalide.");
    return doc;
  }
  try {
    const main = await xml("ppt/presentation.xml");
    if (!PRESENTATION.has(main.documentElement.namespaceURI ?? "") || main.documentElement.localName !== "presentation") throw new Error("Ce fichier n’est pas une présentation PowerPoint lisible.");
    const rels = relationships(await xml("ppt/_rels/presentation.xml.rels"));
    const slides = Array.from(main.getElementsByTagNameNS("*", "sldId")).filter(e => PRESENTATION.has(e.namespaceURI ?? ""));
    if (!slides.length || slides.length > 1000) throw new Error("Nombre de diapositives hors limites.");
    const parts: string[] = []; let hasText = false;
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]!;
      const id = OFFICE_REL.map(ns => slide.getAttributeNS(ns, "id")).find(Boolean);
      const matches = rels.filter(r => r.getAttribute("Id") === id && r.getAttribute("Type")?.endsWith("/slide"));
      if (!id || matches.length !== 1 || matches[0]!.getAttribute("TargetMode") === "External") throw new Error("Diapositive PowerPoint inaccessible.");
      const path = target("ppt/presentation.xml", matches[0]!.getAttribute("Target") ?? "", "slide");
      const page = await xml(path);
      if (page.documentElement.localName !== "sld" || !PRESENTATION.has(page.documentElement.namespaceURI ?? "")) throw new Error("Diapositive PowerPoint invalide.");
      const text = paragraphs(page); hasText ||= Boolean(text);
      parts.push(`=== Diapositive ${i + 1} ===\n${text}`);
      const noteRelations = posix.join(posix.dirname(path), "_rels", posix.basename(path) + ".rels");
      if (zip.file(noteRelations)) {
        const notes = relationships(await xml(noteRelations)).filter(r => r.getAttribute("Type")?.endsWith("/notesSlide"));
        if (notes.length > 1 || notes.some(r => r.getAttribute("TargetMode") === "External")) throw new Error("Notes PowerPoint inaccessibles.");
        if (notes.length) {
          const note = await xml(target(path, notes[0]!.getAttribute("Target") ?? "", "notesSlide"));
          if (note.documentElement.localName !== "notes" || !PRESENTATION.has(note.documentElement.namespaceURI ?? "")) throw new Error("Notes PowerPoint invalides.");
          const text = paragraphs(note); hasText ||= Boolean(text);
          if (text) parts.push(`=== Notes de la diapositive ${i + 1} ===\n${text}`);
        }
      }
    }
    if (!hasText) throw new Error("Cette présentation ne contient pas de texte lisible ; ses images ne sont pas interprétées.");
    const text = parts.join("\n\n");
    return { text, metadata: { pages: slides.length, wordCount: text.split(/\s+/).filter(Boolean).length, extractionScope: "SLIDE_XML_AND_SPEAKER_NOTES", visualContentRead: false } };
  } finally { dom.window.close(); }
}
