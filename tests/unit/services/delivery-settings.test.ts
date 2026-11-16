import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ config: null as unknown, find: vi.fn(), upsert: vi.fn(), open: vi.fn(), close: vi.fn() }));
vi.mock("@/lib/auth/types", () => ({})); // declaration-only module imports next-auth at runtime
vi.mock("@/lib/db", () => ({ db: {
  mcpServerConfig: { findUnique: store.find, upsert: store.upsert },
  $transaction: async (work: (tx: unknown) => Promise<unknown>) => work({ mcpServerConfig: { findUnique: store.find, upsert: store.upsert }, $executeRaw: vi.fn() }),
} }));
vi.mock("@/server/governance/emission-spine", () => ({ openEmission: store.open, closeEmission: store.close }));
// Only the unrelated legacy generic writer is stubbed; the new settings routes
// use the real adminProcedure and the manual, redacted spine above.
vi.mock("@/server/governance/governed-procedure", async () => {
  const { operatorProcedure } = await import("@/server/trpc/init");
  return { governedProcedure: ({ inputSchema }: { inputSchema: Parameters<typeof operatorProcedure.input>[0] }) => operatorProcedure.input(inputSchema) };
});
import { getDeliverySettings, resolveDeliverySettings, saveDeliverySettings, DELIVERY_SETTINGS_KEY } from "@/server/services/anubis/delivery-settings";
import { systemConfigRouter } from "@/server/trpc/routers/system-config";
import { sendEmail, systemEmailIsArmed } from "@/server/services/anubis/email-sender";
import { cinetpayProvider } from "@/server/services/payment-providers/cinetpay";
import { pickProvider, listProviders } from "@/server/services/payment-providers";
import { cinetpayCredentialFingerprint } from "@/server/services/crm-engine/collection-provider";
import { db } from "@/lib/db";

