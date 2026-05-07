/**
 * XLSX Parser router — Phase 18-A1 J5+1 résidu shippé.
 *
 * Endpoint server-side qui décode un .xlsx (base64) → CSV/JSON pour
 * alimenter `/launchpad/portfolio-bulk-import` sans forcer l'opérateur à
 * exporter manuellement en CSV.
 *
 * Le package `xlsx@0.18.5` est déjà installé (cf. package.json), utilisé
 * par 5 services (campaign-deliverable, ingestion-pipeline/extractors,
 * seshat/market-study-ingestion, source-classifier/mime-heuristics). Cet
 * endpoint expose le même pattern de parsing à la surface publique
 * portfolio-bulk-import.
 *
 * Sécurité :
 * - 5 MB cap sur le payload (xlsx réaliste : 17 KB → 745 KB observés)
 * - publicProcedure : la page d'import est /launchpad (intake), accessible
 *   sans login. La donnée n'est PAS persistée — uniquement parsée + retournée.
 * - Aucun side-effect DB, aucun LLM call. Pure transformation.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../init";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export const xlsxParserRouter = createTRPCRouter({
  /**
   * Parse a .xlsx file (base64-encoded) and return the first sheet as CSV
   * + structured rows. Designed to feed portfolio-bulk-import which
   * already accepts CSV — the page calls this, gets CSV back, populates
   * the textarea, and reuses the existing parseCSV preview pipeline.
   */
  parseFirstSheet: publicProcedure
    .input(z.object({
      base64: z.string().min(1),
      sheetName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Empty payload — base64 decode produced 0 bytes",
        });
      }
      if (buffer.length > MAX_BYTES) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: `XLSX payload ${buffer.length} bytes exceeds ${MAX_BYTES} bytes cap`,
        });
      }

      const XLSX = await import("xlsx");
      let workbook;
      try {
        workbook = XLSX.read(buffer, { type: "buffer" });
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Failed to parse XLSX: ${err instanceof Error ? err.message : String(err)}`,
        });
      }

      const sheetNames = workbook.SheetNames;
      if (sheetNames.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Workbook has zero sheets",
        });
      }

      // Use named sheet if requested + present; otherwise first sheet.
      const targetName = input.sheetName && sheetNames.includes(input.sheetName)
        ? input.sheetName
        : sheetNames[0]!;
      const sheet = workbook.Sheets[targetName];
      if (!sheet) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Sheet "${targetName}" not found`,
        });
      }

      // Two outputs:
      //  - csv (TSV-friendly, populates textarea via setPasted)
      //  - rows (already structured for direct consumption)
      const csv = XLSX.utils.sheet_to_csv(sheet, { FS: "\t" });
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];

      return {
        sheetNames,
        activeSheet: targetName,
        csv,
        rows,
        rowCount: rows.length,
      };
    }),
});
