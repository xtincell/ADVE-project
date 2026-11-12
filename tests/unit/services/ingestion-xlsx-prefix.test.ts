import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { readXlsxWorkbook } from "@/server/services/utils/xlsx-read";

const main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const rel =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const packageRel =
  "http://schemas.openxmlformats.org/package/2006/relationships";

/** Legal SpreadsheetML prefixes and relationship IDs are arbitrary. */
async function fixture() {
  const z = new JSZip();
  z.file(
    "xl/workbook.xml",
    `<ss:workbook xmlns:ss="${main}" xmlns:end="${rel}"><ss:sheets><ss:sheet name="Guide" sheetId="1" end:id="Rreading"/><ss:sheet name="Références" sheetId="2" end:id="Rregister"/></ss:sheets></ss:workbook>`,
  );
  z.file(
    "xl/_rels/workbook.xml.rels",
    `<Relationships xmlns="${packageRel}"><Relationship Id="Rreading" Type="${rel}/worksheet" Target="/xl/worksheets/sheet1.xml"/><Relationship Id="Rregister" Type="${rel}/worksheet" Target="/xl/worksheets/sheet2.xml"/></Relationships>`,
  );
  const sheet = (rows: string, links = "") =>
    `<s:worksheet xmlns:s="${main}" xmlns:ln="${rel}"><s:sheetData>${rows}</s:sheetData>${links}</s:worksheet>`;
  const cell = (ref: string, t: string) =>
    `<s:c r="${ref}" t="inlineStr"><s:is><s:t>${t}</s:t></s:is></s:c>`;
  z.file(
    "xl/worksheets/sheet1.xml",
    sheet(`<s:row r="2">${cell("B2", "Règles de lecture")}</s:row>`),
  );
  z.file(
    "xl/worksheets/sheet2.xml",
    sheet(
      `<s:row r="1">${cell("A1", "Identifiant")}${cell("B1", "Consigne")}</s:row><s:row r="2">${cell("A2", "FOOD009")}${cell("B2", "Ne pas publier le pixel tiers")}</s:row>`,
      '<s:hyperlinks><s:hyperlink ref="B2" ln:id="Rlink"/></s:hyperlinks>',
    ),
  );
  z.file(
    "xl/worksheets/_rels/sheet2.xml.rels",
    `<Relationships xmlns="${packageRel}"><Relationship Id="Rlink" Type="${rel}/hyperlink" TargetMode="External" Target="https://example.test/reference"/></Relationships>`,
  );
  return z.generateAsync({ type: "nodebuffer" });
}

describe("ingestion d’un registre SpreadsheetML", () => {
  it("lit les feuilles, les règles sous un en-tête vide et les cellules portant des liens sans modifier l’original", async () => {
    const original = await fixture(),
      before = Buffer.from(original);
    const result = await readXlsxWorkbook(original);
    expect(result.sheetNames).toEqual(["Guide", "Références"]);
    expect(result.getSheet("Guide")?.csv).toContain("Règles de lecture");
    expect(result.getSheet("Références")?.rows).toEqual([
      { Identifiant: "FOOD009", Consigne: "Ne pas publier le pixel tiers" },
    ]);
    expect(original.equals(before)).toBe(true);
  });
});
