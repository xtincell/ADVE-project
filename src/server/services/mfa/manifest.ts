import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "mfa",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "generateTotp",
      inputSchema: z.object({ secret: z.string(), atSeconds: z.number().optional() }),
      outputSchema: z.string().regex(/^\d{6}$/),
      sideEffects: [],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "TOTP generation for admin enrollment — without it, MFA can't be set up.",
    },
    {
      name: "verifyTotp",
      inputSchema: z.object({ secret: z.string(), code: z.string() }),
      outputSchema: z.boolean(),
      sideEffects: [],
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "TOTP verification gates admin login — without it, MFA is decorative.",
    },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Admin compromise = total OS compromise. MFA on operator console is non-negotiable for founder trust.",
  docs: {
    summary: "RFC 6238 TOTP MFA for ADMIN role. Used by NextAuth credentials provider during admin login.",
  },
});
