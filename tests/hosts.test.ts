import { describe, expect, it } from "vitest";
import {
  classifyHost,
  DEFAULT_ROOT_DOMAIN,
  normalizeHost,
  productSiteUrl,
  resolveHostRoute,
  rootDomain,
  rootSiteUrl,
  stripProductPrefix,
} from "@/lib/hosts";

/**
 * WP-025 — table de routage host-based (sous-domaines, un seul déploiement).
 * Ces règles sont consommées telles quelles par src/middleware.ts : toute
 * ligne modifiée ici doit l'être en connaissance de cause.
 */

const ROOT = "upgraders.example.test";
const PRODUCT_HOST = `lafusee.${ROOT}`;

describe("rootDomain (env ROOT_DOMAIN, fallback Coolify)", () => {
  it("retombe sur l'instance Coolify sans env", () => {
    expect(rootDomain(undefined)).toBe(DEFAULT_ROOT_DOMAIN);
    expect(DEFAULT_ROOT_DOMAIN).toBe("upgraders.76-13-128-23.sslip.io");
  });

  it("normalise l'env : trim, minuscules, point final retiré", () => {
    expect(rootDomain("  Upgraders.Example.TEST.  ")).toBe("upgraders.example.test");
  });

  it("env vide = fallback (jamais de racine vide)", () => {
    expect(rootDomain("")).toBe(DEFAULT_ROOT_DOMAIN);
    expect(rootDomain("   ")).toBe(DEFAULT_ROOT_DOMAIN);
  });
});

describe("normalizeHost (en-tête Host brut)", () => {
  it("minuscules + port retiré", () => {
    expect(normalizeHost("Upgraders.Example.TEST:443")).toBe("upgraders.example.test");
    expect(normalizeHost("localhost:3000")).toBe("localhost");
  });

  it("point final DNS retiré", () => {
    expect(normalizeHost("upgraders.example.test.")).toBe("upgraders.example.test");
  });

  it("littéral IPv6 : crochets gardés, port retiré", () => {
    expect(normalizeHost("[::1]:3000")).toBe("[::1]");
  });

  it("absent ou vide → null", () => {
    expect(normalizeHost(null)).toBeNull();
    expect(normalizeHost(undefined)).toBeNull();
    expect(normalizeHost("")).toBeNull();
    expect(normalizeHost("   ")).toBeNull();
  });
});

describe("classifyHost (univers par hôte)", () => {
  it("racine (et www) → root", () => {
    expect(classifyHost(ROOT, ROOT)).toBe("root");
    expect(classifyHost(`www.${ROOT}`, ROOT)).toBe("root");
  });

  it("sous-domaines produit / guilde / argos", () => {
    expect(classifyHost(PRODUCT_HOST, ROOT)).toBe("product");
    expect(classifyHost(`laguilde.${ROOT}`, ROOT)).toBe("guild");
    expect(classifyHost(`argos.${ROOT}`, ROOT)).toBe("argos");
  });

  it("tout le reste est inconnu (localhost, ancienne URL, sous-sous-domaine)", () => {
    expect(classifyHost("localhost", ROOT)).toBe("unknown");
    expect(classifyHost("lafusee-v7.76-13-128-23.sslip.io", ROOT)).toBe("unknown");
    expect(classifyHost(`x.lafusee.${ROOT}`, ROOT)).toBe("unknown");
    expect(classifyHost(null, ROOT)).toBe("unknown");
  });
});

describe("stripProductPrefix", () => {
  it("réduit /lafusee* à l'alias court", () => {
    expect(stripProductPrefix("/lafusee")).toBe("/");
    expect(stripProductPrefix("/lafusee/tarifs")).toBe("/tarifs");
    expect(stripProductPrefix("/lafusee/a/b")).toBe("/a/b");
  });

  it("ne touche pas les autres chemins (y compris préfixes trompeurs)", () => {
    expect(stripProductPrefix("/lafuseex")).toBe("/lafuseex");
    expect(stripProductPrefix("/intake")).toBe("/intake");
    expect(stripProductPrefix("/")).toBe("/");
  });
});

