# CAHIER DES CHARGES — LA FUSÉE v2

**Rebuild ground-level dans un repo neuf. Ce document est la spécification de référence.**

| | |
|---|---|
| Produit | **La Fusée** — Industry OS de stratégie de marque, édité par **UPgraders** |
| Version visée | v2 (from scratch — aucun code v1 réutilisé) |
| Source de ce cahier | Audit code du repo v1 (`xtincell/ADVE-project`, v6.27.43, 2026-07-05) : intention produit + fonctionnalités **réellement développées**, vérifiées dans le code. La documentation v1 (120 ADRs, blueprints, roadmaps) n'a **pas** autorité — seul ce qui existait et fonctionnait a été retenu. |
| Autorité | En cas de conflit avec toute autre source (docs v1, dump v1, souvenirs), **ce cahier prime**. En cas de trou dans le cahier : choisir l'option la plus simple alignée avec §1 et §12, et le noter au journal de build. |
| Compagnon | `REVAMP-PROMPT.md` — le prompt d'exécution qui s'appuie sur ce cahier. |

---

## 1. Vision & intention

**Mission** : La Fusée transforme des marques en icônes culturelles, en industrialisant l'accumulation de **superfans** qui font basculer la fenêtre d'**Overton** de leur secteur — via la méthode **ADVE/RTIS**.

- **Marché** : industrie créative d'Afrique francophone (UEMOA + CEMAC + diaspora). Langue produit : **français d'abord**. Monnaie première : **FCFA** (XOF/XAF, parité fixe 655,957 FCFA/€). Paiement roi : **mobile money**, pas la carte bancaire.
- **Identité commerciale** : **UPgraders** (la société, l'agence-fixer qui vend) > **La Fusée** (le produit : l'OS que les clients utilisent) > **Argos** (sous-marque éditoriale/média, secondaire). Devise : *« De la poussière à l'étoile »*.
- **Posture économique — capture-then-grow** : capter les marques à fort potentiel et faible pouvoir d'achat, grandir avec elles. Prix localisés par zone économique, jamais de grille figée en dur dans le code.
- **Ce que le client achète** : un diagnostic de marque scoré (gratuit), un rapport approfondi (one-shot payant), puis un cockpit de pilotage continu de sa marque (abonnement), adossé à un réseau de talents (La Guilde) opéré par UPgraders.
- **Vocabulaire client = business, en français.** Les éventuels noms internes techniques ou mythologiques ne doivent **jamais** apparaître dans l'UI client, les PDF, les emails ou le marketing (v1 utilisait un panthéon égyptien en interne : c'est toléré en interne, interdit en façade).

## 2. Utilisateurs & rôles

| Rôle | Qui | Surface principale |
|---|---|---|
| **Visiteur** | prospect anonyme | Funnel public (landing, intake, pricing, La Guilde, pages légales) |
| **Founder** (client marque) | dirigeant/CMO d'une marque | **Cockpit** |
| **Operator** (UPgraders) | consultant/admin interne | **Console** (jamais vendue) |
| **Talent** (freelance/créatif) | prestataire du réseau | **Espace Creator** + La Guilde |
| **Agency** (agence partenaire) | agence comm/média/évent | **Espace Agency** |

- Rôles techniques v2 recommandés : `ADMIN`, `OPERATOR`, `FOUNDER`, `TALENT`, `AGENCY`, `USER` (v1 en avait 11 — resserrer ; prévoir multi-rôles par utilisateur).
- **God-mode** : liste d'emails toujours élevés ADMIN + bypass de tous les gates payants, définie par variable d'env `GOD_MODE_EMAILS` avec défauts : `xtincell@gmail.com`, `alexandre@upgraders.com`, `x-tincell@hotmail.fr`, `nefer@upgraders.io`.
- **Multi-tenant** : toute donnée métier est rattachée à un opérateur (tenant). Toute requête est scoppée tenant par défaut (v1 : proxy Prisma scoppé — reprendre le principe, en simple).

## 3. Le cœur métier — méthode ADVE/RTIS

### 3.1 Les 4 piliers ADVE (fondateurs, saisis/amendés par l'humain)

