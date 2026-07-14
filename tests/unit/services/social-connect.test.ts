/**
 * Réseaux de la marque — connexions OAuth founder (ADR-0128).
 *
 * Couvre les unités PURES (fetch-mock / env-stub, sans DB) et verrouille :
 *   (1) le mapping plateforme↔provider couvre les 6 SocialPlatform ;
 *   (2) les scopes sont LECTURE-AUDIENCE uniquement (jamais ads/écriture) ;
 *   (3) les tokens traversent l'Intent CHIFFRÉS (aller-retour AES-GCM, le
 *       blob ne contient jamais le token en clair) ;
 *   (4) la découverte de comptes n'invente rien : compteur caché → null,
 *       réponse vide → aucun compte (jamais un zéro fabriqué) ;
 *   (5) sans env creds, le provider n'est PAS « prêt » (l'UI affiche
 *       « Bientôt disponible », pas un 500) ;
 *   (6) les adaptations OAuth par provider (PKCE S256 pour X, client_key +
 *       scopes virgule pour TikTok, Basic sur le token endpoint X).
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  BRAND_SOCIAL_PROVIDERS,
  PROVIDER_FOR_PLATFORM,
  SOCIAL_SCOPES,
  encryptDiscoveredAccounts,
  discoverSocialAccounts,
  providerReadiness,
  integrationKeyReady,
  type DiscoveredSocialAccount,
} from "@/server/services/anubis/social-connect";
import {
  buildAuthorizeUrl,
  decryptTokenPayload,
  exchangeCode,
  generatePkcePair,
  getProviderConfig,
  parseInstagramShortTokenResponse,
} from "@/server/services/oauth-integrations";

const TEST_KEY = "test-integration-token-key-0123456789abcdef";

beforeEach(() => {
  vi.stubEnv("INTEGRATION_TOKEN_KEY", TEST_KEY);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

// ── (1) Mapping plateforme ↔ provider ────────────────────────────────────────

describe("PROVIDER_FOR_PLATFORM", () => {
  it("couvre les 6 plateformes SocialPlatform avec des providers connus", () => {
    const platforms = Object.keys(PROVIDER_FOR_PLATFORM).sort();
    expect(platforms).toEqual(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "TWITTER", "YOUTUBE"]);
    for (const provider of Object.values(PROVIDER_FOR_PLATFORM)) {
      expect(BRAND_SOCIAL_PROVIDERS).toContain(provider);
    }
    // FB via Meta/Facebook Login ; IG via son PROPRE flow « Instagram Business
    // Login » (ADR-0128 amendé 2026-07-14 — connexion directe, sans Page FB).
    expect(PROVIDER_FOR_PLATFORM.FACEBOOK).toBe("meta");
    expect(PROVIDER_FOR_PLATFORM.INSTAGRAM).toBe("instagram");
  });
});

// ── (2) Scopes de pilotage (ADR-0133) — bornés, jamais publicitaires ─────────

describe("SOCIAL_SCOPES", () => {
  it("ne demande JAMAIS de scope publicitaire, de messagerie privée ni d'upload vidéo", () => {
    // Mandat « rival Sprout » : les scopes de PILOTAGE (publier, répondre,
    // mesurer) sont désormais canon. Restent interdits : la pub (ads), les
    // DM (messaging — vague ultérieure, consentement dédié) et l'upload
    // vidéo YouTube (audit).
    const forbidden = [/ads/i, /messaging/i, /manage_messages/i, /video.upload/i, /youtube.upload/i];
    for (const provider of BRAND_SOCIAL_PROVIDERS) {
      for (const scope of SOCIAL_SCOPES[provider]) {
        for (const pattern of forbidden) {
          expect(scope).not.toMatch(pattern);
        }
      }
    }
  });

  it("porte les scopes de pilotage attendus (publier / répondre / mesurer)", () => {
    for (const s of [
      "pages_manage_posts",
      "pages_manage_engagement",
      "read_insights",
      "instagram_content_publish",
      "instagram_manage_comments",
      "instagram_manage_insights",
    ]) {
      expect(SOCIAL_SCOPES.meta).toContain(s);
    }
    expect(SOCIAL_SCOPES.linkedin).toContain("w_member_social");
    expect(SOCIAL_SCOPES.google.join(" ")).toContain("yt-analytics.readonly");
  });

  it("couvre chaque provider de la liste", () => {
    for (const provider of BRAND_SOCIAL_PROVIDERS) {
      expect(SOCIAL_SCOPES[provider].length).toBeGreaterThan(0);
    }
  });
});

// ── (3) Chiffrement des tokens avant l'Intent ────────────────────────────────

describe("encryptDiscoveredAccounts", () => {
  const account: DiscoveredSocialAccount = {
    platform: "FACEBOOK",
    accountId: "page-123",
    accountName: "Motion19",
    handle: "motion19store",
    followerCount: 4252,
    followingCount: null,
    profile: {
      bio: "Équipement audiovisuel à Douala",
      website: "https://motion19.com",
      category: "Retail",
      location: "Douala, Cameroon",
      followingCount: null,
      mediaCount: null,
      totalViews: null,
      pictureUrl: null,
    },
    tokens: { access_token: "SECRET-PAGE-TOKEN-XYZ", refresh_token: null, obtainedAt: 1, expiresAt: null },
  };

  it("le blob chiffré ne contient jamais le token en clair et se déchiffre à l'identique", () => {
    const [encrypted] = encryptDiscoveredAccounts([account]);
    expect(encrypted!.encryptedTokens).not.toContain("SECRET-PAGE-TOKEN-XYZ");
    expect(encrypted!.encryptedTokens.length).toBeGreaterThan(20);
    const roundTrip = decryptTokenPayload<{ access_token: string }>(encrypted!.encryptedTokens);
    expect(roundTrip.access_token).toBe("SECRET-PAGE-TOKEN-XYZ");
    // Les métadonnées non-secrètes restent lisibles pour l'émission.
    expect(encrypted!.platform).toBe("FACEBOOK");
    expect(encrypted!.followerCount).toBe(4252);
  });

  it("expiresAt null → tokenExpiresAt null (page tokens Meta sans expiration)", () => {
    const [encrypted] = encryptDiscoveredAccounts([account]);
    expect(encrypted!.tokenExpiresAt).toBeNull();
  });
});

// ── (4) Découverte de comptes — jamais de donnée inventée ────────────────────

describe("discoverSocialAccounts", () => {
  const tokens = { access_token: "user-token", expires_in: 3600 };

  it("meta : une page FB + son compte IG Business → 2 comptes, tokens de PAGE, compteurs réels", async () => {
    vi.stubEnv("META_OAUTH_CLIENT_ID", "meta-id");
    vi.stubEnv("META_OAUTH_CLIENT_SECRET", "meta-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          data: [
            {
              id: "111",
              name: "Motion19",
              username: "motion19store",
              access_token: "PAGE-TOKEN-111",
              fan_count: 4252,
              instagram_business_account: { id: "ig-9", username: "motion19store", followers_count: 1753 },
            },
          ],
        }),
      ),
    );
    const config = getProviderConfig("meta")!;
    const accounts = await discoverSocialAccounts(config, tokens);
    expect(accounts).toHaveLength(2);
    const fb = accounts.find((a) => a.platform === "FACEBOOK")!;
    const ig = accounts.find((a) => a.platform === "INSTAGRAM")!;
    expect(fb.followerCount).toBe(4252);
    expect(fb.tokens.access_token).toBe("PAGE-TOKEN-111");
    expect(ig.followerCount).toBe(1753);
    expect(ig.tokens.access_token).toBe("PAGE-TOKEN-111");
  });

  it("meta : `me/accounts` OMET l'IG → le fallback par-Page le récupère (quirk Meta, fix « FB oui, IG non »)", async () => {
    vi.stubEnv("META_OAUTH_CLIENT_ID", "meta-id");
    vi.stubEnv("META_OAUTH_CLIENT_SECRET", "meta-secret");
    const fetchMock = vi
      .fn()
      // 1) agrégat me/accounts : la Page SANS instagram_business_account
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: [{ id: "111", name: "SPAWT", username: "spawt.ci", access_token: "PAGE-TOKEN-111", fan_count: 4252 }],
        }),
      )
      // 2) fallback direct sur la Page (token de PAGE) : renvoie le compte IG
      .mockResolvedValueOnce(
        jsonResponse(200, { instagram_business_account: { id: "ig-9", username: "spawt.ci", followers_count: 1753 } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const accounts = await discoverSocialAccounts(getProviderConfig("meta")!, tokens);
    expect(accounts.map((a) => a.platform).sort()).toEqual(["FACEBOOK", "INSTAGRAM"]);
    const ig = accounts.find((a) => a.platform === "INSTAGRAM")!;
    expect(ig.accountId).toBe("ig-9");
    expect(ig.followerCount).toBe(1753);
    expect(ig.tokens.access_token).toBe("PAGE-TOKEN-111"); // token de PAGE, pas user
    expect(fetchMock).toHaveBeenCalledTimes(2); // agrégat + fallback par-Page
  });

  it("google : compteur d'abonnés masqué (hiddenSubscriberCount) → followerCount null, jamais 0 fabriqué", async () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "g-id");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "g-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          items: [
            {
              id: "chan-1",
              snippet: { title: "Motion19 Academy", customUrl: "@motion19" },
              statistics: { subscriberCount: "12", hiddenSubscriberCount: true },
            },
          ],
        }),
      ),
    );
    const accounts = await discoverSocialAccounts(getProviderConfig("google")!, tokens);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]!.platform).toBe("YOUTUBE");
    expect(accounts[0]!.followerCount).toBeNull();
    expect(accounts[0]!.handle).toBe("motion19");
  });

  it("x : profil propre avec public_metrics → TWITTER + followers réels", async () => {
    vi.stubEnv("X_OAUTH_CLIENT_ID", "x-id");
    vi.stubEnv("X_OAUTH_CLIENT_SECRET", "x-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, { data: { id: "u1", username: "motion19store", name: "Motion19", public_metrics: { followers_count: 87 } } }),
      ),
    );
    const accounts = await discoverSocialAccounts(getProviderConfig("x")!, tokens);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]!.platform).toBe("TWITTER");
    expect(accounts[0]!.followerCount).toBe(87);
  });

  it("réponse provider vide → AUCUN compte (pas d'invention)", async () => {
    vi.stubEnv("META_OAUTH_CLIENT_ID", "meta-id");
    vi.stubEnv("META_OAUTH_CLIENT_SECRET", "meta-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { data: [] })));
    const accounts = await discoverSocialAccounts(getProviderConfig("meta")!, tokens);
    expect(accounts).toHaveLength(0);
  });

  it("linkedin : profil membre → followerCount null (compteur org non accessible sans produit dédié)", async () => {
    vi.stubEnv("LINKEDIN_OAUTH_CLIENT_ID", "in-id");
    vi.stubEnv("LINKEDIN_OAUTH_CLIENT_SECRET", "in-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { sub: "abc", name: "Motion19 SARL" })),
    );
    const accounts = await discoverSocialAccounts(getProviderConfig("linkedin")!, tokens);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]!.platform).toBe("LINKEDIN");
    expect(accounts[0]!.followerCount).toBeNull();
  });
});

// ── (5) Readiness honnête (env creds) ────────────────────────────────────────

describe("providerReadiness", () => {
  it("sans env creds → aucun provider prêt (l'UI dira « Bientôt disponible »)", () => {
    const readiness = providerReadiness();
    for (const provider of BRAND_SOCIAL_PROVIDERS) {
      expect(readiness[provider]).toBe(false);
    }
  });

  it("creds meta posées → meta prêt, les autres non", () => {
    vi.stubEnv("META_OAUTH_CLIENT_ID", "meta-id");
    vi.stubEnv("META_OAUTH_CLIENT_SECRET", "meta-secret");
    const readiness = providerReadiness();
    expect(readiness.meta).toBe(true);
    expect(readiness.google).toBe(false);
  });

  it("clé de chiffrement absente → RIEN n'est prêt même avec des creds provider", () => {
    vi.stubEnv("INTEGRATION_TOKEN_KEY", "");
    vi.stubEnv("META_OAUTH_CLIENT_ID", "meta-id");
    vi.stubEnv("META_OAUTH_CLIENT_SECRET", "meta-secret");
    expect(integrationKeyReady()).toBe(false);
    expect(providerReadiness().meta).toBe(false);
  });
});

// ── (6) Adaptations OAuth par provider ───────────────────────────────────────

describe("oauth-integrations — adaptations x / tiktok", () => {
  it("x : l'URL d'autorisation porte code_challenge S256 ; sans challenge → throw", () => {
    vi.stubEnv("X_OAUTH_CLIENT_ID", "x-id");
    vi.stubEnv("X_OAUTH_CLIENT_SECRET", "x-secret");
    const config = getProviderConfig("x")!;
    const { challenge } = generatePkcePair();
    const url = buildAuthorizeUrl({ config, redirectUri: "https://app/cb", state: "s", pkceChallenge: challenge });
    expect(url).toContain("code_challenge=");
    expect(url).toContain("code_challenge_method=S256");
    expect(() => buildAuthorizeUrl({ config, redirectUri: "https://app/cb", state: "s" })).toThrow(/PKCE/);
  });

  it("tiktok : client_key (pas client_id) + scopes séparés par des virgules", () => {
    vi.stubEnv("TIKTOK_OAUTH_CLIENT_ID", "tk-key");
    vi.stubEnv("TIKTOK_OAUTH_CLIENT_SECRET", "tk-secret");
    const config = getProviderConfig("tiktok")!;
    const url = buildAuthorizeUrl({ config, redirectUri: "https://app/cb", state: "s" });
    expect(url).toContain("client_key=tk-key");
    expect(url).not.toContain("client_id=");
    expect(decodeURIComponent(url)).toContain("user.info.basic,user.info.profile,user.info.stats");
  });

  it("x : l'échange de code envoie Authorization Basic + code_verifier dans le corps", async () => {
    vi.stubEnv("X_OAUTH_CLIENT_ID", "x-id");
    vi.stubEnv("X_OAUTH_CLIENT_SECRET", "x-secret");
    const spy = vi.fn().mockResolvedValue(jsonResponse(200, { access_token: "at", refresh_token: "rt" }));
    vi.stubGlobal("fetch", spy);
    const config = getProviderConfig("x")!;
    await exchangeCode({ config, code: "c0de", redirectUri: "https://app/cb", pkceVerifier: "v3rifier" });
    const [, init] = spy.mock.calls[0]!;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^Basic /);
    const body = init.body as URLSearchParams;
    expect(body.get("code_verifier")).toBe("v3rifier");
    expect(body.get("client_secret")).toBeNull(); // jamais en corps quand Basic
  });
});

// ── (7) Instagram Business Login — flow dédié (ADR-0128 amendé 2026-07-14) ────
// « il faut un tout autre code pour instagram » : provider PROPRE, distinct de
// meta. instagram.com/oauth/authorize · api.instagram.com (réponse enveloppée)
// · graph.instagram.com. Répond au blocage « Facebook connecte, pas Instagram ».

describe("Instagram Business Login (provider dédié)", () => {
  it("provider config : endpoints instagram.com/api.instagram.com, scopes business, App ID par défaut", () => {
    vi.stubEnv("INSTAGRAM_OAUTH_CLIENT_SECRET", "ig-secret");
    const config = getProviderConfig("instagram")!;
    expect(config).not.toBeNull();
    expect(config.authorizationEndpoint).toBe("https://www.instagram.com/oauth/authorize");
    expect(config.tokenEndpoint).toBe("https://api.instagram.com/oauth/access_token");
    expect(config.scopeDelimiter).toBe(",");
    // App ID PUBLIC par défaut (visible dans l'URL, jamais un secret) — surchargé par env.
    // = Instagram App ID (« LaFusee_ADVE-IG »), PAS un ID de configuration Login-for-Business.
    expect(config.clientId).toBe("1274394400786813");
    expect(config.defaultScopes).toContain("instagram_business_basic");
    expect(config.defaultScopes).toContain("instagram_business_content_publish");
  });

  it("sans INSTAGRAM_OAUTH_CLIENT_SECRET → provider indisponible (null, UI « bientôt disponible »)", () => {
    expect(getProviderConfig("instagram")).toBeNull();
  });

  it("INSTAGRAM_OAUTH_CLIENT_ID surcharge le défaut", () => {
    vi.stubEnv("INSTAGRAM_OAUTH_CLIENT_ID", "override-app-id");
    vi.stubEnv("INSTAGRAM_OAUTH_CLIENT_SECRET", "ig-secret");
    expect(getProviderConfig("instagram")!.clientId).toBe("override-app-id");
  });

  it("URL d'autorisation : instagram.com/oauth/authorize + enable_fb_login=0 + scopes virgule", () => {
    vi.stubEnv("INSTAGRAM_OAUTH_CLIENT_SECRET", "ig-secret");
    const config = getProviderConfig("instagram")!;
    const url = buildAuthorizeUrl({
      config,
      redirectUri: "https://app/cb",
      state: "s",
      scopes: SOCIAL_SCOPES.instagram,
    });
    expect(url).toContain("https://www.instagram.com/oauth/authorize");
    expect(url).toContain("client_id=1274394400786813");
    expect(url).toContain("enable_fb_login=0"); // login PUREMENT Instagram (pas d'interstitiel FB)
    expect(decodeURIComponent(url)).toContain(
      "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments",
    );
  });

  it("force_reauth n'est posé QUE si forceReselect (ré-affiche l'écran de compte)", () => {
    vi.stubEnv("INSTAGRAM_OAUTH_CLIENT_SECRET", "ig-secret");
    const config = getProviderConfig("instagram")!;
    const withReselect = buildAuthorizeUrl({ config, redirectUri: "https://app/cb", state: "s", forceReselect: true });
    const without = buildAuthorizeUrl({ config, redirectUri: "https://app/cb", state: "s" });
    expect(withReselect).toContain("force_reauth=true");
    expect(without).not.toContain("force_reauth");
  });

  it("parseInstagramShortTokenResponse : déballe l'enveloppe {data:[…]} + permissions → scope", () => {
    // Forme RÉELLE de api.instagram.com/oauth/access_token (≠ OAuth standard).
    const wrapped = {
      data: [
        {
          access_token: "IGAA-short",
          user_id: 178414,
          permissions: "instagram_business_basic,instagram_business_content_publish",
        },
      ],
    };
    const parsed = parseInstagramShortTokenResponse(wrapped)!;
    expect(parsed.access_token).toBe("IGAA-short");
    expect(parsed.user_id).toBe("178414"); // coercition number → string
    expect(parsed.scope).toBe("instagram_business_basic,instagram_business_content_publish");
  });

  it("parseInstagramShortTokenResponse : tolère une forme plate + permissions en tableau", () => {
    const parsed = parseInstagramShortTokenResponse({
      access_token: "IGAA-flat",
      user_id: "42",
      permissions: ["a", "b"],
    })!;
    expect(parsed.access_token).toBe("IGAA-flat");
    expect(parsed.scope).toBe("a,b");
  });

  it("parseInstagramShortTokenResponse : pas d'access_token → null (jamais un token vide)", () => {
    expect(parseInstagramShortTokenResponse({ data: [{ user_id: "1" }] })).toBeNull();
    expect(parseInstagramShortTokenResponse(null)).toBeNull();
    expect(parseInstagramShortTokenResponse({})).toBeNull();
  });

  it("discoverSocialAccounts instagram : /me → 1 compte INSTAGRAM, compteurs réels, token long-lived conservé", async () => {
    vi.stubEnv("INSTAGRAM_OAUTH_CLIENT_SECRET", "ig-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          user_id: "17841400000000000",
          username: "spawt.ci",
          name: "SPAWT",
          followers_count: 1753,
          follows_count: 12,
          media_count: 87,
          biography: "La boutique",
        }),
      ),
    );
    const config = getProviderConfig("instagram")!;
    const accounts = await discoverSocialAccounts(config, { access_token: "ig-long-token", expires_in: 5183944 });
    expect(accounts).toHaveLength(1);
    const ig = accounts[0]!;
    expect(ig.platform).toBe("INSTAGRAM");
    expect(ig.accountId).toBe("17841400000000000");
    expect(ig.handle).toBe("spawt.ci");
    expect(ig.followerCount).toBe(1753);
    expect(ig.tokens.access_token).toBe("ig-long-token");
  });

  it("discoverSocialAccounts instagram : réponse vide → aucun compte (pas d'invention)", async () => {
    vi.stubEnv("INSTAGRAM_OAUTH_CLIENT_SECRET", "ig-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, {})));
    const accounts = await discoverSocialAccounts(getProviderConfig("instagram")!, { access_token: "t" });
    expect(accounts).toHaveLength(0);
  });
});
