/**
 * xlsx-read — lecteur de tableur basé sur `exceljs` (remplace `xlsx`/SheetJS).
 *
 * SheetJS (`xlsx@0.18.5`, dernière version publiée sur npm) traîne deux CVE
 * high sans correctif npm (prototype pollution GHSA-4r6h-8v6p-xvw6 + ReDoS
 * GHSA-5pgg-2g8v-p4x9), or il parse des uploads attaquant-contrôlables
 * (portfolio-bulk-import public + ingestion). On bascule sur `exceljs`
 * (maintenu, sans CVE) pour le sous-ensemble qu'on utilisait : `sheet_to_csv`
 * + `sheet_to_json` (defval ""). Déterministe, zéro LLM.
 *
 * Limite : `exceljs` lit `.xlsx` (OOXML) — PAS le `.xls` binaire legacy (BIFF).
 * Les appelants rejettent `.xls` en amont avec un message clair.
 */

export interface SheetData {
  /** Texte délimité (ligne d'en-tête + lignes de données), séparé par `fieldSep`. */
  csv: string;
  /** Lignes de données en objets indexés par l'en-tête ; cellule vide = "". */
  rows: Record<string, unknown>[];
}

export interface WorkbookData {
  sheetNames: string[];
  getSheet(name: string): SheetData | undefined;
}

// Surface structurelle minimale d'exceljs — découple du gros union `CellValue`.
interface XlsxCell {
  value: unknown;
}
interface XlsxRow {
  eachCell(
    opts: { includeEmpty: boolean },
    cb: (cell: XlsxCell, col: number) => void,
  ): void;
  getCell(col: number): XlsxCell;
}
interface XlsxWorksheet {
  name: string;
  rowCount: number;
  getRow(n: number): XlsxRow;
}
interface XlsxWorkbookInstance {
  xlsx: { load(buffer: Buffer): Promise<unknown> };
  worksheets: XlsxWorksheet[];
}

/** Normalise une valeur de cellule exceljs en primitive prête pour CSV/JSON. */
function cellToPrimitive(value: unknown): string | number | boolean {
  if (value == null) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("result" in v) return cellToPrimitive(v.result); // cellule formule → résultat calculé
    if ("text" in v) return cellToPrimitive(v.text); // hyperlien → texte lisible
    if ("richText" in v && Array.isArray(v.richText)) {
      return (v.richText as Array<{ text?: string }>).map((r) => r.text ?? "").join("");
    }
    if ("error" in v) return String(v.error);
  }
  return String(value);
}

function escapeCsvField(s: string, sep: string): string {
  if (s.includes(sep) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Charge un buffer `.xlsx` et expose les feuilles sous forme de
 * `{ sheetNames, getSheet(name) → { csv, rows } }`.
 *
 * @throws si le buffer n'est pas un `.xlsx` valide (ex. `.xls` legacy).
 */
export async function readXlsxWorkbook(
  buffer: Buffer,
  opts: { fieldSep?: string } = {},
): Promise<WorkbookData> {
  const sep = opts.fieldSep ?? ",";
  const mod = (await import("exceljs")) as unknown as {
    Workbook?: new () => XlsxWorkbookInstance;
    default?: { Workbook: new () => XlsxWorkbookInstance };
  };
  const WorkbookCtor = mod.Workbook ?? mod.default?.Workbook;
  if (!WorkbookCtor) throw new Error("exceljs: constructeur Workbook introuvable");

  const wb = new WorkbookCtor();
  await wb.xlsx.load(buffer);

  const sheetNames = wb.worksheets.map((ws) => ws.name);

  function getSheet(name: string): SheetData | undefined {
    const ws = wb.worksheets.find((w) => w.name === name);
    if (!ws) return undefined;

    // Ligne 1 = en-têtes. Colonnes 1-indexées chez exceljs.
    const headers: string[] = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col] = String(cellToPrimitive(cell.value)).trim();
    });
    const maxCol = Math.max(headers.length - 1, 0);

    const headerCells: string[] = [];
    for (let c = 1; c <= maxCol; c++) headerCells.push(escapeCsvField(headers[c] ?? "", sep));
    const csvLines: string[] = [headerCells.join(sep)];

    const rows: Record<string, unknown>[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const obj: Record<string, unknown> = {};
      const csvCells: string[] = [];
      let hasValue = false;
      for (let c = 1; c <= maxCol; c++) {
        const prim = cellToPrimitive(row.getCell(c).value);
        const str = String(prim);
        csvCells.push(escapeCsvField(str, sep));
        const key = headers[c];
        if (key) obj[key] = prim;
        if (str !== "") hasValue = true;
      }
      if (hasValue) {
        rows.push(obj);
        csvLines.push(csvCells.join(sep));
      }
    }

    return { csv: csvLines.join("\n"), rows };
  }

  return { sheetNames, getSheet };
}
