import { afterEach, expect, it, vi } from "vitest";
import { barreBinding } from "@/server/services/brand-node/barre-connection";
import { readBarreSnapshot } from "@/server/services/brand-node/workspace";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("keeps the historical binding, validates new source identities and refuses a path as a depot", () => {
  expect(barreBinding()).toEqual({ instance: "barre-matanga", depot: "beignet-paradise.json" });
  vi.stubEnv("PORTFOLIO_BARRE_INSTANCE", "barre-tpe-a"); vi.stubEnv("PORTFOLIO_BARRE_DEPOT", "entreprise.json");
  expect(barreBinding()).toEqual({ instance: "barre-tpe-a", depot: "entreprise.json" });
  for (const bad of ["../secret.json", ".env.json", "data/own.json", "https://other.test/x.json"]) {
    vi.stubEnv("PORTFOLIO_BARRE_DEPOT", bad); expect(() => barreBinding()).toThrow();
  }
});
it("does not reuse a cached corpus or ETag across connection identities", async () => {
  const source = { marques: [], clients: [], campagnes: [], projets: [], sku: [], assets: [] };
  const fetcher = vi.fn().mockImplementation(async () => Response.json(source, { headers: { ETag: '"same"' } }));
  vi.stubGlobal("fetch", fetcher); vi.stubEnv("PORTFOLIO_BARRE_UPSTREAM", "http://private-a:3000");
  vi.stubEnv("PORTFOLIO_BARRE_INSTANCE", "barre-a"); vi.stubEnv("PORTFOLIO_BARRE_DEPOT", "entreprise.json");
  await readBarreSnapshot(); await readBarreSnapshot(); expect(fetcher).toHaveBeenCalledTimes(1);
  vi.stubEnv("PORTFOLIO_BARRE_INSTANCE", "barre-b"); await readBarreSnapshot({ fresh: true });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1]![1].method).toBeUndefined();
  expect(fetcher.mock.calls[1]![0].href).toBe("http://private-a:3000/depots/entreprise.json");
});
