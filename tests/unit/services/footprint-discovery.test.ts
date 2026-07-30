/**
 * Auto-découverte du site officiel (ADR-0149 revealed-gates precondition).
 * Le générateur de candidats est PUR + déterministe. La probe réseau
 * (`discoverOfficialSite`) n'est pas testée ici (I/O) — sa garde anti-faux-
 * positif (mention de marque) est couverte par revue.
 */

import { describe, it, expect } from "vitest";
import { brandDomainSlug, candidateDomains } from "@/server/services/quick-intake/web-footprint";

describe("brandDomainSlug", () => {
  it("compacte nom + retire suffixes juridiques + diacritiques", () => {
    expect(brandDomainSlug("Chococam SA")).toBe("chococam");
    expect(brandDomainSlug("Société Générale")).toBe("societegenerale"); // "sa" seul retiré, pas dans un mot
    expect(brandDomainSlug("MTN Group")).toBe("mtn");
    expect(brandDomainSlug("Café  Noir!")).toBe("cafenoir");
  });
});

describe("candidateDomains", () => {
  it("génère TLD pays D'ABORD + .com + génériques, déterministe, max 5", () => {
    const c = candidateDomains("Chococam", "CM");
    // TLD du marché déclaré en tête (ADR-0162, test BK Abidjan 2026-07-20) :
    // pour une franchise mondiale, le domaine du pays représente LE client.
    // Tous les candidats sont probés en parallèle — l'ordre n'est que la
    // préférence de sélection ; un .cm absent retombe sur le .com.
    expect(c[0]).toBe("https://chococam.cm"); // TLD pays d'abord
    expect(c).toContain("https://chococam.com");
    expect(c.length).toBeLessThanOrEqual(5);
    expect(candidateDomains("Chococam", "CM")).toEqual(c); // variance = 0
  });

  it("sans pays connu → .com + génériques", () => {
    const c = candidateDomains("Chococam", null);
    expect(c[0]).toBe("https://chococam.com");
    expect(c.every((u) => u.startsWith("https://chococam."))).toBe(true);
  });

  it("nom trop court → aucun candidat (pas de devinette hasardeuse)", () => {
    expect(candidateDomains("X", "CM")).toEqual([]);
  });
});

// ── Fix 2026-07-20 (test qualité Dovv) : domaine parqué ≠ site officiel ──
import { looksLikeParkedDomain } from "@/server/services/quick-intake/web-footprint";

describe("looksLikeParkedDomain", () => {
  it("détecte les pages de parking (cas réel dovv.com)", () => {
    expect(looksLikeParkedDomain("dovv.com — This Domain May Be For Sale. Get it now!")).toBe(true);
    expect(looksLikeParkedDomain("Buy this domain at sedo.com auctions")).toBe(true);
    expect(looksLikeParkedDomain("Ce domaine est à vendre — contactez-nous")).toBe(true);
  });
  it("ne rejette pas un vrai site de marque", () => {
    expect(looksLikeParkedDomain("Chococam — chocolat camerounais depuis 1968. Nos produits en vente ici.")).toBe(false);
  });
});

// ── Audit 2026-07-30 : « le serveur refuse de me parler » ≠ « ça n'existe pas » ──
// L'ancien probe faisait `if (!res.ok) return null` : un 403 Cloudflare classait
// la marque « aucun site détecté » et lui coûtait 45 points de poids (site,
// email, domaine, perf) alors qu'un serveur sert bel et bien ce domaine.
import {
  looksLikeBotWall,
  officialSiteCandidatesFromHits,
  corroboratedHostsFromHits,
  hostOf,
} from "@/server/services/quick-intake/web-footprint";

describe("looksLikeBotWall", () => {
  it("détecte les statuts de refus (le domaine sert bel et bien)", () => {
    expect(looksLikeBotWall(403, "")).toBe(true);
    expect(looksLikeBotWall(503, "")).toBe(true);
    expect(looksLikeBotWall(429, "")).toBe(true);
  });

  it("détecte le challenge dans le corps même en 200", () => {
    expect(looksLikeBotWall(200, "<title>Just a moment...</title>")).toBe(true);
    expect(looksLikeBotWall(200, "Attention Required! | Cloudflare")).toBe(true);
    expect(looksLikeBotWall(200, "Please enable JavaScript and cookies to continue")).toBe(true);
  });

  it("ne confond pas une vraie page ni une vraie absence", () => {
    expect(looksLikeBotWall(200, "<h1>Chococam — chocolat camerounais</h1>")).toBe(false);
    expect(looksLikeBotWall(404, "Not Found")).toBe(false); // vraie absence
  });
});

