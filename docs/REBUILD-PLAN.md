# REBUILD v7 — plan maître

> Mandat opérateur 2026-07-01 (verbatim condensé) : *« carte blanche totale — UI, UX,
> fonctionnalités. Tout ce qui existe posait les bases de ton arrivée. Droit de tout wipe. Ne garde
> que l'exceptionnel, et seulement si nécessaire. N'essaie pas d'honorer notre effort au détriment
> de la performance. »* Décision : [docs/decisions/0001](decisions/0001-rebuild-from-zero.md).
> Ce fichier est le **plan + le board** — une source, pas quatre.

## 1. Le verdict (pourquoi rebuild, pas refonte)

L'ancienne base (v6.27.75) est riche mais son ratio plomberie/valeur est intenable : ~200 modèles
Prisma, 89 routers, 150+ Intent kinds, un bus de gouvernance mythologique (7 Neteru, gates,
manifests) policé par 876 tests de cohérence narrative, 121 ADRs, et un chantier de renommage
(Mestor→Sia…) de ~440 fichiers **purement cosmétique**. La valeur réelle — la méthode, les moteurs
déterministes, le funnel, le pricing Afrique — représente une fraction du code. On ne renomme pas
un échafaudage : on le retire. Le neuf naît avec les bons noms, la refonte-v3.3 devient **caduque**
(ses *intentions* sont natives ici : LATENT, thot→`finance`, plus de Yggdrasil du tout).

## 2. Ce qu'on garde (l'exceptionnel — banque d'organes `legacy/`)