| Pilier | Question | Exemples de champs |
|---|---|---|
| **A — Authenticité** | Qui est vraiment cette marque ? | histoire, archétype, noyau identitaire, valeurs |
| **D — Distinction** | Pourquoi est-elle irremplaçable ? | positionnement, promesse maître, personas, territoire |
| **V — Valeur** | Quelle valeur cardinale délivre-t-elle ? | offre/catalogue, business model, preuves, prix |
| **E — Engagement** | Comment l'audience franchit-elle le seuil ? | canaux, rituels, communauté, parcours d'engagement |

Règles :
- L'ADVE est le **socle** : tout artefact produit (score, Oracle, brief, calendrier, livrable) doit remonter à un pilier ADVE.
- **Écriture ADVE = action humaine explicite** (founder ou operator). Jamais d'écriture automatique par cascade ou par LLM. Modes d'amendement : édition directe / reformulation assistée LLM / réécriture stratégique assistée — toujours avec preview + validation humaine.
- **Certitude par champ** : `DECLARED` (saisi par l'humain) / `INFERRED` (pré-rempli par l'IA, badgé « à valider ») / `OFFICIAL` (validé). 7 champs sont non-inférables par nature et exigent validation humaine : archétype, noyau identitaire, positionnement, promesse maître, personas, catalogue produits, business model.
- **Point d'écriture unique** : une seule fonction du code a le droit d'écrire le contenu d'un pilier (validation + version + rescoring + propagation de staleness). Toute autre écriture est un bug.

### 3.2 Les 4 piliers RTIS (dérivés, jamais édités à la main)

