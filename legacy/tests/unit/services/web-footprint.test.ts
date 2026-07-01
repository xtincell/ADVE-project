/**
 * Vague 10 — Empreinte web publique (parseurs purs + garde SSRF + merge E).
 * Zéro réseau : fixtures HTML/XML. Le collecteur lui-même est exercé en
 * intégration (prod) — ici on verrouille le déterminisme des briques.
 */

import { describe, it, expect } from "vitest";
import {
  parseHtmlMeta,
  extractLinks,
  detectSocialLinks,
  parseFollowersHint,
  extractSitemapUrls,
  pickArticleCandidates,
  assertPublicUrl,
  mergeFootprintIntoPillarE,
  type WebFootprint,
} from "@/server/services/quick-intake/web-footprint";

const FIXTURE_HTML = `<!doctype html><html lang="fr"><head>
<title>CIMENCAM — Le ciment des bâtisseurs</title>
<meta property="og:title" content="CIMENCAM &amp; les bâtisseurs" />
<meta name="description" content="Leader du ciment au Cameroun depuis 1963." />
<meta property="og:image" content="https://www.cimencam.cm/og.jpg" />
</head><body>
<a href="/produits/ciment-425">Ciment 42.5</a>
<a href="/actualites/nouvelle-usine-2026">Nouvelle usine</a>
<a href="https://www.instagram.com/cimencam_officiel">Instagram</a>
<a href="https://www.facebook.com/sharer/sharer.php?u=x">Partager</a>
<a href="https://www.facebook.com/cimencam">Facebook</a>
<a href="https://www.linkedin.com/company/cimencam">LinkedIn</a>
<a href="https://wa.me/237670000000">WhatsApp</a>
<a href="mailto:contact@cimencam.cm">Mail</a>
</body></html>`;

describe("parseHtmlMeta", () => {
  it("extrait title (og prioritaire), description, image, langue — entités décodées", () => {
    const meta = parseHtmlMeta(FIXTURE_HTML);
    expect(meta.title).toBe("CIMENCAM & les bâtisseurs");
    expect(meta.description).toContain("1963");
    expect(meta.ogImage).toBe("https://www.cimencam.cm/og.jpg");
    expect(meta.language).toBe("fr");
  });
  it("retourne null proprement sur HTML vide", () => {
    expect(parseHtmlMeta("<html></html>")).toEqual({ title: null, description: null, ogImage: null, language: null });
  });
});

describe("extractLinks", () => {
  it("résout les liens relatifs et ignore mailto/tel", () => {
    const links = extractLinks(FIXTURE_HTML, "https://www.cimencam.cm/");
    expect(links).toContain("https://www.cimencam.cm/actualites/nouvelle-usine-2026");
    expect(links.some((l) => l.startsWith("mailto:"))).toBe(false);
  });
});

describe("detectSocialLinks", () => {
  it("détecte les profils, dédoublonne, exclut les liens de partage", () => {
    const socials = detectSocialLinks(FIXTURE_HTML);
    const platforms = socials.map((s) => s.platform).sort();
    expect(platforms).toEqual(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "WHATSAPP"]);
    expect(socials.find((s) => s.platform === "INSTAGRAM")?.handle).toBe("cimencam_officiel");
    expect(socials.find((s) => s.url.includes("sharer"))).toBeUndefined();
  });
  it("est déterministe", () => {
    expect(detectSocialLinks(FIXTURE_HTML)).toEqual(detectSocialLinks(FIXTURE_HTML));
  });
});

describe("parseFollowersHint", () => {
  it("parse les formats followers/abonnés", () => {
    expect(parseFollowersHint("12,345 Followers, 200 Following")).toBe(12345);
    expect(parseFollowersHint("12 345 abonnés · entreprise")).toBe(12345);
    expect(parseFollowersHint("Bienvenue chez nous")).toBeNull();
  });
});

describe("sitemap + articles", () => {
  it("extrait les <loc> et filtre les chemins éditoriaux du même hôte", () => {
    const xml = `<urlset><url><loc>https://www.cimencam.cm/actualites/usine</loc></url>
      <url><loc>https://www.cimencam.cm/produits/ciment</loc></url>
      <url><loc>https://autre-site.com/blog/post</loc></url></urlset>`;
    const urls = extractSitemapUrls(xml);
    expect(urls).toHaveLength(3);
    const articles = pickArticleCandidates(urls, "cimencam.cm");
    expect(articles).toEqual(["https://www.cimencam.cm/actualites/usine"]);
  });
});

describe("assertPublicUrl — garde SSRF", () => {
  it("refuse localhost, IP privées, protocoles exotiques", async () => {
    await expect(assertPublicUrl("http://localhost:3000/x")).rejects.toThrow(/interne/);
    await expect(assertPublicUrl("http://127.0.0.1/x")).rejects.toThrow(/privée/);
    await expect(assertPublicUrl("http://192.168.1.10/x")).rejects.toThrow(/privée/);
    await expect(assertPublicUrl("http://10.0.0.1/x")).rejects.toThrow(/privée/);
    await expect(assertPublicUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow(/privée/);
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow(/Protocole/);
    await expect(assertPublicUrl("gopher://example.com")).rejects.toThrow(/Protocole/);
  });
});

describe("mergeFootprintIntoPillarE", () => {
  const footprint: WebFootprint = {
    site: { url: "https://www.cimencam.cm", reachable: true, title: "CIMENCAM", description: null, ogImage: null, language: "fr" },
    socials: [{ platform: "INSTAGRAM", url: "https://instagram.com/cimencam_officiel", handle: "cimencam_officiel", followersHint: 12345 }],
    articles: [{ url: "https://www.cimencam.cm/actualites/usine", title: "Nouvelle usine", source: "SITEMAP" }],
    channels: [
      { canal: "Site web", url: "https://www.cimencam.cm", source: "EMPREINTE_WEB" },
      { canal: "Instagram", url: "https://instagram.com/cimencam_officiel", source: "EMPREINTE_WEB" },
    ],
    collectedAt: "2026-06-12T00:00:00.000Z",
    errors: [],
  };

  it("append-déduplique les touchpoints — le déclaré prime", () => {
    const merged = mergeFootprintIntoPillarE(
      { touchpoints: [{ canal: "Instagram", type: "déclaré par le founder" }] },
      footprint,
    );
    const tps = merged.touchpoints as Array<Record<string, unknown>>;
    expect(tps).toHaveLength(2); // Instagram déclaré conservé + Site web ajouté
    expect(tps[0]!.type).toBe("déclaré par le founder");
    expect(tps.some((t) => t.canal === "Site web")).toBe(true);
  });

  it("pose le bloc webPresence factuel sans toucher au reste", () => {
    const merged = mergeFootprintIntoPillarE({ promesseExperience: "X" }, footprint);
    expect(merged.promesseExperience).toBe("X");
    const wp = merged.webPresence as { socials: Array<{ followersHint: number | null }> };
    expect(wp.socials[0]!.followersHint).toBe(12345);
  });

  it("est pur — l'entrée n'est pas mutée", () => {
    const input = { touchpoints: [{ canal: "Instagram" }] };
    const snapshot = structuredClone(input);
    mergeFootprintIntoPillarE(input, footprint);
    expect(input).toEqual(snapshot);
  });
});
