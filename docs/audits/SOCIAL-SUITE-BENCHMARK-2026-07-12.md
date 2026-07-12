# Benchmark suites sociales (Sprout Social · Zoho Social) × réalité des APIs 2026 — et plan d'upgrade La Fusée

- **Date** : 2026-07-12 · **Auteur** : NEFER (session PR #466)
- **Commande opérateur** : « Je ne vois toujours pas les connectivités et performances digne de Sprout Social. Tu as vérifié sur internet ce qu'ils font ? Et Zoho Social ? Fait un plan pour upgrade ton rendu. »
- **Méthode** : 5 recherches indépendantes sur sources officielles (sproutsocial.com + help center, zoho.com/social + help.zoho.com, developers.facebook.com, docs.x.com, developers.tiktok.com, learn.microsoft.com/linkedin, developers.google.com), toutes fetchées 2026-07-12. Les briefs complets sourcés (chaque claim + URL) sont archivés dans la session ; ce document est la synthèse actionnable.
- **Périmètre La Fusée concerné** : hub réseaux du cockpit (ADR-0128), FollowerSnapshot, veille (Seshat external-feeds), `anubis/social-connect`, `oauth-integrations`, intake empreinte digitale (ADR-0121).

---

## 1. Ce que font réellement les deux références

### 1.1 Sprout Social (le « digne de » demandé)

| Module | Contenu réel 2026 | Gate de plan |
|---|---|---|
| **Connexions** | 13 réseaux + review sites (X, FB, IG Business only, LinkedIn Pages+profils, TikTok, YouTube brand, Pinterest, Bluesky, Threads, WhatsApp, Reddit 03/2026, Snapchat Public Profile 06/2026, Trustpilot) ; OAuth **par le client, profil par profil** (admin de la Page requis) | 5 profils (Essentials/Standard $79-249), illimité dès Professional $299-399/siège/mois |
| **Publishing** | Compose multi-réseaux avec personnalisation par réseau, file « Sprout Queue » (10 posts/j/profil), **ViralPost/Optimal Send Times** (heures optimales calculées sur ~16 semaines d'engagement), calendrier List/Week/Month partageable PDF, bulk CSV 350 posts, First Comment IG, approbations multi-étapes + approbateurs externes | OST tous plans ; bulk/asset library/tags Pro+ ; approbations externes Advanced $399-499 |
| **Smart Inbox** | Flux unifié tous réseaux (comments, DMs, mentions, reviews, **dark comments** des ads), détection de collision de réponse, cases + routing, règles d'automatisation (auto-tag, sentiment, spam), chatbots FB/IG/X/WhatsApp, Guardian (masquage PII) | Inbox dès Standard ; rules/sentiment/chatbots **Advanced uniquement** |
| **Analytics** | Rapports par profil + cross-network (impressions/engagements/clics), comparaisons de périodes, **rapports concurrents FB/IG/X**, envoi PDF programmé, My Reports builder (add-on Premium Analytics), API + Tableau (Advanced) | Concurrents Pro+ ; scheduled delivery/BI/API Advanced |
| **Listening** | Add-on (~$999+/mois, non publié) : X, Reddit, Bluesky, web/news, TikTok brand hashtags ; share of voice, sentiment | Add-on dès Standard |
| **IA** | AI Assist (génération de posts, alt text, traductions, résumés), agent « Trellis » 2026 | Échelonné par plan |

**Prix** : $79 → $499 par **siège**/mois + profils extra + add-ons. Positionnement mid-market/enterprise US.

### 1.2 Zoho Social (le chasseur de coûts)

| Module | Contenu réel 2026 | Gate |
|---|---|---|
| **Connexions** | 14 canaux par Brand (un de chaque type) : FB Page, X, IG Business, LinkedIn perso+Page, GBP, YouTube, Pinterest, TikTok, Mastodon, Threads, Bluesky + WhatsApp/Telegram **en inbox seulement** | Free 6 canaux ; payants 11-14 |
| **Publishing** | SmartQ (créneaux prédits, ≥7 j de données), CustomQ, calendrier drag-drop, bulk 350 CSV/XLSX, repeat posts, pause/resume de file, first comment IG/FB/LinkedIn/YT, posts GBP Event/Offer/CTA | SmartQ Premium+ ; CustomQ Pro+ |
| **Monitor** | Colonnes d'écoute (keywords, mentions, hashtags, reviews, X Lists) + Live Stream temps réel | 5-15 colonnes selon plan |
| **Inbox** | Unifié (comments/DMs/reviews/dark comments + WhatsApp/Telegram), round-robin, règles d'assignation, saved replies, Reply with Zia | **Premium+ seulement** |
| **Écosystème** | Push auto Leads vers Zoho CRM, tickets Zoho Desk, Canva, cloud pickers | Premium+ |
| **Prix** | **$10-15/mois** (Standard) → $40-65 (Premium) par **Brand** ; Agency 10 marques $230-320 ; membres 1→5 inclus | — |

**Leçon structurante** : les deux produits gardent la **connexion OAuth par le client** (jamais de credentials partagés), vendent **l'inbox unifié et les règles comme le premium** (c'est LE moat), et calculent les **heures optimales** à partir des données d'engagement du compte — pas d'un référentiel statique.

---

## 2. Réalité des APIs plateformes pour un SaaS indépendant (juillet 2026)

Ce que Sprout/Zoho paient en partenariats, un SaaS sans partenariat l'obtient ainsi :

| Plateforme | Stats du compte (a) | Publier (b) | Inbox (c) | Gate réel |
|---|---|---|---|---|
| **Meta (FB Page + IG Business)** | Page Insights + IG insights (views/reach/follows — `impressions` dépréciée 2025-2026) | `POST /feed` avec **scheduling natif** (10 min-30 j), Reels, IG container flow **100 posts/24 h** | Comments/mentions/DMs + **webhooks** (IG comments = Advanced Access) | **Standard Access = 0 review** pour les comptes ayant un rôle sur l'app (test Motion19 immédiat) ; clients arbitraires = App Review + **Business Verification** + Access Verification (trio une fois, ~1 sem de review, gratuit) |
| **Threads** | insights complets | 250 posts/24 h | replies + webhooks | Testers sans review ; public = App Review |
| **YouTube** | Analytics API OAuth (views, watch time, subs gained) — self-serve | `videos.insert` **100 uploads/j** (réforme quota 06/2026) mais **privé forcé tant que l'audit gratuit n'est pas passé** | commentaires (lecture 1 unit, réponse 50 units) | Verification Google scope *sensitive* (pas de CASA) + audit YouTube gratuit |
| **Google Business Profile** | Performance API (impressions, calls, clicks) | posts What's New/Event/Offer + réponses aux **reviews** | Q&A API | **Formulaire gratuit unique** ; il faut un profil GBP vérifié depuis 60 j (le nôtre ou celui d'un client) → 300 QPM |
| **X** | Pay-Per-Use : **owned reads $0.001/ressource** | **$0.015/post** ($0.20 si URL) | mentions + DMs, métrés | Aucune review — **argent seulement**. Plus aucun plan gratuit |
| **TikTok** | Display API `user.info.stats` (followers/likes) après review standard | Content Posting : **SELF_ONLY (privé) tant que l'audit n'est pas passé**, puis ~15 posts/créateur/j | commentaires **hors plateforme normale** (Business API à part, incertain) | Review app (jours→2 sem) puis audit contenu |
| **LinkedIn** | Community Management : stats Pages complètes ; analytics membre incertain | Posts Pages + membre (`w_member_social` self-serve 150/j) | mentions org ; DMs impossibles | CM = **vetting société légale** (email pro, page vérifiée) ; dev tier 500 req/j suffit pour démarrer, upgrade sous 12 mois |
| **Bluesky / Mastodon** | tout | tout | tout | **Zéro review, zéro clé** (app passwords / register app) |
| **WhatsApp Cloud API** | — | templates + messages service | inbox 24 h fenêtre | Self-serve **sans BSP**, paiement au message ; 250→2 000 contacts/j après vérification business |

