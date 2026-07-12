/**
 * Newsletter — intégration Brevo par marque (BrandEmailConnector).
 *
 * Couvre les unités PURES (fetch-only, sans DB) : l'envoi transactionnel réel
 * et la validation de clé. Verrouille : (1) aucun succès simulé — un refus
 * provider remonte `ok:false`, (2) la clé n'est validée qu'après un vrai appel
 * `/v3/account`, (3) les senders vérifiés sont bien extraits.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { sendViaBrevo } from "@/server/services/anubis/email-sender";
import { validateBrevoKey } from "@/server/services/anubis/brand-email";

afterEach(() => vi.unstubAllGlobals());

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Map() as unknown as Headers,
  } as unknown as Response;
}

describe("sendViaBrevo", () => {
  it("envoie via POST /v3/smtp/email avec header api-key et retourne le messageId", async () => {
    const spy = vi.fn().mockResolvedValue(jsonResponse(201, { messageId: "<msg-123@brevo>" }));
    vi.stubGlobal("fetch", spy);

    const res = await sendViaBrevo(
      { to: "dest@example.com", subject: "Hello", html: "<p>Hi</p>" },
      "Spawt <spawt.ci@gmail.com>",
      "xkeysib-test-key-longenough-000000",
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.provider).toBe("BREVO");
      expect(res.providerRef).toBe("<msg-123@brevo>");
    }
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init.headers as Record<string, string>)["api-key"]).toBe("xkeysib-test-key-longenough-000000");
    const payload = JSON.parse(init.body as string);
    expect(payload.sender).toEqual({ email: "spawt.ci@gmail.com", name: "Spawt" });
    expect(payload.to).toEqual([{ email: "dest@example.com" }]);
  });

  it("ne simule JAMAIS un succès : un refus Brevo remonte ok:false + raison", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(400, { message: "Sender not valid" })),
    );
    const res = await sendViaBrevo(
      { to: "dest@example.com", subject: "x", html: "<p>x</p>" },
      "bad@sender.com",
      "xkeysib-test-key-longenough-000000",
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.provider).toBe("BREVO");
      expect(res.error).toContain("Sender not valid");
    }
  });
});

describe("validateBrevoKey", () => {
  it("clé invalide (401) → ok:false, aucun sender", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { message: "unauthorized" })));
    const v = await validateBrevoKey("xkeysib-bad-key-longenough-00000000");
    expect(v.ok).toBe(false);
    expect(v.verifiedSenders).toBeUndefined();
  });

  it("clé valide → ok:true + email compte + senders vérifiés extraits", async () => {
    const spy = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { email: "spawt.ci@gmail.com", companyName: "Spawt" }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          senders: [{ email: "spawt.ci@gmail.com", name: "Spawt", active: true }],
        }),
      );
    vi.stubGlobal("fetch", spy);

    const v = await validateBrevoKey("xkeysib-good-key-longenough-0000000");
    expect(v.ok).toBe(true);
    expect(v.accountEmail).toBe("spawt.ci@gmail.com");
    expect(v.verifiedSenders).toEqual([{ email: "spawt.ci@gmail.com", name: "Spawt", active: true }]);
  });
});
