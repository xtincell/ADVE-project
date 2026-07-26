# ADR-0183 — Serveur OAuth 2.1 du endpoint MCP (connecteur claude.ai)

- **Status** : Accepted
- **Date** : 2026-07-26
- **Phase** : Chantier « accès MCP » — suite (WP-OAuth, après ADR-0182)
- **Depends on** : ADR-0182 (transport MCP JSON-RPC), ADR-0145 (tokens scopés), ADR-0166 (ownership)
- **Supersedes** : — (réalise le résidu « OAuth 2.1 claude.ai » tracé par ADR-0182)

## Contexte

ADR-0182 a livré un endpoint MCP réel authentifié par header `x-api-key` — cible
Claude Code / Desktop (`.mcp.json` + `headers`). Mais le **connecteur claude.ai**
(web/mobile, Réglages → Connecteurs) refuse l'auth par header : il exige un flux
**OAuth 2.1 complet** (découverte RFC 8414/9728 → enregistrement dynamique de
client RFC 7591 → authorization code + PKCE RFC 7636 → token). Sans serveur
d'autorisation, l'opérateur reçoit « Impossible de s'inscrire auprès du service
de connexion de La Fusée… ajouter un OAuth Client ID » (erreur `ofid_…` côté
claude.ai). C'était le résidu explicitement déféré par ADR-0182.

Le repo a un précédent OAuth 2.1 device-flow (Phase 16-C, Higgsfield) — mais en
tant que **client** (La Fusée appelle un tiers). Ici, La Fusée doit être
**serveur d'autorisation** (émettre des tokens au connecteur) — direction
inverse, entités distinctes. Audit anti-doublon : aucun serveur d'autorisation
OAuth n'existe (`McpApiKey` = header auth, pas OAuth) — greps négatifs → cet ADR.

## Décision

### 1. Trois modèles Prisma additifs

`McpOAuthClient` (clients enregistrés dynamiquement — `client_id` public
`lfc_`, `redirectUris`), `McpOAuthCode` (codes d'autorisation usage-unique, TTL
10 min, liés au PKCE challenge + portée), `McpOAuthToken` (access/refresh — seuls
les **hash SHA-256** stockés, jamais le secret). Migration
`20260726123700_mcp_oauth`, additive backfill-safe.

### 2. Service `anubis/mcp-oauth.ts` (déterministe, zéro LLM)

DCR (`registerClient`), PKCE S256 (`verifyPkceS256`, comparaison
longueur-constante), émission/consommation de code (`issueAuthCode` /
`exchangeCode` — usage-unique via `updateMany(consumedAt: null)` atomique + PKCE
+ redirect_uri + client_id vérifiés), tokens (`mintTokens` / `refreshTokens` —
rotation : l'ancien refresh révoqué), validation Bearer (`validateAccessToken`),
métadonnées de découverte (`buildProtectedResourceMetadata` /
`buildAuthServerMetadata`) + `resolveOrigin` (derrière Cloudflare/Traefik).

### 3. Endpoints (route handlers Next, publics par spec)

- `GET /.well-known/oauth-protected-resource` (RFC 9728)
- `GET /.well-known/oauth-authorization-server` (RFC 8414)
- `POST /api/mcp/oauth/register` (DCR RFC 7591 — client public)
- `GET|POST /api/mcp/oauth/authorize` — **consentement** : sans session NextAuth
  → redirige vers `/login?callbackUrl=…` ; avec session → page de portée
  (SYSTEM pour un ADMIN, sinon une des marques accessibles), portée
  **re-vérifiée serveur-side** au POST avant d'émettre le code.
- `POST /api/mcp/oauth/token` — `authorization_code` | `refresh_token`
  (form-urlencoded ET JSON).

### 4. Portée identique + intégration transport

Un token OAuth porte `scopeKind` (SYSTEM|BRAND) + `scopeStrategyId` — **même
modèle que `McpApiKey`**. `authenticateMcpRequest` accepte désormais
`Authorization: Bearer <lft_…>` (validé par hash, non facturé — usage
interactif), et `/api/mcp/rpc` renvoie `WWW-Authenticate: Bearer
resource_metadata="…"` sur 401 → c'est ce header qui déclenche la découverte du
connecteur. Le `enforceBrandScope` fail-closed en aval est inchangé.

## Conséquences

- Le connecteur claude.ai web/mobile peut enfin s'inscrire et se connecter ; les
  deux voies coexistent (header pour Claude Code, OAuth pour claude.ai).
- Sécurité : PKCE S256 obligatoire, redirect_uri validé **exactement**
  (anti open-redirect), codes usage-unique + TTL court, tokens hashés au repos,
  portée re-vérifiée contre les accès réels de l'utilisateur connecté.
- Tests : `mcp-oauth.test.ts` (PKCE pur, métadonnées, redirect_uri, + scan des
  invariants de sécurité). Cap APOGEE 7/7 préservé (mécanique Anubis, pas un Neter).
- **Déféré (RESIDUAL-DEBT)** : révocation explicite d'un token depuis la console ;
  purge cron des codes/tokens expirés ; consentement « une marque à la fois » vs
  multi-marques (v1 = une portée par token, ré-autoriser pour changer).
