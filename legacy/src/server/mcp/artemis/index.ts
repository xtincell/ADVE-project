import { z } from "zod";
import * as artemis from "@/server/services/artemis";
import type { FrameworkLayer } from "@/server/services/artemis/frameworks";

// ---------------------------------------------------------------------------
// ARTEMIS MCP Server — Neter du Protocole
// Diagnostic frameworks + GLORY tools + sequences
// ---------------------------------------------------------------------------

export const serverName = "artemis";
export const serverDescription =
  "Serveur MCP ARTEMIS — Neter du Protocole. Exécute les frameworks diagnostiques (24), les outils créatifs GLORY (39), et les séquences de production (31). Analyse, score, prescrit.";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

export const tools: ToolDefinition[] = [
  // ── Framework Execution ──────────────────────────────────────────────
  // Phase 17 (ADR-0039) — Sequence devient l'unité publique unique
  // d'Artemis. Les MCP tools framework_* émettent désormais via Mestor
  // (kind: RUN_ORACLE_SEQUENCE, sequenceKey: WRAP-FW-<slug>) au lieu
  // d'appeler executeFramework / runDiagnosticBatch direct. Audit hash
  // chain présent côté IntentEmission.
  {
    name: "framework_execute",
    description:
      "Exécuter un framework diagnostique Artemis (via wrap sequence WRAP-FW-<slug>). Retourne score (0-10), analyse, prescriptions, confidence.",
    inputSchema: z.object({
      strategyId: z.string(),
      frameworkSlug: z.string().describe("Slug du framework (ex: fw-01-brand-archeology)"),
      input: z.record(z.string(), z.unknown()).optional().describe("Données d'entrée additionnelles"),
    }),
    handler: async (input) => {
      const { emitIntent } = await import("@/server/services/mestor/intents");
      return emitIntent(
        {
          kind: "RUN_ORACLE_SEQUENCE",
          strategyId: input.strategyId as string,
          sequenceKey: `WRAP-FW-${input.frameworkSlug as string}`,
          input: (input.input ?? {}) as Record<string, unknown>,
        },
        { caller: "mcp:artemis:framework_execute" },
      );
    },
  },

  {
    name: "framework_batch",
    description:
      "Exécuter plusieurs frameworks en respectant l'ordre topologique (dépendances). Phase 17 — chaque framework wrappé en sequence WRAP-FW-<slug>.",
    inputSchema: z.object({
      strategyId: z.string(),
      frameworkSlugs: z.array(z.string()),
      inputs: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    }),
    handler: async (input) => {
      const { emitIntent } = await import("@/server/services/mestor/intents");
      const sorted = artemis.topologicalSort(input.frameworkSlugs as string[]);
      const inputs = (input.inputs ?? {}) as Record<string, Record<string, unknown>>;
      const results: Array<{ slug: string; status: string }> = [];
      for (const slug of sorted) {
        const r = await emitIntent(
          {
            kind: "RUN_ORACLE_SEQUENCE",
            strategyId: input.strategyId as string,
            sequenceKey: `WRAP-FW-${slug}`,
            input: (inputs[slug] ?? {}) as Record<string, unknown>,
          },
          { caller: "mcp:artemis:framework_batch" },
        );
        results.push({ slug, status: r.status });
      }
      return results;
    },
  },

  {
    name: "framework_list",
    description:
      "Lister tous les frameworks disponibles avec leurs métadonnées (layer, piliers, dépendances).",
    inputSchema: z.object({}),
    handler: async () => {
      return artemis.FRAMEWORKS.map(fw => ({
        slug: fw.slug,
        name: fw.name,
        layer: fw.layer,
        pillarKeys: fw.pillarKeys,
        dependencies: fw.dependencies,
      }));
    },
  },

  {
    name: "framework_suggest",
    description:
      "Suggérer des frameworks pertinents par pilier ou layer.",
    inputSchema: z.object({
      pillarKey: z.string().optional(),
      layer: z.string().optional(),
    }),
    handler: async (input) => {
      if (input.pillarKey) {
        return artemis.getFrameworksByPillar(input.pillarKey as string);
      }
      if (input.layer) {
        return artemis.getFrameworksByLayer(input.layer as FrameworkLayer);
      }
      return artemis.FRAMEWORKS;
    },
  },

  // ── Diagnostic Analysis ──────────────────────────────────────────────
  {
    name: "diagnostic_history",
    description:
      "Historique des diagnostics pour une stratégie — timeline des résultats de frameworks.",
    inputSchema: z.object({
      strategyId: z.string(),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    handler: async (input) => {
      return artemis.getDiagnosticHistory(input.strategyId as string);
    },
  },

  {
    name: "diagnostic_differential",
    description:
      "Analyse différentielle — comparer l'état de la stratégie entre deux points dans le temps.",
    inputSchema: z.object({
      strategyId: z.string(),
      fromDate: z.string().describe("ISO date de début"),
      toDate: z.string().describe("ISO date de fin"),
    }),
    handler: async (input) => {
      return artemis.differentialDiagnosis(
        input.strategyId as string,
        new Date(input.fromDate as string),
        new Date(input.toDate as string),
      );
    },
  },

  {
    name: "pillar_diagnostic",
    description:
      "Diagnostic complet d'un pilier — exécute tous les frameworks liés via leur wrap WRAP-FW-<slug> en ordre topologique (Phase 17, ADR-0039).",
    inputSchema: z.object({
      strategyId: z.string(),
      pillarKey: z.string().describe("Clé du pilier (a, d, v, e, r, t, i, s)"),
    }),
    handler: async (input) => {
      const { emitIntent } = await import("@/server/services/mestor/intents");
      const frameworks = artemis.getFrameworksByPillar(input.pillarKey as string);
      const sorted = artemis.topologicalSort(frameworks.map((f) => f.slug));
      const results: Array<{ slug: string; status: string }> = [];
      for (const slug of sorted) {
        const r = await emitIntent(
          {
            kind: "RUN_ORACLE_SEQUENCE",
            strategyId: input.strategyId as string,
            sequenceKey: `WRAP-FW-${slug}`,
            input: {},
          },
          { caller: "mcp:artemis:pillar_diagnostic" },
        );
        results.push({ slug, status: r.status });
      }
      return results;
    },
  },
];
