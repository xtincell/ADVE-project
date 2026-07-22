/**
 * Manifest — Brand Book Ingestion (ADR-0173, Lot 1b).
 *
 * Fait ENTRER un brand book officiel (PDF/deck fourni par la marque) dans La Fusée :
 * extraction structurée (LLM ou parseur déterministe, parité manual-first ADR-0060)
 * → revue opérateur → écriture des piliers A/D/V via le gateway + assets vault DRAFT.
 * Zéro fabrication (l'extracteur émet null sur absence).
 *
 * Governor MESTOR — l'écriture pilier passe par le gateway (writePillarAndScore),
 * dispatché par Mestor ; l'ingestion est une décision opérateur (preview→confirm).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "brand-book-ingestion",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: ["INGEST_BRAND_BOOK"],
  capabilities: [
    {
      name: "previewBrandBook",
      inputSchema: z.object({ strategyId: z.string(), text: z.string(), mode: z.enum(["LLM", "STRUCTURED"]) }),
      outputSchema: z.object({ extraction: z.unknown() }),
      sideEffects: ["LLM_CALL"],
    },
    {
      name: "ingestBrandBook",
      inputSchema: z.object({ strategyId: z.string(), operatorId: z.string(), extraction: z.unknown() }),
      outputSchema: z.object({
        pillarsWritten: z.array(z.string()),
        fieldsWritten: z.number(),
        assetsCreated: z.array(z.string()),
      }),
      sideEffects: ["DB_WRITE"],
    },
  ],
  dependencies: ["llm-gateway", "pillar-gateway", "brand-vault"],
  missionContribution: "CHAIN_VIA:artemis",
  groundJustification:
    "Un brand book officiel EXISTANT est la matière la plus riche et la plus fiable pour fonder l'ADVE d'une marque. Sans porte d'entrée, cette matière restait dehors et l'opérateur ré-saisissait à la main. L'ingestion la fait entrer sans jamais rien inventer (null sur absence ; provenance SOURCE, source marquée OFFICIAL ; les jugements ne sont pas écrits en dur) — l'ADVE nourri par le réel accélère toute la chaîne aval qui accumule des superfans.",
});