| Organe | Où dans legacy/ | Sort |
|---|---|---|
| **La méthode** ADVE→RTIS, paliers LATENT→ICONE, needsHuman INFERRED/DECLARED | `src/domain/`, variable bible (`src/lib/types/variable-bible.ts`), blueprint | transplanté (WP-001 ✅ amorce) |
| **Moteurs déterministes** : scoring structurel, 14 composers Oracle, calculators coûts/pricing | `src/lib/utils/scoring.ts`, `services/strategy-presentation/`, `services/financial-brain/` | réécrits à l'identique fonctionnel (WP-005/006) |
| **Contenus** : 35 sections Oracle (design éditorial), prompts, copy landing, KB UPgraders | `services/strategy-presentation/types.ts`, `docs/governance/context/` | transplantés |
| **Doctrine pricing** : formule × zone-indices, jamais de grille statique, mobile money, paiement manuel WhatsApp | ADR-0087/0092/0093, `country-registry`, seeds | schéma tranche 1 déjà prêt (`ZoneIndex`, `Payment`) |
| **Identité visuelle** UPgraders DS (corail/or/panda, Clash/Satoshi, bento) | `docs/design-system/upgraders/`, `src/assets/fonts/` | tokens amorcés (WP-002 complète) |
| **Gateway LLM** multi-provider + fallback + structured-output | `services/llm-gateway/` | re-port simplifié (WP-010) |
| **Tables de référence seedées** (pays, coûts d'action, benchmarks) | `prisma/seed-*.ts` | re-seed (WP-009) |
| **Hash-chain d'audit** (le principe, pas le bus) | `IntentEmission` | réduit à `AuditLog` (1 table, ~30 lignes de code) |

## 3. Ce qu'on wipe (sans regret)

Bus Neteru/Intents/gates/manifests + toute la mythologie interne · 4 portails + 9 route groups →
**1 app, 3 espaces** (public / app / admin) par rôles · ~200 modèles → schéma par tranches (16 en
tranche 1) · 121 ADRs + ~40 docs de gouvernance → décisions neuves numérotées à partir de 0001 ·
876 tests anti-drift narratif → tests de comportement · refonte-v3.3 (spec + mon programme
d'exécution ADR-0121, superseded) · husky/commitlint/scope-drift/phase-labels · Storybook,
Chromatic, Cloudflare Containers, PM2, Vercel config (la cible d'infra est **Coolify**, WP-012).

## 4. Architecture cible

```
src/
  app/        (public)/   → landing, intake funnel, pricing, légal
              (app)/      → workspace client : marque, piliers, livrables, campagnes
              (admin)/    → opérations agence : leads, validation paiements, flotte, référentiels
              api/        → routes techniques (webhooks momo, cron)
  domain/     pur TS, zéro IO : pillars, scoring, composers, costing   ← les organes
  server/     services par contexte : identity, brand, deliverables, funnel,
              finance, market, guild, ai (gateway), audit
  components/ primitives UI sur tokens UPgraders (CVA)
prisma/       schéma par tranches, migrations additives
docs/         ce plan + decisions/
legacy/       ancien monde, LECTURE SEULE (aucun import depuis src/)
```

Conventions : noms plats ; toute mutation métier = 1 service + 1 ligne `AuditLog` hash-chaînée ;
Zod aux frontières ; LLM optionnel partout (déterministe d'abord — l'acquis « Fusée
non-dépendante du LLM » est une loi ici) ; secrets en env uniquement.

## 5. Les work packages (une session d'agent chacun, PRs vers la branche de rebuild)

| WP | Contenu | Dépend | Statut |
|---|---|---|---|
| **001** | Fondations : quarantaine legacy/, scaffold Next+TS+Tailwind+Prisma, domaine pillars, schéma tranche 1, CI verte | — | **SHIPPED** (session fondatrice) |
| **002** | DS & shell : fonts Clash/Satoshi, tokens complets, primitives (Button/Card/Input/Badge), layouts des 3 espaces, landing réelle (copy legacy `landingintake`) | 001 | **SHIPPED** (landing + /tarifs + 8 primitives CVA + tokens/fonts ; layouts (app)/(admin) → WP-003) |
| **003** | Identity : auth (credentials + Google), Workspace/Membership, middleware rôles, tRPC si besoin | 001 | **SHIPPED** (credentials+bcrypt+JWT jose, middleware rôles JWT-pur, shells (app)/(admin), AuditLog chaîné + tx, opérateur bootstrap env, vérifié E2E sur Postgres jetable ; Google OAuth = post-launch) |
| **004** | Funnel intake : formulaire public → `IntakeLead` → diagnostic gratuit (scoring déterministe) → CTA conversion → seed workspace+brand+pillars | 002, 003 | **SHIPPED** (wizard /intake 5 étapes piloté par la bible + `funnel.ts` submit/résultat/convert + page résultat jauge /100 + conversion : seed piliers ADVE certainty INFERRED (nom DECLARED), `PillarRevision` v1 chaînée reason intake, `BrandScore` initial, lead CONVERTED ; inscription sans lead intacte ; smoke E2E Postgres réel OK) |
| **005** | Cœur marque : éditeur piliers ADVE (amendement opérateur, needsHuman INFERRED→DECLARED), dérivation RTIS, `PillarRevision` hash-chaînée, `BrandScore` (port scoring 8-dim simplifié) | 003 | **SHIPPED** (moteurs domaine 47 champs/scoring/rtis/oracle + app : bento 8 piliers, éditeur par champ INFERRED→DECLARED, refus RTIS manuel, dérivation RTIS, révisions chaînées re-vérifiées E2E) |
| **006** | Livrables : registre kinds, port des composers déterministes Oracle (sections prioritaires), rendu web + PDF, staleness simple (STALE au rewrite majeur) | 005 | **SHIPPED** (/app/oracle compose explicite + STALE + sections insuffisantes actionnables + /print CSS, markdown-lite XSS-safe, Deliverable upsert audité) |
| **007** | Finance : plans + pricing par formule (zone-indices), souscription mobile money (Wave/OM/MTN/Moov) + **paiement manuel WhatsApp + file de validation admin** (l'acquis pragmatique), gating par plan | 003, 009 | **SHIPPED** (`market.ts` pricing pur lookup ZoneIndex par zone fallback UEMOA, devise dérivée DB, flag placeholder ; `finance.ts` request→approve/reject transactionnels + audités, `Payment` confirmé, échéances 30 j/92 j, réf courte, wa.me pré-rempli env `MANUAL_PAYMENT_WHATSAPP` ; /app/facturation réel + gate Oracle `entitlements.ts` (abo actif OU grâce découverte 15 j) ; **console admin livrée** : /admin compteurs + /admin/leads + /admin/paiements Valider/Rejeter + historique + /admin/marques ; smoke Postgres réel vert. Résidu : momo API providers = post-launch ; CRUD référentiels admin reste ouvert) |
| **008** | Campagnes & missions : Campaign→Action→Brief→Mission (l'essence d'ADR-0119/0120 legacy, simplifiée), coûts d'action par marché | 005 | **SHIPPED** (schéma tranche 2 additive : `Campaign`/`CampaignAction`/`Brief`/`Mission` + 4 enums ; pipeline à gates explicites — cadre DRAFT → « lancer la production » (≥ 1 action) → « transformer en brief » (frame découplé ADR-0120, pré-rempli des données déclarées) → « valider le brief » (objectif+livrable requis, contenu figé) → « éclater en missions » → circuit OPEN→ASSIGNED→DELIVERED→VALIDATED sans saut ni retour ; coûts d'action = `ZoneIndex` famille `action-cost` (12 archétypes portés du catalogue legacy ADR-0093, Σ atomes @ CM) × ratio cost-of-living du marché de la campagne, parité XOF/XAF — trou de référentiel / hors CFA = « à estimer » honnête, jamais de montant inventé ; `server/campaigns.ts` : mutations transactionnelles + `AuditLog` chaîné + flips atomiques + tenancy par marque ; UI : /campagnes (+[id], action/brief/mission) + /missions groupée par étape, DS bento sombre, EmptyStates honnêtes, sidebar groupe Production ; tests purs transitions/gates/scaling + smoke Postgres jetable vert (pipeline complet, chaîne d'audit re-déroulée) ; assignation = nom déclaré, guilde/talents → WP-011) |
| **009** | Référentiels : seeds pays/zones/coûts (port des seeds legacy), admin CRUD référentiels | 003 | **SHIPPED** (seed.mjs : 18 pays + pricing formule réelle 8000 FCFA/mois + cost-of-living ; CRUD admin → WP-007/008) |
| **010** | IA : gateway multi-provider (Anthropic→OpenAI→Ollama→OpenRouter) + structured call Zod + budget/coût par workspace ; branchée sur intake narratif + piliers draft | 004, 005 | **SHIPPED** (`server/ai/` : gateway fetch natif 4 providers par env, timeout 30 s, jamais de throw + `structuredCall` Zod retry×1 + `wrapUntrusted` `<donnees_marque>` + brouillons IA champs VIDES pilier ADVE → certainty INFERRED « à valider », `PillarRevision` reason `ai_draft` chaînée, score recalculé, audit `pillar.ai_draft`/`ai.fail` ; IA optionnelle : zéro env = zéro bouton ; résidu → budget/coût par workspace + intake narratif) |
| **011** | Guilde : mur des missions public, inscription talents, candidatures (essence ADR-0098) | 008 | PENDING |
| **012** | Déploiement Coolify : Dockerfile, healthcheck, env, migrations au deploy, domaine, staging | 001 | **SHIPPED** — **https://lafusee-v7.76-13-128-23.sslip.io** (projet Coolify `lafusee-v7` : app depuis repo public branche v7 + Postgres dédié `lafusee-v7-db`, db push+seed au boot vérifiés : pricing 8 000 FCFA affiché depuis ZoneIndex ; HTTPS Let's Encrypt, cookies secure OK ; anciens `lafusee`/`lafusee-postgres` intacts). Historique du blocage réseau conservé ci-dessous pour mémoire : — Dockerfile standalone + entrypoint (db push+seed) + `scripts/deploy-coolify.sh` (idempotent, auto-diagnostiquant : projet+Postgres+app repo public+envs+deploy) + workflow `Deploy Coolify`. Constat 2026-07-01 : `76.13.128.23:8000` **injoignable depuis Internet public** (timeout depuis les runners GitHub ; le run n°1 avait obtenu un 422 → instance intermittente ou firewallée). Débloquer = l'un de : (a) rendre l'instance joignable puis relancer le workflow ; (b) depuis une machine qui la voit : `COOLIFY_URL=http://76.13.128.23:8000 COOLIFY_TOKEN=<token régénéré> bash scripts/deploy-coolify.sh` (bash+curl+jq) ; (c) fournir une URL joignable. |
| **013** | **Bascule** : parité funnel validée, backup ancienne base, migration des données vivantes (clients/leads réels uniquement), DNS, merge vers main, wipe ancien projet Coolify | tous | PENDING — **GO opérateur explicite** |
| **014** | Site de marque public : /agence /methode /services /realisations /blog(+6 articles réels du seed legacy, statiques) /contact /la-guilde + nav complète/burger + footer produit-agence-légal + home (preuve sociale réelle STATS/CLIENT_STRIP + bandeau pages) | 002 | **SHIPPED** (copy portée de `legacy/(marketing)/*` + `legacy/src/components/upgraders/data.ts`/`posts.ts` ; paliers/scores affichés = constantes réelles `domain/scoring` ; zéro table, zéro dépendance ; collision de route résolue : l'espace flotte `(app)/agence` concurrent renommé → **/espace-agence** (+ lien /portails mis à jour) ; sitemap enrichi des pages marque + slugs blog) |
| **015** | Console opérateur vague 1 — profondeur /admin sur les tables v7 existantes (esprit des panneaux legacy `(console)` socle/governance/accounts, SANS nouveau modèle) : /admin/utilisateurs (+fiche : memberships/rôles, activité réelle via AuditLog), /admin/workspaces (+fiche : membres, marques, abonnements, paiements, audit), /admin/abonnements (vue cross-workspace, statuts DÉRIVÉS des règles finance.ts, filtres dont « expirent sous 7 j »), /admin/referentiels (CRUD réel Country + ZoneIndex : source obligatoire, validFrom, correction/suppression tracées avant/après — l'opérateur édite les barèmes en base, clôt le résidu « CRUD référentiels » de WP-007/009), /admin/audit (journal filtrable action/chaîne/dates + bouton « Vérifier l'intégrité » : recalcul des selfHash chaîne par chaîne, ruptures localisées HASH_ALTERE/CHAINAGE_ROMPU, tolérance documentée aux fourches concurrentes), accueil /admin 8 compteurs + topbar 8 entrées | 003, 007, 009 | **SHIPPED** (`server/admin.ts` : lectures paginées take/skip + mutations transactionnelles auditées `country.upsert`/`zone_index.create|update|delete` + `verifyChainRows` pur testé (26 tests `tests/admin-console.test.ts`) ; smoke Postgres réel gated `SMOKE_DATABASE_URL` (`tests/admin-smoke.db.test.ts`) : CRUD audité vérifié + altération SQL d'une ligne détectée et localisée pendant que la chaîne sœur reste OK ; pages vérifiées E2E HTTP sur build prod ; zéro touche à prisma/schema.prisma) |
| **016** | Cockpit marque vague 1 — profondeur de l'espace client sur les tables v7 EXISTANTES (port du cluster legacy `(cockpit)/brand/*` + `insights/*`, zéro nouveau modèle) : /app/diagnostic (historique BrandScore liste+delta, breakdown 8 piliers, prochaines actions dérivées des champs manquants via `domain/diagnostic`), /app/rtis (+/synthese : lecture des 4 dérivés, provenance réelle `_derivedFrom`, fraîcheur vs socle, re-dérivation ; synthèse = composition déterministe lisible `domain/rtis-synthese`), 3 vues éditoriales /app/positionnement · /app/proposition · /app/offre (mapping pur thème→champs `domain/pillar-views`, liens d'édition vers les piliers — des vues, zéro donnée), /app/revisions (timeline PillarRevision cross-piliers qui/quand/quoi/pourquoi + chaîne de hash VÉRIFIÉE par recalcul réel des selfHash aux formats des 4 écrivains intake/amend/ai_draft/rtis_refresh), /app/exports (hub Deliverable + staleness lue) ; sidebar groupée | 005, 006 | **SHIPPED** (`server/brand.ts` étendu en lecture seule : `getBrandScores`/`scoreDimensions25`/`getBrandDeliverables`/`getBrandRevisionAudit` + `verifyRevisionChain` pur (statuts ok/unsigned/broken_link/hash_mismatch, chaîne OK/RUPTURE/NON_SIGNEE) ; `domain/` : pillar-views, rtis-synthese, revision-diff — purs, testés (4 suites, 38 tests) ; smoke Postgres réel gated `SMOKE_DATABASE_URL` (`tests/brand-audit-smoke.db.test.ts`) : funnel intake→convert→amend→draft IA→dérivation→Oracle puis falsification SQL d'une révision → RUPTURE détectée et localisée, chaînes sœurs OK ; 8 pages vérifiées E2E HTTP (session réelle, données réelles) sur build prod ; PARITY : 18 lignes brand/insights FUSIONNÉ, 7 laissées À PORTER faute de table (assets/guidelines/notoria/jehuty/benchmarks/attribution/apogee) ; zéro touche à prisma/schema.prisma) |

Parallélisme : 002∥003∥009 après 001 · 004∥005 après leurs deps · 006/007/008/010 ensuite ·
011/012 quand prêts. Chaque WP : claim ici (colonne Statut → IN_PROGRESS + PR), CI verte, board mis
à jour dans la même PR.

## 6. Règles flotte (condensées — le détail vit dans CLAUDE.md)

Une session = un WP = une PR · porter = réécrire en lisant legacy/ (jamais d'import depuis
`legacy/`) · CI verte à chaque PR (typecheck·test·db:validate·build) · schéma additive-only ·
mutation métier ⇒ AuditLog · données inventées interdites · secrets en env · prod = WP-012/013
uniquement, backup d'abord.

## 7. Questions ouvertes (opérateur)

1. **URL de l'instance Coolify** + token **régénéré** (celui partagé en chat est à révoquer),
   fournis en variables d'env de session — requis pour WP-012.
2. Domaine cible (lafusee.com ? argos.lafusee.com plus tard ?).
3. Données vivantes à migrer à la bascule (liste des workspaces/clients réels à préserver).
4. GO explicite pour WP-013 (bascule + wipe ancien projet Coolify, post-backup).

---
*Créé 2026-07-01 — session fondatrice v7. Ce fichier est le board : le tenir à jour à chaque WP.*