const caller = (role = "ADMIN") => systemConfigRouter.createCaller({ session: { user: { id: "operator", role } }, db } as never);
const fetcher = vi.fn();
beforeEach(() => {
  vi.clearAllMocks(); store.config = null;
  store.find.mockImplementation(async () => store.config === null ? null : { config: store.config });
  store.upsert.mockImplementation(async ({ create }) => { store.config = create.config; return { id: "settings" }; });
  store.open.mockResolvedValue("intent"); store.close.mockResolvedValue(undefined);
  for (const key of ["RESEND_API_KEY", "MAILGUN_API_KEY", "MAILGUN_DOMAIN", "MAILGUN_REGION", "SENDGRID_API_KEY", "BREVO_API_KEY", "EMAIL_FROM", "CINETPAY_API_KEY", "CINETPAY_API_PASSWORD", "CINETPAY_BASE_URL", "STRIPE_SECRET_KEY", "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"]) vi.stubEnv(key, "");
  vi.stubEnv("CINETPAY_BASE_URL", "https://api.cinetpay.net");
  vi.stubEnv("INTEGRATION_TOKEN_KEY", "owned-only-test-vault-key-more-than-32-characters");
  vi.stubEnv("NODE_ENV", "test");
  fetcher.mockReset(); vi.stubGlobal("fetch", fetcher);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("delivery configuration persistence and authority", () => {
  it("can save an incomplete draft without a vault key, provider account or network call", async () => {
    vi.stubEnv("INTEGRATION_TOKEN_KEY", "");
    const result = await caller().saveDeliverySettings({ email: { provider: "RESEND", from: "Equipe <hello@example.test>" } });
    expect(result).toMatchObject({ vaultAvailable: false, email: { status: "INCOMPLETE", verified: false }, cinetpay: { status: "MISSING", verified: false } });
    expect(fetcher).not.toHaveBeenCalled();
    expect((await caller().getDeliverySettings()).email.from).toBe("Equipe <hello@example.test>");
  });

  it("encrypts secrets at rest and omits values and ciphertext from views and audit events", async () => {
    const result = await caller().saveDeliverySettings({ email: { provider: "RESEND", from: "hello@example.test", apiKey: { action: "REPLACE", value: "owned-email-secret" } },
      cinetpay: { mode: "SANDBOX", apiKey: { action: "REPLACE", value: "sk_test_owned_payment" }, apiPassword: { action: "REPLACE", value: "owned-payment-password" } } });
    const persisted = JSON.stringify(store.config);
    const exposed = JSON.stringify([result, await caller().getDeliverySettings(), store.open.mock.calls, store.close.mock.calls]);
    for (const secret of ["owned-email-secret", "sk_test_owned_payment", "owned-payment-password"]) {
      expect(persisted).not.toContain(secret); expect(exposed).not.toContain(secret);
    }
    const internal = await resolveDeliverySettings();
    expect(internal.email.credentials.RESEND.value).toBe("owned-email-secret");
    expect(internal.cinetpay.apiPassword).toBe("owned-payment-password");
    expect(result.email).toMatchObject({ status: "CONFIGURED", verified: false, apiKey: { source: "DATABASE", configured: true } });
    expect(result.cinetpay).toMatchObject({ status: "CONFIGURED", verified: false });
    const encrypted = (store.config as { email: { credentials: { RESEND: string } } }).email.credentials.RESEND;
    expect(exposed).not.toContain(encrypted);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["USER", "OPERATOR", "FOUNDER"])("refuses %s before reading settings or opening an emission", async role => {
    await expect(caller(role).getDeliverySettings()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(role).saveDeliverySettings({ email: { apiKey: { action: "REPLACE", value: "untrusted" } } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(store.find).not.toHaveBeenCalled(); expect(store.upsert).not.toHaveBeenCalled(); expect(store.open).not.toHaveBeenCalled();
  });

  it("blocks the generic config endpoints from reading or overwriting the private row", async () => {
    await expect(caller().get({ key: DELIVERY_SETTINGS_KEY })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().upsert({ key: DELIVERY_SETTINGS_KEY, config: { email: "injection" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(store.find).not.toHaveBeenCalled(); expect(store.upsert).not.toHaveBeenCalled();
  });

  it("preserves environment credentials and unrelated payment settings when saving only email", async () => {
    vi.stubEnv("CINETPAY_API_KEY", "sk_live_env_kept"); vi.stubEnv("CINETPAY_API_PASSWORD", "env-password-kept"); vi.stubEnv("CINETPAY_BASE_URL", "https://api.cinetpay.co");
    const result = await caller().saveDeliverySettings({ email: { provider: "BREVO", from: "future@example.test", apiKey: { action: "REPLACE", value: "" } } });
    expect(result.cinetpay).toMatchObject({ mode: "LIVE", status: "CONFIGURED", apiKey: { source: "ENV" }, apiPassword: { source: "ENV" } });
    expect(process.env.CINETPAY_API_KEY).toBe("sk_live_env_kept");
    expect((await resolveDeliverySettings()).cinetpay.apiPassword).toBe("env-password-kept");
  });

  it("supports blank retention, replacement, explicit clearing and restoration of environment fallback", async () => {
    vi.stubEnv("CINETPAY_API_KEY", "sk_test_environment");
    await saveDeliverySettings({ cinetpay: { apiKey: { action: "REPLACE", value: "sk_test_override" } } });
    await saveDeliverySettings({ cinetpay: { apiKey: { action: "REPLACE", value: "  " } } });
    expect((await resolveDeliverySettings()).cinetpay.apiKey).toBe("sk_test_override");
    await saveDeliverySettings({ cinetpay: { apiKey: { action: "CLEAR" } } });
    expect((await resolveDeliverySettings()).cinetpay.apiKey).toBeNull();
    expect((await getDeliverySettings()).cinetpay.apiKey).toMatchObject({ overridden: true, configured: false });
    await saveDeliverySettings({ cinetpay: { apiKey: { action: "USE_ENV" } } });
    expect((await resolveDeliverySettings()).cinetpay.apiKey).toBe("sk_test_environment");
  });

  it("does not publish persistence errors containing secrets", async () => {
    store.upsert.mockRejectedValueOnce(new Error("database failed with owned-email-secret"));
    await expect(caller().saveDeliverySettings({ email: { provider: "RESEND", apiKey: { action: "REPLACE", value: "owned-email-secret" } } })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(JSON.stringify([store.open.mock.calls, store.close.mock.calls])).not.toContain("owned-email-secret");
  });

  it("reports uncertain confirmation after a committed save when the audit close fails", async () => {
    store.close.mockRejectedValueOnce(new Error("owned-secret-in-driver-error"))
      .mockRejectedValueOnce(new Error("owned-secret-in-driver-error"));
    const result = await caller().saveDeliverySettings({ email: { provider: "RESEND", from: "saved@example.test" } }).catch((error: Error) => error);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("n’a pas pu être confirmé");
    expect((result as Error).message).not.toContain("non enregistrée");
    expect((result as Error).message).not.toContain("owned-secret-in-driver-error");
    expect((await getDeliverySettings()).email.from).toBe("saved@example.test");
  });

  it("fails closed on a ciphertext that cannot be decrypted instead of reviving the env secret", async () => {
    vi.stubEnv("CINETPAY_API_KEY", "sk_test_environment");
    await saveDeliverySettings({ cinetpay: { apiKey: { action: "REPLACE", value: "sk_test_override" } } });
    vi.stubEnv("INTEGRATION_TOKEN_KEY", "different-owned-vault-key-more-than-32-characters");
    expect((await getDeliverySettings()).cinetpay.apiKey).toMatchObject({ configured: false, source: "DATABASE", readable: false });
    expect((await resolveDeliverySettings()).cinetpay.apiKey).toBeNull();
  });
});

describe("effective runtime configuration with entirely mocked transport", () => {
  it("describes the actual first usable provider in automatic mode", async () => {
    vi.stubEnv("EMAIL_FROM", "env@example.test"); vi.stubEnv("BREVO_API_KEY", "usable-brevo");
    await saveDeliverySettings({ email: { provider: "MAILGUN", mailgunDomain: null, apiKey: { action: "REPLACE", value: "incomplete-mailgun" } } });
    await saveDeliverySettings({ email: { provider: "ENV" } });
    expect((await getDeliverySettings()).email).toMatchObject({ provider: "ENV", status: "CONFIGURED", apiKey: { source: "ENV", configured: true } });
    fetcher.mockResolvedValueOnce(Response.json({ messageId: "owned-auto-mail" }));
    expect(await sendEmail({ to: "recipient@example.test", subject: "Owned", html: "Owned" })).toMatchObject({ ok: true, provider: "BREVO" });
    expect(fetcher.mock.calls[0]![0]).toBe("https://api.brevo.com/v3/smtp/email");
  });
  it("uses the saved sender/provider/key at send time and readiness time", async () => {
    vi.stubEnv("EMAIL_FROM", "old@example.test"); vi.stubEnv("BREVO_API_KEY", "old-brevo");
    await saveDeliverySettings({ email: { provider: "RESEND", from: "Saved <saved@example.test>", apiKey: { action: "REPLACE", value: "saved-resend" } } });
    expect(await systemEmailIsArmed()).toBe(true);
    fetcher.mockResolvedValueOnce(Response.json({ id: "owned-mail" }));
    expect(await sendEmail({ to: "recipient@example.test", subject: "Owned", html: "Owned" })).toMatchObject({ ok: true, provider: "RESEND" });
    expect(fetcher.mock.calls[0]![0]).toBe("https://api.resend.com/emails");
    expect(fetcher.mock.calls[0]![1].headers.Authorization).toBe("Bearer saved-resend");
    expect(JSON.parse(fetcher.mock.calls[0]![1].body).from).toBe("Saved <saved@example.test>");
    expect(process.env.EMAIL_FROM).toBe("old@example.test");
    await saveDeliverySettings({ email: { apiKey: { action: "CLEAR" } } });
    expect(await systemEmailIsArmed()).toBe(false);
  });

  it("uses existing environment email settings when no override exists and hides error echoes", async () => {
    vi.stubEnv("EMAIL_FROM", "env@example.test"); vi.stubEnv("RESEND_API_KEY", "env-secret");
    fetcher.mockResolvedValueOnce(Response.json({ message: "env-secret" }, { status: 401 }));
    const result = await sendEmail({ to: "recipient@example.test", subject: "Owned", html: "Owned", allowFallback: false });
    expect(result).toMatchObject({ ok: false, provider: "RESEND" });
    expect(JSON.stringify(result)).not.toContain("env-secret");
    expect(fetcher.mock.calls[0]![1].headers.Authorization).toBe("Bearer env-secret");
  });

  it("selects CinetPay from saved credentials and invalidates OAuth and approval fingerprints after rotation", async () => {
    await saveDeliverySettings({ cinetpay: { mode: "SANDBOX", apiKey: { action: "REPLACE", value: "sk_test_db_owned" }, apiPassword: { action: "REPLACE", value: "db-password-one" } } });
    expect((await pickProvider({ preferred: "CINETPAY", allowMock: false })).id).toBe("CINETPAY");
    expect(await listProviders()).toContainEqual({ id: "CINETPAY", configured: true });
    const before = await cinetpayCredentialFingerprint();
    const receipt = { status: "PENDING", merchant_transaction_id: "owned-ref", transaction_id: "owned-tx" };
    fetcher.mockResolvedValueOnce(Response.json({ access_token: "owned-token-one" })).mockResolvedValueOnce(Response.json(receipt));
    await cinetpayProvider.verifyPayment!("owned-ref");
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({ api_key: "sk_test_db_owned", api_password: "db-password-one" });
    await saveDeliverySettings({ cinetpay: { apiPassword: { action: "REPLACE", value: "db-password-two" } } });
    expect(await cinetpayCredentialFingerprint()).not.toBe(before);
    fetcher.mockResolvedValueOnce(Response.json({ access_token: "owned-token-two" })).mockResolvedValueOnce(Response.json(receipt));
    await cinetpayProvider.verifyPayment!("owned-ref");
    expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/oauth/login"))).toHaveLength(2);
    expect(JSON.parse(fetcher.mock.calls[2]![1].body).api_password).toBe("db-password-two");
  });

  it("preserves the production live endpoint guard before any transport", async () => {
    await saveDeliverySettings({ cinetpay: { mode: "SANDBOX", apiKey: { action: "REPLACE", value: "sk_test_owned" }, apiPassword: { action: "REPLACE", value: "owned-password" } } });
    vi.stubEnv("NODE_ENV", "production");
    expect((await getDeliverySettings()).cinetpay).toMatchObject({ status: "INCOMPLETE", environmentValid: false, verified: false });
    expect(await cinetpayProvider.isConfigured()).toBe(false);
    await expect(cinetpayProvider.verifyPayment!("owned-ref")).rejects.toThrow("environment unavailable");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("refuses a rotation between merchant approval and checkout before making any provider request", async () => {
    await saveDeliverySettings({ cinetpay: { mode: "SANDBOX", apiKey: { action: "REPLACE", value: "sk_test_approved_before_rotation" }, apiPassword: { action: "REPLACE", value: "approved-password" } } });
    const expectedCredentialFingerprint = await cinetpayCredentialFingerprint();
    await saveDeliverySettings({ cinetpay: { apiKey: { action: "REPLACE", value: "sk_test_new_unapproved_account" } } });
    await expect(cinetpayProvider.initPayment({ reference: "owned-race", amount: 100, currency: "XAF", description: "Owned",
      returnUrl: "https://owned.invalid/result", notifyUrl: "https://owned.invalid/notify", customer: { email: "owned@example.invalid" }, expectedCredentialFingerprint }))
      .rejects.toThrow("Approved payment credentials changed");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps the approved credential snapshot through OAuth even when settings rotate during fetch", async () => {
    await saveDeliverySettings({ cinetpay: { mode: "SANDBOX", apiKey: { action: "REPLACE", value: "sk_test_approved_during_fetch" }, apiPassword: { action: "REPLACE", value: "approved-snapshot-password" } } });
    const expectedCredentialFingerprint = await cinetpayCredentialFingerprint();
    fetcher.mockImplementationOnce(async () => {
      await saveDeliverySettings({ cinetpay: { mode: "LIVE", apiKey: { action: "REPLACE", value: "sk_live_rotated_during_fetch" }, apiPassword: { action: "REPLACE", value: "rotated-password" } } });
      return Response.json({ access_token: "approved-snapshot-token" });
    }).mockResolvedValueOnce(Response.json({ payment_url: "https://owned.invalid/pay", transaction_id: "owned-tx", merchant_transaction_id: "owned-snapshot", notify_token: "owned-proof" }));
    await cinetpayProvider.initPayment({ reference: "owned-snapshot", amount: 100, currency: "XAF", description: "Owned",
      returnUrl: "https://owned.invalid/result", notifyUrl: "https://owned.invalid/notify", customer: { email: "owned@example.invalid" }, expectedCredentialFingerprint });
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({ api_key: "sk_test_approved_during_fetch", api_password: "approved-snapshot-password" });
    expect(fetcher.mock.calls[1]![0]).toBe("https://api.cinetpay.net/v1/payment");
    expect(fetcher.mock.calls[1]![1].headers.Authorization).toBe("Bearer approved-snapshot-token");
    expect(fetcher.mock.calls[1]![1].body).not.toContain(expectedCredentialFingerprint);
    expect((await resolveDeliverySettings()).cinetpay.apiKey).toBe("sk_live_rotated_during_fetch");
  });
});
