export const dynamic = "force-dynamic";

/**
 * Authorization endpoint OAuth 2.1 (ADR-0183) — consentement + émission du code.
 *
 * GET  : valide client_id + redirect_uri (sinon 400 HTML, JAMAIS de redirect
 *        vers une URI non enregistrée). Sans session NextAuth → redirige vers
 *        /login?callbackUrl=<cette URL>. Avec session → page de consentement
 *        (choix de la portée : SYSTEM pour un ADMIN, sinon une des marques
 *        accessibles).
 * POST : (depuis le formulaire de consentement) re-valide, résout la portée
 *        CHOISIE en la re-vérifiant contre les accès réels, émet le code, et
 *        redirige (302) vers redirect_uri?code=...&state=...
 *
 * PKCE S256 obligatoire (client public). La sécurité repose sur : redirect_uri
 * exact, session utilisateur réelle, portée re-vérifiée serveur-side.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getOperatorContext } from "@/server/services/operator-isolation";
import { accessibleStrategyIds } from "@/server/trpc/middleware/strategy-scope";
import {
  getClient,
  issueAuthCode,
  redirectUriAllowed,
  resolveOrigin,
  type OAuthScope,
} from "@/server/services/anubis/mcp-oauth";

interface AuthzParams {
  clientId: string;
  redirectUri: string;
  responseType: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
  resource: string;
}

function readParams(sp: URLSearchParams): AuthzParams {
  return {
    clientId: sp.get("client_id") ?? "",
    redirectUri: sp.get("redirect_uri") ?? "",
    responseType: sp.get("response_type") ?? "",
    codeChallenge: sp.get("code_challenge") ?? "",
    codeChallengeMethod: sp.get("code_challenge_method") ?? "",
    state: sp.get("state") ?? "",
    resource: sp.get("resource") ?? "",
  };
}

function htmlError(message: string, status = 400): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Connexion refusée</title><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#1d1d1d"><h1 style="font-size:1.25rem">Connexion impossible</h1><p>${message}</p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function redirectWithError(redirectUri: string, state: string, error: string): Response {
  const u = new URL(redirectUri);
  u.searchParams.set("error", error);
  if (state) u.searchParams.set("state", state);
  return NextResponse.redirect(u.toString(), { status: 302 });
}

/** Options de portée offertes à CET utilisateur (re-vérifiées au POST). */
async function scopeOptions(userId: string): Promise<{ label: string; value: string }[]> {
  const ids = await accessibleStrategyIds(userId); // null = ADMIN (tout)
  if (ids === null) {
    return [{ label: "Toutes vos marques (accès système)", value: "SYSTEM" }];
  }
  if (ids.length === 0) return [];
  const brands = await db.strategy.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return brands.map((b) => ({ label: b.name, value: `BRAND:${b.id}` }));
}

/** Vérifie qu'une valeur de portée soumise est bien accessible à l'utilisateur. */
async function resolveScope(userId: string, value: string): Promise<OAuthScope | null> {
  const opCtx = await getOperatorContext(userId);
  if (value === "SYSTEM") return opCtx.role === "ADMIN" ? { scopeKind: "SYSTEM", scopeStrategyId: null } : null;
  if (value.startsWith("BRAND:")) {
    const strategyId = value.slice("BRAND:".length);
    const ids = await accessibleStrategyIds(userId);
    const ok = ids === null || ids.includes(strategyId);
    return ok ? { scopeKind: "BRAND", scopeStrategyId: strategyId } : null;
  }
  return null;
}

