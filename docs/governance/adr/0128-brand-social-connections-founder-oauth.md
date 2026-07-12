# ADR-0128 — Réseaux de la marque : connexions OAuth par le founder (SocialConnection branché)

- **Status** : Accepted · **Amended 2026-07-12 (nuit)** — mandat « la fusée devrait tout récupérer » : collecte portée au MAXIMUM des scopes accordés (v6.27.112). Posts riches ×25 (permalink/visuel/type de média — colonnes additives `SocialPost.mediaType/permalinkUrl/mediaUrl`), profil public de la marque collecté à la connexion ET rafraîchi à chaque sync (`SocialConnection.metadata.profile` : bio/site/catégorie/localisation/volumes ; `FollowerSnapshot.followingCount` rempli), pilier E enrichi (`webPresence.connectedProfiles` + provenance `followerSource` honnête CONNECTOR|APIFY). **Frontière testée en dur au bon niveau** : la boucle passive ne stocke rien des tiers ni n'appelle `/insights` sans scope ; l'engagement des tiers (commentaires/DM/mentions AVEC identités) relève de l'**Inbox unifiée S3** (benchmark §4) avec scopes dédiés, service distinct, et mise à jour /privacy + /data-deletion (rôle processor — modèle Sprout, doctrine « rival de Sprout Social » confirmée opérateur le 12/07 au soir). Le reste est credential/review-gated (RESIDUAL-DEBT §ADR-0128).
- **Date** : 2026-07-12
- **Phase** : post-Phase 23 (dashboard cockpit — demande opérateur « connecter leurs réseaux eux-mêmes, comme Sprout Social »)
- **Depends on** : ADR-0021 (Credentials Vault), ADR-0060 (manual-first parity), ADR-0123 (vocabulaire client), ADR-0124 (spine d'émission), ADR-0126 (échelle déclarée)
- **Supersedes** : —

## Contexte

Demande opérateur (2026-07-12) : le tableau de bord résumé de marque du cockpit « fait plein de choses bien mais dans un layout qui oublie des choses » — le logo et les ressources de la marque n'apparaissent nulle part, la veille sectorielle (articles de presse spécialisée, mécanique type Feedly) n'est pas surfacée, et surtout **le founder n'a aucun moyen de connecter lui-même les réseaux sociaux de sa marque** (Google/YouTube, Facebook/Instagram, X, TikTok) pour que leurs données soient ventilées aux bons endroits du système — à la façon des suites social media (Sprout Social).

L'audit anti-doublon (Phase 2) a révélé que **toutes les briques existaient déjà, sans se parler** :

1. **`oauth-integrations`** (`src/server/services/oauth-integrations/`) — un flow OAuth Authorization-Code réel (state HMAC, tokens AES-256-GCM via `INTEGRATION_TOKEN_KEY`, routes `/api/integrations/oauth/[provider]/start|callback`) écrivant `IntegrationConnection` (operator-scoped)… **orphelin de toute UI**.
2. **`SocialConnection`** (Prisma, `strategyId + platform + accountId + tokens`) — LE modèle token-par-marque… **dormant : zéro écrivain en production** (seeds uniquement).
3. **`social-audit`** (`anubis/social-audit.ts`) + `FollowerSnapshot` + `RECORD_FOLLOWER_SNAPSHOT` — la collecte d'audience (Meta Graph, Apify, saisie manuelle) et sa ventilation vers le suivi communauté (`community-dashboard`, `getConnectedSources`)… **côté opérateur seulement**.
4. **`external-feeds`** (Seshat) — l'agrégation RSS réelle (Google News par pays × secteur) persistée en `KnowledgeEntry EXTERNAL_FEED_DIGEST`… **dont aucune UI ne listait les articles** (seule la fraîcheur remontait).
5. **`BrandAsset`** kinds `LOGO_FINAL` / `TYPOGRAPHY_SYSTEM` / `CHROMATIC_STRATEGY` — le coffre d'identité visuelle… **jamais affiché sur le dashboard**.

## Décision

**Réconcilier l'existant — zéro nouvelle roue, zéro nouveau modèle, zéro nouveau Neter (cap 7/7 préservé).**

### 1. Flow social founder = extension du flow OAuth existant

- `oauth-integrations` gagne 2 providers additifs (`x` avec PKCE S256 + token endpoint Basic ; `tiktok` avec `client_key` + scopes virgule) et des options de config par provider (`usePkce`, `clientIdParam`, `tokenAuth`, `scopeDelimiter`). Convention env inchangée : `<PROVIDER>_OAUTH_CLIENT_ID/SECRET` (5 fournisseurs documentés dans `.env.example`).
- La route `start` accepte `?social=1&strategyId=…` : ownership de la Strategy vérifié (founder propriétaire, ADMIN, ou user lié opérateur), scopes **lecture-audience uniquement** (`SOCIAL_SCOPES`, jamais de scope ads/écriture), state HMAC étendu (`intent:"social"`, `strategyId`, `userId`). Le verifier PKCE voyage en **cookie httpOnly** (jamais dans le state, visible dans l'URL).
- Le callback, en mode social : échange le code (+ échange long-lived Meta best-effort), **découvre les comptes** (`discoverSocialAccounts` — pages FB avec leur page-token, compte IG Business lié, chaîne YouTube, profil X/TikTok/LinkedIn), **chiffre les tokens AES-GCM**, puis émet l'Intent gouverné.

### 2. Cycle de vie gouverné — 3 nouveaux Intent kinds ANUBIS

| Kind | Voie | Effet |
|---|---|---|
| `ANUBIS_SOCIAL_CONNECT_ACCOUNT` | `emitIntentTyped` depuis le callback (dispatch Mestor → commandant → `anubis/social-connect.ts`) | upsert `SocialConnection` (status ACTIVE, unique `(strategyId, platform, accountId)`) + premier `FollowerSnapshot source=CONNECTOR` si le provider fournit un compteur |
| `ANUBIS_SOCIAL_DISCONNECT_ACCOUNT` | `governedProcedure` (`social.disconnectSocial`, founder-facing) | status DISCONNECTED + purge des tokens ; les snapshots historiques sont **conservés** (Loi 1) |
| `ANUBIS_SOCIAL_SYNC_FOLLOWERS` | `governedProcedure` (`social.syncSocial`) | refresh token transparent (google/x/tiktok) + fetch followers par plateforme + `FollowerSnapshot source=CONNECTOR` ; contract **P22-1** `ConnectorResult` (LIVE / DEGRADED AUTH_REVOKED·VENDOR_OUTAGE·INSUFFICIENT_DATA / DEFERRED) |

Anubis est le Neter de tutelle (il garde les credentials externes — ADR-0021 ; parité avec `ANUBIS_REGISTER_CREDENTIAL` et les kinds OAuth device-flow). **Primitives write/persistence pures → Intent direct sans Glory tool** (règle NEFER §3.1, documenté ici).

**Sécurité de l'émission** : le payload de `ANUBIS_SOCIAL_CONNECT_ACCOUNT` ne transporte QUE des tokens **déjà chiffrés** — l'`IntentEmission` hash-chaînée ne contient jamais un secret en clair (durcissement vs le précédent `ANUBIS_REGISTER_CREDENTIAL` qui passe la config brute).

### 3. Ventilation des données : les chemins existants, pas de nouveaux silos

Followers → `FollowerSnapshot` → déjà consommé par `community-dashboard` (« Audience par plateforme »), `getConnectedSources`, `followerTrends`. Aucun nouveau modèle. La synchronisation des **publications** (`SocialPost`, likes/commentaires/reach par post) est **hors périmètre v1** — elle exige les app-reviews avancées des plateformes (inscrite au RESIDUAL-DEBT).

### 4. Dashboard cockpit — 3 manques comblés (vocabulaire ADR-0123)

- **Identité** : la carte « Identité de marque » affiche le **logo du coffre** (`LOGO_FINAL` ACTIVE > récent > `LOGO_IDEA`, via `cockpitDashboard.getBrandIdentity`) + inventaire des actifs (logos/typos/palettes) + CTA « Ajouter votre logo » vers `/cockpit/brand/assets` quand il n'y en a pas.
- **« Mes réseaux »** (`SocialHubCard`) : 6 plateformes, états honnêtes — Connecté / à connecter / **« Bientôt disponible »** quand les env creds manquent (jamais un 500, jamais du jargon connecteur) / Reconnexion requise ; compteurs = derniers relevés réels (toutes provenances, étiquetés « relevé manuel » / « relevé auto ») ; actions Connecter (redirect OAuth), Actualiser l'audience, Déconnecter (ConfirmDialog DS).
- **« Veille & actualités »** (`MarketFeedCard`) : les **articles réels** du dernier digest (pays × secteur) — le schéma `ExternalFeedDigestDataSchema` gagne un champ additif `items[]` (max 12, mode RSS uniquement ; le fallback LLM n'invente jamais d'URLs de presse) surfacé par `cockpitDashboard.getMarketFeed`. Secteur/pays absents → EmptyState « complétez votre fiche » ; pas de digest → « collecte en préparation ».

### 5. Marque de test : seed Motion19 (sources publiques, doctrine INFERRED)

`prisma/seed-motion19.ts` + canon `motion19-canon.ts` : MOTION 19 SARL (boutique d'équipement audiovisuel, Akwa Douala, motion19.com) — ADVE complet pré-rempli par NEFER depuis les **sources publiques** (catalogue Shopify 373 produits/157 collections, réseaux publics, DataReportal 2026, RDAP), `validationStatus:"DRAFT"`, **tous les jugements stratégiques marqués `fieldCertainty INFERRED`** (l'opérateur valide → DECLARED), RTI dérivés cohérents + S recalculé (`computePillarS`), **zéro traction inventée** (compteurs non publiés = 0 + « non communiqué »), relevés d'audience publics observés (FollowerSnapshot MANUAL : FB 4 252 · IG 1 753 · TikTok 1 308), logo officiel (BrandAsset `LOGO_FINAL` ACTIVE, fileUrl CDN du site). `marketScale`/`addressableAudience`/`brandFoundedYear` **laissés NULL** — faits déclarés par le porteur (ADR-0126). Commande : `npm run db:seed:motion19`.

## Conséquences

- Le founder connecte ses comptes en 2 clics dès que l'opérateur a posé les env creds d'un provider ; sans creds, la ligne dit « Bientôt disponible » — dégradation honnête, pattern DEFERRED.
- `SocialConnection` cesse d'être dormant : premier écrivain de production (callback OAuth gouverné). `IntegrationConnection` reste le flow outbound opérateur (frontière intacte).
- 3 Intent kinds + SLOs au catalogue (`intent-kinds.ts`, `slos.ts`) ; payload typé + case commandant pour CONNECT ; kinds registre → 549 (recompte au commit).
- Tests : `tests/unit/services/social-connect.test.ts` (mapping plateforme↔provider, scopes lecture-seule, chiffrement aller-retour, découverte de comptes fetch-mocké, arms DEGRADED/DEFERRED honnêtes) + extension feed items. Surfaces UI sous le verrou `cockpit-vocabulary` existant (`src/components/cockpit` scanné).
- **Restes (RESIDUAL-DEBT)** : sync des publications `SocialPost` (app-review plateformes) ; compteurs LinkedIn organisation (produit Community Management requis) ; X free-tier limité au profil propre ; cron de sync périodique des connexions (aujourd'hui sync manuel founder / à l'occasion) ; UI console opérateur de supervision des connexions par marque.
