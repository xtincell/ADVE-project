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
} from "@/server/services/quick-intake/footprint-collectors";

const ENV_KEYS = ["YOUTUBE_API_KEY", "PAGESPEED_API_KEY", "APIFY_TOKEN", "APIFY_MAPS_ACTOR_ID", "APIFY_ADS_ACTOR_ID"] as const;
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
