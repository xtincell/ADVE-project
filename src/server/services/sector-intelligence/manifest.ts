/**
 * Manifest — sector-intelligence (Sector first-class + Overton telemetry).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const SectorAxisSchema = z.object({
  tags: z.record(z.string(), z.number().min(0).max(1)),
  confidence: z.number().min(0).max(1),
  samples: z.number().int().nonnegative(),
});

const OvertonSnapshotSchema = z.object({
  takenAt: z.string(),
  axis: SectorAxisSchema,
  narratives: z.array(z.object({ narrative: z.string(), weight: z.number() })),
});

export const manifest = defineManifest({
  service: "sector-intelligence",
  governor: "SESHAT",
  version: "1.0.0",
  acceptsIntents: ["DEFEND_OVERTON", "PROCESS_SESHAT_SIGNAL"],
  emits: ["DEFEND_OVERTON"],
  capabilities: [
    {
      name: "getSectorAxis",
      inputSchema: z.object({ slug: z.string() }),
      outputSchema: SectorAxisSchema.nullable(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "DIRECT_OVERTON",
      missionStep: 4,
    },
    {
      name: "refreshSectorOverton",
      inputSchema: z.object({
        slug: z.string(),
        signals: z.array(z.object({
          tags: z.record(z.string(), z.number()).optional(),
          narrative: z.string().optional(),
          weight: z.number().optional(),
        })),
      }),
      outputSchema: OvertonSnapshotSchema,
      sideEffects: ["DB_WRITE", "DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 8000,
      missionContribution: "DIRECT_OVERTON",
      missionStep: 5,
    },
    {
      name: "detectDrift",
      inputSchema: z.object({
        prev: OvertonSnapshotSchema,
        curr: OvertonSnapshotSchema,
      }),
      outputSchema: z.object({
        fromSnapshotAt: z.string(),
        toSnapshotAt: z.string(),
        distance: z.number(),
        significantShifts: z.array(z.object({ tag: z.string(), from: z.number(), to: z.number() })),
        emergedNarratives: z.array(z.string()),
        fadedNarratives: z.array(z.string()),
      }),
      sideEffects: [],
      idempotent: true,
      missionContribution: "DIRECT_OVERTON",
      missionStep: 5,
    },
    {
      name: "computeBrandDeflection",
      inputSchema: z.object({
        brandTags: z.record(z.string(), z.number()),
        sectorAxis: SectorAxisSchema,
      }),
      outputSchema: z.object({
        alignment: z.number().min(-1).max(1),
        deflectionVector: z.record(z.string(), z.number()),
        deflectionMagnitude: z.number().nonnegative(),
      }),
      sideEffects: [],
      idempotent: true,
      missionContribution: "DIRECT_OVERTON",
      missionStep: 4,
    },
  ],
  dependencies: ["seshat"],
  docs: {
    summary: "Models a sector as a first-class entity with cultural axis + Overton state. Powers <OvertonRadar> in Cockpit and DEFEND_OVERTON sentinel intents.",
  },
});