describe("resolveHostRoute — hôte racine (site agence)", () => {
  it("sert le site agence tel quel", () => {
    for (const p of ["/", "/agence", "/methode", "/services", "/realisations", "/blog", "/contact", "/intake", "/connexion", "/la-guilde", "/argos"]) {
      expect(resolveHostRoute("root", p, ROOT)).toEqual({ action: "next" });
    }
  });

  it("redirige l'univers produit vers son sous-domaine (308, chemin conservé)", () => {
    expect(resolveHostRoute("root", "/lafusee", ROOT)).toEqual({
      action: "redirect",
      host: PRODUCT_HOST,
      pathname: "/",
    });
    expect(resolveHostRoute("root", "/lafusee/tarifs", ROOT)).toEqual({
      action: "redirect",
      host: PRODUCT_HOST,
      pathname: "/tarifs",
    });
    expect(resolveHostRoute("root", "/lafusee/a/b", ROOT)).toEqual({
      action: "redirect",
      host: PRODUCT_HOST,
      pathname: "/a/b",
    });
  });

  it("l'alias produit /tarifs suit le produit (un seul saut)", () => {
    expect(resolveHostRoute("root", "/tarifs", ROOT)).toEqual({
      action: "redirect",
      host: PRODUCT_HOST,
      pathname: "/tarifs",
    });
  });

  it("ne touche jamais aux espaces privés (gardes auth en amont)", () => {
    expect(resolveHostRoute("root", "/app", ROOT)).toEqual({ action: "next" });
    expect(resolveHostRoute("root", "/admin/leads", ROOT)).toEqual({ action: "next" });
  });
});

describe("resolveHostRoute — hôte produit (lafusee.<racine>)", () => {
  it("aliase la racine et /tarifs vers les pages internes", () => {
    expect(resolveHostRoute("product", "/", ROOT)).toEqual({
      action: "rewrite",
      pathname: "/lafusee",
    });
    expect(resolveHostRoute("product", "/tarifs", ROOT)).toEqual({
      action: "rewrite",
      pathname: "/lafusee/tarifs",
    });
  });

  it("canonicalise les chemins internes /lafusee* vers l'alias court", () => {
    expect(resolveHostRoute("product", "/lafusee", ROOT)).toEqual({
      action: "redirect",
      host: PRODUCT_HOST,
      pathname: "/",
    });
    expect(resolveHostRoute("product", "/lafusee/tarifs", ROOT)).toEqual({
      action: "redirect",
      host: PRODUCT_HOST,
      pathname: "/tarifs",
    });
  });

  it("laisse passer intake / connexion / app (chemins inchangés)", () => {
    for (const p of ["/intake", "/intake/score", "/connexion", "/inscription", "/app", "/app/oracle", "/partage/oracle/x"]) {
      expect(resolveHostRoute("product", p, ROOT)).toEqual({ action: "next" });
    }
  });
});

describe("resolveHostRoute — hôtes guilde et argos", () => {
  it("laguilde.<racine> : / → /la-guilde, le reste passe", () => {
    expect(resolveHostRoute("guild", "/", ROOT)).toEqual({
      action: "rewrite",
      pathname: "/la-guilde",
    });
    expect(resolveHostRoute("guild", "/studio", ROOT)).toEqual({ action: "next" });
  });

  it("argos.<racine> : / → /argos, le reste passe", () => {
    expect(resolveHostRoute("argos", "/", ROOT)).toEqual({
      action: "rewrite",
      pathname: "/argos",
    });
    expect(resolveHostRoute("argos", "/blog", ROOT)).toEqual({ action: "next" });
  });
});

describe("resolveHostRoute — hôte inconnu (dev local, previews)", () => {
  it("passthrough intégral : aucun redirect, aucune réécriture", () => {
    for (const p of ["/", "/tarifs", "/lafusee", "/lafusee/tarifs", "/intake", "/app"]) {
      expect(resolveHostRoute("unknown", p, ROOT)).toEqual({ action: "next" });
    }
  });
});

describe("URLs absolues cross-univers", () => {
  it("rootSiteUrl : https + racine, sans slash final", () => {
    expect(rootSiteUrl(ROOT)).toBe("https://upgraders.example.test");
    expect(rootSiteUrl()).toBe(`https://${DEFAULT_ROOT_DOMAIN}`);
  });

  it("productSiteUrl : chemin interne et alias court convergent", () => {
    expect(productSiteUrl("/", ROOT)).toBe(`https://${PRODUCT_HOST}/`);
    expect(productSiteUrl("/lafusee", ROOT)).toBe(`https://${PRODUCT_HOST}/`);
    expect(productSiteUrl("/tarifs", ROOT)).toBe(`https://${PRODUCT_HOST}/tarifs`);
    expect(productSiteUrl("/lafusee/tarifs", ROOT)).toBe(`https://${PRODUCT_HOST}/tarifs`);
    expect(productSiteUrl("tarifs", ROOT)).toBe(`https://${PRODUCT_HOST}/tarifs`);
  });
});
