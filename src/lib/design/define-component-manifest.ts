/**
 * defineComponentManifest — frontend mirror of backend `defineManifest`
 * (src/server/governance/manifest.ts:209). Zod-validated runtime in dev,
 * no-op in prod.
 *
 * Cf. DESIGN-SYSTEM.md §17.B.13 + ADR-0013.
 */

import { z } from "zod";

const A11Y_LEVELS = ["A", "AA", "AAA"] as const;

const MissionContributionSchema = z.union([
  z.literal("DIRECT_SUPERFAN"),
  z.literal("DIRECT_OVERTON"),
  z.literal("DIRECT_BOTH"),
  z.literal("DIRECT_ENGAGEMENT"),
  z.literal("DIRECT_NOTORIETY"),
  z.literal("INDIRECT_NOTORIETY"),
  z.literal("GROUND_INFRASTRUCTURE"),
  z.string().regex(/^CHAIN_VIA:[a-z][a-z0-9-]*$/),
]);

const VariantSchema = z.object({
  name: z.string().min(1),
  tokens: z.array(z.string()).optional(),
  description: z.string().optional(),
});

const ComponentManifestSchema = z.object({
  component: z.string().regex(/^[a-z][a-z0-9-]*$/, "kebab-case required"),
  governor: z.literal("NETERU_UI"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "semver required"),
  anatomy: z.array(z.string()).min(1, "anatomy slots required"),
  variants: z.array(VariantSchema).min(1, "at least 1 variant"),
  sizes: z.array(z.string()).optional(),
  tones: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
  density: z.array(z.enum(["compact", "comfortable", "airy", "editorial"])).optional(),
  constraints: z
    .object({
      minHeight: z.string().optional(),
      minWidth: z.string().optional(),
      maxLines: z.number().optional(),
      touchTargetMin: z.string().optional(),
    })
    .optional(),
  a11yLevel: z.enum(A11Y_LEVELS),
  i18n: z.object({
    rtl: z.boolean(),
    fontScaling: z.string().optional(),
  }),
  missionContribution: MissionContributionSchema,
  missionStep: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  groundJustification: z.string().optional(),
});

export type ComponentManifest = z.infer<typeof ComponentManifestSchema>;

export function defineComponentManifest<T extends ComponentManifest>(m: T): Readonly<T> {
  if (process.env.NODE_ENV !== "production") {
    const result = ComponentManifestSchema.safeParse(m);
    if (!result.success) {
      const flat = result.error.errors.map((e) => `  - ${e.path.join(".")}: ${e.message}`).join("\n");
      throw new Error(`[design] Invalid component manifest for "${m.component}":\n${flat}`);
    }
    if (m.missionContribution === "GROUND_INFRASTRUCTURE" && !m.groundJustification) {
      throw new Error(
        `[design] Component "${m.component}" declares missionContribution=GROUND_INFRASTRUCTURE but has no groundJustification. Cf. NEFER §6.3.`,
      );
    }
  }
  return Object.freeze(m);
}