function consentPage(p: AuthzParams, clientName: string, options: { label: string; value: string }[]): Response {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const radios = options
    .map(
      (o, i) =>
        `<label style="display:flex;gap:.5rem;align-items:center;padding:.6rem .8rem;border:1px solid #e5e5e5;border-radius:.6rem;margin:.4rem 0;cursor:pointer"><input type="radio" name="scope" value="${esc(o.value)}" ${i === 0 ? "checked" : ""} required> ${esc(o.label)}</label>`,
    )
    .join("");
  const hidden = (["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state", "resource"] as const)
    .map((k) => {
      const map: Record<string, string> = {
        client_id: p.clientId, redirect_uri: p.redirectUri, response_type: p.responseType,
        code_challenge: p.codeChallenge, code_challenge_method: p.codeChallengeMethod,
        state: p.state, resource: p.resource,
      };
      return `<input type="hidden" name="${k}" value="${esc(map[k] ?? "")}">`;
    })
    .join("");
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Autoriser l'accès</title><body style="font-family:system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem;color:#1d1d1d">
<h1 style="font-size:1.35rem">Autoriser <strong>${esc(clientName || "l'application")}</strong></h1>
<p style="color:#555">Cette application demande à consulter l'intelligence de marque de La Fusée (stratégie, livrables, analyses). Accès en lecture. Choisissez la portée :</p>
<form method="post">${hidden}${radios}
<button type="submit" style="margin-top:1rem;background:#E56458;color:#fff;border:0;border-radius:.6rem;padding:.7rem 1.2rem;font-size:1rem;cursor:pointer">Autoriser</button>
</form></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const p = readParams(url.searchParams);

  const client = await getClient(p.clientId);
  if (!client) return htmlError("Application inconnue (client_id invalide).");
  if (!redirectUriAllowed(client, p.redirectUri)) return htmlError("URI de redirection non autorisée.");
  // À partir d'ici redirect_uri est validé → les erreurs repartent vers le client.
  if (p.responseType !== "code") return redirectWithError(p.redirectUri, p.state, "unsupported_response_type");
  if (!p.codeChallenge || p.codeChallengeMethod !== "S256") {
    return redirectWithError(p.redirectUri, p.state, "invalid_request");
  }

  const session = await auth();
  if (!session?.user) {
    // Origine PUBLIQUE obligatoire : `url.origin` vient de `request.url`, qui
    // derrière Traefik/Coolify porte l'adresse de bind du conteneur
    // (`0.0.0.0:80`) → le navigateur ne peut pas suivre la redirection
    // (incident OAuth 2026-07-27). `resolveOrigin` lit x-forwarded-host/proto.
    const callbackUrl = url.pathname + url.search;
    const target = new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, resolveOrigin(request));
    return NextResponse.redirect(target, { status: 302 });
  }

  const options = await scopeOptions(session.user.id);
  if (options.length === 0) {
    return htmlError("Votre compte n'a accès à aucune marque — impossible d'autoriser l'accès.", 403);
  }
  return consentPage(p, client.clientName ?? "", options);
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return htmlError("Requête invalide.");
  const get = (k: string) => String(form.get(k) ?? "");
  const p: AuthzParams = {
    clientId: get("client_id"), redirectUri: get("redirect_uri"), responseType: get("response_type"),
    codeChallenge: get("code_challenge"), codeChallengeMethod: get("code_challenge_method"),
    state: get("state"), resource: get("resource"),
  };
  const chosenScope = get("scope");

  const client = await getClient(p.clientId);
  if (!client) return htmlError("Application inconnue (client_id invalide).");
  if (!redirectUriAllowed(client, p.redirectUri)) return htmlError("URI de redirection non autorisée.");
  if (!p.codeChallenge || p.codeChallengeMethod !== "S256") {
    return redirectWithError(p.redirectUri, p.state, "invalid_request");
  }

  const session = await auth();
  if (!session?.user) return htmlError("Session expirée — reconnectez-vous.", 401);

  const scope = await resolveScope(session.user.id, chosenScope);
  if (!scope) return redirectWithError(p.redirectUri, p.state, "access_denied");

  const code = await issueAuthCode({
    clientId: p.clientId,
    userId: session.user.id,
    redirectUri: p.redirectUri,
    codeChallenge: p.codeChallenge,
    scope,
    resource: p.resource || null,
  });

  const u = new URL(p.redirectUri);
  u.searchParams.set("code", code);
  if (p.state) u.searchParams.set("state", p.state);
  return NextResponse.redirect(u.toString(), { status: 302 });
}
