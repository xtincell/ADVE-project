/**
 * Dépôt de fichier — un caractère U+0000 issu d'un document ne fait plus
 * échouer l'enregistrement.
 *
 * Premier relevé SLO réel (12 novembre) : 2 dépôts sur 28 avaient échoué sur
 * « invalid byte sequence for encoding "UTF8": 0x00 ». PostgreSQL refuse ce
 * caractère dans `text` comme dans `jsonb` ; les extracteurs de documents
 * (PDF notamment) en produisent comme artefact. Les fichiers texte, eux,
 * restent refusés s'ils contiennent des caractères de contrôle.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("pdf-parse", () => ({
  PDFParse: class {
    async getText() {
      return { total: 1, text: "Titre\u0000 du document", pages: [{ text: "Titre\u0000 du document" }] };
    }
    async destroy() {}
  },
}));

import { extractAuto, extractReceivedFile, withoutNulCharacters } from "@/server/services/ingestion-pipeline/extractors";

describe("caractère nul dans un document extrait", () => {
  it("un PDF dont le texte porte U+0000 s'extrait sans ce caractère", async () => {
    const result = await extractAuto("PDF", Buffer.from("%PDF-1.4").toString("base64"), "s");
    expect(result.text).toBe("Titre du document");
    expect(result.text.includes("\u0000")).toBe(false);
  });

  it("le nettoyage couvre le texte et les données structurées, et rien d'autre", () => {
    const date = new Date("2026-11-12T00:00:00Z");
    const cleaned = withoutNulCharacters({
      text: "a\u0000b",
      structured: { "feuille\u0000": [["x\u0000y", 3, null, date]] },
      metadata: { wordCount: 2 },
    });
    expect(cleaned.text).toBe("ab");
    expect(cleaned.structured).toEqual({ feuille: [["xy", 3, null, date]] });
    expect((cleaned.structured as { feuille: unknown[][] }).feuille[0]![3]).toBeInstanceOf(Date);
    expect(cleaned.metadata).toEqual({ wordCount: 2 });
  });

  it("un fichier texte qui contient U+0000 reste refusé comme binaire", async () => {
    await expect(extractReceivedFile("TXT", Buffer.from("a\u0000b"), "s")).rejects.toThrow(/données binaires/);
  });
});