**Trois conclusions d'architecture** :
1. **Le trio Meta (App Review + Business Verification + Access Verification) est LE seul chantier administratif qui débloque des clients arbitraires** sur FB/IG/Threads — une fois, au niveau UPgraders, gratuit. En attendant : chaque marque testée (Motion19) fonctionne **dès aujourd'hui** en ajoutant son compte comme testeur de l'app Meta.
2. **X est devenu un coût variable pur** : synchroniser les followers d'une marque coûte ~$0.001/lecture ; publier $0.015. Facturable au client via Thot (ADR-0093 atomized costing) — aucun partenariat requis.
3. **Bluesky/Mastodon/WhatsApp sont les fruits mûrs** : zéro gate, et WhatsApp est LE canal dominant du marché camerounais — différenciateur vs Sprout/Zoho qui le traitent en canal secondaire d'inbox.

---

## 3. Où en est La Fusée après PR #466

**Déjà posé (cette PR)** : OAuth founder self-service 5 providers (Meta/Google/X/TikTok/LinkedIn, PKCE, tokens AES-256-GCM, Intents gouvernés ANUBIS_SOCIAL_*), découverte des comptes (Pages FB + IG business + chaîne YT + X + TikTok + LinkedIn), `SocialConnection` + `FollowerSnapshot(source=CONNECTOR)`, hub « Mes réseaux » 6 plateformes avec états honnêtes (`DEFERRED_AWAITING_CREDENTIALS` → « Bientôt disponible »), veille RSS Seshat sur le dashboard, identité de marque (logo/palette/typo du coffre) + theming cockpit aux couleurs de la marque (ADR-0130), accès délégué par marque (ADR-0129, testé E2E avec Maximus/Motion19).

