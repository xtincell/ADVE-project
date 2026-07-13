/**
 * ADVERTIS (outbound) MCP Server — expose la STRATÉGIE d'une marque à un agent
 * (ADR-0142).
 *
 * Contrepartie lecture d'`advertis-inbound` (qui INGÈRE des signaux vers les
 * piliers). Ce serveur EXPOSE l'ADVERTIS — la stratégie ADVE-RTIS (les 8
 * piliers) — à un agent externe, pour qu'il raisonne/agisse sur la marque.
 *
 * Frontière de domaine (précisée par l'opérateur 2026-07-13) :
 *   - Le MCP `advertis` = LA STRATÉGIE (ADVE-RTIS). C'est SON périmètre.
 *   - Le SUIVI DES SUPERFANS (framework AARRR, déterministe zéro LLM,
 *     ADR-0141) est un AUTRE domaine (Seshat/superfan) — surfacé par le MCP
 *     `pulse` + le cockpit, PAS ici.
 *   - La FENÊTRE D'OVERTON est encore un AUTRE domaine (culture/Seshat) —
 *     PAS ici.
 *
 * Doctrine : lecture seule, scopée à `strategyId`, zéro mutation, zéro LLM,
 * aucune donnée fabriquée (P22-2).
 */

import { z } from "zod";
import { db } from "@/lib/db";
import { classifyTier } from "@/domain/brand-tier";
import { PILLAR_KEYS, PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";

export const serverName = "advertis";
export const serverDescription =
  "Serveur MCP Advertis (sortant) — expose la stratégie ADVE-RTIS d'une marque à un agent : carte d'identité + les 8 piliers (Authenticité, Distinction, Valeur, Engagement, Risk, Track, Innovation, Strategy). Lecture seule, scopée à strategyId.";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

async function loadPillar(strategyId: string, key: string): Promise<Record<string, unknown>> {
  const p = await db.pillar.findFirst({ where: { strategyId, key }, select: { content: true } });
  return asRecord(p?.content);
}

/**
 * Résumé lisible d'un pilier : les premiers champs texte de tête (déterministe,
 * aucun nom de champ codé en dur — robuste à la forme de n'importe quelle
 * marque). Tronqué pour rester une carte, pas un dump.
 */
function pillarHeadline(content: Record<string, unknown>, max = 4): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(content)) {
    if (Object.keys(out).length >= max) break;
    if (typeof v === "string" && v.trim().length > 0) {
      out[k] = v.length > 280 ? `${v.slice(0, 280)}…` : v;
    }
  }
  return out;
}

// ── Tools ────────────────────────────────────────────────────────────────

export const tools: ToolDefinition[] = [
  // ---- Carte d'identité ADVERTIS ----
  {
    name: "getBrandCard",
    description:
      "Carte d'identité ADVERTIS de la marque : nom, secteur, archétype, accroche, positionnement, promesse maître, palier de maturité + score composite. Lecture seule.",
    inputSchema: z.object({ strategyId: z.string().describe("ID de la marque") }),
    handler: async (input) => {
      const strategyId = input.strategyId as string;
      const strategy = await db.strategy.findUnique({
        where: { id: strategyId },
        select: { id: true, name: true, sector: true, advertis_vector: true },
      });
      if (!strategy) return { error: "NOT_FOUND", strategyId };
      const [pillarA, pillarD] = await Promise.all([
        loadPillar(strategyId, "a"),
        loadPillar(strategyId, "d"),
      ]);
      const vec = asRecord(strategy.advertis_vector);
      const composite = typeof vec.compositeScore === "number" ? vec.compositeScore : null;
      return {
        strategyId: strategy.id,
        name: strategy.name,
        sector: strategy.sector ?? pillarA.secteur ?? null,
        archetype: pillarA.archetype ?? null,
        accroche: pillarA.accroche ?? null,
        positionnement: pillarD.positionnement ?? null,
        promesseMaitre: pillarD.promesseMaitre ?? null,
        compositeScore: composite,
        tier: composite != null ? classifyTier(composite) : null,
      };
    },
  },

  // ---- La stratégie ADVE-RTIS (les 8 piliers) — le cœur exposé ----
  {
    name: "getAdveRtis",
    description:
      "La stratégie ADVE-RTIS de la marque : les 8 piliers (A Authenticité, D Distinction, V Valeur, E Engagement, R Risk, T Track, I Innovation, S Strategy). Pour chaque pilier : son nom, un résumé lisible et son score. C'est le cœur de l'exposition de l'ADVERTIS à un agent.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la marque"),
      keys: z
        .array(z.enum(PILLAR_KEYS as unknown as [PillarKey, ...PillarKey[]]))
        .optional()
        .describe("Piliers à renvoyer (défaut : les 8)"),
    }),
    handler: async (input) => {
      const strategyId = input.strategyId as string;
      const strategy = await db.strategy.findUnique({
        where: { id: strategyId },
        select: { id: true, advertis_vector: true },
      });
      if (!strategy) return { error: "NOT_FOUND", strategyId };

      const requested = (input.keys as PillarKey[] | undefined) ?? (PILLAR_KEYS as readonly PillarKey[]);
      const rows = await db.pillar.findMany({
        where: { strategyId, key: { in: requested as string[] } },
        select: { key: true, content: true },
      });
      const byKey = new Map(rows.map((r) => [r.key, asRecord(r.content)]));
      const vec = asRecord(strategy.advertis_vector);

      const pillars = requested.map((key) => {
        const content = byKey.get(key) ?? {};
        const score = typeof vec[key] === "number" ? (vec[key] as number) : null;
        return {
          key,
          name: PILLAR_NAMES[key],
          score,
          present: Object.keys(content).length > 0,
          headline: pillarHeadline(content),
        };
      });

      return {
        strategyId,
        method: "ADVE-RTIS",
        compositeScore: typeof vec.compositeScore === "number" ? vec.compositeScore : null,
        pillars,
      };
    },
  },
];
