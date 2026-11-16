import { z } from "zod";

export const EMAIL_PROVIDERS = ["RESEND", "MAILGUN", "SENDGRID", "BREVO"] as const;
export type DeliveryEmailProvider = typeof EMAIL_PROVIDERS[number];
export const secretChangeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("KEEP") }).strict(),
  z.object({ action: z.literal("REPLACE"), value: z.string().trim().max(8192) }).strict(),
  z.object({ action: z.literal("CLEAR") }).strict(),
  z.object({ action: z.literal("USE_ENV") }).strict(),
]);
const sender = z.string().trim().max(320).refine(value => !value || /^[^\r\n<>]*<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>$/.test(value)
  || /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value), "Adresse expéditeur invalide.");
export const deliverySettingsInputSchema = z.object({
  email: z.object({
    provider: z.enum(["ENV", ...EMAIL_PROVIDERS]).optional(),
    from: sender.nullable().optional(),
    mailgunDomain: z.string().trim().max(253).regex(/^$|^[a-zA-Z0-9.-]+$/, "Domaine Mailgun invalide.").nullable().optional(),
    mailgunRegion: z.enum(["us", "eu"]).optional(),
    apiKey: secretChangeSchema.optional(),
  }).strict().optional(),
  cinetpay: z.object({
    mode: z.enum(["SANDBOX", "LIVE"]).optional(),
    apiKey: secretChangeSchema.optional(),
    apiPassword: secretChangeSchema.optional(),
  }).strict().optional(),
}).strict();
export type DeliverySettingsInput = z.infer<typeof deliverySettingsInputSchema>;
export type SecretStatus = { configured: boolean; source: "DATABASE" | "ENV" | "NONE"; overridden: boolean; readable: boolean };
export type ConfigurationStatus = "MISSING" | "INCOMPLETE" | "CONFIGURED";
export type DeliverySettingsView = {
  vaultAvailable: boolean;
  email: { provider: "ENV" | DeliveryEmailProvider; from: string | null; mailgunDomain: string | null; mailgunRegion: "us" | "eu"; apiKey: SecretStatus; status: ConfigurationStatus; verified: false };
  cinetpay: { mode: "SANDBOX" | "LIVE"; apiKey: SecretStatus; apiPassword: SecretStatus; status: ConfigurationStatus; environmentValid: boolean; verified: false };
};
