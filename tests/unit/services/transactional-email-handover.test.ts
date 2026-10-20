import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/server/services/email";

const emailKeys = ["BREVO_API_KEY", "RESEND_API_KEY", "SENDGRID_API_KEY", "MAILGUN_API_KEY", "MAILGUN_DOMAIN", "EMAIL_FROM"] as const;
function clearEmailConfiguration() { for (const key of emailKeys) vi.stubEnv(key, ""); }
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("transactional handover through the existing email transport", () => {
  it("does not claim delivery or log the reset secret when no transport is configured", async () => {
    clearEmailConfiguration(); const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const network = vi.fn(); vi.stubGlobal("fetch", network);
    const result = await sendEmail({ to: "owned@example.invalid", subject: "Access", html: "OWNED_RESET_SECRET", text: "OWNED_RESET_SECRET" });
    expect(result.ok).toBe(false);
    expect(log).not.toHaveBeenCalled(); expect(network).not.toHaveBeenCalled();
  });
  it("requires an explicit sender even if a provider key is present", async () => {
    clearEmailConfiguration(); vi.stubEnv("BREVO_API_KEY", "owned-fake-test-key");
    const network = vi.fn(); vi.stubGlobal("fetch", network);
    const result = await sendEmail({ to: "owned@example.invalid", subject: "Access", html: "Owned fixture" });
    expect(result.ok).toBe(false); expect(network).not.toHaveBeenCalled();
  });
  it("keeps the reset category and propagates the actual provider acknowledgement", async () => {
    clearEmailConfiguration(); vi.stubEnv("BREVO_API_KEY", "owned-fake-test-key");
    vi.stubEnv("EMAIL_FROM", "La Fusée <owned-sender@example.invalid>");
    const network = vi.fn(async () => new Response(JSON.stringify({ messageId: "owned-provider-receipt" }), { status: 201 }));
    vi.stubGlobal("fetch", network);
    const result = await sendEmail({ to: "owned@example.invalid", subject: "Access", html: "Owned fixture", tag: "password-reset" });
    expect(result.ok).toBe(true); expect(JSON.stringify(result)).toContain("owned-provider-receipt");
    const [url, init] = network.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(JSON.parse(init.body as string).tags).toEqual(["password-reset"]);
  });
});