describe("officialSiteCandidatesFromHits", () => {
  const hits = (...urls: string[]) => urls.map((url) => ({ url }));

  it("retient le domaine de la marque cité par le web (ce que le slug seul rate)", () => {
    const c = officialSiteCandidatesFromHits(
      hits("https://www.chococam-cameroun.com/produits", "https://news.example/article"),
      "Chococam",
    );
    expect(c).toContain("https://chococam-cameroun.com");
  });

  it("exclut les plateformes tierces : on cherche le site DE la marque", () => {
    const c = officialSiteCandidatesFromHits(
      hits(
        "https://facebook.com/chococam",
        "https://fr.wikipedia.org/wiki/Chococam",
        "https://www.linkedin.com/company/chococam",
      ),
      "Chococam",
    );
    expect(c).toEqual([]);
  });

  it("exclut un host qui ne porte pas le nom (pas de faux positif)", () => {
    expect(officialSiteCandidatesFromHits(hits("https://actucameroun.com/x"), "Chococam")).toEqual([]);
  });

  it("déduplique, borne à 3, et reste déterministe", () => {
    const c = officialSiteCandidatesFromHits(
      hits("https://chococam.cm/a", "https://www.chococam.cm/b", "https://chococam.com/c"),
      "Chococam",
    );
    expect(c).toEqual(["https://chococam.cm", "https://chococam.com"]);
  });

  it("nom trop court → aucune devinette", () => {
    expect(officialSiteCandidatesFromHits(hits("https://x.com/a"), "X")).toEqual([]);
  });
});

describe("hostOf", () => {
  it("normalise sans www et en minuscules", () => {
    expect(hostOf("https://WWW.Chococam.CM/produits")).toBe("chococam.cm");
  });
  it("URL malformée → null (jamais de throw)", () => {
    expect(hostOf("pas-une-url")).toBeNull();
  });
});

/**
 * Trou fermé le 2026-07-30, découvert en vérifiant le fix sur le terrain :
 * `chococam.com` n'est PAS le site de Chococam — c'est un domaine parqué en
 * vente chez HugeDomains (« ChocoCam.com is for sale »). Le gate d'entité
 * l'ACCEPTE, puisque la page de vente cite bel et bien la marque.
 *
 * Sans filtre, ce host devenait « corroboré » — et un domaine parqué protégé
 * par un anti-bot aurait donc pu être adopté comme site officiel, là où
 * `looksLikeParkedDomain` est aveugle faute de contenu lisible. C'est le piège
 * Dovv (2026-07-20) qui serait rentré par la porte de la corroboration.
 */
describe("corroboration — une page qui VEND le domaine n'atteste rien", () => {
  const sellHit = {
    url: "https://chococam.com",
    title: "ChocoCam.com is for sale | HugeDomains",
    description: "100% satisfaction guaranteed on every domain we sell.",
  };
  const realHit = {
    url: "https://www.jeuneafrique.com/chococam-tiger-brands",
    title: "Chococam, filiale de Tiger Brands",
    description: "Le chocolatier camerounais…",
  };

  it("exclut le host mis en vente des hosts corroborés", () => {
    const hosts = corroboratedHostsFromHits([sellHit, realHit]);
    expect(hosts).not.toContain("chococam.com");
    expect(hosts).toContain("jeuneafrique.com");
  });

  it("exclut aussi le host mis en vente des candidats site", () => {
    expect(officialSiteCandidatesFromHits([sellHit], "Chococam")).toEqual([]);
  });

  it("laisse passer un host normal qui porte le nom de la marque", () => {
    const hit = { url: "https://chococam.cm/produits", title: "Chococam — nos produits", description: "" };
    expect(corroboratedHostsFromHits([hit])).toContain("chococam.cm");
    expect(officialSiteCandidatesFromHits([hit], "Chococam")).toEqual(["https://chococam.cm"]);
  });

  it("hits sans titre ni description (forme minimale) → toujours exploitables", () => {
    expect(corroboratedHostsFromHits([{ url: "https://chococam.cm/x" }])).toEqual(["chococam.cm"]);
  });
});
