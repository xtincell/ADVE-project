/**
 * Manifest — email.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): INFRASTRUCTURE governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Provides outbound email
 * delivery (Resend / SendGrid / log fallback) for authentication and
 * notification flows.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const sendEmailInput = z.object({
  to: z.string(),
  subject: z.string(),
  html: z.string(),
  text: z.string().optional(),
  tag: z.string().optional(),
});

export const manifest = defineManifest({
  service: "email",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "sendEmail",
      inputSchema: sendEmailInput,
      outputSchema: z.object({ ok: z.boolean(), provider: z.string(), id: z.string().optional() }),
      sideEffects: ["EXTERNAL_API"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Without transactional email, password reset and account claim flows break — founders cannot self-serve recovery, OS support cost balloons.",
    },
    {
      name: "renderPasswordResetEmail",
      inputSchema: z.object({ resetUrl: z.string(), userName: z.string().optional() }),
      outputSchema: z.object({ subject: z.string(), html: z.string(), text: z.string() }),
      sideEffects: [],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Renders the password-reset email; pure function, no I/O.",
    },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Outbound email is a foundational infra capability used by auth and notification flows; without it founder onboarding stalls.",
});
