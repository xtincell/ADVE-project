/** Global delivery settings. Secrets use the existing AES-GCM vault primitive;
 * generic McpServerConfig readers/writers must never expose this reserved row. */
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { encryptTokenPayload, decryptTokenPayload } from "@/server/services/oauth-integrations";
import { EMAIL_PROVIDERS, type DeliveryEmailProvider, type DeliverySettingsInput, type DeliverySettingsView, type SecretStatus } from "@/domain/delivery-settings";

export const DELIVERY_SETTINGS_KEY = "system-delivery-settings-v1";
type ConfigClient = Pick<Prisma.TransactionClient, "mcpServerConfig">;
const storedSchema = z.object({
  version: z.literal(1),
  email: z.object({ provider: z.enum(["ENV", ...EMAIL_PROVIDERS]).optional(), from: z.string().nullable().optional(),
    mailgunDomain: z.string().nullable().optional(), mailgunRegion: z.enum(["us", "eu"]).optional(),
    credentials: z.partialRecord(z.enum(EMAIL_PROVIDERS), z.string().nullable()).optional() }).optional(),
  cinetpay: z.object({ mode: z.enum(["SANDBOX", "LIVE"]).optional(), apiKey: z.string().nullable().optional(), apiPassword: z.string().nullable().optional() }).optional(),
});
type Stored = z.infer<typeof storedSchema>;
const envNames: Record<DeliveryEmailProvider, string> = { RESEND: "RESEND_API_KEY", MAILGUN: "MAILGUN_API_KEY", SENDGRID: "SENDGRID_API_KEY", BREVO: "BREVO_API_KEY" };
const clean = (value: string | undefined) => value?.trim() || null;
export function deliveryVaultAvailable() { return (process.env.INTEGRATION_TOKEN_KEY?.length ?? 0) >= 32; }
async function storedSettings(client: ConfigClient): Promise<Stored> {
  const row = await client.mcpServerConfig.findUnique({ where: { serverName: DELIVERY_SETTINGS_KEY }, select: { config: true } });
  if (!row) return { version: 1 };
  const parsed = storedSchema.safeParse(row.config);
  if (!parsed.success) throw new Error("DELIVERY_SETTINGS_UNAVAILABLE");
  return parsed.data;
}
function secret(encoded: string | null | undefined, env: string | undefined, scope: string) {
  let value: string | null = null;
  let readable = true;
  if (encoded === undefined) value = clean(env);
  else if (encoded !== null) {
    try {
      const data = decryptTokenPayload<{ scope?: unknown; value?: unknown }>(encoded);
      if (data.scope !== scope || typeof data.value !== "string" || !data.value.trim()) throw new Error("invalid");
      value = data.value;
    } catch { readable = false; }
  }
  const status: SecretStatus = { configured: value !== null, source: encoded !== undefined ? "DATABASE" : value ? "ENV" : "NONE", overridden: encoded !== undefined, readable };
  return { value, status };
}
export function cinetpayEnvironmentValid(config: { apiKey: string | null; baseUrl: string }) {
  if (!["https://api.cinetpay.co", "https://api.cinetpay.net"].includes(config.baseUrl)) return false;
  if (process.env.NODE_ENV === "production") return config.baseUrl === "https://api.cinetpay.co" && /^sk_live_/i.test(config.apiKey ?? "");
  return !(/^sk_live_/i.test(config.apiKey ?? "") && config.baseUrl !== "https://api.cinetpay.co")
    && !(/^sk_test_/i.test(config.apiKey ?? "") && config.baseUrl !== "https://api.cinetpay.net");
}
function resolve(stored: Stored) {
  const email = stored.email ?? {}, cinetpay = stored.cinetpay ?? {};
  const credentials = Object.fromEntries(EMAIL_PROVIDERS.map(provider => [provider, secret(email.credentials?.[provider], process.env[envNames[provider]], `email:${provider}`)])) as Record<DeliveryEmailProvider, ReturnType<typeof secret>>;
  const apiKey = secret(cinetpay.apiKey, process.env.CINETPAY_API_KEY, "cinetpay:apiKey");
  const apiPassword = secret(cinetpay.apiPassword, process.env.CINETPAY_API_PASSWORD, "cinetpay:apiPassword");
  const baseUrl = cinetpay.mode ? cinetpay.mode === "LIVE" ? "https://api.cinetpay.co" : "https://api.cinetpay.net"
    : (process.env.CINETPAY_BASE_URL ?? "https://api.cinetpay.net").replace(/\/+$/, "");
  return {
    email: { provider: email.provider ?? "ENV", from: email.from !== undefined ? email.from : clean(process.env.EMAIL_FROM),
      mailgunDomain: email.mailgunDomain !== undefined ? email.mailgunDomain : clean(process.env.MAILGUN_DOMAIN),
      mailgunRegion: email.mailgunRegion ?? (process.env.MAILGUN_REGION?.toLowerCase() === "eu" ? "eu" : "us"), credentials },
    cinetpay: { apiKey: apiKey.value, apiPassword: apiPassword.value, baseUrl, keyStatus: apiKey.status, passwordStatus: apiPassword.status },
  };
}
export async function resolveDeliverySettings(client: ConfigClient = db) { return resolve(await storedSettings(client)); }
export async function resolveCinetpaySettings(client: ConfigClient = db) { return (await resolveDeliverySettings(client)).cinetpay; }
export function configuredEmailProviders(settings: Awaited<ReturnType<typeof resolveDeliverySettings>>["email"]) {
  return EMAIL_PROVIDERS.filter(provider => (settings.provider === "ENV" || settings.provider === provider)
    && settings.credentials[provider].value && (provider !== "MAILGUN" || settings.mailgunDomain));
}
function view(stored: Stored): DeliverySettingsView {
  const settings = resolve(stored), email = settings.email, payment = settings.cinetpay;
  const selected = email.provider === "ENV"
    ? configuredEmailProviders(email)[0]
      ?? EMAIL_PROVIDERS.find(provider => email.credentials[provider].value)
      ?? EMAIL_PROVIDERS.find(provider => !email.credentials[provider].status.readable || email.credentials[provider].status.overridden)
    : email.provider;
  const apiKey = selected ? email.credentials[selected].status : { configured: false, source: "NONE" as const, overridden: false, readable: true };
  const emailComplete = Boolean(email.from && configuredEmailProviders(email).length);
  const environmentValid = cinetpayEnvironmentValid(payment);
  const paymentComplete = Boolean(payment.apiKey && payment.apiPassword && environmentValid);
  return { vaultAvailable: deliveryVaultAvailable(),
    email: { provider: email.provider, from: email.from, mailgunDomain: email.mailgunDomain, mailgunRegion: email.mailgunRegion,
      apiKey, status: emailComplete ? "CONFIGURED" : email.from || apiKey.configured ? "INCOMPLETE" : "MISSING", verified: false },
    cinetpay: { mode: payment.baseUrl === "https://api.cinetpay.co" ? "LIVE" : "SANDBOX", apiKey: payment.keyStatus, apiPassword: payment.passwordStatus,
      status: paymentComplete ? "CONFIGURED" : payment.apiKey || payment.apiPassword ? "INCOMPLETE" : "MISSING", environmentValid, verified: false },
  };
}
export async function getDeliverySettings(client: ConfigClient = db) { return view(await storedSettings(client)); }
function changeSecret(current: string | null | undefined, change: NonNullable<DeliverySettingsInput["cinetpay"]>["apiKey"], scope: string) {
  if (!change || change.action === "KEEP") return current;
  if (change.action === "CLEAR") return null;
  if (change.action === "USE_ENV") return undefined;
  if (!change.value.trim()) return current; // empty password input never erases an existing secret
  return encryptTokenPayload({ scope, value: change.value.trim() });
}
async function saveIn(input: DeliverySettingsInput, client: ConfigClient) {
  const stored = await storedSettings(client);
  const email = { ...stored.email }, cinetpay = { ...stored.cinetpay };
  if (input.email) {
    const { apiKey, ...fields } = input.email;
    Object.assign(email, fields);
    // Empty text means no replacement; explicit null clears a text setting.
    if (fields.from === "") email.from = stored.email?.from;
    if (fields.mailgunDomain === "") email.mailgunDomain = stored.email?.mailgunDomain;
    const provider = email.provider ?? "ENV";
    if (apiKey && apiKey.action !== "KEEP") {
      if (provider === "ENV") throw new Error("EMAIL_PROVIDER_REQUIRED");
      email.credentials = { ...email.credentials, [provider]: changeSecret(email.credentials?.[provider], apiKey, `email:${provider}`) };
    }
  }
  if (input.cinetpay) {
    if (input.cinetpay.mode) cinetpay.mode = input.cinetpay.mode;
    cinetpay.apiKey = changeSecret(cinetpay.apiKey, input.cinetpay.apiKey, "cinetpay:apiKey");
    cinetpay.apiPassword = changeSecret(cinetpay.apiPassword, input.cinetpay.apiPassword, "cinetpay:apiPassword");
  }
  const data = JSON.parse(JSON.stringify({ version: 1, email, cinetpay })) as Prisma.InputJsonValue;
  await client.mcpServerConfig.upsert({ where: { serverName: DELIVERY_SETTINGS_KEY }, create: { serverName: DELIVERY_SETTINGS_KEY, description: "System email and CinetPay configuration (encrypted secrets)", config: data }, update: { config: data }, select: { id: true } });
  return view(storedSchema.parse(data));
}

export async function saveDeliverySettings(input: DeliverySettingsInput, client: Pick<typeof db, "$transaction"> = db) {
  // Independent email/payment forms patch one global document. Serialize the
  // read/merge/write, including first creation, so neither overwrites the other.
  return client.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${DELIVERY_SETTINGS_KEY}))`;
    return saveIn(input, tx);
  });
}
