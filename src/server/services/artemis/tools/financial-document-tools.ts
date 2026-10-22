import type { GloryToolDef } from "./tool-types";

/** Registers the existing financial calculator and its documentary composer. */
export const FINANCIAL_DOCUMENT_TOOLS: GloryToolDef[] = [{
  slug: "break-even-calculator", name: "Fiche de seuil de rentabilité", layer: "BRAND", order: 330,
  executionType: "COMPOSE", pillarKeys: ["V", "D"], requiredDrivers: [], dependencies: [],
  description: "Produit une fiche financière depuis une version sourcée des prix, coûts et hypothèses ; distingue clients payeurs, audience et dépenses historiques.",
  inputFields: ["sourceId", "expectedSourceHash"], pillarBindings: {}, outputFormat: "financial_document",
  promptTemplate: "Calcul déterministe depuis une proposition ou référence financière conservée. Aucun appel d’intelligence artificielle.",
  status: "ACTIVE",
}];
