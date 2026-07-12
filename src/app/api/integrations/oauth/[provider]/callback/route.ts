export const dynamic = "force-dynamic";
/**
 * GET /api/integrations/oauth/:provider/callback
 *
 * Final hop of the OAuth Authorization-Code flow. Validates the signed
 * state, exchanges the code for tokens, then :
 *
 *  - state.intent === "social" (ADR-0128) : découvre les comptes de la marque
 *    chez le provider (pages FB, compte IG Business, chaîne YouTube, profil
 *    X/TikTok/LinkedIn), chiffre les tokens AES-GCM et émet l'Intent gouverné
 *    `ANUBIS_SOCIAL_CONNECT_ACCOUNT` (aucun secret en clair dans l'émission).
 *    Un premier FollowerSnapshot source=CONNECTOR est posé quand le provider
 *    fournit un compteur — la donnée est ventilée vers le suivi communauté.
 *
 *  - sinon (legacy) : upserts an `IntegrationConnection` row (opérateur).
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  encryptTokenPayload,
  exchangeCode,
  exchangeMetaLongLivedToken,
  fetchUserInfo,
  getProviderConfig,
  getPublicBaseUrl,
  unpackState,
} from "@/server/services/oauth-integrations";
import {
  discoverSocialAccounts,
  encryptDiscoveredAccounts,
  type BrandSocialProvider,
} from "@/server/services/anubis/social-connect";
import { emitIntentTyped } from "@/server/services/mestor/intents";

function signingKey(): string {
  return process.env.NEXTAUTH_SECRET ?? "lafusee-dev-fallback-32-chars-minimum";
}

const PKCE_COOKIE = "lf_oauth_pkce";

function redirectWithFlag(returnUrl: string, flag: string, providerSlug: string): NextResponse {
  const u = new URL(returnUrl, "http://placeholder.local");
  u.searchParams.set("integration", providerSlug);
  u.searchParams.set("status", flag);
  // Strip the placeholder host — we want a relative redirect.
  return NextResponse.redirect(`${u.pathname}${u.search}`);
}

/** Redirection sociale : porte l'état en vocabulaire client (jamais de jargon). */
function socialRedirect(
  baseUrl: string,
  returnUrl: string,
  flag: string,
  provider: string,
  platforms?: string[],
): NextResponse {
  const safePath = returnUrl.startsWith("/") ? returnUrl : "/cockpit";
  const u = new URL(safePath, baseUrl);
  u.searchParams.set("reseau", flag);
  u.searchParams.set("fournisseur", provider);
  if (platforms && platforms.length > 0) u.searchParams.set("plateformes", platforms.join(","));
  const res = NextResponse.redirect(u);
  // Le verifier PKCE est single-use — purge dans tous les cas.
  res.cookies.set(PKCE_COOKIE, "", { maxAge: 0, path: "/api/integrations/oauth" });
  return res;
}