**Écart restant vs Sprout/Zoho** (l'objet du plan) : pas encore de **métriques par post**, pas d'**inbox**, pas de **publishing direct**, pas d'**heures optimales**, pas de **rapports concurrents**, pas de **reviews GBP**.

---

## 4. Le plan d'upgrade (vagues S1→S5, dans l'ordre de déblocage réel)

> Chaque vague est shippable seule, chaque item porte son gate. Pattern constant : provider façade `ConnectorResult<T>` (P22-1), Credentials Vault/env (ADR-0021/0075), Intents gouvernés Anubis, états honnêtes — jamais de zéro fabriqué.

### Vague S1 — « Digne de Sprout » en lecture (gate : clés app + comptes testeurs, 0 review)
1. **Métriques par post FB/IG/Threads** : nouvelle table `SocialPostMetric` (postId, platform, views, reach, likes, comments, shares, saves, fetchedAt) alimentée par un poller Anubis (BUC ~48k appels/j/compte IG — largement assez) ; carte « Performance des posts » dans le hub + page `/cockpit/intelligence/social`. *Dépend : app Meta en mode dev + Motion19 testeur — état actuel suffisant.*
2. **YouTube Analytics** (views/watch-time/subs gained) via scope `yt-analytics.readonly` déjà prévu dans SOCIAL_SCOPES — même table, même carte. *Dépend : verification Google sensitive (formulaire, gratuit).*
3. **Historique followers → sparklines réelles** : le dashboard trace `FollowerSnapshot` (déjà en base) par plateforme, badge Δ7j/Δ30j. *Aucun gate.*
4. **Sync programmé** : Routine quotidienne `ANUBIS_SYNC_FOLLOWERS` pour toutes les connexions ACTIVE (aujourd'hui : bouton manuel). *Aucun gate.*

### Vague S2 — Publier depuis le cockpit (gate : mêmes clés ; review Meta pour ouvrir aux clients)
5. **Publishing FB Page + IG** : Intent `ANUBIS_PUBLISH_SOCIAL_POST` (kind nouveau, governor ANUBIS) + composer sur le calendrier éditorial existant (`BrandAction` porte déjà sélection/timing — on ajoute `publishTarget` + statut) ; scheduling **natif FB** (10 min-30 j) et fenêtre IG 100/24 h ; approbation founder→collaborateur via `StrategyCollaborator` (ADR-0129 — l'équivalent des workflows Sprout Advanced, déjà dans notre modèle). 
6. **Bluesky + Mastodon** : mêmes Intents, zéro clé plateforme (app password/registration à la volée) — victoire rapide pour les marques média.
7. **GBP posts + réponses reviews** : formulaire d'accès GBP (gratuit) déposé avec le profil Motion19 (vérifié >60 j) ; posts Event/Offer + **reviews dans le hub** (le canal de réputation n°1 d'un commerce de Douala).

### Vague S3 — Inbox unifié (le moat que Sprout vend $399+/siège)
8. **Webhooks Meta** (feed/comments/mentions/messages) → `SocialInboxItem` (modèle nouveau) → surface `/cockpit/operate/inbox` : flux unifié, assignation au DIGITAL_DIRECTOR (ADR-0129), statut traité/à traiter, réponse in-app (FB/IG/Threads). IG comments webhooks exigent Advanced Access → dépend du trio Meta. En attendant : polling comments (Standard Access, testeurs).
9. **Saved replies + règles simples** (auto-tag par mot-clé, langue) — réutiliser Artemis pour suggérer la réponse (LLM optionnel, manual-first ADR-0060).
10. **WhatsApp Cloud API** : inbox fenêtre 24 h + templates ; **c'est le différenciateur Afrique** (Sprout le facture en add-on, Zoho en Premium). Paiement au message → refacturable via Thot.

### Vague S4 — Intelligence (heures optimales, concurrents)
11. **Heures optimales** : calcul Seshat sur nos `SocialPostMetric` accumulées (≥7 j de données comme SmartQ) → suggestion dans l'auto-planification du calendrier (`autoSchedule` existant). Déterministe, zéro LLM.
12. **Rapports concurrents** : X owned-reads hors-périmètre (comptes tiers = $0.005-0.010/lecture — coût à métrer), IG business discovery (FB-Login path) pour métadonnées publiques de concurrents ; borne honnête : Sprout/Zoho n'ont plus accès à grand-chose non plus (X a coupé la géoloc, Meta a fermé les Groups).
13. **X en option payante par marque** : activer owned-reads + publishing PPU derrière un flag de facturation Thot (coût réel ~1-3 $/mois/marque en lecture quotidienne + $0.015/post).

### Vague S5 — Échelle (quand des clients hors-testeurs arrivent)
14. **Trio Meta** (App Review + Business Verification UPgraders + Access Verification) — le SEUL passage obligé pour onboarder des marques sans rôle sur l'app. Préparer : captures vidéo des flows (le hub existe déjà), privacy policy, justification par permission.
15. **Audit TikTok Content Posting** (sinon posts privés) + **vetting LinkedIn Community Management** (société légale UPgraders — dev tier 500 req/j suffit pour ~20 marques en lecture quotidienne).
16. **Audit YouTube** (lever le private-lock sur les uploads si on publie de la vidéo).

### Réutilisation intake (la question « ça peut aussi servir pour l'intake non ? » — oui)
L'empreinte digitale de l'intake (ADR-0121 : Brave discovery + compteurs Apify best-effort) et le hub partagent désormais le même sol : quand un prospect **connecte** un compte pendant l'intake (mêmes routes OAuth, scopes read-only), l'audit gagne des **compteurs exacts + insights privés** au lieu d'estimations scrapées — et la connexion survit à la conversion (elle est déjà `SocialConnection` de la Strategy shell). Chantier : bouton « Connecter pour un audit précis » sur l'interstitiel intake → réutilise `/api/integrations/oauth/[provider]/start?intent=social` tel quel. À inscrire en S2.

---

## 5. Positionnement (pour mémoire commerciale)

- Sprout vend le **siège** ($79-499/mois), Zoho vend la **Brand** ($10-65/mois). La Fusée vend un **OS de marque** dont le social est un organe — le pricing reste capture-then-grow FCFA (blueprint §pricing) ; la suite sociale est un argument de rétention du COCKPIT_MONTHLY, pas un SKU séparé.
- Notre avantage structurel n'est pas la parité de features : c'est que les données sociales **irriguent l'ADVE→RTIS** (E-pilier, superfans, Overton) au lieu de mourir dans un dashboard. Aucun des deux concurrents ne relie l'inbox à une doctrine de marque.
- Différenciateurs Afrique à prioriser : WhatsApp (S3), GBP reviews (S2), coûts X refacturés au réel via Thot (S4), mobile money déjà en place.
