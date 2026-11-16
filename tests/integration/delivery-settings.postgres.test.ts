/** Owned local PostgreSQL only: real configuration storage, crypto and audit spine. */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/types", () => ({}));
import { db } from "@/lib/db";
import { systemConfigRouter } from "@/server/trpc/routers/system-config";
import { DELIVERY_SETTINGS_KEY, getDeliverySettings, resolveDeliverySettings, saveDeliverySettings } from "@/server/services/anubis/delivery-settings";
import { verifyEmissionSeal } from "@/server/governance/hash-chain";

const actor = `delivery-fixture-${randomUUID()}`;
const caller = (role = "ADMIN") => systemConfigRouter.createCaller({ session: { user: { id: actor, role } }, db } as never);
let safe = false;
const network = vi.fn(async () => { throw new Error("No network allowed in configuration fixture"); });

beforeAll(async () => {
  const connection = new URL(process.env.DATABASE_URL!);
  expect(connection.hostname).toBe("127.0.0.1");
  expect(connection.pathname).toBe("/shinkiro_verify");
  const ownedCI = process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REPOSITORY === "xtincell/ADVE-project";
  expect(ownedCI ? connection.port === "5432" : connection.port === "55439" && connection.username === "shinkiro_fixture").toBe(true);
  expect(connection.searchParams.get("schema") ?? "public").toBe("public");
  // This one global fixture must not overwrite an existing configuration.
  expect(await db.mcpServerConfig.findUnique({ where: { serverName: DELIVERY_SETTINGS_KEY } })).toBeNull();
  safe = true;
  vi.stubEnv("INTEGRATION_TOKEN_KEY", "owned-local-delivery-vault-key-over-32-characters");
  vi.stubEnv("CINETPAY_API_KEY", "sk_test_owned_env_preserved");
  vi.stubEnv("CINETPAY_API_PASSWORD", "owned-env-password-preserved");
  vi.stubEnv("CINETPAY_BASE_URL", "https://api.cinetpay.net");
  vi.stubEnv("EMAIL_FROM", "");
  vi.stubGlobal("fetch", network);
});
afterAll(async () => {
  if (safe) {
    await db.mcpServerConfig.deleteMany({ where: { serverName: DELIVERY_SETTINGS_KEY } });
    await db.intentEmission.deleteMany({ where: { caller: "system-config:saveDeliverySettings", payload: { path: ["actor"], equals: actor } } });
  }
  vi.unstubAllEnvs(); vi.unstubAllGlobals();
  await db.$disconnect();
});

describe("delivery settings on actual PostgreSQL", () => {
  it("retains both sections and all encrypted keys under concurrent partial saves, including first creation", async () => {
    await Promise.all([
      saveDeliverySettings({ email: { provider: "RESEND", from: "owned@example.invalid", apiKey: { action: "REPLACE", value: "owned-resend-secret" } } }),
      saveDeliverySettings({ email: { provider: "BREVO", apiKey: { action: "REPLACE", value: "owned-brevo-secret" } } }),
      saveDeliverySettings({ cinetpay: { mode: "SANDBOX", apiKey: { action: "REPLACE", value: "sk_test_owned_saved" } } }),
      saveDeliverySettings({ cinetpay: { apiPassword: { action: "REPLACE", value: "owned-saved-password" } } }),
    ]);
    const effective = await resolveDeliverySettings();
    expect(effective.email.from).toBe("owned@example.invalid");
    expect(effective.email.credentials.RESEND.value).toBe("owned-resend-secret");
    expect(effective.email.credentials.BREVO.value).toBe("owned-brevo-secret");
    expect(effective.cinetpay.apiKey).toBe("sk_test_owned_saved");
    expect(effective.cinetpay.apiPassword).toBe("owned-saved-password");
    const stored = await db.mcpServerConfig.findUniqueOrThrow({ where: { serverName: DELIVERY_SETTINGS_KEY } });
    for (const secret of ["owned-resend-secret", "owned-brevo-secret", "sk_test_owned_saved", "owned-saved-password"]) expect(JSON.stringify(stored.config)).not.toContain(secret);
    expect((await getDeliverySettings()).cinetpay).toMatchObject({ status: "CONFIGURED", verified: false });
    expect(network).not.toHaveBeenCalled();
  });

  it("uses a sealed redacted audit and never returns either secret or ciphertext", async () => {
    const result = await caller().saveDeliverySettings({ email: { provider: "RESEND", apiKey: { action: "REPLACE", value: "owned-rotated-secret" } } });
    const emissions = await db.intentEmission.findMany({ where: { caller: "system-config:saveDeliverySettings", payload: { path: ["actor"], equals: actor } } });
    expect(emissions).toHaveLength(1);
    expect(emissions[0]!.status).toBe("OK");
    expect(verifyEmissionSeal(emissions[0]!)).toMatchObject({ ok: true });
    const raw = await db.mcpServerConfig.findUniqueOrThrow({ where: { serverName: DELIVERY_SETTINGS_KEY } });
    const ciphertext = (raw.config as { email: { credentials: { RESEND: string } } }).email.credentials.RESEND;
    const observable = JSON.stringify([result, await caller().getDeliverySettings(), emissions]);
    expect(observable).not.toContain("owned-rotated-secret"); expect(observable).not.toContain(ciphertext);
    expect(network).not.toHaveBeenCalled();
  });

  it("blocks non-admin and generic CRUD without changing storage or writing an audit", async () => {
    const before = await db.mcpServerConfig.findUniqueOrThrow({ where: { serverName: DELIVERY_SETTINGS_KEY } });
    const count = await db.intentEmission.count({ where: { caller: "system-config:saveDeliverySettings", payload: { path: ["actor"], equals: actor } } });
    await expect(caller("USER").getDeliverySettings()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller("USER").saveDeliverySettings({ cinetpay: { apiKey: { action: "CLEAR" } } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().get({ key: DELIVERY_SETTINGS_KEY })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().upsert({ key: DELIVERY_SETTINGS_KEY, config: { injected: "owned-secret" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect((await db.mcpServerConfig.findUniqueOrThrow({ where: { serverName: DELIVERY_SETTINGS_KEY } })).config).toEqual(before.config);
    expect(await db.intentEmission.count({ where: { caller: "system-config:saveDeliverySettings", payload: { path: ["actor"], equals: actor } } })).toBe(count);
  });
});
