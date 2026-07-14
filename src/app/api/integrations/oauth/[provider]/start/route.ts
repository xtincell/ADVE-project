export const dynamic = "force-dynamic";
/**
 * GET /api/integrations/oauth/:provider/start
 *
 * Initiates an OAuth Authorization-Code flow for the given provider.
 *
 * Deux usages :
 *  - Legacy opérateur (défaut) : intégrations outbound → `IntegrationConnection`.
 *    Requires admin or operator-bound session.
 *  - `?social=1&strategyId=…` (ADR-0128) : le founder connecte les réseaux de
 *    SA marque → le callback écrit des `SocialConnection` via Intent gouverné.
 *    Ownership de la Strategy exigé. Sans env creds provider ou sans
 *    INTEGRATION_TOKEN_KEY → redirection honnête vers le cockpit (pas de 500).
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  buildAuthorizeUrl,
  generatePkcePair,
  getProviderConfig,
  getPublicBaseUrl,
  packState,
} from "@/server/services/oauth-integrations";
import {
  BRAND_SOCIAL_PROVIDERS,
  integrationKeyReady,
  SOCIAL_SCOPES,
  type BrandSocialProvider,
} from "@/server/services/anubis/social-connect";

function signingKey(): string {
  return process.env.NEXTAUTH_SECRET ?? "lafusee-dev-fallback-32-chars-minimum";
}

const PKCE_COOKIE = "lf_oauth_pkce";

function cockpitRedirect(baseUrl: string, flag: string, provider: string): NextResponse {
  const u = new URL("/cockpit", baseUrl);
  u.searchParams.set("reseau", flag);
  u.searchParams.set("fournisseur", provider);
  return NextResponse.redirect(u);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { provider } = await context.params;
  const url = new URL(request.url);
  // Proto/host PUBLICS (x-forwarded-*) — le redirect_uri doit matcher les
  // URIs https déclarées chez les providers, pas la connexion interne.
  const baseUrl = getPublicBaseUrl(request);
  const isSocial = url.searchParams.get("social") === "1";
  const isCommerce = url.searchParams.get("commerce") === "1";

  const config = getProviderConfig(provider);

  // ── Branche « réseaux de la marque » (founder self-connect, ADR-0128) ──
  if (isSocial) {
    if (!BRAND_SOCIAL_PROVIDERS.includes(provider as BrandSocialProvider)) {
      return cockpitRedirect(baseUrl, "fournisseur_inconnu", provider);
    }
    if (!config) {
      // Env creds absentes — état honnête, l'UI l'affiche déjà comme
      // « bientôt disponible » ; on ne dispatch jamais un redirect cassé.
      return cockpitRedirect(baseUrl, "indisponible", provider);
    }
    if (!integrationKeyReady()) {
      return cockpitRedirect(baseUrl, "chiffrement_manquant", provider);
    }
    const strategyId = url.searchParams.get("strategyId");
    if (!strategyId) {
      return cockpitRedirect(baseUrl, "marque_manquante", provider);
    }
    const strategy = await db.strategy.findUnique({
      where: { id: strategyId },
      select: { id: true, userId: true },
    });
    if (!strategy) {
      return cockpitRedirect(baseUrl, "marque_introuvable", provider);
    }
    const isPrivileged = session.user.role === "ADMIN";
    if (!isPrivileged && strategy.userId !== session.user.id) {
      // Opérateur lié ? (parité console — un opérateur peut connecter pour un client)
      const u = await db.user.findUnique({
        where: { id: session.user.id },
        select: { operatorId: true },
      });
      if (!u?.operatorId) {
        return cockpitRedirect(baseUrl, "acces_refuse", provider);
      }
    }

    const returnUrlRaw = url.searchParams.get("returnUrl") ?? "/cockpit";
    const returnUrl = returnUrlRaw.startsWith("/") ? returnUrlRaw : "/cockpit";
    const redirectUri = `${baseUrl}/api/integrations/oauth/${provider}/callback`;
    const state = packState(
      {
        operatorId: "SOCIAL",
        provider: config.id,
        returnUrl,
        nonce: crypto.randomUUID(),
        ts: Date.now(),
        intent: "social",
        strategyId,
        userId: session.user.id,
      },
      signingKey(),
    );

    let pkceChallenge: string | undefined;
    let pkceVerifier: string | undefined;
    if (config.usePkce) {
      const pair = generatePkcePair();
      pkceChallenge = pair.challenge;
      pkceVerifier = pair.verifier;
    }

    const authorizeUrl = buildAuthorizeUrl({
      config,
      redirectUri,
      state,
      scopes: SOCIAL_SCOPES[provider as BrandSocialProvider],
      pkceChallenge,
      // Meta : impose l'écran de sélection de Page (le founder DOIT choisir sa
      // Page pro, jamais son profil auto-résolu — bug « pas eu le choix »).
      // Instagram : ré-affiche l'écran de compte (force_reauth) pour permettre
      // d'en choisir un autre (`enable_fb_login=0` est posé côté builder).
      forceReselect: config.id === "meta" || config.id === "instagram",
    });
    const response = NextResponse.redirect(authorizeUrl);
    if (pkceVerifier) {
      // Le verifier ne voyage JAMAIS dans le state (visible dans l'URL) —
      // cookie httpOnly court, scoppé aux routes OAuth.
      response.cookies.set(PKCE_COOKIE, pkceVerifier, {
        httpOnly: true,
        secure: url.protocol === "https:",
        sameSite: "lax",
        maxAge: 600,
        path: "/api/integrations/oauth",
      });
    }
    return response;
  }

  // ── Branche « boutique de la marque » (Shopify, vague cockpit-qui-ramène-tout) ──
  if (isCommerce) {
    if (provider !== "shopify") {
      return cockpitRedirect(baseUrl, "fournisseur_inconnu", provider);
    }
    if (!config) {
      return cockpitRedirect(baseUrl, "indisponible", provider);
    }
    if (!integrationKeyReady()) {
      return cockpitRedirect(baseUrl, "chiffrement_manquant", provider);
    }
    const strategyId = url.searchParams.get("strategyId");
    const shop = (url.searchParams.get("shop") ?? "").trim().toLowerCase();
    if (!strategyId) return cockpitRedirect(baseUrl, "marque_manquante", provider);
    const { isValidShopDomain } = await import("@/server/services/oauth-integrations");
    if (!isValidShopDomain(shop)) {
      return cockpitRedirect(baseUrl, "boutique_invalide", provider);
    }
    const strategy = await db.strategy.findUnique({
      where: { id: strategyId },
      select: { id: true, userId: true },
    });
    if (!strategy) return cockpitRedirect(baseUrl, "marque_introuvable", provider);
    if (session.user.role !== "ADMIN" && strategy.userId !== session.user.id) {
      const u = await db.user.findUnique({
        where: { id: session.user.id },
        select: { operatorId: true },
      });
      if (!u?.operatorId) return cockpitRedirect(baseUrl, "acces_refuse", provider);
    }

    const returnUrlRaw = url.searchParams.get("returnUrl") ?? "/cockpit/settings/connections";
    const returnUrl = returnUrlRaw.startsWith("/") ? returnUrlRaw : "/cockpit/settings/connections";
    const redirectUri = `${baseUrl}/api/integrations/oauth/${provider}/callback`;
    const state = packState(
      {
        operatorId: "SOCIAL",
        provider: config.id,
        returnUrl,
        nonce: crypto.randomUUID(),
        ts: Date.now(),
        intent: "commerce",
        strategyId,
        userId: session.user.id,
        shop,
      },
      signingKey(),
    );
    const authorizeUrl = buildAuthorizeUrl({ config, redirectUri, state, shop });
    return NextResponse.redirect(authorizeUrl);
  }

  // ── Branche legacy opérateur (inchangée) ────────────────────────────────
  // X/TikTok (PKCE / client_key) ne sont câblés que pour le flow social —
  // le flow outbound opérateur reste google/linkedin/meta.
  if (provider === "x" || provider === "tiktok") {
    return NextResponse.json(
      { error: "provider_social_only", provider, hint: "Use ?social=1&strategyId=…" },
      { status: 400 },
    );
  }
  if (!config) {
    return NextResponse.json(
      {
        error: "provider_not_configured",
        provider,
        hint: `Set ${provider.toUpperCase()}_OAUTH_CLIENT_ID and ${provider.toUpperCase()}_OAUTH_CLIENT_SECRET in env.`,
      },
      { status: 400 },
    );
  }

  // Resolve operatorId
  let operatorId: string;
  if (session.user.role === "ADMIN") {
    operatorId = "ADMIN";
  } else {
    const u = await db.user.findUnique({
      where: { id: session.user.id },
      select: { operatorId: true },
    });
    if (!u?.operatorId) {
      return NextResponse.json(
        { error: "Operator binding required to connect integrations" },
        { status: 403 },
      );
    }
    operatorId = u.operatorId;
  }

  const returnUrl = url.searchParams.get("returnUrl") ?? "/console/config/integrations";
  const redirectUri = `${baseUrl}/api/integrations/oauth/${provider}/callback`;

  const state = packState(
    {
      operatorId,
      provider: config.id,
      returnUrl,
      nonce: crypto.randomUUID(),
      ts: Date.now(),
    },
    signingKey(),
  );

  const authorizeUrl = buildAuthorizeUrl({ config, redirectUri, state });
  return NextResponse.redirect(authorizeUrl);
}