function readPkceCookie(request: Request): string | undefined {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${PKCE_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(PKCE_COOKIE.length + 1)) : undefined;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const url = new URL(request.url);
  // MÊME base publique que le start : le redirect_uri de l'échange de code
  // doit être STRICTEMENT identique à celui envoyé à l'autorisation.
  const baseUrl = getPublicBaseUrl(request);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const preState = stateParam ? unpackState(stateParam, signingKey()) : null;

  if (errorParam) {
    if (preState?.intent === "social") {
      // L'utilisateur a refusé l'autorisation chez le provider — état honnête.
      return socialRedirect(baseUrl, preState.returnUrl, "refuse", provider);
    }
    return redirectWithFlag(
      "/console/config/integrations",
      `error_${errorParam}`,
      provider,
    );
  }
  if (!code || !stateParam) {
    return NextResponse.json({ error: "missing_code_or_state" }, { status: 400 });
  }

  const state = preState;
  if (!state || state.provider !== provider) {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }

  const config = getProviderConfig(provider);
  if (!config) {
    return NextResponse.json({ error: "provider_not_configured" }, { status: 400 });
  }

  const redirectUri = `${baseUrl}/api/integrations/oauth/${provider}/callback`;

  let tokens;
  try {
    tokens = await exchangeCode({
      config,
      code,
      redirectUri,
      pkceVerifier: config.usePkce ? readPkceCookie(request) : undefined,
      shop: state.shop,
    });
  } catch (err) {
    console.error("[oauth-callback]", provider, err);
    if (state.intent === "social" || state.intent === "commerce") {
      return socialRedirect(baseUrl, state.returnUrl, "echec_echange", provider);
    }
    return redirectWithFlag(state.returnUrl, "error_token_exchange", provider);
  }

  // ── Branche « réseaux de la marque » (ADR-0128) ─────────────────────────
  if (state.intent === "social") {
    if (!state.strategyId || !state.userId) {
      return socialRedirect(baseUrl, state.returnUrl, "etat_invalide", provider);
    }

    // Meta : troque le user token court (~1h) contre un long-lived (~60j)
    // AVANT la découverte — les page tokens dérivés n'expirent alors pas.
    if (config.id === "meta") {
      const longLived = await exchangeMetaLongLivedToken(config, tokens.access_token);
      if (longLived?.access_token) {
        tokens = { ...tokens, ...longLived };
      }
    }

    const accounts = await discoverSocialAccounts(config, tokens);
    if (accounts.length === 0) {
      // Rien à connecter (ex : aucun droit sur une Page FB) — on le dit.
      return socialRedirect(baseUrl, state.returnUrl, "aucun_compte", provider);
    }

    try {
      await emitIntentTyped(
        {
          kind: "ANUBIS_SOCIAL_CONNECT_ACCOUNT",
          strategyId: state.strategyId,
          userId: state.userId,
          provider: config.id as BrandSocialProvider,
          accounts: encryptDiscoveredAccounts(accounts),
          scopes: tokens.scope
            ? tokens.scope.split(/[\s,]+/)
            : Array.from(config.defaultScopes),
        },
        { caller: "oauth-callback:social" },
      );
    } catch (err) {
      console.error("[oauth-callback:social] intent failed", provider, err);
      return socialRedirect(baseUrl, state.returnUrl, "echec_enregistrement", provider);
    }

    return socialRedirect(
      baseUrl,
      state.returnUrl,
      "connecte",
      provider,
      accounts.map((a) => a.platform),
    );
  }

  // ── Branche « boutique de la marque » (Shopify) ─────────────────────────
  if (state.intent === "commerce") {
    if (!state.strategyId || !state.userId || !state.shop) {
      return socialRedirect(baseUrl, state.returnUrl, "etat_invalide", provider);
    }
    // Vérification réelle du token : lecture du shop (nom public).
    let shopName: string | null = null;
    try {
      const res = await fetch(`https://${state.shop}/admin/api/2025-01/shop.json`, {
        headers: { "X-Shopify-Access-Token": tokens.access_token },
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) {
        const json = (await res.json()) as { shop?: { name?: string; domain?: string } };
        shopName = json.shop?.name ?? null;
      }
    } catch { /* le nom est cosmétique — la connexion reste valable */ }

    try {
      const { connectShopifyStore } = await import("@/server/services/anubis/commerce-connect");
      await connectShopifyStore({
        strategyId: state.strategyId,
        shopDomain: state.shop,
        shopName,
        accessToken: tokens.access_token,
        scopes: tokens.scope ? tokens.scope.split(/[\s,]+/) : Array.from(config.defaultScopes),
        userId: state.userId,
      });
    } catch (err) {
      console.error("[oauth-callback:commerce] connect failed", err);
      return socialRedirect(baseUrl, state.returnUrl, "echec_enregistrement", provider);
    }
    return socialRedirect(baseUrl, state.returnUrl, "boutique_connectee", provider);
  }

  // ── Branche legacy opérateur (inchangée) ────────────────────────────────
  const userInfo = await fetchUserInfo(config, tokens.access_token).catch(() => null);
  const externalUserId = userInfo?.id ?? null;

  const encryptedTokens = encryptTokenPayload({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    scope: tokens.scope ?? null,
    token_type: tokens.token_type ?? null,
    obtainedAt: Date.now(),
  });
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;

  await db.integrationConnection.upsert({
    where: {
      operatorId_provider_externalUserId: {
        operatorId: state.operatorId,
        provider: config.id,
        externalUserId: externalUserId ?? "",
      },
    },
    update: {
      encryptedTokens,
      scopes: tokens.scope ? tokens.scope.split(/\s+/) : Array.from(config.defaultScopes),
      expiresAt,
    },
    create: {
      operatorId: state.operatorId,
      provider: config.id,
      externalUserId,
      encryptedTokens,
      scopes: tokens.scope ? tokens.scope.split(/\s+/) : Array.from(config.defaultScopes),
      expiresAt,
    },
  });

  return redirectWithFlag(state.returnUrl, "connected", provider);
}
