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
    {
      name: "generateBase32Secret",
      inputSchema: z.object({ byteLength: z.number().int().positive().optional() }),
      outputSchema: z.string(),
      sideEffects: [],
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Génération secret base32 pour enrollement initial admin — sans cela impossible de provisionner MFA pour nouveaux admins.",
    },
    {
      name: "otpauthUrl",
      inputSchema: z.object({
        secret: z.string(),
        accountName: z.string().min(1),
        issuer: z.string().min(1),
      }).passthrough(),
      outputSchema: z.string().url(),
      sideEffects: [],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "URL otpauth:// pour QR code à scanner avec Google Authenticator/Authy — UX standard d'enrollement TOTP.",
    },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Admin compromise = total OS compromise. MFA on operator console is non-negotiable for founder trust.",
  docs: {
    summary: "RFC 6238 TOTP MFA for ADMIN role. Used by NextAuth credentials provider during admin login.",
  },
});