| Pilier | Rôle |
|---|---|
| **R — Risque** | menaces/faiblesses dérivées de l'ADVE (SWOT interne) |
| **T — Track** | lecture marché & signaux externes (SWOT externe, tendances) |
| **I — Innovation** | catalogue d'actions candidates |
| **S — Stratégie** | synthèse exécutable (plan d'activation) |

- Cascade unidirectionnelle **A→D→V→E→R→T→I→S** : le RTIS se **recalcule** (bouton « rafraîchir », par pilier ou en chaîne), il ne s'édite pas.
- Tout amendement ADVE marque les RTIS et livrables dépendants **stale** (péremption propagée, visible dans l'UI).

### 3.3 Scoring — 100 % déterministe

- Chaque pilier est scoré sur la **complétude/qualité structurelle** de ses champs (pondérations fixes, zéro LLM). Score composite **/200** → palier de marque :

| Palier | Bornes /200 |
|---|---|
| LATENT | ≤ 40 |
| FRAGILE | ≤ 80 |
| ORDINAIRE | ≤ 120 |
| FORTE | ≤ 160 |
| CULTE | ≤ 180 |
| **ICONE** | > 180 |

- Le score et le palier sont recalculés à chaque écriture de pilier et historisés (snapshots). **Aucun LLM dans le chemin de scoring** (leçon v1, verrouillée par test).

### 3.4 Concepts de mesure d'audience

- **Devotion Ladder** (6 échelons, du passif au militant) : `SPECTATEUR → INTERESSE → PARTICIPANT → ENGAGE → AMBASSADEUR → EVANGELISTE`. Les deux derniers échelons constituent les **superfans**.
- **Cult Index** : score de masse culturelle de la marque, historisé (snapshots), alimenté par les données réelles disponibles (profils superfans, signaux presse) — jamais fabriqué.
- **Fenêtre d'Overton sectorielle** : position culturelle du secteur ; v2 la traite en **heuristique honnête** (voir §8), pas en ML.

### 3.5 Doctrines transverses (héritées du v1, à conserver — elles ont fait leurs preuves)

1. **Honest-empty** : un trou de données s'affiche comme état vide/dégradé explicite (`EmptyState`, `DEFERRED`, `INSUFFISANT`), **jamais** comblé par des valeurs inventées ou des mocks silencieux.
2. **Manual-first** : toute action réalisable par LLM a son équivalent manuel dans l'UI (formulaire), et le LLM passe par les **mêmes endpoints** que l'humain.
3. **LLM optionnel au runtime** : sans aucune clé LLM configurée, l'application reste 100 % fonctionnelle sur tout le périmètre déterministe (intake, scoring, Oracle sections déterministes, PDF, paiements, guilde…). Le LLM enrichit, il ne conditionne pas.
4. **Dégradation par provider** : tout connecteur externe sans credentials répond par un état structuré `DEFERRED_AWAITING_CREDENTIALS` — le code ship sans clés, n'échoue jamais en silence, ne simule jamais un succès.

## 4. Parcours & surfaces

### 4.1 Funnel public (priorité n°1 — c'est le moteur commercial)

```
Landing → Intake guidé (sans compte, token) → Résultat scoré (web)
   → Paywall (PDF complet / Oracle) → Paiement → Activation compte + Cockpit
```

- **Landing** (`/`) : proposition de valeur La Fusée by UPgraders, section méthode ADVE, score animé, témoignages, CTA unique vers l'intake. Pages marketing satellites : méthode, services, agence, réalisations, tarifs, blog (léger), contact.
- **Intake** : questionnaire guidé (marque, secteur, pays, business model, canaux…) accessible par **token** sans création de compte ; pré-remplissage LLM optionnel depuis texte libre. Produit une ébauche ADVE + score.
- **Page résultat** : score /200 + palier, aperçu partiel des piliers (2 valeurs par pilier), 1 pilier RTIS en teaser, **paywall** pour le rapport complet ; version imprimable.
- **Paywall / one-shots** : `INTAKE_PDF` (rapport PDF léger) et `ORACLE_FULL` (rapport complet). Prix localisés par pays/zone. Comptes god-mode et montants nuls : bypass propre.
- **Activation** : création de compte + wizard de création de la marque (contexte business) → arrivée dans le Cockpit.
- **Pages légales** obligatoires (opposables B2B, contenu FR à transposer du v1) : CGU, CGV, SLA, DPA, mentions légales, confidentialité, trust-center, statut.
- **Pricing** (`/pricing` + `/tarifs`) : grille dérivée dynamiquement de la config (jamais codée en dur), affichage FCFA d'abord.

### 4.2 Cockpit (portail founder — le produit vendu)

- **Dashboard** : état de la marque (score, palier, fraîcheur des piliers), prochaines actions, activité.
- **Ma marque** : édition ADVE champ par champ (avec badges de certitude, champs « à valider », historique de versions), lecture RTIS + boutons de refresh, sources de la marque.
- **Livrables** : génération et vault d'assets de marque (voir §5) ; forge d'un livrable cible avec ses prérequis.
- **Opérations** : calendrier/roadmap d'actions, suivi de campagnes (léger), demandes à l'opérateur, missions liées à ma marque.
- **Intelligence** (gated abonnement) : communauté/superfans (Devotion Ladder, évolution), radar Overton sectoriel — avec états honnêtes quand la donnée manque.
- **Réglages** : profil, abonnement/facturation, notifications.

### 4.3 Console (portail operator UPgraders — jamais vendu)

- **Comptes & accès** : utilisateurs, rôles, god-mode, MFA.
- **Portefeuille marques** : toutes les stratégies clientes, diagnostics, ingestion/intake en cours, édition ADVE côté opérateur.
- **Argent** : abonnements (dont **file de validation des paiements manuels WhatsApp**), factures, commissions, escrow/litiges (arbitrage manuel), grille tarifaire & config providers de paiement, relevés MCP.
- **Credentials Vault** : connecteurs externes par opérateur (email, push, mobile money, réseaux…) — CRUD des clés en base chiffrée ; les secrets **système** (Stripe, DB) restent en env.
- **Guilde & talents** : modération des missions déposées, annuaire talents, matching, candidatures, QC.
- **Contenu & comms** : templates de notifications/emails, envois, digest, blog.
- **Config** : pays/zones & indices de prix, seuils, templates, feature flags.
- **Audit** : journal des actions sensibles (qui a fait quoi quand — voir §11.2).

### 4.4 La Guilde (marketplace public de missions — réel et différenciant en v1)

- **Mur public des missions** (sans données de contact), fiches mission par slug, stats.
- **Dépôt de mission par une marque** (formulaire public → création d'un client/marque « shell » côté opérateur + mission en attente de modération). Assist LLM optionnel : pré-remplir le brief depuis un texte libre, sans rien persister avant validation humaine.
- **Inscription talents** (freelance) et **agences** — voie d'entrée canonique des profils talents.
- **Modération opérateur** : publier/rejeter ; **candidatures** des talents sur missions ouvertes ; l'opérateur décide (pas de premier-arrivé-premier-servi).
- Parcours talent : profil/compétences/portfolio, missions disponibles/actives, devis structurés, earnings, progression par tier talent : `APPRENTI → COMPAGNON → MAITRE → ASSOCIE` (commissions dégressives par tier — taux en config).

### 4.5 Espaces Creator & Agency (v2 : volontairement minces)

- **Creator** : profil, missions (disponibles/candidatures/actives), devis, earnings. Le reste (académie, QC pair, communauté) = v2.1.
- **Agency** : liste de ses marques clientes avec score ADVE moyen, missions, commissions. Le reste = v2.1.

### 4.6 Argos (vitrine média) — v2.1, hors périmètre initial

Mur public de dossiers de référence de campagnes (harvest éditorial). Ne pas construire en v2.0 ; réserver la route.

## 5. Livrables générés

### 5.1 L'Oracle — rapport de stratégie 35 sections (le livrable phare)

Généré depuis les piliers, en 3 tiers. **Sections 01–21 : composition 100 % déterministe** (mapping direct des données piliers — aucune invention : « le rapport ne dit que ce que la marque a déclaré »). **22–35 : enrichissement LLM optionnel**, avec fallback déterministe honnête.

| # | Section | Tier |
|---|---|---|
| 01 | Executive Summary | CORE |
| 02 | Contexte & Défi | CORE |
| 03 | Plateforme Stratégique | CORE |
| 04 | Proposition de Valeur | CORE |
| 05 | Territoire Créatif | CORE |
| 06 | Expérience & Engagement | CORE |
| 07 | SWOT Interne (Risque) | CORE |
| 08 | SWOT Externe (Track) | CORE |
| 09 | Signaux & Opportunités | CORE |
| 10 | Catalogue d'Actions | CORE |
| 11 | Plan d'Activation | CORE |
| 12 | Fenêtre d'Overton | CORE |
| 13 | Médias & Distribution | CORE |
| 14 | Production & Livrables | CORE |
| 15 | Profil Superfan | CORE |
| 16 | KPIs & Mesure | CORE |
| 17 | Croissance & Évolution | CORE |
| 18 | Budget | CORE |
| 19 | Timeline & Gouvernance | CORE |
| 20 | Équipe | CORE |
| 21 | Conditions & Prochaines Étapes | CORE |
| 22 | Programme Équipe/Crew | CORE |
| 23 | Plan de Communication | CORE |
| 24 | McKinsey 7S | BIG4 |
| 25 | BCG Growth-Share Matrix | BIG4 |
| 26 | Bain Net Promoter System | BIG4 |
| 27 | Deloitte Greenhouse (Talent) | BIG4 |
| 28 | McKinsey Three Horizons | BIG4 |
| 29 | BCG Strategy Palette | BIG4 |
| 30 | Deloitte Budget Framework | BIG4 |
| 31 | Cult Index — masse culturelle | DISTINCTIVE |
| 32 | Matrice d'engagement (4 modes) | DISTINCTIVE |
| 33 | Devotion Ladder — hiérarchie superfans | DISTINCTIVE |
| 34 | Position fenêtre culturelle | DISTINCTIVE |
| 35 | Signaux faibles sectoriels | DISTINCTIVE |

- **PDF** : une **seule** pile de génération PDF, sans dépendance Chromium (v1 avait jsPDF **et** Puppeteer — n'en garder qu'une, la plus légère). Snapshot horodaté + hash à chaque export.
- Statut par section (`PENDING/GENERATING/COMPLETE/FAILED/STALE`) + régénération unitaire.

### 5.2 Assets de marque (vault)

- Un modèle unique d'asset avec `kind` typé — kinds v1 à reprendre : `BIG_IDEA`, `CREATIVE_BRIEF`, `MANIFESTO`, `CLAIM`, `POSITIONING`, `PERSONA`, `NAMING`, `KV_*` (key visuals), `LOGO_*`, `SCRIPT`, `LONG_COPY`, `PITCH`, `BRAND_BIBLE`, `INTAKE_REPORT`, etc.
- Lifecycle simple : `DRAFT → ACTIVE → SUPERSEDED/ARCHIVED` + péremption `staleAt` quand l'ADVE bouge.
- Génération : outils de composition **déterministes d'abord** (templates + données piliers), LLM en amélioration optionnelle. v1 avait 139 « tools » — v2 en reconstruit **le strict nécessaire par kind réellement exposé dans l'UI**, sous une interface unique (entrée typée → sortie validée Zod).

## 6. Paiements & économie

### 6.1 Rails de paiement (tous réels en v1, à reconstruire)

| Rail | Usage | Notes |
|---|---|---|
| **Stripe** | cartes, abonnements récurrents + one-shots | test mode en dev ; webhooks signés |
| **Mobile money : Wave, MTN MoMo, Orange Money** | encaissements + payouts talents | clients HTTP réels ; sans clés → `DEFERRED` explicite ; **jamais** de paiement marqué payé sans transfert confirmé |
| **CinetPay / PayPal** | alternatifs par pays | routing provider par pays |
| **Manuel WhatsApp** | marché local sans CB | crée un abonnement `pending_manual` (n'ouvre **aucun** droit) + lien `wa.me` (numéro via env `MANUAL_PAYMENT_WHATSAPP_NUMBER`) → file de validation Console → activation 30 jours |
| Mock | dev/tests uniquement | interdit en production, échec bruyant |

- **Webhooks** : endpoints dédiés par provider, vérification HMAC/signature sur corps brut, idempotents.

### 6.2 Offres & gates

- Tiers : `INTAKE_FREE`, one-shots `INTAKE_PDF` / `ORACLE_FULL`, récurrents `COCKPIT_MONTHLY`, `RETAINER_BASE`, `RETAINER_PRO`, `RETAINER_ENTERPRISE`.
- **Gate payant** : les fonctions premium (intelligence, forge avancée, MCP…) vérifient un abonnement `active|trialing` sur les tiers récurrents ; refus **structuré** (`TIER_GATE_DENIED` + upgrade path), jamais une exception brute. One-shots exclus des gates. God-mode bypass.
- **Prix localisés** : grille par pays/zone (donnée de config seedée, modifiable en Console), FCFA d'abord, fallback par proximité économique. Ordres de grandeur v1 (indicatifs, Dakar/Abidjan) : intake 0 ; PDF 5–25k ; cockpit 15–75k/mois selon palier ; retainers 200k–1M+ ; enterprise sur devis.
- **Commissions talents** : moteur par tier talent (taux en config, dégressifs APPRENTI→ASSOCIE), relevés visibles Console + Creator.
- **Escrow/litiges** : v2.0 = suivi + **arbitrage manuel opérateur** (pas d'escrow automatisé).
- **API MCP facturable** : clés API hashées (affichées une fois), comptage d'appels, relevés gelés, règlement via les rails ci-dessus. C'est un différenciateur réel du v1 à conserver (en un seul endpoint MCP consolidé).

## 7. Notifications & communications

- **In-app temps réel** : flux SSE (un seul endpoint), heartbeat, reprise `?since=`. Contrat **mono-instance assumé et documenté** (pas de Redis/pubsub en v2.0 ; concevoir l'interface du broker pour pouvoir en brancher un plus tard).
- **Push web** : VAPID (clés via env/vault), opt-in par utilisateur.
- **Email transactionnel** : cascade de providers (Resend → Mailgun → SendGrid) selon clés présentes, templates typés, `DEFERRED` sans clé.
- **Digest** : récap hebdo founder des notifications non lues (email).
- **Crons** : de simples endpoints HTTP `/api/cron/*` protégés par `CRON_SECRET` (fail-closed en prod), déclenchés par n'importe quel scheduler externe (GitHub Actions, cron système…). **Aucun scheduler in-process.**
- **Hors périmètre v2.0** : broadcast publicitaire (Meta/Google/X/TikTok) et SMS — en v1 ce sont des façades non câblées ; ne pas les reconstruire (au plus, réserver l'interface connecteur).

## 8. Intelligence & télémétrie (v2.0 : heuristique honnête)

- **Snapshots** : score, Cult Index, répartition Devotion Ladder, followers — historisés par marque.
- **Feeds externes réels** : indicateurs macro (API World Bank publique), presse sectorielle (RSS Google News) → signaux marché du pilier T. Sources payantes (Nielsen/Statista…) : non intégrées, états vides honnêtes.
- **Radar Overton & attribution superfans** : v2.0 livre la **version paramétrique/heuristique** avec états `DEGRADED/INSUFFICIENT_DATA` par axe. Pas de régression ML, pas d'embeddings en v2.0 (le v1 les gardait d'ailleurs derrière une validation humaine de calibration).
- **Journal des coûts LLM** : chaque appel LLM loggé (provider, modèle, tokens, coût, but, marque) + budget par opérateur.

## 9. LLM — règles d'intégration

- **Gateway unique multi-provider** avec fallback : Anthropic → OpenAI → Ollama (local) → OpenRouter — clés via env, sélection par variable (`LLM_PRIMARY_PROVIDER`…). Aucune clé nulle part ⇒ tout le déterministe fonctionne (cf. §3.5.3).
- **Sorties structurées** : tout appel LLM produisant des données passe par un schéma Zod + retry-on-fail ; pas de coercition silencieuse.
- Usages LLM du produit (tous optionnels) : pré-remplissage intake, reformulation ADVE assistée, enrichissement Oracle 22–35, rédaction de briefs/assets, brouillon de mission Guilde. Chacun a son équivalent manuel (§3.5.2).

## 10. Identité visuelle & UX

- **Design system UPgraders** (identité réelle du v1, à transposer) : panda noir/bone, **corail `#E56458`**, or `#FACC15` ; typos **Clash Display** (display), **Satoshi** (texte), **JetBrains Mono** (données) ; rayons « du cube au cercle » (6→36 px) ; texture géométrique discrète.
- **Assets binaires à récupérer tels quels du repo v1** (seul emprunt direct autorisé — ce sont des données, pas du code) : `public/brand/**` (logos, photos, illustrations) et `src/assets/fonts/**`.
- Tokens CSS **simples à 2 niveaux** (référence → sémantique). Pas de bureaucratie de tokens (v1 : 4 tiers + 3 interdits + tests CI — surdimensionné) ; la discipline v2 : composants n'utilisent que des tokens sémantiques, variantes via CVA.
- **Responsive mobile réel** (le funnel se consomme au téléphone en Afrique de l'Ouest — c'est un requirement, pas un nice-to-have), dark/light, a11y de base (focus, contrastes, alt).
- Empty-states soignés partout (cf. honest-empty). FR par défaut ; structure i18n simple prête pour EN.

## 11. Exigences non fonctionnelles

### 11.1 Portabilité — LE CONTRAT (le déploiement lui-même est hors sujet)

Le projet doit tourner sur **n'importe quel hôte capable d'exécuter Node.js 22 LTS + PostgreSQL ≥ 16**. Concrètement :

1. **Config 100 % par variables d'environnement** — `.env.example` exhaustif et commenté ; zéro secret en dur ; zéro URL de vendor en fallback (la base URL publique vient de l'env).
2. **Build pur** : `build` ne migre pas, ne seed pas, ne touche pas au réseau. Migrations et seeds = commandes explicites (`db:migrate`, `db:seed`) exécutables sur toute cible (+ entrypoint Docker optionnel qui les enchaîne).
3. **Aucune API/SDK propre à un hébergeur** (pas de `@vercel/*`, pas d'edge runtime, pas de Workers, pas de supabase-js — Postgres = simple `DATABASE_URL`). Runtime Node partout.
4. **Artefacts fournis** : `output: standalone` + `Dockerfile` multi-stage + config pm2. Un seul Node partout (22) — CI comprise.
5. **État in-process assumé** : SSE, caches et rate-limits vivent en mémoire d'une instance unique ; ce contrat mono-nœud est documenté ; les interfaces permettent un adaptateur externe futur sans le construire maintenant.
6. **Stockage fichiers** : abstrait derrière une variable (`BLOB_STORAGE_PUT_URL_TEMPLATE` façon v1) avec fallback local/base64 — aucun SDK S3/vendor imposé. PDF générés à la volée, jamais stockés obligatoirement.
7. Reverse proxy, TLS, scheduler externe, plateforme (Coolify/VPS/autre) : **hors périmètre du code**. Seule concession : documenter en une page les prérequis runtime (SSE sans buffering, taille de body, `CRON_SECRET`).

### 11.2 Sécurité

- Auth : NextAuth v5 (ou équivalent actuel) — credentials bcrypt toujours actif, **Google OAuth conditionnel** (uniquement si `GOOGLE_CLIENT_ID/SECRET` présents), sessions JWT, **MFA TOTP obligatoire pour ADMIN** dès enrôlement.
- Webhooks signés (HMAC, corps brut), idempotence.
- Journal d'audit **simple** sur les mutations sensibles : paiements/validations manuelles, modération Guilde, amendements de piliers, changements de rôles (qui/quoi/quand/avant-après). Une table, pas une religion.
- Scoping tenant par défaut (cf. §2) ; RGPD : export/suppression de compte basiques ; pas de PII dans les logs.

### 11.3 Qualité & tests

- TypeScript strict ; lint ; **tests unitaires sur le domaine** (scoring, cascade staleness, gates de paiement, mappers Oracle) ; **E2E Playwright sur les parcours d'argent** : funnel complet, amendement ADVE→refresh RTIS→export PDF, dépôt mission Guilde→modération→candidature, abonnement manuel→validation→gate ouvert.
- Pas de « tests de doctrine » (v1 : 83 tests anti-drift de gouvernance) — les tests v2 vérifient des comportements utilisateur et des invariants métier, pas des conventions.

### 11.4 Données & seeds

- Seeds idempotents : compte **admin god-mode**, **canon UPgraders + La Fusée** (les deux marques de démonstration avec ADVE complet — contenu textuel à transposer du v1 : dump `prisma/seed-upgraders.ts`, `*-canon.ts`), pays/zones + grille tarifaire, jeu de démo (marque exemple + missions Guilde) pour que chaque écran ait une donnée réaliste dès l'installation.
- Décision données de production v1 : **aucune reprise automatique**. Si des données réelles doivent survivre, c'est une opération manuelle ultérieure décidée par l'opérateur (le build n'en dépend pas).

## 12. Anti-patterns v1 — les erreurs d'ingénierie à ne PAS réimporter

Le v1 fonctionne mais s'est enseveli sous sa propre gouvernance. Chiffres mesurés : **~282 000 LOC**, **202 modèles Prisma**, **546 « intent kinds »**, **112 routers tRPC (~1 000 procédures)**, **115 services**, **139 outils de génération**, **253 pages**, **120 ADRs**, CHANGELOG de 882 Ko, CLAUDE.md de 68 Ko. Le produit réel décrit dans ce cahier n'exige qu'une fraction de tout cela.

| # | Erreur v1 | Principe v2 |
|---|---|---|
| 1 | **Méta-gouvernance comme produit** : bus d'intents (546 kinds), hash-chain, gates, manifests, protocole opérateur 8 phases — plus de code pour gouverner le code que pour servir l'utilisateur | Un journal d'audit simple sur les mutations sensibles (§11.2). Le reste : des fonctions et des tests. |
| 2 | **Régime documentaire auto-référentiel** : 120 ADRs, « 7 sources de vérité » à synchroniser, tests CI qui vérifient la doctrine | Un README, ce cahier, un CHANGELOG court. La vérité = le code + les tests de comportement. |
| 3 | **Mythologie comme architecture** : services nommés par des dieux (opacité pour tout nouveau venu) | Nommage par domaine métier (`billing`, `oracle`, `guild`, `scoring`…). |
| 4 | **Explosion du modèle** : 202 tables, ~300 variables de piliers, 139 tools dont une minorité réellement exposée | Modéliser ce que l'UI lit/écrit. Une table sans surface réelle ne naît pas. |
| 5 | **Doubles implémentations** : 2 piles PDF (jsPDF + Puppeteer/Chromium), ancien et nouveau moteur Oracle en cohabitation, shims dépréciés | Une seule implémentation par capacité. Remplacer = supprimer. |
| 6 | **Features fantômes** : paramètres définis jamais consommés (matrice de manipulation branchée sur 0/139 tools), façades broadcast jamais câblées | Une feature n'existe que si un parcours utilisateur l'exerce. Sinon : hors périmètre, pas de scaffolding. |
| 7 | **Couplage build/plateforme** : migrations DB dans la commande de build Vercel, artefacts Cloudflare orphelins, URLs vendor en fallback | Contrat de portabilité §11.1. |
| 8 | **Pyramide de tests inversée** : ~2 000 tests unitaires (surtout doctrinaux), zéro test DOM/composant, E2E rouge depuis des semaines | §11.3 : tests de domaine + E2E des parcours d'argent, tous verts, tout le temps. |

**Les bonnes idées v1 à conserver** (déjà intégrées dans ce cahier) : point d'écriture unique des piliers ; scoring déterministe ; honest-empty ; manual-first ; LLM optionnel + gateway fallback + coûts journalisés ; credentials vault par opérateur / secrets système en env ; `DEFERRED_AWAITING_CREDENTIALS` ; scoping tenant ; grille de prix localisée en données ; god-mode par env.

## 13. Périmètre v2.0 — IN / OUT

**IN (ordre de construction recommandé)** :
1. Socle : auth + rôles + god-mode + tenant scoping + design tokens + layout + seeds.
2. Funnel public complet (landing → intake → résultat → paywall → activation) + pages légales + pricing.
3. Méthode : ADVE (édition + certitude + versions) → scoring/paliers → RTIS refresh → staleness.
4. Oracle : 21 sections déterministes + PDF + snapshots (+ 22–35 en enrichissement LLM optionnel).
5. Paiements : Stripe + manuel WhatsApp + file de validation + gates + grille localisée (mobile money : clients réels, `DEFERRED` sans clés).
6. Console : comptes, portefeuille marques, argent, vault credentials, config, audit.
7. La Guilde : mur + dépôt + inscription + modération + candidatures + devis.
8. Notifications : SSE in-app + email transactionnel + digest + crons HTTP.
9. Cockpit intelligence (heuristique honnête) + vault d'assets/forge de base.
10. Creator/Agency minces + MCP facturable.

**OUT v2.0 (explicitement)** : broadcast publicitaire réel, SMS, Argos, académie/QC pair/communauté creator, arbre de marque multi-niveaux FMCG (une hiérarchie parent-enfant simple suffit), escrow automatisé, embeddings/ML d'attribution, multi-pod/Redis, app mobile, GraphQL, tout ce qui n'apparaît pas dans ce cahier.

**Règle d'arbitrage** : dans le doute sur une capacité v1 partielle → construire la version la plus simple qui préserve le parcours utilisateur observable, noter la décision au journal. Ne jamais élargir le périmètre pour « faire comme le v1 ».

## 14. Budgets de sobriété (indicatifs — dépassement possible mais justifié par écrit)

- Modèles de données : **≤ 60 tables**. Routes/procédures API : **≤ 200**. Services/modules serveur : **≤ 25**.
- Dépendances : chaque dep lourde (Chromium, ORM secondaire, lib de queue…) doit être défendue en une phrase.
- Une seule pile PDF, un seul moteur Oracle, un seul endpoint SSE, un seul endpoint MCP.
- Zéro dossier `legacy/`, zéro code mort, zéro `@deprecated` à la livraison.

## 15. Glossaire minimal

**ADVE/RTIS** : les 8 piliers (§3). **Palier** : maturité de marque LATENT→ICONE (§3.3). **Superfan** : échelons AMBASSADEUR/EVANGELISTE de la Devotion Ladder. **Overton** : axe culturel sectoriel que la marque cherche à déplacer. **Oracle** : rapport 35 sections (§5.1). **La Guilde** : marketplace public de missions (§4.4). **Cockpit/Console** : portail client / portail opérateur. **Tenant/Operator** : l'entité UPgraders (ou agence fille) qui opère des marques. **Honest-empty / Manual-first / DEFERRED** : doctrines §3.5.
