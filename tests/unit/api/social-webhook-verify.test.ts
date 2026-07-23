/**
 * Vérification d'abonnement webhook Meta/Instagram (handshake GET `hub.challenge`).
 *
 * Prérequis code-side des webhooks temps-réel Meta (Advanced Access). La review
 * Meta reste l'atome externe, mais le handshake doit être prêt (drop-in) : Meta
 * appelle GET `?hub.mode=subscribe&hub.verify_token=<tok>&hub.challenge=<c>` et
 * attend `hub.challenge` EN CLAIR si le token matche. Fail-closed sinon.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Les imports lourds du module de route n'ont aucun rôle dans le handshake GET.
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/services/feedback-loop", () => ({}));
vi.mock("@/server/services/knowledge-capture", () => ({}));

import { GET } from "@/app/api/webhooks/social/route";

function req(qs: string): Request {
  return new Request(`https://x.test/api/webhooks/social${qs}`);
}

describe("Webhook social — vérification Meta GET (hub.challenge)", () => {
  const orig = process.env.META_WEBHOOK_VERIFY_TOKEN;
  beforeEach(() => {
    process.env.META_WEBHOOK_VERIFY_TOKEN = "secret-verify-tok";
  });
  afterEach(() => {
    if (orig === undefined) delete process.env.META_WEBHOOK_VERIFY_TOKEN;
    else process.env.META_WEBHOOK_VERIFY_TOKEN = orig;
  });

  it("renvoie hub.challenge EN CLAIR quand le verify_token matche", async () => {
    const res = await GET(
      req("?hub.mode=subscribe&hub.verify_token=secret-verify-tok&hub.challenge=42abc"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toBe("42abc");
  });

  it("403 quand le verify_token ne matche pas", async () => {
    const res = await GET(
      req("?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=42abc"),
    );
    expect(res.status).toBe(403);
  });

  it("403 fail-closed quand META_WEBHOOK_VERIFY_TOKEN n'est pas configuré", async () => {
    delete process.env.META_WEBHOOK_VERIFY_TOKEN;
    const res = await GET(
      req("?hub.mode=subscribe&hub.verify_token=whatever&hub.challenge=42abc"),
    );
    expect(res.status).toBe(403);
  });

  it("403 quand mode != subscribe (même avec un token valide)", async () => {
    const res = await GET(
      req("?hub.mode=unsubscribe&hub.verify_token=secret-verify-tok&hub.challenge=42abc"),
    );
    expect(res.status).toBe(403);
  });

  it("préserve la sonde de santé JSON quand aucun paramètre hub.*", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { status?: string };
    expect(json.status).toBe("ok");
  });
});
