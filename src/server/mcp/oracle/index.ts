/**
 * MCP Oracle server (ADR-0182) — expose le livrable Oracle (35 sections, 3
 * tiers) d'une marque à un agent externe. Lecture seule, scopée à strategyId,
 * zéro LLM (lit l'état persisté `OracleSection` + le registre de sections).
 *
 * Comble le trou identifié à l'audit MCP : l'Oracle — pièce maîtresse du
 * livrable client — n'avait AUCUNE exposition MCP (zéro tool, zéro resource
 * câblée). Un client Claude ne pouvait pas lire le document de conseil.
 *
 * Réutilise le service `oracle-section` (source de vérité du cycle de vie des
 * sections) + `SECTION_REGISTRY` (métadonnées : titre, tier, personas).
 */

import { z } from "zod";
import { getSection, getSectionsForStrategy, snapshotStrategy } from "@/server/services/oracle-section";
import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";

export const serverName = "oracle";
export const serverDescription =
  "Serveur MCP Oracle — expose le livrable Oracle (document de conseil dynamique, 35 sections en 3 tiers CORE/BIG4_BASELINE/DISTINCTIVE) d'une marque : liste des sections + statut, contenu d'une section, instantané de complétude. Lecture seule, scopé à strategyId.";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

const titleFor = new Map(SECTION_REGISTRY.map((s) => [Number(s.number), { title: s.title, tier: s.tier ?? "CORE" }]));

export const tools: ToolDefinition[] = [
  {
    name: "list_sections",
    description:
      "Liste les 35 sections de l'Oracle d'une marque avec leur titre, tier et statut de génération (PENDING/GENERATING/COMPLETE/FAILED/STALE). Vue d'ensemble du livrable.",
    inputSchema: z.object({ strategyId: z.string().describe("ID de la marque") }),
    handler: async (input) => {
      const strategyId = input.strategyId as string;
      const rows = await getSectionsForStrategy(strategyId);
      return {
        strategyId,
        sections: rows.map((r) => {
          const meta = titleFor.get(r.sectionId);
          return {
            sectionId: r.sectionId,
            title: meta?.title ?? `Section ${r.sectionId}`,
            tier: r.tier,
            status: r.status,
            confidence: r.confidence,
            updatedAt: r.updatedAt,
          };
        }),
      };
    },
  },
  {
    name: "get_section",
    description:
      "Contenu complet d'UNE section de l'Oracle (payload intégral) + son statut. Renvoie une erreur honnête si la section n'est pas encore générée (status ≠ COMPLETE).",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la marque"),
      sectionId: z.number().int().min(1).max(35).describe("Numéro de section (1..35)"),
    }),
    handler: async (input) => {
      const strategyId = input.strategyId as string;
      const sectionId = input.sectionId as number;
      const row = await getSection(strategyId, sectionId);
      if (!row) return { error: "NOT_FOUND", strategyId, sectionId };
      const meta = titleFor.get(sectionId);
      return {
        strategyId,
        sectionId,
        title: meta?.title ?? `Section ${sectionId}`,
        tier: row.tier,
        status: row.status,
        confidence: row.confidence,
        // Contenu réel uniquement si généré — sinon on l'affiche honnêtement.
        content: row.status === "COMPLETE" ? row.payload : null,
        note: row.status === "COMPLETE" ? undefined : `Section non générée (statut ${row.status}).`,
      };
    },
  },
  {
    name: "snapshot",
    description:
      "Instantané de complétude de l'Oracle d'une marque : nombre de sections par statut (total/pending/generating/complete/failed/stale). Pour jauger l'avancement du livrable.",
    inputSchema: z.object({ strategyId: z.string().describe("ID de la marque") }),
    handler: async (input) => {
      const strategyId = input.strategyId as string;
      return { strategyId, ...(await snapshotStrategy(strategyId)) };
    },
  },
];
