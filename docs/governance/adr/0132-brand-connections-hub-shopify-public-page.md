# ADR-0132 — Le cockpit ramène tout : hub Connexions, boutique Shopify par marque, page publique de marque

- **Status** : Accepted
- **Date** : 2026-07-12
- **Phase** : train P1→P6 validé (mandat opérateur — « on crée un cockpit qui ramène tout, c'est l'utilisateur qui autorise » · « Motion19 a une boutique Shopify… corrige ça aussi » · « crée ma page Xtincell via xtincell.powerupgraders.com »)
- **Depends on** : ADR-0128 (réseaux founder OAuth), ADR-0129/0131 (accès délégué + zones), ADR-0021 (Credentials Vault), ADR-0124 (spine)
- **Supersedes** : —

## Contexte

Les réseaux sociaux se connectent par la marque (ADR-0128) mais la boutique Shopify de Motion19 restait un catalogue scrapé, la carte « Ventes & commandes » un état vide, et il n'existait ni surface unique d'autorisation ni présence publique par marque. Doctrine posée par l'opérateur : **le cockpit agrège tous les environnements de la marque ; c'est l'utilisateur qui autorise, jamais l'agence qui détient**.

## Décision

1. **Provider `shopify`** dans `oauth-integrations` : endpoints PAR BOUTIQUE (`{shop}` résolu depuis un domaine `*.myshopify.com` STRICTEMENT validé — `isValidShopDomain`), scopes lecture seule `read_products,read_orders`, token offline. Branche `?commerce=1&strategyId=…&shop=…` sur start/callback (state signé porte le shop ; env `SHOPIFY_OAUTH_CLIENT_ID/SECRET`).
2. **Anti-doublon** : la connexion vit dans le modèle générique DORMANT `MediaPlatformConnection` (premier écrivain de production — zéro migration) ; les agrégats de ventes dans `Signal type=COMMERCE_METRICS`. Service `anubis/commerce-connect.ts` : connexion via Intent gouverné `ANUBIS_COMMERCE_CONNECT_SHOP` (token **chiffré AES-GCM avant l'émission**), sync `ANUBIS_SYNC_COMMERCE` (commandes 7 j, CA, top produits — P22-1), router `commerce` (status zéro-secret / sync / disconnect). **Non délégable** (DENY firewall ADR-0131 — la boutique n'est pas une zone du SOCIAL_MANAGER).
3. **Hub « Connexions »** `/cockpit/settings/connections` (nav Mon compte, i18n ×3) : réseaux (carte ADR-0128) + boutique (input domaine → OAuth, états honnêtes, ConfirmDialog) + « À venir » — l'onglet unique où le porteur autorise et révoque. La carte « Ventes & commandes » du Suivi du jour lit le dernier relevé réel.
4. **Page publique de marque** : colonne additive `Strategy.publicSlug @unique` (migration `20260712200000`) + route `/b/[slug]` (server component, **données publiques uniquement** : nom, logo ACTIVE du coffre, accroche/positionnement, réseaux avec compteurs — jamais un contact privé ni un secret) + réécriture proxy `<slug>.powerupgraders.com → /b/<slug>` (hôtes techniques www/lafuseev6 épargnés, slug validé). Seeds : `motion19` + `xtincell` (marque PERSONAL embryonnaire du porteur, créée quand son compte existe — skip honnête sinon).
5. **Cron** `social-sync` étendu : audience + publications + ventes, y compris les marques boutique-seule.

## Conséquences

- Motion19 : boutique connectable en OAuth depuis Connexions → commandes/CA/top produits réels sur le Suivi du jour ; page publique `motion19.powerupgraders.com` vivante (vérifiée localement).
- Xtincell : page `xtincell.powerupgraders.com` dès le seed prod (compte Google existant) ; les OAuth du porteur se font dans l'onglet Connexions de SA marque.
- **Gates ops** : DNS wildcard `*.powerupgraders.com` + domaines ajoutés dans Coolify ; app Shopify (Partner dashboard) → env `SHOPIFY_OAUTH_CLIENT_ID/SECRET` + redirect `<BASE>/api/integrations/oauth/shopify/callback`.
- Tests : `commerce-brand-page.test.ts` (7 verrous — kinds+SLO, non-délégable, validation domaine, chiffrement pré-émission, proxy, publicSlug/page sans privé, cron union).
- Restes (RESIDUAL-DEBT) : écriture boutique (gestion produits) = décision dédiée ; page publique enrichie (galerie créations, CTA contact) = Personal Brand Cockpit ; GBP/WhatsApp dans Connexions = P2/P3.
