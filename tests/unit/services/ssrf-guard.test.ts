/**
 * Garde SSRF partagée (`@/lib/net/ssrf-guard`) — round-8 adversarial.
 *
 * Deux fetchers d'URLs fournies par l'utilisateur/tenant passaient
 * `redirect:"follow"` → un `302 Location: http://169.254.169.254/…` était suivi
 * SANS re-validation (contournement de la garde qui ne s'appliquait qu'à l'URL
 * initiale). `ssrfSafeFetch` re-valide chaque saut (redirect MANUEL). Ce test
 * verrouille (a) le comportement de la garde et (b) le fait que les DEUX fetchers
 * la consomment (plus aucun `redirect:"follow"`).
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isPrivateIp, assertPublicUrl, ssrfSafeFetch } from "@/lib/net/ssrf-guard";

afterEach(() => vi.unstubAllGlobals());

describe("isPrivateIp", () => {
  it("détecte les plages privées / loopback / link-local (IPv4 + IPv6)", () => {
    for (const ip of [
      "127.0.0.1", "10.0.0.1", "192.168.1.10", "172.16.0.1", "172.31.255.255",
      "169.254.169.254", "0.0.0.0", "224.0.0.1",
      "::1", "fe80::1", "fc00::1", "fd12::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1",
    ]) {
      expect(isPrivateIp(ip), `${ip} doit être privé`).toBe(true);
    }
  });

  it("laisse passer les IP publiques", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "203.0.113.7", "2606:4700::1111"]) {
      expect(isPrivateIp(ip), `${ip} doit être public`).toBe(false);
    }
  });
});

describe("assertPublicUrl (garde sans réseau — littéraux/protocoles)", () => {
  it("refuse localhost, IP privées littérales, protocoles exotiques", async () => {
    await expect(assertPublicUrl("http://localhost/x")).rejects.toThrow(/interne/);
    await expect(assertPublicUrl("http://127.0.0.1/x")).rejects.toThrow(/privée/);
    await expect(assertPublicUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow(/privée/);
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow(/Protocole/);
    await expect(assertPublicUrl("gopher://evil/")).rejects.toThrow(/Protocole/);
  });

  it("laisse passer une IP publique littérale (sans DNS)", async () => {
    const u = await assertPublicUrl("http://8.8.8.8/x");
    expect(u.hostname).toBe("8.8.8.8");
  });
});

describe("ssrfSafeFetch — redirections re-validées", () => {
  it("REFUSE une redirection vers une IP privée (302 → métadonnées cloud)", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (u: string) => {
      calls.push(u);
      return new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } });
    });
    await expect(ssrfSafeFetch("http://8.8.8.8/start")).rejects.toThrow(/privée/);
    // La cible privée n'a JAMAIS été fetchée (rejet AVANT le saut).
    expect(calls).toEqual(["http://8.8.8.8/start"]);
  });

  it("retourne la réponse finale d'un hôte public (sans redirection)", async () => {
    vi.stubGlobal("fetch", async () => new Response("OK", { status: 200 }));
    const res = await ssrfSafeFetch("http://8.8.8.8/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("OK");
  });

  it("suit une redirection vers un hôte public", async () => {
    let n = 0;
    vi.stubGlobal("fetch", async () => {
      n += 1;
      return n === 1
        ? new Response(null, { status: 301, headers: { location: "http://1.1.1.1/final" } })
        : new Response("FINAL", { status: 200 });
    });
    const res = await ssrfSafeFetch("http://8.8.8.8/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("FINAL");
  });

  it("borne le nombre de redirections", async () => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 302, headers: { location: "http://1.1.1.1/loop" } }));
    await expect(ssrfSafeFetch("http://8.8.8.8/", {}, 2)).rejects.toThrow(/redirections/);
  });

  it("utilise redirect:\"manual\" (jamais follow)", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/net/ssrf-guard.ts"), "utf8");
    expect(src).toMatch(/redirect:\s*["']manual["']/);
    expect(src).not.toMatch(/redirect:\s*["']follow["']/);
  });
});

describe("les deux fetchers consomment ssrfSafeFetch (plus de redirect:follow)", () => {
  const FILES = [
    "src/server/services/quick-intake/web-footprint.ts",
    "src/server/services/artemis/market-research/web-fetcher.ts",
  ];
  it.each(FILES)("%s appelle ssrfSafeFetch et ne suit plus les redirections", (rel) => {
    const src = readFileSync(join(process.cwd(), rel), "utf8");
    expect(src, `${rel} doit fetcher via ssrfSafeFetch`).toContain("ssrfSafeFetch(");
    expect(src, `${rel} ne doit plus contenir redirect:"follow"`).not.toMatch(/redirect:\s*["']follow["']/);
  });
});
