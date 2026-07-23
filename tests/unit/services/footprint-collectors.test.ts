/**
 * ADR-0121 vague A — collecteurs d'empreinte digitale (parseurs purs).
 * Zéro réseau : fixtures réalistes par source. On verrouille le déterminisme
 * des parseurs et l'honnêteté des dégradations (DEFERRED/SKIPPED explicites,
 * jamais de fabrication — ADR-0046).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  registrableDomain,
  parseRdapResponse,
  detectMxProvider,
  hasSpfRecord,
  hasDmarcRecord,
  parseYouTubeChannelResponse,
  parseMapsPlaceItem,
  parsePsiResponse,
  parseAdsItems,
  fetchYouTubeChannelStats,
  fetchGoogleBusinessPresence,
  fetchSitePerformance,
  fetchAdsPresence,
  fetchDomainInfo,
  parseWikipediaSummary,
  fetchWikipediaPresence,
  parseAutocompleteResponse,
  isSearchAutocompleteEnabled,
  fetchSearchAutocomplete,
} from "@/server/services/quick-intake/footprint-collectors";

const ENV_KEYS = ["YOUTUBE_API_KEY", "PAGESPEED_API_KEY", "APIFY_TOKEN", "APIFY_MAPS_ACTOR_ID", "APIFY_ADS_ACTOR_ID", "SEARCH_AUTOCOMPLETE_ENABLED"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
});

// ── Domaine (RDAP) ─────────────────────────────────────────────────────

describe("registrableDomain", () => {
  it("extrait le domaine enregistrable (www strippé, casse normalisée)", () => {
    expect(registrableDomain("https://www.CIMENCAM.cm/produits")).toBe("cimencam.cm");
    expect(registrableDomain("upgraders.io")).toBe("upgraders.io");
  });
  it("gère les ccSLD à 3 labels (.com.ng, .co.uk)", () => {
    expect(registrableDomain("https://shop.dangote.com.ng")).toBe("dangote.com.ng");
    expect(registrableDomain("https://www.bbc.co.uk/news")).toBe("bbc.co.uk");
  });
  it("null sur entrée invalide ou host sans point", () => {
    expect(registrableDomain("localhost")).toBeNull();
    expect(registrableDomain("::::")).toBeNull();
  });
});

describe("parseRdapResponse", () => {
  const NOW = new Date("2026-07-10T00:00:00Z");
  it("extrait création + âge + registrar depuis events/entities", () => {
    const info = parseRdapResponse(
      {
        events: [
          { eventAction: "registration", eventDate: "2016-07-10T00:00:00Z" },
          { eventAction: "expiration", eventDate: "2027-07-10T00:00:00Z" },
        ],
        entities: [
          { roles: ["registrar"], vcardArray: ["vcard", [["fn", {}, "text", "OVH sas"]]], handle: "OVH" },
        ],
      },
      "cimencam.cm",
      NOW,
    );
    expect(info.status).toBe("LIVE");
    expect(info.createdAt).toBe("2016-07-10T00:00:00Z");
    expect(info.ageYears).toBe(10);
    expect(info.registrar).toBe("OVH sas");
  });
  it("sans event registration → âge null (jamais inventé)", () => {
    const info = parseRdapResponse({ events: [], entities: [] }, "x.cm", NOW);
    expect(info.ageYears).toBeNull();
    expect(info.createdAt).toBeNull();
  });
  it("registrar depuis handle si pas de vcard fn", () => {
    const info = parseRdapResponse(
      { events: [], entities: [{ roles: ["registrar"], handle: "NETIM" }] },
      "x.cm",
      NOW,
    );
    expect(info.registrar).toBe("NETIM");
  });
});

describe("fetchDomainInfo (dégradations)", () => {
  it("SKIPPED sans site déclaré (aucun fetch)", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const info = await fetchDomainInfo(null);
    expect(info.status).toBe("SKIPPED");
    expect(spy).not.toHaveBeenCalled();
  });
  it("NOT_FOUND honnête sur 404 RDAP", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const info = await fetchDomainInfo("https://inconnu-total.cm");
    expect(info.status).toBe("NOT_FOUND");
    expect(info.ageYears).toBeNull();
  });
});

// ── Email (MX/SPF/DMARC) ───────────────────────────────────────────────

describe("detectMxProvider", () => {
  it("identifie les providers connus", () => {
    expect(detectMxProvider(["aspmx.l.google.com"])).toBe("Google Workspace");
    expect(detectMxProvider(["cimencam-cm.mail.protection.outlook.com"])).toBe("Microsoft 365");
    expect(detectMxProvider(["mx1.mail.ovh.net"])).toBe("OVH");
  });
  it("fallback : premier host MX (point final strippé)", () => {
    expect(detectMxProvider(["mail.custom-host.cm."])).toBe("mail.custom-host.cm");
  });
  it("null sans MX", () => {
    expect(detectMxProvider([])).toBeNull();
  });
});

describe("hasSpfRecord / hasDmarcRecord", () => {
  it("détecte SPF/DMARC même en chunks TXT multiples", () => {
    expect(hasSpfRecord([["v=spf1 include:_spf.goo", "gle.com ~all"]])).toBe(true);
    expect(hasSpfRecord([["google-site-verification=abc"]])).toBe(false);
    expect(hasDmarcRecord([["V=DMARC1; p=quarantine"]])).toBe(true);
    expect(hasDmarcRecord([])).toBe(false);
  });
});

// ── YouTube ────────────────────────────────────────────────────────────

describe("parseYouTubeChannelResponse", () => {
  it("extrait les stats publiques d'une chaîne", () => {
    const stats = parseYouTubeChannelResponse(
      {
        items: [
          {
            snippet: { title: "Cimencam Officiel" },
            statistics: { subscriberCount: "12500", viewCount: "890000", videoCount: "134", hiddenSubscriberCount: false },
          },
        ],
      },
      "cimencam",
    );
    expect(stats).toMatchObject({
      status: "LIVE",
      channelTitle: "Cimencam Officiel",
      subscriberCount: 12500,
      viewCount: 890000,
      videoCount: 134,
    });
  });
  it("abonnés masqués → null (jamais 0 fabriqué)", () => {
    const stats = parseYouTubeChannelResponse(
      { items: [{ statistics: { subscriberCount: "999", hiddenSubscriberCount: true }, snippet: {} }] },
      "x",
    );
    expect(stats.subscriberCount).toBeNull();
  });
  it("NOT_FOUND sur items vide", () => {
    expect(parseYouTubeChannelResponse({ items: [] }, "x").status).toBe("NOT_FOUND");
  });
});

describe("fetchYouTubeChannelStats (dégradations)", () => {
  it("DEFERRED_NO_KEY sans clé (aucun fetch, handle conservé)", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const stats = await fetchYouTubeChannelStats("https://youtube.com/@cimencam");
    expect(stats.status).toBe("DEFERRED_NO_KEY");
    expect(stats.handle).toBe("cimencam");
    expect(spy).not.toHaveBeenCalled();
  });
  it("normalise handle depuis URL et route les IDs UC… par id=", async () => {
    process.env.YOUTUBE_API_KEY = "k";
    const spy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
    vi.stubGlobal("fetch", spy);
    await fetchYouTubeChannelStats("UCabcdefghijklmnopqrstuv");
    expect(String(spy.mock.calls[0]![0])).toContain("id=UCabcdefghijklmnopqrstuv");
  });
});

// ── Google Business (Maps) ─────────────────────────────────────────────

describe("parseMapsPlaceItem", () => {
  it("extrait note/volume/avis d'un item crawler-google-places", () => {
    const parsed = parseMapsPlaceItem({
      title: "Cimencam Douala",
      totalScore: 4.3,
      reviewsCount: 212,
      address: "Douala, Cameroun",
      reviews: [{ text: "Très bon ciment", stars: 5 }, { text: "", stars: 1 }, { text: "Service correct", stars: 4 }],
    });
    expect(parsed).toMatchObject({ placeName: "Cimencam Douala", rating: 4.3, reviewCount: 212 });
    expect(parsed!.topReviews).toHaveLength(2); // l'avis vide est droppé
  });
  it("null sans nom de lieu (rien à rattacher)", () => {
    expect(parseMapsPlaceItem({ totalScore: 5 })).toBeNull();
  });
});

describe("fetchGoogleBusinessPresence (dégradations)", () => {
  it("DEFERRED_NO_KEY sans token/actor (aucun fetch)", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const maps = await fetchGoogleBusinessPresence("Cimencam", "Cameroun");
    expect(maps.status).toBe("DEFERRED_NO_KEY");
    expect(spy).not.toHaveBeenCalled();
  });
  it('actor "off" = opt-out explicite', async () => {
    process.env.APIFY_TOKEN = "t";
    process.env.APIFY_MAPS_ACTOR_ID = "off";
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const maps = await fetchGoogleBusinessPresence("Cimencam", null);
    expect(maps.status).toBe("DEFERRED_NO_KEY");
    expect(spy).not.toHaveBeenCalled();
  });
  it("NOT_FOUND honnête sur dataset vide (protocole async start→poll→items)", async () => {
    process.env.APIFY_TOKEN = "t";
    process.env.APIFY_MAPS_ACTOR_ID = "compass~crawler-google-places";
    // Séquence async 2 temps (ADR-0162 amendé — plus jamais de long-poll
    // run-sync tué à ~60 s) : start run → poll SUCCEEDED → dataset vide.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: "run-1" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { status: "SUCCEEDED" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
    const maps = await fetchGoogleBusinessPresence("Marque Introuvable", null);
    expect(maps.status).toBe("NOT_FOUND");
    expect(maps.rating).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("run FAILED → ERROR honnête, jamais de fabrication", async () => {
    process.env.APIFY_TOKEN = "t";
    process.env.APIFY_MAPS_ACTOR_ID = "compass~crawler-google-places";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: "run-2" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { status: "FAILED" } }) });
    vi.stubGlobal("fetch", fetchMock);
    const maps = await fetchGoogleBusinessPresence("Marque", null);
    expect(maps.status).toBe("ERROR");
    expect(maps.placeName).toBeNull();
  });
});

// ── PageSpeed ──────────────────────────────────────────────────────────

describe("parsePsiResponse", () => {
  it("extrait score performance ×100 + LCP arrondi", () => {
    const perf = parsePsiResponse({
      lighthouseResult: {
        categories: { performance: { score: 0.63 } },
        audits: { "largest-contentful-paint": { numericValue: 3421.7 } },
      },
    });
    expect(perf).toEqual({ performanceScore: 63, lcpMs: 3422 });
  });
  it("réponse partielle → nulls honnêtes", () => {
    expect(parsePsiResponse({})).toEqual({ performanceScore: null, lcpMs: null });
  });
});

describe("fetchSitePerformance (dégradations)", () => {
  it("SKIPPED sans site, DEFERRED_NO_KEY sans clé", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect((await fetchSitePerformance(null)).status).toBe("SKIPPED");
    expect((await fetchSitePerformance("https://cimencam.cm")).status).toBe("DEFERRED_NO_KEY");
    expect(spy).not.toHaveBeenCalled();
  });
});

// ── Pubs Meta (Ad Library) ─────────────────────────────────────────────

describe("parseAdsItems", () => {
  it("compte les ads actives + nom de page", () => {
    expect(parseAdsItems([{ pageName: "Cimencam" }, { pageName: "Cimencam" }, {}])).toEqual({
      activeAdsCount: 3,
      pageName: "Cimencam",
    });
    expect(parseAdsItems([{ page_name: "Marque" }])).toEqual({ activeAdsCount: 1, pageName: "Marque" });
  });
  it("vide → nulls (jamais 0 présenté comme mesure)", () => {
    expect(parseAdsItems([])).toEqual({ activeAdsCount: null, pageName: null });
  });
});

describe("fetchAdsPresence (dégradations)", () => {
  it("DEFERRED_NO_KEY sans token/actor, NOT_FOUND sur dataset vide", async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", spy);
    expect((await fetchAdsPresence("Cimencam")).status).toBe("DEFERRED_NO_KEY");
    process.env.APIFY_TOKEN = "t";
    process.env.APIFY_ADS_ACTOR_ID = "some~ads-actor";
    expect((await fetchAdsPresence("Cimencam")).status).toBe("NOT_FOUND");
  });
});

// ── Wikipédia (axe A — notabilité) — collecteur no-key, ConnectorResult ─────
// Design : l'API a répondu 404 = négatif RÉEL → LIVE avec hasPage:false (pas
// DEGRADED — Wikipédia a bien tranché « aucune page »). Seule une panne de
// transport = DEGRADED(VENDOR_OUTAGE). Zéro clé → jamais DEFERRED.

describe("parseWikipediaSummary", () => {
  it("page standard → hasPage true + titre/extrait/url", () => {
    const sig = parseWikipediaSummary(
      {
        type: "standard",
        title: "Nestlé",
        extract: "Nestlé S.A. est une entreprise agroalimentaire suisse.",
        content_urls: { desktop: { page: "https://fr.wikipedia.org/wiki/Nestlé" } },
      },
      "fr",
    );
    expect(sig).toEqual({
      hasPage: true,
      title: "Nestlé",
      extract: "Nestlé S.A. est une entreprise agroalimentaire suisse.",
      url: "https://fr.wikipedia.org/wiki/Nestlé",
      lang: "fr",
    });
  });
  it("désambiguïsation → hasPage false + nuls (jamais un faux positif « Orange »)", () => {
    const sig = parseWikipediaSummary({ type: "disambiguation", title: "Orange" }, "fr");
    expect(sig).toEqual({ hasPage: false, title: null, extract: null, url: null, lang: "fr" });
  });
});

describe("fetchWikipediaPresence (ConnectorResult, dégradations honnêtes)", () => {
  it("(a) l'API répond avec une page → LIVE + hasPage true + User-Agent envoyé", async () => {
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ type: "standard", title: "Cimencam", extract: "…", content_urls: { desktop: { page: "https://fr.wikipedia.org/wiki/Cimencam" } } }),
    });
    vi.stubGlobal("fetch", spy);
    const res = await fetchWikipediaPresence("Cimencam", { lang: "fr" });
    expect(res.state).toBe("LIVE");
    if (res.state !== "LIVE") throw new Error("attendu LIVE");
    expect(res.data.hasPage).toBe(true);
    expect(res.data.title).toBe("Cimencam");
    expect(res.observedAt).toEqual(expect.any(String));
    // Étiquette API Wikimedia : User-Agent descriptif obligatoire.
    const init = spy.mock.calls[0]![1] as { headers?: Record<string, string> };
    expect(init.headers?.["User-Agent"]).toContain("LaFusee");
  });

  it("(b) l'API répond 404 → LIVE négatif honnête (hasPage:false), jamais DEGRADED", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const res = await fetchWikipediaPresence("MarqueInexistanteXYZ", { lang: "fr" });
    expect(res.state).toBe("LIVE");
    if (res.state !== "LIVE") throw new Error("attendu LIVE");
    expect(res.data.hasPage).toBe(false);
    expect(res.data.title).toBeNull();
  });

  it("(c) fetch throw → DEGRADED(VENDOR_OUTAGE), jamais de crash ni de valeur fabriquée", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const res = await fetchWikipediaPresence("Cimencam", { lang: "fr" });
    expect(res).toEqual({ state: "DEGRADED", reason: "VENDOR_OUTAGE" });
  });

  it("non-200 (5xx) → DEGRADED(VENDOR_OUTAGE)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const res = await fetchWikipediaPresence("Cimencam");
    expect(res).toEqual({ state: "DEGRADED", reason: "VENDOR_OUTAGE" });
  });

  it("nom vide → DEGRADED(INSUFFICIENT_DATA), aucun fetch", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const res = await fetchWikipediaPresence("   ");
    expect(res).toEqual({ state: "DEGRADED", reason: "INSUFFICIENT_DATA" });
    expect(spy).not.toHaveBeenCalled();
  });
});

// ── Autocomplete Google (axe D — demande) — no-key, registered-but-off ──────
// Endpoint public NON officiel (ToS-gray) : OFF par défaut. Design : suggestions
// vides = négatif RÉEL → LIVE (l'API a répondu). Panne = DEGRADED(VENDOR_OUTAGE).
// Désactivé = DEGRADED(MISSING_PREREQUISITE) sans aucun fetch. Zéro clé → jamais DEFERRED.

describe("parseAutocompleteResponse", () => {
  it("suggestions contenant la marque → brandAppearsInOwnSuggest true", () => {
    const sig = parseAutocompleteResponse(["nestle", ["nestle produits", "nestle rappel", ""]], "Nestlé");
    expect(sig.suggestions).toEqual(["nestle produits", "nestle rappel"]);
    expect(sig.brandAppearsInOwnSuggest).toBe(true);
  });
  it("suggestions vides → LIVE négatif honnête (false), jamais fabriqué", () => {
    const sig = parseAutocompleteResponse(["xqzyt", []], "Xqzyt");
    expect(sig.suggestions).toEqual([]);
    expect(sig.brandAppearsInOwnSuggest).toBe(false);
  });
});

describe("isSearchAutocompleteEnabled", () => {
  it("OFF par défaut ; ON sur opt-in explicite", () => {
    expect(isSearchAutocompleteEnabled()).toBe(false);
    process.env.SEARCH_AUTOCOMPLETE_ENABLED = "true";
    expect(isSearchAutocompleteEnabled()).toBe(true);
  });
});

describe("fetchSearchAutocomplete (ConnectorResult, ToS-gray registered-but-off)", () => {
  it("désactivé par défaut → DEGRADED(MISSING_PREREQUISITE), AUCUN fetch (posture ToS)", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const res = await fetchSearchAutocomplete("Nestlé");
    expect(res).toEqual({ state: "DEGRADED", reason: "MISSING_PREREQUISITE" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("(a) activé + l'API répond avec suggestions → LIVE + brandAppearsInOwnSuggest true", async () => {
    process.env.SEARCH_AUTOCOMPLETE_ENABLED = "1";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(["nestle", ["nestle produits", "nestle cameroun"]]),
    }));
    const res = await fetchSearchAutocomplete("Nestlé");
    expect(res.state).toBe("LIVE");
    if (res.state !== "LIVE") throw new Error("attendu LIVE");
    expect(res.data.brandAppearsInOwnSuggest).toBe(true);
    expect(res.data.suggestions).toHaveLength(2);
  });

  it("(b) activé + suggestions vides → LIVE négatif honnête (pas DEGRADED)", async () => {
    process.env.SEARCH_AUTOCOMPLETE_ENABLED = "1";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(["xqzyt", []]) }));
    const res = await fetchSearchAutocomplete("Xqzyt");
    expect(res.state).toBe("LIVE");
    if (res.state !== "LIVE") throw new Error("attendu LIVE");
    expect(res.data.brandAppearsInOwnSuggest).toBe(false);
  });

  it("(c) activé + fetch throw → DEGRADED(VENDOR_OUTAGE), jamais de crash", async () => {
    process.env.SEARCH_AUTOCOMPLETE_ENABLED = "1";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const res = await fetchSearchAutocomplete("Nestlé");
    expect(res).toEqual({ state: "DEGRADED", reason: "VENDOR_OUTAGE" });
  });

  it("activé + JSON illisible → DEGRADED(VENDOR_OUTAGE)", async () => {
    process.env.SEARCH_AUTOCOMPLETE_ENABLED = "1";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "<html>429</html>" }));
    const res = await fetchSearchAutocomplete("Nestlé");
    expect(res).toEqual({ state: "DEGRADED", reason: "VENDOR_OUTAGE" });
  });
});
