/** ExcelJS expects unprefixed SpreadsheetML tag names; the namespace prefix is arbitrary in OOXML.
 * Canonicalise an in-memory *reading copy*, never the retained original. */
import JSZip from "jszip";
const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NAMESPACE = "http://www.w3.org/2000/xmlns/";
const PART =
  /^(?:\[Content_Types\]\.xml|_rels\/.rels|xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|styles\.xml|worksheets\/(?:sheet\d+\.xml|_rels\/sheet\d+\.xml\.rels)))$/;
type ZipMember = import("jszip").JSZipObject;
async function bounded(member: ZipMember, budget: { remaining: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    const stream = member.nodeStream("nodebuffer"),
      chunks: Buffer[] = [];
    let size = 0,
      stopped = false;
    stream.on("data", (bytes: Buffer) => {
      if (stopped) return;
      size += bytes.length;
      budget.remaining -= bytes.length;
      if (size > 8 * 1024 * 1024 || budget.remaining < 0) {
        stopped = true;
        stream.pause();
        reject(Error("Classeur XML trop volumineux."));
        return;
      }
      chunks.push(bytes);
    });
    stream.on("end", () => {
      if (!stopped) resolve(Buffer.concat(chunks));
    });
    stream.on("error", reject);
  });
}
export async function normalizePrefixedSpreadsheet(
  buffer: Buffer,
): Promise<Buffer | null> {
  const archive = await JSZip.loadAsync(buffer),
    workbook = archive.file("xl/workbook.xml");
  if (!workbook) return null;
  const entries = Object.values(archive.files).filter(
    (f) => !f.dir && PART.test(f.name),
  );
  if (entries.length > 600) throw Error("Trop de feuilles dans le classeur.");
  const budget = { remaining: 32 * 1024 * 1024 },
    xml = await bounded(workbook, budget);
  if (
    !/<[\w.-]+:workbook(?:\s|>)/.test(xml.toString("utf8")) &&
    !Object.keys(archive.files).some((name) => name.startsWith("xl/drawings/"))
  )
    return null;
  const { JSDOM } = await import("jsdom"),
    dom = new JSDOM("");
  const parse = (bytes: Buffer) => {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(text))
      throw Error("Déclarations XML interdites dans un classeur.");
    const doc = new dom.window.DOMParser().parseFromString(
      text,
      "application/xml",
    );
    if (doc.getElementsByTagName("parsererror").length)
      throw Error("XML du classeur invalide.");
    return doc;
  };
  try {
    const first = parse(xml);
    if (
      first.documentElement.localName !== "workbook" ||
      first.documentElement.namespaceURI !== MAIN
    )
      return null;
    const result = new JSZip();
    for (const part of entries) {
      const bytes =
        part.name === workbook.name ? xml : await bounded(part, budget);
      if (part.name.endsWith(".rels") || part.name === "[Content_Types].xml") {
        result.file(part.name, bytes);
        continue;
      }
      const source = part.name === workbook.name ? first : parse(bytes);
      // The reading copy needs cells, formats and relationships; original bytes remain untouched.
      const target = dom.window.document.implementation.createDocument(
        null,
        null,
      );
      const copy = (src: Element, depth = 0): Element => {
        if (depth > 80) throw Error("XML du classeur trop imbriqué.");
        const dst =
          src.namespaceURI === MAIN
            ? target.createElementNS(MAIN, src.localName)
            : target.createElementNS(src.namespaceURI, src.tagName);
        for (const a of Array.from(src.attributes)) {
          if (
            a.namespaceURI === NAMESPACE &&
            (a.value === MAIN || a.value === REL)
          )
            continue;
          if (a.namespaceURI === REL)
            dst.setAttributeNS(REL, "r:" + a.localName, a.value);
          else if (a.namespaceURI)
            dst.setAttributeNS(a.namespaceURI, a.name, a.value);
          else dst.setAttribute(a.name, a.value);
        }
        for (const child of Array.from(src.childNodes)) {
          if (child.nodeType === 1)
            dst.appendChild(copy(child as Element, depth + 1));
          else if (child.nodeType === 3 || child.nodeType === 4)
            dst.appendChild(target.createTextNode(child.textContent ?? ""));
        }
        return dst;
      };
      const root = copy(source.documentElement);
      root.setAttributeNS(NAMESPACE, "xmlns", MAIN);
      root.setAttributeNS(NAMESPACE, "xmlns:r", REL);
      target.appendChild(root);
      result.file(
        part.name,
        new dom.window.XMLSerializer().serializeToString(target),
      );
    }
    return result.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  } finally {
    dom.window.close();
  }
}
