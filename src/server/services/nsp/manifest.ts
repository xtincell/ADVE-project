/**
 * Manifest — nsp (Neteru Streaming Protocol — pure transport utility).
 *
 * **Pas une capability métier** — utilitaire pur publish/subscribe SSE pour
 * streamer des événements (Intent progress, notifications, MCP invocations)
 * vers les UIs connectées. Ne traite pas d'Intent, ne gère pas d'état métier.
 *
 * Manifest minimal présent pour permettre aux services métier (anubis, etc.)
 * de déclarer `nsp` comme dépendance sans casser l'audit registry. ADR-0025
 * (notification real-time stack).
 *
 * Sous tutelle INFRASTRUCTURE — transport infra transversale, pas de Neter
 * gouverneur métier.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const StringId = z.string().min(1);

export const manifest = defineManifest({
  service: "nsp",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "publish",
      inputSchema: z.object({
        userId: StringId,
        event: z.unknown(),
      }),
      outputSchema: z.object({
        delivered: z.number().int().nonnegative(),
      }),
      sideEffects: ["EVENT_EMIT"],
      idempotent: false,
      latencyBudgetMs: 50,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Sans transport SSE temps réel, les UIs Cockpit/Console/Creator restent muettes pendant les Intents long-running (Ptah forge, sequences Glory) — l'opérateur navigue à l'aveugle et la perception de l'OS comme système vivant s'effondre.",
    },
  ],
  dependencies: [],
  docs: {
    summary:
      "Transport publish/subscribe SSE pour streamer Intent progress + notifications + MCP invocations vers UIs. Utilitaire pur, pas de capability métier. ADR-0025/0026.",
  },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Backbone temps réel de tout l'OS — sans NSP, aucun streaming UI possible et l'expérience devient batch/refresh manuel.",
  missionStep: 4,
});
