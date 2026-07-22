/**
 * brand-book-ingestion/index.ts — orchestrateur (ADR-0173, Lot 1b).
 *
 * Parité manual-first (ADR-0060), motif `market-study-ingestion` :
 *   - `previewBrandBook`  : EXTRAIT sans persister (revue opérateur avant écriture) ;
 *     deux modes — LLM (`extractor-llm`) ou STRUCTURED (`extractor-structured`, zéro LLM).
 *     En mode LLM, le plancher déterministe (couleurs/polices) COMPLÈTE l'extraction si
 *     le LLM l'a manqué (jamais d'écrasement d'une valeur LLM présente).
 *   - `ingestBrandBook`   : handler de l'Intent gouverné `INGEST_BRAND_BOOK` — prend
 *     l'extraction RÉVISÉE et la persiste (piliers via gateway + assets vault DRAFT).
 *
 * L'aval (persister) ne sait pas quel extracteur a tourné.
 */
import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import { extractBrandBookLLM } from "./extractor-llm";
import { extractStructured } from "./extractor-structured";
import { persistBrandBookExtraction } from "./persister";
import { BrandBookExtractionSchema, type BrandBookExtraction } from "./schema";

export { BrandBookExtractionSchema, type BrandBookExtraction } from "./schema";

/** Complète `base` avec le plancher déterministe `floor` SANS écraser une valeur présente. */
function mergeVisualFloor(base: BrandBookExtraction, floor: BrandBookExtraction): BrandBookExtraction {
  if (!floor.visual) return base;
  const bv = base.visual ?? null;
  return {
    ...base,
    visual: {
      colors: bv?.colors ?? floor.visual.colors ?? null,
      fonts: bv?.fonts ?? floor.visual.fonts ?? null,
      logoDescription: bv?.logoDescription ?? null,
    },
  };
}

export interface PreviewBrandBookArgs {
  strategyId: string;
  text: string;
  mode: "LLM" | "STRUCTURED";
  caller: string;
  sourceFilename?: string;
}

/** Extrait un brand book pour REVUE (aucune écriture). */
export async function previewBrandBook(args: PreviewBrandBookArgs): Promise<BrandBookExtraction> {
  const floor = extractStructured(args.text);
  if (args.mode === "STRUCTURED") return floor;
  const llm = await extractBrandBookLLM(args.text, {
    strategyId: args.strategyId,
    caller: args.caller,
    sourceFilename: args.sourceFilename,
  });
  return mergeVisualFloor(llm, floor);
}

type IngestIntent = Extract<Intent, { kind: "INGEST_BRAND_BOOK" }>;
type HandlerResult = Pick<IntentResult, "status" | "summary" | "output" | "reason">;

/**
 * Handler de l'Intent `INGEST_BRAND_BOOK` — persiste une extraction RÉVISÉE.
 * L'Intent porte l'extraction validée + l'opérateur ; on re-valide par sécurité.
 */
export async function ingestBrandBook(intent: IngestIntent): Promise<HandlerResult> {
  const { strategyId, extraction, operatorId, sourceFilename, sourceDataSourceId, extractionMode } = intent;
  const parsed = BrandBookExtractionSchema.safeParse(extraction);
  if (!parsed.success) {
    return { status: "FAILED", summary: "Extraction de brand book invalide", reason: parsed.error.issues.slice(0, 3).map((i) => i.message).join(" | ") };
  }
  const result = await persistBrandBookExtraction({
    strategyId,
    operatorId,
    extraction: parsed.data,
    sourceFilename,
    sourceDataSourceId,
    extractionMode,
  });
  const nothing = !result.wrote;
  return {
    status: "OK",
    summary: nothing
      ? "Rien à écrire — le brand book ne contenait aucun champ exploitable (aucune fabrication)"
      : `Brand book ingéré : ${result.pillarsWritten.length} pilier(s) [${result.pillarsWritten.join("/")}], ${result.fieldsWritten} champ(s), ${result.assetsCreated.length} asset(s) vault (DRAFT)`,
    output: result as unknown as IntentResult["output"],
  };
}
