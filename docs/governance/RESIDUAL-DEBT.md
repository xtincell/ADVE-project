# RESIDUAL DEBT — inventaire honnête des résidus

## Audit adversarial « TOUT » 2026-07-22 (PR #612) — déférés bornés

Items MEDIUM à régression-risquée ou à coordination, déférés de la boucle de fix (le reste est shippé — cf. CHANGELOG v6.27.252→) :

- **F5 — tier-gate par-marque** : `checkPaidTier(operatorId)` (`glory-tools/tier-gate.ts`) ignore `Subscription.strategyId` → un `COCKPIT_MONTHLY` débloque les N marques d'un même user (l'intention est par-marque sauf `RETAINER_ENTERPRISE` ≤5). **Fermeture** : ajouter `strategyId?` à `checkPaidTier`, scoper les tiers mono-marque quand `sub.strategyId` est posé (rétro-compat : subs `strategyId=null` restent operator-wide), mettre à jour les callers (`cockpit-router.ts:165,246`). **Déclencheur** : passe billing dédiée (change l'entitlement de payeurs LIVE → design délibéré + classification tiers mono/multi requis avant).
- **B1 — Q3 non-bypass réellement enforcé** — 🟢 **VÉRIFICATEUR BÂTI** (v6.27.265) : `governed-active-no-new-bypass.test.ts` (HARD) remplace la tautologie du grep — pour CHAQUE routeur `governed-active`, il compte les `.mutation()` NI `governedProcedure` NI `auditedProcedure` NI porteuses d'un `emitIntent*`/`openEmission`, et **gèle ce compte par un baseline décroissant** (78 au 2026-07-22, exact-match) : aucune mutation non gouvernée ne peut PLUS être ajoutée en silence (compte > baseline → merge cassé). **Reste** (dette tracée dans le baseline, catégorisée EXEMPT vs PENDING) : migrer les vraies mutations métier PENDING vers `governedProcedure` — surtout **`campaign-manager` (18)**, **`notoria` (12)**, **`pillar` (10)** = chantier dédié « migration Neteru cœur » (trop risqué en une passe — ces routeurs sont les plus sollicités) ; petits routeurs (`client`, `crm-contacts`, `strategy.validateSynthesis`, `social`, `market-cost`, `mission-applications`, `monetization`) par lots. Le flip du lint `no-direct-service-from-router` à `error` reste secondaire (mécanique distincte — imports de service directs, pas les mutations ; le test HARD est désormais le garde-fou Q3 canonique). **Déclencheur** : chantier « migration governedProcedure des 3 routeurs Neteru cœur ».
- **B2 — mutations directes non gouvernées** — 🟢 **actions GOUVERNÉES** (v6.27.264) : `actions.setSelected`/`setTiming`/`autoSchedule` (décision opérateur — `setTiming`/`autoSchedule` arment le CRON social) passent désormais par `emitIntent(SET_BRAND_ACTION_STATUS)` (kind câblé union/commandant/handler `artemis/action-db/set-status`, garde de zone calendrier ADR-0131 conservée au routeur, mirror de `propose`). **Reclassé documenté-exempt (rationale valide)** : `brand-mcp.createKey/revokeKey` (**credential infra** ADR-0145, `canAccessStrategy`-gardé, header `lafusee:governed-active`) + `mcp-billing.*` (**adminProcedure** billing infra, relevés gelés + `paymentRef` = audit propre) — ce ne sont pas des mutations d'entité de marque au sens doctrine ; les auditer via `auditedProcedure` régresserait les collaborateurs (veto firewall sur kind LEGACY hors-zone) pour un gain marginal (déjà access-gardés + auto-audités). Décision de ne PAS sur-gouverner une infra documentée (anti « innovation pour l'innovation »).
- **T2 — DS interdit #2 sans enforcement** : `design-tokens-canonical` est gardé par `DESIGN_STRICT` (jamais posé) → vacant ; pas de regex hex ; le lint `lafusee/design-token-only` n'est pas dans `eslint.config.mjs`. **Fermeture** : dé-garder le test (assert `[]` toujours) + regex hex + étendre le `walk` à `src/app` ; OU activer le lint `error`. **Risque** : révélera les `text-white`/violet/zinc existants (dont J4) → coordonner avec la passe DS. **Déclencheur** : passe DS mode-jour (avec J4).
- **G — moteur de restauration réel (Compensate)** — 🟢 **ROLLBACK_PILLAR BÂTI** ([ADR-0176](adr/0176-real-rollback-pillar-compensation.md), v6.27.262) : `PillarVersion.intentId` + handler `pillar-gateway/rollback.ts` (restaure le contenu pré-écriture via le gateway, C5 ; refus honnête sans instantané lié) + câblage union/commandant/compensate. La Loi 1 a des dents pour les écritures pilier gouvernées. **Restants (audit-only honnête, plan)** : `ROLLBACK_ADVE` (multi-piliers A/D/V/E — annuler un FILL_ADVE = restaurer 4 piliers, chacun via son instantané `intentId`) · `ROLLBACK_RTIS_CASCADE` (effacer R/T/I/S — dérivés, régénérables) · `DISCARD/REVERT_RECOMMENDATIONS` (état reco, pas pilier). **Fermeture** : même patron que ROLLBACK_PILLAR, un handler par kind. **Déclencheur** : quand un besoin réel de compenser un FILL_ADVE/cascade apparaît (faible fréquence, admin-gated).
- **`pillar.rollbackVersion` — restauration opérateur non gouvernée** *(trouvé à l'audit G, 2026-07-22)* : la mutation `operatorProcedure` `pillar.rollbackVersion` (restaure vers une `versionId` choisie) appelle `pillarVersioning.rollback` qui **bare-write `Pillar.content`** (C5-allowlisté) SANS émission (Q1/Q2 absents) ni scoring gateway (juste `propagateFromPillar` manuel). **Fermeture** : router la restauration via un chemin gateway (comme `rollbackPillar`) + émettre → ferme l'entrée allowlist C5 ET le trou d'émission. **Déclencheur** : rattaché au chantier **B2** (gouverner les mutations directes).
- **J4 — `text-white` en mode jour** (~303 occurrences dans `cockpit/operate/*`) : `text-white` (raw, n'inverse pas) sur des fonds `bg-background` (qui deviennent clairs en `[data-theme="light"]`) → texte blanc illisible en mode jour. **Fermeture** : remplacer par `text-foreground` UNIQUEMENT sur les fonds theme-inversants (garder `text-white` sur les fonds accent/coloré fixe — jugement par occurrence, pas de sweep aveugle) + étendre le walk de `design-tokens-canonical` à `src/app` avec détection `text-white`/hex. **Déclencheur** : passe DS mode-jour dédiée (T2 test-hardening). Cas confirmé `operate/tracker/page.tsx:175`.
- **E5 — armes `z.unknown()` des `S.computed`** (`pillar-schemas.ts:1447+`) : `budgetByPhase`/`devotionFunnel` acceptent tout objet/array → gate SHAPE neutralisé pour ces champs. **Fermeture** : resserrer vers les formes concrètes de `computePillarS` **en coordination avec le seed spawt** (qui portait des formes divergentes — risque de re-casser le seed sinon). **Déclencheur** : passe seed spawt / computePillarS.
- **Sweep des émissions PENDING orphelines (LOW)** *(round-13c, note honnêteté — commentaires corrigés v6.27.296)* : `closeEmission` + le `close()` best-effort de `emitIntent` promettaient « le cron staleness la flaggera » — ce sweep n'existe PAS. Si `closeEmission` throw (blip DB à l'update) ou si le process meurt entre `openEmission` et `closeEmission`, la row `IntentEmission` reste `PENDING`/`PENDING_OBSERVATION` à vie, non réconciliée. **Intégrité PAS en jeu** (fail-closed : la mutation a commit ou non, jamais à moitié) — pur trou d'observabilité ; commentaires rendus honnêtes. **Plan** : un sweep dans `ops-sweep` passant en terminal (état `STALE`/`ABANDONED`, **PAS `FAILED`** → éviter le fan-out de compensation) les `IntentEmission` non-terminales dont `emittedAt` dépasse un plafond GÉNÉREUX (≫ tous les SLO, ex. 1 h). **Prudence obligatoire** : ne pas fail-closer une émission `async:true` légitimement encore en vol (threader le SLO du kind, ou plafond fixe très large). **Effort** : ~½ session (design état-terminal + test anti-faux-positif). **Déclencheur** : prochaine passe observabilité gouvernance / si des PENDING orphelines s'accumulent en prod.

> Ce registre est **transitoire** (NEFER §3.4, interdit absolu n°4) — pas un cimetière. Toute ligne
> porte un **plan de résolution + un déclencheur de reprise**. `nefer-boot` (Phase 0.2.bis) et
> `nefer-postmerge` (9.5.bis) le relisent et referment le refermable ; le diagnostic de fond le purge.
> Les fixes en passant, eux, sont journalisés dans [`PATCHED-SYMPTOMS.md`](PATCHED-SYMPTOMS.md).
>
> **Restructuré le 2026-07-20** (mandat opérateur « gère le tout ») : lignes closes purgées vers
> l'archive compressée en pied de fichier, actions opérateur consolidées, lignes STALE réconciliées
> avec l'état réel du code. L'historique détaillé vit dans CHANGELOG.md et les ADRs — pas ici.

---

## ✅ Purge du 2026-07-20 — ce qui a été fermé par la session « gère le tout »

- **Gardes d'ownership `strategyId` (51→56 routeurs)** — CLOS ([ADR-0166](adr/0166-strategy-ownership-guard-routers.md)) :
  middleware canonique `strategyScopedProcedure` + `assertRawStrategyScope` + `accessibleStrategyIds`,
  85 procédures / 30 routeurs basculées, gardes inline (payment, messaging, brand-node ×10 dont
  `resolveEffectivePillars`/`searchContext`, glory ×11, jehuty.dashboard, cockpit-router.dashboard,
  campaign-manager ×2, social ×4, strategy ×3), flips `operatorProcedure` (error-vault, knowledge-graph),
  verrou CI HARD `strategy-ownership-guard.test.ts` (allowlist 3 entrées justifiées, décroissante).
- **Routeur LLM Sonnet 4 → Sonnet 5 (côté code)** — CLOS : défauts gateway + routeurs + seed swappés
  `claude-sonnet-5` + gardes de parité (thinking disabled explicite, température strippée — Sonnet 5
  pense par défaut et rejette une température non-défaut). Reste l'action ops table `ModelPolicy` (§ ci-dessous).
- **Cascade `/data-deletion` PersonIdentifier (ADR-0147)** — CLOS : purge RGPD gouvernée
  `SESHAT_PURGE_PERSON_DATA` (requireOperator, transactionnelle : identifiants PII + tombstones
  fusionnés supprimés, profils de mesure dé-rattachés) + `identity.purgePersonData`.
- **Writers `Client.sector` (ADR-0152)** — CLOS : canonicalisation à l'écriture via
  `classifyCanonicalSector` sur laguilde (dépôt guilde), brief-ingest brand-resolver, client.create/update.
- **Contrat writeback→renderer §33 Devotion Ladder** — CLOS (borné honnête) : `normalizeSectionPayload`
  au persist mappe le QUALITATIF du tool (déclencheurs par palier) vers la forme composer ; la
  distribution CHIFFRÉE du LLM n'est JAMAIS mappée (cf. § Décisions de refus).
- **Surfaçage `entityGate.filtered` page résultat intake (ADR-0162)** — CLOS : bloc « Filtrage des
  homonymes » (mentions écartées, mode de tri, repères) + i18n fr/en/zh.
- **Accents hors funnel (surfaces listées)** — CLOS : sweep déterministe (notoria, pillar-page,
  pipeline-progress, mestor/recos, skill-tree, agency/intake + 12 occurrences attrapées par la garde)
  + **garde structurelle anti-sans-accents** ajoutée au test HARD `cockpit-vocabulary` (5ᵉ test).
- **FK durable `BrandAction.missionId` (ADR-0144)** — CLOS : champ additif nullable + FK
  `ON DELETE SET NULL` + backfill depuis `metadata.missionKey` (migration `20260720120000`) ;
  read `missionId ?? metadata.missionKey` ; seed double-write.
- **Rate limiting MCP outbound (Phase 16)** — CLOS : token bucket par serveur dans `anubis/mcp-client.ts`.
- **Digest cron (Phase 16)** — CLOS côté code : route `/api/cron/anubis-digest` (DAILY/WEEKLY,
  CRON_SECRET). Reste l'entrée scheduler côté ops (§ ci-dessous).
- **Garde-fou contraste theming (ADR-0130)** — CLOS : luminance WCAG dans `BrandAccentVars`,
  fallback corail si accent illisible sur fond sombre.
- **locale OG dynamique** — fermé en borné : `alternateLocale` en_US/zh_CN déclarées (le plein
  dynamique est refusé — cf. § Décisions de refus).
- **Réconciliations STALE** (lignes contredites par des ships antérieurs, purgées ce jour) :
  C8 Seshat→T clos (PR #442, `loadMarketDigestForT` + `enforceSeshatProvenance`) · T7
  `devotionTransitionsObserved` clos ([ADR-0135](adr/0135-devotion-transition-attribution.md)) ·
  ratification θ ancres/items close ([ADR-0150](adr/0150-scoreur-canon-operator-editable.md) — canon
  éditable opérateur) · doublon T6 supprimé (shippé ADR-0137) · Typecheck CI + Lighthouse Phase 16
  résolus (CI 15/15 verts depuis PR #447) · `xlsx` high éteint (dépendance retirée) · audit chunking
  `enrich-oracle` sans objet (déposé ADR-0125 ; les appels structurés passent par ADR-0067) ·
  « installer mjml » sans objet (renderer zéro-dep depuis galileo V1 — seul `firebase-admin` reste
  gated FCM).

---

## 🔴 Actions OPÉRATEUR en attente (non pilotables depuis le repo)

| Action | Contexte / référence |
|---|---|
| **`ModelPolicy` prod → Sonnet 5** : émettre `UPDATE_MODEL_POLICY` (ou re-seed `scripts/seed-model-policy.ts`) contre la base Coolify | ADR-0143 suite — le code défaut est migré ; `resolvePolicy` lit la BASE. Vérifier ensuite que la cascade Ollama-cloud→Sonnet 5 ne hard-fail plus |
| **Scheduler cron** : ajouter `curl CRON_SECRET /api/cron/anubis-digest?frequency=DAILY` (07:00 UTC) + `WEEKLY` (lundi) | Route posée 2026-07-20 ; même patron que social-sync |
| **Bascule Coolify « Docker Image »** (`ghcr.io/xtincell/adve-project:latest`, port 3000), hors pic ; optionnel : registry ghcr + secrets `COOLIFY_URL/TOKEN/APP_UUID` | Build déporté — [docs/deploy/BUILD-DEPORT.md](../deploy/BUILD-DEPORT.md). Rollback = re-source « Dockerfile » |
| **Désactiver l'auto-deploy** dans le dashboard Coolify (webhook git / watch registry) | Déploiement manuel 2026-07-15 — non pilotable depuis le repo |
| **Sign-off direction seuils ROC AUC / RMSE** (`CALIBRATION_THRESHOLDS`, ADR-0081 §4) → promotions PRODUCTION des 3 sous-clusters pivot + flips MISSION §9 | Phase 23 closure. Trigger : calibration via `CalibrationReviewPanel`, lecture des métriques, acceptation |
| **Phase 18 — résidus derrière formulaire opérateur** `/console/governance/phase-18-residuals` (model `Phase18ResidualEntry`, 7 catégories canoniques) : N5-bis `BIBLE_VAR` (Bible ~300 entrées), N6-bis `GLORY_TOOL` (annotation tools restants), N9 `PILLAR_DUPLICATE` (duplicate-pillars), N10 `FEATURE_FLAG` (rollout), `LLM_TUNING` (post-30 j prod), `PHASE_18_BIS` (M&A + archétypes), `CACHE_INFRA` (Redis cross-pod) | Non-inférables sans input business (doctrine NEFER §1.1 — pas d'auto-ship). NEFER query `phase18ResidualEntry pending` avant toute action Phase 18 |
| **Prod ADR-0140** : créer le login Lionel (Motion19) + vérifier le départ du post planifié Xtincell | Contre la base Coolify (accès temporaire opérateur) |
| **Fiche Motion19** : déclarer `marketScale`/`addressableAudience`/`brandFoundedYear` (hub Fondation), valider les jugements INFERRED → DECLARED, brancher les données internes | ADR-0126/0128 |
| **Premier Pari Public SPAWT** (énoncé modeste et daté, panneau Prévisions) | ADR-0159 §8 — le code est prêt |
| **Ratification bandes de redevance/VAN** (valorisation §4) | ADR-0160 — trigger : première vente réelle |
| **Tunnels live SPAWT** : re-datation Sprint Abidjan (7–21 août, `?op=patch actions[]`) + réconciliation `spawt-strategy-001` (reparent missions → GTM_90, archive placeholder) | ADR-0144 — post-deploy, après `?diag` |
| **Revue des 16 Glory tools candidats `forgeOutput`** ([glory-forgeoutput-audit.md](glory-forgeoutput-audit.md)) | Phase 9 — instrumentation après revue humaine |

### Clés / contrats / App Review (gated externe — le code dégrade honnêtement en attendant)

- **Meta App Review 2ᵉ soumission groupée** (publishing + engagement + insights : `read_insights`,
  `instagram_manage_insights`) = LE passage hors-testeurs ; **IG Business Login direct** hors testeurs ;
  webhooks temps réel (Advanced Access) ; DM/messaging (vague ultérieure) — ADR-0128/0133.
- **Ops env** : `INSTAGRAM_OAUTH_CLIENT_SECRET` (Coolify) ; `OPENAI_API_KEY` (embeddings Seshat) ;
  `firebase-admin` + creds si FCM ; clés providers ads/email/SMS (Credentials Vault ADR-0021).
- **LinkedIn** : produit Community Management (compteurs organisation) · **X** : palier payant PPU ·
  **TikTok** : client secret + audit d'app · **YouTube** : scope `yt-analytics.readonly` + audit
  (commentaires/upload).
- **Tarsis réel** : SDK/contrat vendor (connecteur `_mocked` prêt) · **WABA** : contrat WhatsApp
  Business (webhook entrant passeport fan) · **Shopify** : app Partner (env) + DNS wildcard
  `*.powerupgraders.com` + domaines Coolify (pages publiques de marque).
- **Scrappeur légit A/D/V du scoreur** (Trends, autocomplete, avis, wiki, presse, awards) :
  credential/ToS-gated — pattern `ConnectorResult<T>` P22-1, dégradation honnête (ADR-0149).

---

## 🟠 Dettes actives — code (chacune : plan + déclencheur)

### Gouvernance / sécurité

- **IDOR round-2/3 — ops keyées sur un id d'ENTITÉ (hors strategyId/campaignId)** — 🟢 **CLOS round-3** (v6.27.273, audit adversarial « TOUT » round-3) : les ~24 procédures campaign-manager keyées sur un id d'entité (action/execution/amplification/milestone/budget/brief/fieldop/fieldreport/approval/asset + `addDependency`/`getReport`/`getFieldOp`/`getFieldReport`/`getPendingApprovals`/`briefStatusMany`) résolvent désormais entité→`campaignId`→`enforceCampaignAccess` (governés : dans le `.use()` via `enforceResolvedCampaignAccess` ; operator/reads : inline dans le corps). `deliverable-tracking` (`create`/`addSignal`/`getByDeliverable`/`getImpact`/`expire`) remonte `deliverable→mission→canAccessMission`. `getPendingApprovals` restreint à l'approbateur=caller (ou ADMIN) ; `briefStatusMany` intersecte via `scopeCampaigns`. **Verrou posé** : `api-route-auth-guards.test.ts` (routes API) ; les gardes campaign-manager restent couvertes par revue + le pattern structurel `.use()` (extension du scanner `strategy-ownership-guard` aux ids d'entité laissée en option — les gardes inline sont explicites et lisibles).
- **CRM — vraie isolation deal↔opérateur PAR-DEAL** *(régression round-2 corrigée round-3 ; structurel restant)* : round-3 a corrigé la RÉGRESSION que le scoping relation-to-one avait introduite (`Deal.strategyId` NULLABLE → les deals pré-conversion étaient tous EXCLUS → pipeline VIDE pour l'opérateur ; `getPipelineOverview`/`listDeals`/`getRevenueForecast` incluent maintenant `{ strategyId: null }`). **Structurel restant** : les deals pré-conversion n'ont AUCUN lien opérateur en base (`createDeal` ne pose ni `userId` ni `strategyId`) → ils sont partagés entre opérateurs (visibles de tous). Vraie isolation = **colonne `Deal.operatorId`** (additive nullable) + stamp à la création (threading du contexte opérateur dans `createDeal`/`createDealFromIntake`) + décision backfill legacy (converti → `strategy.operatorId` ; pré-conversion legacy → null, non fabricable). Les ops keyées `dealId` (`updateDeal`/`advanceDeal`/`getDeal`…) et `getConversionMetrics` (funnelMapping agrégé) restent alors à scoper sur cette colonne. **Théorique en mono-opérateur** (UPgraders ADMIN god-mode voit tout ; aucun FIXER non-ADMIN avec pipeline propre aujourd'hui). **Déclencheur** : quand un second opérateur FIXER avec son propre pipeline existe.
- **`/api/chat` — routage LLM Gateway (budget/coût/rate) + modèle Sonnet 4→5** *(round-3, 2026-07-22)* : la sécurité est fermée (auth + `canAccessStrategy` sur le `strategyId` client — plus d'exfil de contexte ni de déni-de-portefeuille anonyme), MAIS le stream utilise encore `anthropic("claude-sonnet-4-20250514")` en DIRECT (bypass du LLM Gateway → pas de cost-tracking/circuit-breaker/headroom, et modèle Sonnet 4 legacy). **Plan** : router le chat via un chemin streaming du Gateway (à ajouter — le Gateway est aujourd'hui `executeStructuredLLMCall` pour les sorties structurées, pas de surface streaming) + défaut Sonnet 5. **Déclencheur** : passe LLM Gateway streaming / `UPDATE_MODEL_POLICY`.
- **`subscription-cycles` — fallback legacy mono-slot** *(round-2 Finding 4, transitoire)* : `alreadyAppliedLegacy` (fenêtre de migration `cycleAppliedAt`) ne protège que le DERNIER cycle (`providerSnapshot.lastCycleRef`) ; un replay d'un cycle plus ancien (ref écrasée, `cycleAppliedAt` NULL) passerait. **Auto-résorbant** : les providers cessent de redélivrer après ~3 j → seul le dernier cycle est jamais rejoué (déjà couvert par le claim atomique `cycleAppliedAt`). **Déclencheur** : aucun (se ferme seul post-fenêtre de migration) — surveiller si un double-grant apparaît.
- **IDOR entité-id APP-WIDE (au-delà de campaign-manager)** — 🟢 **CLOS round-4/5** (v6.27.274, sweep adversarial de TOUS les routeurs) : la classe « `governedProcedure`/`protectedProcedure` keyée sur un id d'ENTITÉ (pas strategyId/campaignId de tête) sans garde » a été balayée sur tout `src/server/trpc/routers`. **CRITICAL fermé** (cluster FINANCIER — déplacement d'argent par tout authentifié) : `mobile-money.initiatePayment/payCommission`, `commission.calculate/markPaid/generatePaymentOrder/calculateOnComplete`, `contract.releaseEscrow/meetEscrowCondition/createEscrow` → `requireOperator: true` (staff, parité `escrow-arbitration`). **HIGH fermé** : `mission.*` cycle de vie (update/delete/complete/cancel/setDeadline/acceptDeliverable/reviewDeliverable/submitToGuild → `enforceMissionAccess`), `campaign.update/delete` (→ `canAccessCampaign`, `get` était déjà gardé), `contract.get/updateStatus/sign` (→ `assertContractAccess`), `guild-tier.promote/demote` + `membership.create/renew/cancel` (self-escalation palier/remise → staff). **MEDIUM fermé** : `intervention.convertToMission/dismiss` (signal→marque), `quality-review.submit` (guild-participant) + `assignReviewer/escalate` (staff), `notification.create` (phishing → staff) + `markRead` (self), `guilde.removePortfolioItem` (self) + `assignMentor` (staff), `guild-org.*` + `operator-action.*` (staff, leurre strategyId), `system-config.recentAudit` (→ ADMIN, journal global ; `get` reste `protectedProcedure` — réglages système non-secrets lus par le portail créateur QC, cf. régression round-5 corrigée), `morning-batch.getBatch/listBatches/listSources` (comms ingérées → operator), reads `campaign-deliverable.listForCampaign`/`campaign-change-request.listForDeliverable`. **Verrou HARD** : `entity-id-ownership-guard.test.ts` (financier+privilège → requireOperator ; founder-reachable → chokepoint résolution). **Restant (refinement multi-opérateur + LOW, tracé ci-dessous).**
- **Scoping PAR-OPÉRATEUR du cluster financier/opérateur** *(refinement round-4/5, mono-opérateur aujourd'hui)* : `requireOperator: true` gate au STAFF mais ne scope pas encore par opérateur — un opérateur FIXER pourrait payer/annuler une commission ou libérer un escrow d'un AUTRE opérateur (les entités `Commission`/`Escrow` ont 3 parents possibles contrat/mission/commission ; `operatorAction`/`guild-org`/`morning-batch` keyés `operatorId` client). **Plan** : résoudre entité→opérateur propriétaire et exiger `== caller` (ou ADMIN) sur chaque primitive financière + `operatorId`-keyée. **Théorique en mono-opérateur** (aucun FIXER non-ADMIN aujourd'hui ; lié à la dette `session.operatorId`/`Deal.operatorId`). **Déclencheur** : 2ᵉ opérateur FIXER réel.
- **MCP tool layer + contenu global + reads operatorId** — 🟢 **CLOS round-6** (v6.27.276, 3ᵉ sweep adversarial). **(HIGH) Portée du token MCP** : les routes `/api/mcp/<server>` passaient les params BRUTS (pas de `__auth`, aucune enforce centrale) → une clé BRAND (qu'un fondateur émet pour SA marque, server `*`) lisait une AUTRE marque via `params.strategyId`. Fermé par `scopeMcpParams` (`mcp-billing.ts`) appelé par les 11 routes (agrégat + 10 par-serveur) : une clé BRAND ne peut opérer QUE sur `scopeStrategyId` (403 + metering DENIED sinon) + injecte `__auth`. Verrou HARD (`entity-id-ownership-guard` §MCP). **(HIGH) Écritures de contenu GLOBAL** → `requireOperator` : `learning.issueCertification/createCourse/publishCourse`, `boutique.createItem/updateItem/updateOrderStatus`, `editorial.create/publish`, `event.create/markAttended` (self-scopés `order`/`enroll`/`register`/`addComment` intacts). **(MED) reads operatorId/list stragglers** → operator/admin : `anubis.trackDelivery/fetchDeliveryReport`, `campaign-deliverable.listForOperator/statsForOperator`, `campaign-change-request.listOpenForOperator`, `brief-ingest.list`, `error-vault.list/groupBySignature`, `knowledge-graph.query/getBenchmarks`, `newsletter.newslettersStats`, `phase18-residuals.*` (→ ADMIN).
- **Restants round-6 (tracés)** : **(a) entité-id DANS le MCP** — 🟢 **fermé round-8 (b)** (v6.27.279) : les 10 routes `/api/mcp/<server>` appelaient `handler()` en direct (seul `scopeMcpParams` = check `params.strategyId`), donc un outil keyé entité-id (`campaignId`/`missionId`/`driverId`/`userId`) échappait à la portée BRAND → cross-marque read+write (~30 outils). Unifié : les 10 routes délèguent à `dispatchTool` (= l'agrégat), qui applique `enforceBrandScope` FAIL-CLOSED (clé BRAND refusée sur tout outil sans champ `strategyId`). **Refinement restant (non-bloquant)** : une clé BRAND ne peut plus utiliser un outil entité-id même pour SA marque ; pour les ré-ouvrir → résolution per-tool entité→`strategyId` (assert `== scope`). Aucun caller actuel n'en a besoin. **(b) scoping PAR-opérateur** des reads operatorId (les gates round-6 sont operator/admin = STAFF, pas `operatorId==caller`) + `anubis.fetchDeliveryReport` utilise les creds d'un autre opérateur (à scoper broadcastJob→operatorId). **(c) `media-buying.syncToCampaign`** — 🟢 **CLOS round-9 (a)** (v6.27.283) : `campaignId` leurre non vérifié → écriture `CampaignAmplification` sur la campagne d'autrui ; garde `camp.strategyId === input.strategyId` posée. **(d) `phase18-residuals.*` gouvernance** : `adminProcedure` ferme l'authz mais reste ungoverned (audit-gap). **(e) test bypass structurel** — 🟢 **CLOS round-8 (e)** (v6.27.282) : `governed-active-no-new-bypass` ne scannait QUE les routeurs `lafusee:governed-active` → 18 routeurs non tagués (payment/newsletter/blog/error-vault/auth…) pouvaient ajouter une mutation ungoverned sans signal CI. Gate retiré : TOUS les routeurs scannés, baseline complet gelé (11 untagged ajoutés, tous EXEMPT sauf newsletter 4 PENDING). Reste : câbler les 4 mutations newsletter au spine (kind `NEWSLETTER_SEND_CAMPAIGN` déjà déclaré Vague 10 mais orphelin — cf. §round-7 newsletter).
- **Newsletter par marque — vrai fix du stopgap round-6** — 🟢 **CLOS round-7** (v6.27.277). Le gate round-6 `newsletter.newslettersStats → operatorProcedure` fermait bien la fuite PII (emails/noms des destinataires cross-marque via `crmMessage.contact`) MAIS (1) cassait la modale « Consulter » du fondateur (403 → modale vide, aucune branche d'erreur) et (2) ne fermait PAS la fuite sœur `newslettersList` (renvoyait TOUTES les campagnes, toutes marques confondues). **Cause racine** : `NewsletterCampaign` n'avait pas de `strategyId` alors que ses entités sœurs en portent (abonnés `CrmContact.strategyId`, fournisseur `BrandEmailConnector`) — l'auteur l'avait flaggé (`newsletter.ts` : « les campagnes ne portent pas encore de strategyId propre »). **Vrai fix** : champ `strategyId` additif nullable (migration `20260722230000_newsletter_campaign_strategy_scope`, backfill-safe) → `newslettersList`/`newslettersStats` repassent `protectedProcedure` scopés par `accessibleStrategyIds` (le fondateur voit SES campagnes ; legacy `strategyId=null` reste opérateur-only, fail-closed) + `newslettersCreate` stampe la marque + garde de cohérence à l'envoi (une campagne d'une marque ne part pas à l'audience d'une autre). Le scanner `strategy-ownership-guard` exige+confirme désormais la garde sur les deux reads (verrou automatique).
- **Écritures newsletter gouvernées par-marque (honorant la zone collaborateur `"newsletter"`)** *(round-7, tracé — refinement, pas une fuite)* : `newslettersCreate`/`newslettersSend`/`subscribersAdd`/`subscribersBulkImport` restent `operatorProcedure` (staff) alors que (a) la page `/cockpit/operate/newsletter` est fondateur-facing (boutons « Créer le brouillon »/« Envoyer ») et (b) il existe une zone d'écriture collaborateur `"newsletter"` (rôle `DIGITAL_DIRECTOR`, `src/domain/collaborator-access.ts`). Un fondateur pur (non-opérateur) reçoit donc un 403 sur ces actions — le produit vise l'auto-service par-marque. **Plan** : cataloguer des kinds `NEWSLETTER_CREATE`/`NEWSLETTER_SEND` (+ SLO) + handlers, passer ces mutations en `governedProcedure` dont le firewall d'émission vérifie la zone `"newsletter"` (100 % déterministe — aucun LLM, parité manual-first non concernée). **Déclencheur** : prochaine passe gouvernance des écritures newsletter / 1er fondateur pur (non-opérateur) qui pilote sa propre newsletter. **NB round-8 (audit MCP §B)** : ces 4 mutations sont AUSSI la seule vraie dette « mutation métier ungoverned » du recensement des routeurs non tagués (baseline `governed-active-no-new-bypass` = `newsletter.ts: 7`, dont 4 PENDING) — même plan de résolution. **Découverte round-8 (e)** : le kind async `NEWSLETTER_SEND_CAMPAIGN` (governor ANUBIS, handler `crm`) est DÉJÀ déclaré au registre (Vague 10) mais jamais câblé — `newslettersSend` fait l'envoi inline en `operatorProcedure`. La gouvernance devra RÉCONCILIER ce kind async existant (dispatch handler) plutôt qu'ajouter un `governedProcedure` sync — d'où le choix de ne pas rusher (flux email + écriture CRM réelle).
- **XSS guidelines + SSRF fetch** — 🟢 **CLOS round-8 (a)** (v6.27.278, sweep adversarial). **(HIGH) XSS stocké** : `guidelines-renderer` rendait `<title>${doc.title}</title>` (nom de marque fondateur-éditable) SANS `escapeHtml` sur la page PUBLIQUE `/shared/guidelines/[token]` (`dangerouslySetInnerHTML`) → `</title><script>…` livré à quiconque ouvre le lien. Échappé (+ 2 tags durcis), verrou `guidelines-renderer-xss.test.ts`. **(HIGH) SSRF redirection intake public** + **(MED) SSRF market-research hostname-only** : `redirect:"follow"` sans re-validation des sauts (302 → `169.254.169.254`) + garde regex sans DNS. Fermés par `src/lib/net/ssrf-guard.ts` (`assertPublicUrl` DNS-résolvante + `ssrfSafeFetch` redirections manuelles re-validées) sur les 2 fetchers ; verrou `ssrf-guard.test.ts`.
- **SSRF — pin de connexion anti-rebinding DNS** *(round-8, tracé — defense-in-depth, exploit pratique déjà fermé)* : `ssrfSafeFetch` valide le DNS de chaque saut AVANT le fetch, mais `fetch` re-résout indépendamment → fenêtre TOCTOU où un DNS attaquant (TTL 0) bascule d'une IP publique vers `169.254.169.254` entre les deux résolutions. La fermeture complète exige de PINNER la connexion sur l'IP validée via un dispatcher `undici` (`connect.lookup` custom) — `undici` n'est pas une dépendance importable ici (interne à Node). **Plan** : ajouter `undici` en dépendance directe + un `Agent` à `lookup` validant, OU migrer vers un client HTTP exposant le pin d'IP. **Déclencheur** : passe sécurité dédiée / si un rebinding est observé. **Bornage** : l'exploit PRATIQUE (redirection 3xx vers une IP privée) est ENTIÈREMENT fermé — seule reste la course DNS, difficile et rarement praticable (cache résolveur).
- **Fuites de lecture cross-tenant (include/select)** — 🟢 **CLOS round-8 (c)** (v6.27.280, sweep adversarial). **(HIGH)** `campaignManager.search` : sans `strategyId`, `searchCampaigns` renvoyait TOUTES les campagnes cross-marque + identités d'équipe (base `campaignScopedProcedure` inerte sans `campaignId`, garde handler conditionnelle) → `scope: scopeCampaigns(opCtx)` ANDé inconditionnellement. **(MED)** `TalentProfile.payoutPhone` (PII payout momo) moissonnable via `guilde.list`/`getProfile` + `membership.list` → `omit: { payoutPhone: true }`. **(LOW-MED)** `mission.listForCreator` exposait `advertis_vector` (scoring ADVE interne) sur le mur des missions ouvertes → `select:{name}`. Verrou `cross-tenant-read-leaks.test.ts`. NB : `guilde.getLeaderboard` était DÉJÀ propre (select sans payoutPhone) — faux positif de l'audit.
- **Publication sociale — arête « claim bloqué » sur crash dur (LOW)** *(round-12, note concurrence)* : le double-publish est fermé par un claim atomique `SCHEDULED→PUBLISHING` (cron) + restauration `SCHEDULED` sur exception. Reste une arête : si le process est TUÉ DUR (timeout serverless, OOM) ENTRE le claim et la résolution du statut par le handler (`upsertPublishAction`), l'action reste bloquée en `PUBLISHING` (jamais re-sélectionnée, `listDueScheduledPublications` filtre `SCHEDULED`) → publication planifiée jamais envoyée. **Bornage** : ne concerne QUE le crash-dur mid-handler (rare) ; l'exception normale restaure. **Plan** : soit un champ `claimedAt` (ou JSON) + un reaper dans `listDueScheduledPublications` qui re-sélectionne les `PUBLISHING` de plus de N min, soit threader le `brandActionId` jusqu'au handler pour un claim+release complet. **Effort** : ~½ session. **Déclencheur** : prochaine passe fiabilité publication / si un post planifié disparaît en prod.
- **`Commission.commissionAmount` ≠ `gross × commissionRate` (piège de modèle, LOW)** *(round-11, note correctness)* : `commissionRate` (persisté) = la part GARDÉE par le talent (0.60-0.75) ; `commissionAmount` = la part PLATEFORME (`gross − net` = `gross×(1−rate)`). L'invariant naturel « amount = gross × rate » est donc FAUX sur chaque ligne — c'est exactement le piège qui a produit le bug `guild.commission_history` (fermé round-11 a : sommait `commissionAmount` au lieu de `netAmount`). **Pas de bug live restant** (le seul consommateur fautif est corrigé ; `getAdjustedRate` expose `platformCommission = 1 − adjustedRate` correctement). **Plan** : renommer `commissionRate`→`talentKeepRate` OU stocker `commissionRate = 1 − rate` (part plateforme) pour rétablir l'invariant, + annoter le model Prisma. **Effort** : ~½ session (migration additive + audit des lecteurs). **Déclencheur** : prochain rapport/dashboard qui agrège des commissions, ou passe finances dédiée.
- **Intégrité financière (double-payout + webhook momo + redelivery)** — 🟢 **CLOS round-8 (d)** (v6.27.281). **(MED)** `commission.generatePaymentOrder` : `create` nu sans dedup (pas d'unique `commissionId`) → double-clic = talent payé 2× → garde d'idempotence (renvoie l'ordre non-FAILED existant). **(MED)** webhook momo `publicProcedure` non signé → écriture ledger anonyme → secret fail-closed `MOBILE_MONEY_WEBHOOK_SECRET`. **(LOW)** Stripe/CinetPay re-fulfillaient sur redelivery → claim atomique `updateMany({status not PAID})` (comme PayPal). Verrou `financial-integrity-round8.test.ts`. **Restants (non-bloquants, tracés)** : (1) course concurrente pure sur `generatePaymentOrder` — deux appels SIMULTANÉS passent tous deux le `findFirst` → nécessite un unique PARTIEL `commissionId WHERE status != FAILED` (Prisma partial unique = SQL brut) ; pratique (double-clic séquentiel) fermé. **Déclencheur** : si un double-payout concurrent est observé. (2) Signature RÉELLE par provider momo (Orange/MTN/Wave HMAC) à l'intégration — le secret partagé est l'interim fail-closed. **Déclencheur** : intégration d'un provider momo live.
- **Correctness Oracle/scoring (round-9 c)** — 🟢 **CLOS** (v6.27.284, fan-out correctness). **(HIGH)** l'Oracle re-plafonnait le composite avec un miroir d'évidence périmé (cibles NATION pré-ADR-0126 + `createdAt`) → palier INFÉRIEUR au dashboard (qui lit le composite persisté déjà scale-aware-capped) ; miroir supprimé. **(MED-HIGH)** §15 comptait les évangélistes via `"evangeliste"` minuscule (jamais matché) + seuils 0.8/0.95 vs canon `TIER_MIN_DEPTH` 0.65/0.85 → aligné. **(LOW)** lock `acquireGenerationLock` défait par un `OR { id: existing.id }` toujours-vrai → retiré ; `nested_complete` vacuously-true sur `{}` → gardé. Verrou `correctness-round9.test.ts`. Aucun résidu.
- **Auth/session — durcissements + 2 résidus (round-9 b)** — 🟡 **partiel** (v6.27.285). **Fermé** : `allowDangerousEmailAccountLinking` retiré (pre-account-hijacking Google), MFA sur rôle EFFECTIF (god-mode challengé), `forgotPassword` fire-and-forget (anti-énumération timing), open-redirect callback OAuth (`//`/`\` rejetés). **Résidus tracés** : **(1) prise du stub non-réclamé (MED)** — `auth.register` pose un mot de passe sur un stub sans mdp (créé par `quickIntake.activateBrand`) SANS vérifier la propriété de l'email → un attaquant qui connaît l'email d'un prospect ayant fait un intake hérite de son Client + Strategy. **Plan** : vérification email pour la revendication (réutiliser l'infra reset-token : à la revendication, envoyer un lien de vérification à l'email du stub ; le mdp n'est posé qu'après clic). **Déclencheur** : décision produit sur la friction onboarding (sécurité vs conversion) — nécessite un arbitrage opérateur car change le flux d'inscription. **(2) rate-limit login/MFA + anti-replay TOTP (LOW)** — aucun throttle/lockout sur le credentials path ; `verifyTotp` sans cache de code utilisé ni comparaison constant-time. **Plan** : limiteur par-compte (in-memory/Redis) + fenêtre TOTP single-use. **Déclencheur** : passe infra rate-limiting / si un bruteforce est observé. **Bornage** : bcrypt cost-12 + TOTP 6 chiffres ±1 step = frein réel mais non-lockout.
- **Audit gouverné — statut de fin honnête** — 🟢 **CLOS round-4** (v6.27.274, trouvé à la vérif du diff round-3) : `governedProcedure` fermait les mutations REFUSÉES/échouées en aval avec `status="OK"` + publiait `intent.completed` + Seshat les marquait OBSERVED (tRPC v11 `next()` NE JETTE PAS sur échec aval — il renvoie `{ok:false}`, donc le `catch` du lane ne voyait que ses propres throws). Corrigé : `governed-procedure.ts` teste `result.ok` et ferme `VETOED` (FORBIDDEN/UNAUTHORIZED) ou `FAILED` sinon — parité avec `auditedProcedure` qui testait déjà `result.ok`. Ferme la falsification de combustion sur le lane gouverné (miroir du fix `/api/nsp` DELETE). NB : sécurité intacte avant/après (le corps ne s'exécutait jamais) — c'était une intégrité d'audit (Q1/Q2).
- **`session.user.operatorId` jamais peuplé — champ `User.operatorId` surchargé** *(trouvé à l'audit
  B1, 2026-07-22)* : le callback NextAuth (`lib/auth/config.ts`) ne pose que `role`+`id` sur la
  session → `session.user.operatorId` est TOUJOURS `undefined`. Le garde ADR-0175 (`governedProcedure`)
  + ~15 routeurs (`client`, `strategy`, `monetization`, `media-plan`, `mission`, `intention`…) le
  lisent → tous voient `null`. **Direction fail-safe** (non exploitable) : `canAccessStrategy` avec
  `operatorId:null` REFUSE l'accès same-operator (le garde n'accorde qu'owner/ADMIN/collaborateur ;
  les staff opérateur passent parce qu'ils sont ADMIN god-mode/seed). **Pourquoi NE PAS peupler
  naïvement** : `User.operatorId` est surchargé — il marque l'appartenance au tenant AUSSI pour les
  users CLIENT/BRAND/founder (cf. `seed-demo` : `CLIENT_RETAINER`/`BRAND_MANAGER` portent
  `operatorId=operator.id`). Peupler `session.operatorId` ferait passer `canAccessStrategy` ligne 160
  → un client verrait TOUTES les marques de son opérateur (fuite cross-tenant CATASTROPHIQUE).
  **Plan** : introduire un booléen distinct `User.isOperatorStaff` (ou un rôle OPERATOR strict) et ne
  peupler `session.operatorId` QUE pour ce cas ; migrer les ~15 lecteurs. **Effort** : ~1 session
  dédiée (sécurité). **Déclencheur** : quand un vrai staff opérateur NON-ADMIN doit exister. Dead code
  supprimé en passant : `middleware/operator.ts` (session-based `operatorFilter` renvoyait `{}` =
  non filtré = fuite si jamais câblé — 0 import, retiré v6.27.267).
- **Audit d'ownership des mutations `governedProcedure` founder-lane** *(suivi ADR-0166, inscrit
  2026-07-20)* — 🟢 **CLOS round-10** (v6.27.287→289, scan proactif `scan-entity-idor`). Le plan
  (« vérifier procédure par procédure, étendre le test HARD ») est réalisé par un **scanner PROACTIF
  permanent** (`tests/unit/governance/entity-id-idor-proactive.test.ts`) qui INVERSE la logique : il
  énumère l'univers des procédures founder-atteignables keyées sur un id d'ENTITÉ (`{id}`/`driverId`/
  `talentProfileId`/…, ou un strategyId nommé `id`) et PROUVE que chacune est gardée OU inscrite à
  `SAFE_BY_DESIGN` (30 entrées, chacune vérifiée par lecture de handler — 4 sous-agents adversariaux).
  122 candidats inventoriés → cluster brand-core (strategy/driver/ingestion/mission/social/scoring, a),
  marketplace PII + télémétrie carrière (guild/quality-review/membership/imhotep/learning, b),
  campaign-manager décoratif + intake privilège/PII (c) fermés. **Une procédure NEUVE non gardée et
  non allowlistée casse désormais le build** — la classe (récurrente rounds 4→10) ne peut plus repasser
  en silence. Restant tracé ci-dessous (`strategy.create` LOW).
- **`strategy.create` — associations `operatorId`/`clientId` non validées (LOW)** *(round-10, scan
  proactif)* : le nouvel objet est TOUJOURS self-owned (`userId = resolveSessionUserId(ctx)` — pas
  d'IDOR sur l'objet créé), mais un caller peut passer un `input.operatorId`/`clientId` ARBITRAIRE →
  la Strategy est associée au portefeuille d'un autre opérateur (pollution de vue, pas fuite/vol de
  donnée). Le flux légitime `cockpit/portfolio/[corporateSlug]` passe l'operatorId du nœud corporate
  que le fondateur opère — d'où l'impossibilité de simplement dropper l'input. **Plan** : valider que
  `input.operatorId`/`clientId`, si fournis, sont accessibles au caller (getOperatorContext →
  `== caller` ou nœud corporate qu'il possède, sinon ignorer et défaut au contexte du caller).
  **Effort** : ~½ session (touche le modèle d'accès portfolio multi-tenant). **Déclencheur** : prochaine
  passe multi-opérateur (lié à `session.operatorId`/`Deal.operatorId` ci-dessus) OU 2ᵉ opérateur réel.
- **C3 canon-sync god-mode** : écrit le pilier S direct (best-effort, push manuel god-mode) —
  2 entrées allowlist C5 (`reroutePlanned:true` pour le bloc computed). **Plan** : reroute gateway.
  **Déclencheur** : basse priorité, prochain passage sur canon-sync.
- **C6 `BRIEF_VS_ADVE_COHERENCE` WARN → BLOCK + UI override** : Phase 24 closure-target #14 —
  décision opérateur explicite (ne pas pull en avant). [ADR-0103](adr/0103-brief-vs-adve-coherence-deterministic-advisory.md).

### Scoreur / graphes (ADR-0147/0148/0149/0153/0154)

- **Tenue (trajectoire de θ)** : fenêtre glissante « durée au-dessus de la bande CULTE » (item
  ICONE) à câbler sur l'historique `ScoreVerdict` (snapshots datés existants). Déterministe pur.
  **Déclencheur** : prochaine session scoreur.
- **Duel de vocabulaire × corpus feeds** : helper `measureVocabularyDuel` prêt ; brancher
  l'alimentation par flux culture RSS / Argos (`EXTERNAL_FEED_DIGEST`). **Déclencheur** : idem.
- **Identity** : persistance des candidats de fusion INFERRED (aujourd'hui renvoyés au résultat,
  non stockés) + `splitPerson` fin (re-scission des arêtes). **Déclencheur** : premier cas réel de
  revue de fusion. *(La cascade /data-deletion est close — purge gouvernée shippée 2026-07-20.)*
- **Overton** : détection automatique de transitions (aujourd'hui `recordZoneTransition` explicite)
  + surfaçage du niveau de résolution polity sur la position. **Déclencheur** : prochaine session Overton.
- **Ponts inter-ligues** (comparaison absolue cross-polity, marques multi-ligues) : vision, après
  volume réel de ligues peuplées.
- **Planchers d'audience** (`EVIDENCE_TARGETS_BY_SCALE.audienceFloor`, ADR-0153) : PROPOSÉS —
  **plan** : les rendre éditables par marché via le pattern canon-override ADR-0150 (kind dédié),
  ratification opérateur ensuite. **Déclencheur** : première contestation d'un plancher en usage réel.
- **Arène D (désirabilité) mesurée** : même patron que A/V depuis les avis — **gated DONNÉE** :
  reviews persistées par-marque dans le temps (`FollowerSnapshot`-like). 
- **Ancres iconiques** (Apple/Coca/Nike… `BrandRef kind=ANCHOR`) : ingestion research-assistée avec
  revue (ADVE INFERRED + épreuves sourcées), hors chemin zéro-LLM. **Déclencheur** : besoin de
  calibration fine des étalons.
- **Hunter victoires (ADR-0154)** : en prod avec clé — observer qualité des victoires proposées et
  taux d'auto-REJECT sans source. **Rival dédup** vers `BrandRef` : passe future. **Orchestration
  serveur** (batch/cron) : promouvoir les kinds en bus SI le besoin apparaît.
- **`scoreBrandRef()`** (scorer une marque externe sans Strategy shell — lever le détour
  `onboard-external-brand`) : orchestrateur arènes A/D/V registre + items. **Effort** : ~½ session.
  **Déclencheur** : prochain onboarding externe en volume (Prospect Scoring).

### Circuit Oracle / livrables (ADR-0134/0136/0137/0138)

- **`COMPOSE_DELIVERABLE` — DAG upstream complet** : le single-target DISPATCHED est shippé
  (ADR-0136) ; la génération auto des briefs upstream MANQUANTS exige un refactor du moteur
  `executeSequence` (rayon large) + un env à clés pour le happy-path forge. **Bornage** : chantier
  env-avec-clés, ADR enfant de 0136. **Déclencheur** : env à clés + session dédiée.
- **`ugcGenerationRate`** : exclusion MAINTENUE (décision négative explicite ADR-0134 §B2).
  Dérivation future : inbox v2 `kind="MENTION"` + mentions connecteur + constante validée direction.
- **Chantier « La Fusée compile » (Brand Book designé, brand-skinné)** — plan `_bmad`/session ; 5 phases.
  **Phase 1 ✅ SHIPPÉE** ([ADR-0169](adr/0169-brand-skinned-deliverable-rendering.md), v6.27.241) :
  `resolveBrandTheme` serveur + `brand-bible-pdf`/`export-oracle` rendent aux couleurs de la marque
  (item « mapper Strategy → thème de rendu » CLOS). **Restant du chantier** :
  - **Phase 1 résidus** : embarquement réel des **fichiers de police** (jsPDF `addFont` depuis
    `TYPOGRAPHY_SYSTEM.files[]` — réseau + TTF-only + souvent absent ; helvetica en attendant) ;
    skinning de la voie **puppeteer** `oracle-pdf.ts` (via le CSS de la route `/shared/strategy`).
  - **Phase 2 ✅ SHIPPÉE** ([ADR-0170](adr/0170-product-system-pillar-v.md), v6.27.242) : `v.productSystem`
    (domaine `product-system.ts` + schéma + bible V8 + field-registry + renderer cockpit + Glory
    `product-system-architect` HYBRID) modélise le mécanisme produit. **Résidus Phase 2** : seed du Palais
    SPAWT complet dans `spawt-canon.ts` (déféré à l'ingestion Phase 3 — l'encoder à la main risquerait la
    fabrication) ; annotation `applicableGloryTools` du tool par nature (`brand-nature-archetypes.ts` —
    discovery UI, le tool est déjà invocable par slug).
  - **Phase 2-bis ✅ SHIPPÉE — socle produit** ([ADR-0171](adr/0171-product-catalog-reference-integrity.md),
    v6.27.243) : ids produits stables + résolution tolérante + 1ʳᵉ règle d'intégrité référentielle
    (cross-validator rule 31) + lien système↔catalogue. **1/23 arêtes de référence fermée.**
  - **🔴 AUDIT D'INTÉGRITÉ ADVE (2026-07-22)** — [carte complète](../audits/ADVE-INTEGRITY-AUDIT-2026-07-22.md).
    Balayage exhaustif des 8 piliers avant l'ingestion → trous de fond systémiques (prérequis Phase 3) :
    - **Canon↔schéma — corruption de forme FERMÉE (Lot 1, [ADR-0172](adr/0172-normalize-to-strict-schema.md), v6.27.246)** :
      gate anti-corruption (`pillar-conformance.ts`) au seed (throw sur SHAPE, tolère les advisories DRAFT) +
      formes duales objet-vs-scalaire réconciliées par unions ADR-0168 → **les 4 canons A→I SHAPE=0** (test CI
      `canon-conformance`). **Restant (advisory, non bloquant, tracé §ADR-0172 ci-dessous)** : traduction
      sémantique enum FR→canonique (« mensuelle »→MONTHLY), normalisation id lisible→UUID au seed.
    - **Arêtes de référence — VALIDATION FERMÉE (Lot 3, [ADR-0174](adr/0174-pillar-reference-edge-integrity.md),
      v6.27.249)** : `findDanglingReferences` + cross-validator rule 32 valident les 22 arêtes restantes (liens
      par nom + FK UUID) ; `overtonBlockers` gagne un `id` (arête S→R rendue possible). **23/23 arêtes
      validées.** **Restant (DONNÉE, non VALIDATION)** : motion19 porte **deux taxonomies de persona**
      (`D.personas` Brand Book §04 « L'amateur / L'entrepreneur du web… » vs le segment/superfan « Le créateur
      de contenu / Le vidéaste pro… ») → 5 dangles LIVE surfacés au score. **Bornage** : réconcilier les deux
      taxonomies (renommer `personaSegmentMap.personaName`/`superfanPortrait.personaRef` vers les `nom` de
      `D.personas`, OU acter que ce sont des segments distincts) — **décision opérateur** (on n'invente pas le
      mapping, interdit n°3). **Déclencheur** : passe éditeur ADVE / validation opérateur des personas motion19.
    - **Champs invisibles — FERMÉ (Lot 2, v6.27.248)** : R.globalSwot / S.selectedFromI / S.rejectedFromI /
      E.channelTouchpointMap rendus (ObjCard/ProofList) ; `ObjCard` tolère désormais la forme compacte
      (chaîne au lieu d'objet — union ADR-0168).
    - **CRUD item-level + dot-path — FERMÉ (Lot 2, v6.27.248)** : `pillar.updateArrayItem`/`removeArrayItem`
      (governés, requireOperator) ferment le « add-only » ; `setNestedValue` indexe enfin les tableaux
      (`personas[0].name` n'écrit plus une clé littérale — corruption, vérifiée E2E). **Restant** :
      `SmartFieldEditor` + field-registry **encore orphelins** (édition = textarea JSON brutes) ; monter
      l'éditeur récursif OU acter le raw-JSON. **Déclencheur** : lot « éditeur ADVE » (+ surface d'ingestion
      §ADR-0173 qui a le même besoin de formulaire nested).
    - **Provenance/needsHuman non-enforcé** : INFERRED nourrit `computePillarS` comme DECLARED.
  - **Phase 3 — backend SHIPPÉ (Lot 1b, [ADR-0173](adr/0173-brand-book-ingestion.md), v6.27.247)** :
    service `brand-book-ingestion` (2 extracteurs parité manual-first, preview→confirm, Intent
    `INGEST_BRAND_BOOK` → gateway A/D/V + assets vault DRAFT, kind `BRAND_BOOK`, source `OFFICIAL`, zéro-fab
    vérifié E2E). **Restant (déféré §ADR-0173 ci-dessous)** : surface cockpit/console, promotion produits,
    logo binaire.
  - **Phase 4** — livrable **Brand Book complet** deux-strates (identité + système produit), gabarit
    multi-sections brand-skinné (cible SPAWT/Motion19).
  - **Phase 5** — profondeur du système visuel (applications carte/letterhead/merch, mauvais usages logo,
    PANTONE, type scale) — incrémental. **Déclencheur** : suite du chantier (l'ADVE détient déjà la
    matière — travail de *rendu*, pas de collecte).

### §ADR-0173 — ingestion brand book (déférés, non bloquants)

Le backend d'ingestion (extracteurs + Intent + tRPC + persister) est shippé et vérifié E2E. Restent :

- **Surface cockpit/console** (upload → revue de l'extraction → apply) : les endpoints tRPC
  `ingestion.previewBrandBook`/`ingestBrandBook` existent ; il manque l'écran opérateur (formulaire éditable
  de l'extraction avant confirmation). **Bornage** : page `/console/…/brand-book` réutilisant le pattern
  `market-study-ingestion` UI. **Déclencheur** : passe « éditeur ADVE » (Lot 2) — mutualiser le rendu de
  formulaire nested.
- **Promotion produits extraits → `v.produitsCatalogue`** : les produits d'un brand book (nom/prix/desc) ne
  sont PAS auto-écrits (le schéma riche exige une matrice de valeur → fabrication). L'extraction brute est
  disponible. **Bornage** : action opérateur « promouvoir » via le socle produit (`ensureProductIds`,
  ADR-0171). **Déclencheur** : Lot CRUD produit (Lot 2).
- **Logo binaire** : `pdf-parse` ne garde que le texte → le logo d'un brand book n'est pas extrait (seule sa
  description l'est). **Bornage** : ré-upload image séparé → `LOGO_FINAL` (chaîne existante). **Déclencheur** :
  quand un vrai book est ingéré en prod.

### §Revue adversariale 2026-07-22 (chantier « La Fusée compile ») — déférés tracés

3 agents adversariaux ont attaqué unions / gate+normaliseur / ingestion. **Bugs réels CORRIGÉS le jour
même** (mêmes commits) : Oracle `sousPromesses` → `[object Object]` (mapper coerce), 3 champs cockpit-E
aveugles (RelList/Principes tolérants string+record), effondrement des actions string (`normalizeInitiative`),
faux-négatif scalaire-dans-record du classifieur (`isContainer` + record), persister (tonDeVoix→D,
motivations sans repli-nom, story non dupliquée, manifesto non écrit, flag `wrote`), S computed corrompu
VALIDATED (unions S + gate S), surclaims de docstrings (OFFICIAL/LLM-zéro-fab). **Restent (latents/systémiques)** :

- **Deux voies de confiance disjointes** (pré-existant) : `content._fieldProvenance` (garde de provenance)
  vs `Pillar.fieldCertainty` (seeds/intake/`confirmInferredField`). Un champ confirmé opérateur reste
  `_fieldProvenance:UNKNOWN` → une écriture SOURCE (ingestion) le surécrit en silence (`decideOverwrite`
  ALLOW). **Bornage** : `confirmInferredField` doit passer par le gateway (poser `_fieldProvenance:HUMAN`)
  OU le garde doit consulter `fieldCertainty`. **Déclencheur** : chantier provenance unifiée (avant tout
  usage prod de l'ingestion qui écrase).
- **Certitude par champ non posée à l'ingestion** : le persister pose `fieldProvenance:SOURCE` mais pas
  `Pillar.fieldCertainty=OFFICIAL` (seule `BrandDataSource.certainty` l'est). **Bornage** : écrire la
  certitude par champ après le write. **Déclencheur** : surface cockpit d'ingestion.
- **`ingestBrandBook`/`previewBrandBook` = `operatorProcedure` non scopé par stratégie** (les reads sœurs
  sont `strategyScopedProcedure`). Modèle de confiance opérateur intentionnel, mais asymétrique.
  **Bornage** : `strategyScopedProcedure` + garde operator. **Déclencheur** : si `operatorProcedure` est
  accordé à un rôle moins fiable.
- **Gate F2/F5/F6/F7 (latents)** : absent-required-container classé MISSING (les renderers doivent
  optional-chain les requis) ; détection SHAPE côté `received` via message EN (un `z.config(locale fr)`
  la casserait — aucun configuré) ; placeholder dans un champ union sur-bloque (SHAPE) vs toléré hors-union ;
  atomicité seed (throw mid-loop ; `seed-spawt` `create` non-idempotent) — **gardé en amont par le test CI
  `canon-conformance`** (un canon régressé échoue le test avant tout seed). **Bornage** : pré-flight
  conformance avant le write loop. **Déclencheur** : prochaine passe seed.
- **`stableUuid` + carriers `*Ref` legacy** (dormant) : si un jour on persiste `normalizeToSchema`, les
  `riskRef`/`hypothesisRef`/`sourceRef` (string nu, non uuid-typés) casseraient l'arête. Aucun caller ne
  persiste le normalisé aujourd'hui. **Bornage** : normaliser aussi les `*Ref` OU remap coordonné.
  **Déclencheur** : si l'ingestion adopte `normalizeToSchema`.
- **`advertis-scorer/semantic.ts` sous-compte les formes compactes** (`hierarchieCommunautaire`/
  `sacredCalendar` objet → `arrLen`=0). **Code mort** (aucun consommateur ; le /200 officiel = `scoreStructural`).
  **Bornage** : si ce scorer est ranimé, le rendre tolérant. **Déclencheur** : réveil du scorer sémantique.

### §ADR-0172 — advisories de conformité canon (déférés, non bloquants)

Le gate anti-corruption (Lot 1) ferme la corruption de forme (SHAPE) ; il **tolère** un tail d'advisories
qui rendent correctement en l'état mais ne sont pas strictement canoniques. Aucun ne casse le rendu.

- **Traduction sémantique enum FR→canonique** (~120/canon) : « mensuelle »→MONTHLY, « Activation »→ACTIVATION,
  « trimestrielle »→QUARTERLY… Le fold ascii/casse du normaliseur ne traduit pas entre langues. **Bornage** :
  petite table FR→enum dans `schema-normalizer` (déterministe, réutilisée par l'ingestion). **Déclencheur** :
  Lot 1b (l'ingestion aura le même besoin sur de la donnée FR) — mutualiser là.
- **Normalisation id lisible→UUID au seed** (`risk-m19-001`→UUID) : le gate persiste **brut** pour préserver
  l'intégrité des refs (id ET ref doivent co-normaliser). **Bornage** : appliquer `normalizeToSchema` au seed
  APRÈS avoir prouvé que toutes les refs sont uuid-typées et partagent la chaîne source. **Déclencheur** :
  Lot 3 (intégrité des 22 arêtes) — c'est le même chantier.
- **S seedé-brut (upgraders/lafusee) vs computed (motion19)** : incohérence pré-existante — le loop
  `seedUpgraders` seed le canon S (stale) au lieu de le calculer via `computePillarS` comme motion19.
  Le gate exclut S (computed, non authored) donc ne le voit pas. **Bornage** : câbler `computePillarS` dans
  `seedUpgraders` (comme `seed-motion19`) + supprimer le S des canons upgraders/lafusee. **Déclencheur** :
  prochaine passe seed — bas risque, ~10 lignes.

### Réseaux / suite sociale (ADR-0128/0129/0130/0131/0132/0133)

- **Inbox + insights provider-aware IG direct** : `social-inbox`/`social-insights` restent codés
  `graph.facebook.com` (une connexion `instagram` y dégrade honnêtement AUTH/OUTAGE). **Plan** :
  hôte choisi selon `metadata.provider` (même mouvement que la collecte v6.27.146). **Déclencheur** :
  vague Inbox S3 (post App Review).
- **Supervision console des `SocialConnection`** : liste cross-marques lecture seule (états ERROR,
  tokens expirés). **Effort** : faible. **Déclencheur** : à l'occasion de la prochaine passe console.
- **UI de gestion des collaborateurs** (« Équipe » sur la fiche marque console : liste, rôle,
  révocation ConfirmDialog — les Intents grant/revoke existent). **Effort** : ~½ session.
  **Déclencheur** : 2ᵉ collaborateur réel délégué.
- **Gating fin par `scopes`** (champ stocké, non consommé ; helper prêt) : activer quand un 2ᵉ rôle
  délégué réel apparaîtra.
- **Cartographie kind→zone à étendre** (ADR-0131) : kinds newsletter (zéro catalogué — l'envoi
  reste operatorProcedure par décision ADR-0129 §6) et la quasi-totalité des kinds campagnes (deny
  par défaut = sûr mais restrictif). **Déclencheur** : premier veto de zone injustifié constaté.
- **Masquage préventif des gestes hors zone** sur surfaces secondaires (campagnes, demandes) via
  `getMyAccess.writeZones` (le serveur veto déjà proprement). **Déclencheur** : prochaine passe UX cockpit.
- **Sweep light-mode page-par-page** (les 2 dashboards vérifiés ; le reste hérite des tokens).
  **Déclencheur** : à l'occasion, même pattern que la passe responsive.
- **Pont relevés → pilier E dans l'ÉDITEUR** : afficher le dernier `FollowerSnapshot` en SUGGESTION
  dans l'éditeur du pilier E (source DECLARED après validation humaine — doctrine ADR-0085 ; le
  chemin `ENRICH_E_FROM_PUBLIC_FOOTPRINT` CONNECTOR-first existe déjà). **Déclencheur** : prochaine
  passe éditeur ADVE.
- **Veille multi-sources PAR MARQUE** : sources curées par marque = nouvelle entité (ADR dédié),
  planifiée P2 avec le bouton intake. *(La veille ADVE éditable pays×secteur est shippée v6.27.230+.)*
- **Écriture boutique Shopify** (produits/prix depuis le cockpit) : décision dédiée — scopes write
  + UI, jamais implicite. **GBP + WhatsApp dans Connexions** : P2/P3 du train validé.
- **Page publique de marque enrichie** (galerie, CTA, thème) : chantier Personal Brand Cockpit (blueprint).
- **Benchmark → plan d'upgrade S1→S5** : [SOCIAL-SUITE-BENCHMARK-2026-07-12.md](../audits/SOCIAL-SUITE-BENCHMARK-2026-07-12.md)
  — chaque vague est un chantier futur distinct.

### Cockpit mission / ingestion (ADR-0144/0145/0146)

- **Pull connecteurs par provider** (Brevo, CRM…) : le motif push est prêt (`INGEST_EXTERNAL_METRIC`) ;
  le pull exige un choix opérateur (clés). **Déclencheur** : choix provider.
- **Exposition de l'ingestion comme outil MCP scopé** (au lieu de l'endpoint brut) : même chemin
  qu'ADR-0145 §4. **Déclencheur** : premier agent externe consommateur.
- **`inviteCollaborator` founder-facing** (email inconnu → user stub + invitation) : attend le
  chantier passeport fan B2. `grantCollaborator` reste requireOperator + compte existant.

### UI / i18n / a11y

- **Spec a11y funnel** : `tests/a11y/scorer.a11y.spec.ts` écrite + `@axe-core/playwright` installé —
  premier run navigateur + baselines + câblage CI restent (même posture que `overton-radar.a11y.spec.ts`
  / story 7.8 : baselines à générer contre un dev-server seedé). **Déclencheur** : session avec
  navigateur + DB seedée (les baselines `toHaveScreenshot` ne se génèrent pas dans un conteneur éphémère).
- **Story 7.4 — harness de rendu composant** (jsdom/happy-dom inexistant au repo) : décision
  d'ajouter un DOM test env = choix d'infra opérateur. **Story 7.6** — vrai diff since-last-visit
  (modèle `FounderSurfaceVisit` ou localStorage) : besoin produit à confirmer.
- **i18n hors nav cockpit** : corps de pages FR-littéraux (clés non généralisées hors nav/piliers).
  + **inventaire des dicts i18n des pages non-intake** (la garde anti-sans-accents couvre les
  littéraux rendus des surfaces scannées, pas les dicts). **Déclencheur** : prochaine passe i18n.
- **Onglets réels Livrables/Rapports** (fusion optionnelle — nav par `activePrefixes` propre).
- **`personas` (pilier D) — mismatch de forme compacte↔schéma** (même motif qu'ADR-0168) : le canon écrit
  une forme divergente de `PersonaSchema` (`name`/`rank` absents, `motivations` scalaire vs objet). Le
  renderer `Personas` est **déjà tolérant** (affiche via `str()`/normalisation array) donc c'est
  **warnings-only** à la validation gateway, PAS un bug d'affichage. **Fix propre** : union/tolérance sur
  `PersonaSchema` (comme `proofPoints`/`directionArtistique` ADR-0168). **Déclencheur** : prochaine passe
  piliers, ou si un `strictSchemaValidation` couvre un jour le pilier D.

### Intents déclarés jamais câblés (audit 2026-07-21)

Découvert en réparant `JEHUTY_FEED_REFRESH` (déclaré au registre, aucun handler → la
Gazette ne se remplissait jamais ; **CLOS** ce jour, v6.27.237). Audit croisé registre ↔
dispatch : sur 588 kinds, **91 cités 0 fois hors de leur déclaration** —

- **71 `LEGACY_*`** : placeholders auto-générés (reliquat migration strangler). **Plan** :
  supprimer ceux dont aucun routeur n'émet le kind (vérifier `emitIntentTyped`/`governedProcedure`
  d'abord — certains restent le kind d'un handler inline actif). **Déclencheur** : passe de nettoyage
  `intent-kinds.ts`.
- **10 kinds trajectoire APOGEE** (`PROMOTE_LATENT_TO_FRAGILE`…`PROMOTE_CULTE_TO_ICONE` + 5 `DEMOTE_*`)
  — **CLOS** ([ADR-0167](adr/0167-apogee-trajectory-engine.md), moteur de trajectoire) : palier officiel
  persisté `Strategy.apogeeTier` (ratchet), gate `PALIER_PROMOTION_PROOFS`, handler qui persiste (dents
  Loi 1, pas un STUB), tRPC `transitionTier`/preview/trajectory + UI console + cockpit `effectiveTier`.
  Vérifié E2E Motion19. HARD `brand-tier-transition-wired.test.ts`.
- **10 non-legacy sans handler restants** : rollbacks (`ROLLBACK_ADVE`, `ROLLBACK_RTIS_CASCADE`,
  `REVERT_RECOMMENDATIONS`, `DISCARD_RECOMMENDATIONS`) · error-vault gouverné (`CAPTURE_ERROR_EVENT`/
  `RESOLVE_ERROR_EVENT` — la capture marche par appel direct) · divers (`ACTIVATE_RETAINER`,
  `ANUBIS_OAUTH_REFRESH_TOKEN`, `COLLECT_WEB_FOOTPRINT`, `COMPUTE_LOYALTY_SCORE`, `HYPERVISEUR_PEER_INSIGHTS`).
  **Plan** : par grappe — câbler ce qui sert la mission, supprimer le reste, tracer les décisions.
  **Déclencheur** : prochaine session (les rollbacks compensateurs sont les plus proches en valeur).

### Trajectoire APOGEE — déférés phase 2 (ADR-0167 §Hors périmètre)

- **Auto-évaluation de palier** : un passage qui flag les promotions éligibles en dry-run pour revue
  opérateur (précédent `AUTO_PROMOTION_EVALUATE`). **Déclencheur** : demande produit / cron gouvernance.
- **Page dédiée** `/console/governance/palier-transitions` (ADR-0086) : vue cross-marques des décisions
  de gate. Le panneau détail-marque `<ApogeeTrajectoryPanel>` suffit au MVP. **Déclencheur** : besoin ops.
- **Divergence officiel/impliqué non surfacée** sur les ~13 autres callsites `ScoreBadge`/`classifyBrand`
  (ils montrent légitimement le palier-impliqué-par-le-score, par conception). **Déclencheur** : si un
  écran opérateur doit trancher officiel vs impliqué, y poser `effectiveTier`.
- **`superfanCount` = rows brutes** (non dé-dupliqué `personId`, ADR-0147) dans le gate — cohérent avec
  ce que lit déjà le scorer + le cron sentinels. **Déclencheur** : si le double-comptage CRM devient
  matériel pour le plafond apex.

### Phase 21 (mégasprint closure — résidus consolidés)

- **Annotation per-tool `outputSchema` Zod** : 56+ Glory tools LLM + 24 frameworks, 5 batchs
  (1 BRAND pipeline ×10 → 2 CR ×10 → 3 DC ×8 → 4 HYBRID ~28 → 5 frameworks). Tests G2/G3 en soft
  (baselines 1000/100) → HARD quand baseline=0. **Déclencheur** : chaque session NEFER en prend un
  batch quand le contexte s'y prête (annotation = lecture du prompt réel, jamais un schéma inventé).
- **Runner annotation explicite des 35 sections** (`runner: { kind, ref, dependsOn? }`) : soft
  baseline 100 ; backward-compat `resolveSectionRunner` fonctionne. **Déclencheur** : avec le batch 5.
- **Hook auto-seed à la création de Strategy** (lazy seed auto-réparateur en place — optimisation
  de latence du premier `listSections`). **Déclencheur** : chantier Strategy lifecycle.
- **Optimisations Assembler** (parallélisme borné, topoSort par `dependsOn`) : **metric-gated** —
  si p95 assembler scope=ALL > 250 s en prod.

### Phase 19 (promotions gated calibration/business — inchangé)

Les sous-clusters PARTIAL/MVP listés ADR-0052 §16 (attribution, crmCapture, overton*, mcpIngest,
learnings.*, economics.*, souverainete, negativeSpace) restent gated sur : calibration réelle
(min 30 échantillons — le writer ADR-0135 alimente désormais), choix providers CRM, et validations
business des ADRs enfants 0052-B/C/D/E/F + 0058 (k-anonymity) + 0078 (algo Overton). **Déclencheur** :
sign-off direction (cf. § Actions opérateur).

### Phase 23 (growth carry-overs, trigger-locked)

- Re-calibration cron programmée + `staleAt` sur les snapshots de calibration (drift detection).
- Predictive OvertonRadar (forecast) · cross-client Jehuty benchmarking (k≥5 anonymisé).
- Améliorations algo Overton : TOUJOURS dans `sector-intelligence/` (ADR-0078), jamais en parallèle.
- Harvesting Tarsis PAR POLITY : niveau secteur global câblé (ADR-0134) ; la granularité
  `SectorPolityAxis` exige une résolution digest→polity qui n'existe pas encore. Pondération
  CULTE/ICONE par largeur de fenêtre : seuils calibrés direction (pattern Phase 23).
- Chip d'échelle sur la console Argos (informatif — sélection safety-verdict-driven).

### Phase 16 (restes réels)

- **NSP multi-instance** : broker in-memory, pas de Redis pubsub — ship-able single-process
  (Coolify actuel = 1 process). **Déclencheur** : scale-out multi-pod.
- **FCM Web Push** : `firebase-admin` non installé (provider → `DEFERRED_AWAITING_CREDENTIALS`).
  **Déclencheur** : décision d'activer FCM + creds (cf. § Actions opérateur).

### Phase 9 (restes réels)

- **Back-fill `Strategy.manipulationMix`** des strategies pré-Phase 9 (`null`) : script
  sector-intelligence + lockdown S à écrire. **Déclencheur** : premier veto MANIPULATION_COHERENCE
  sur une strategy legacy.
- **Tests forge intégration Prisma** (DB live) : session ops avec base.

### Entity Gate (ADR-0162)

- **Lexique de mots communs éditable opérateur** (pattern canon-override ADR-0150) : le statique
  ~200 entrées couvre Top/Orange/Total ; un nom absent retombe sur la garde lexicale seule (jamais
  pire qu'avant). **Déclencheur** : 2ᵉ incident d'homonymie non couvert.

### Divers gated produit

- **Passeport fan (ADR-0158)** : rituels fan-à-fan actifs (≥ 20 passeports actifs sur une marque) ·
  récompense mission fan payée momo bout-en-bout (kind dédié + PersonIdentity du payout — à la
  PREMIÈRE mission fan réelle, doctrine ADR-0157).
- **Pari Public (ADR-0159)** : encart paris sur `/b/[slug]` (première marque avec ≥ 1 pari résolu).
- **Valorisation (ADR-0160)** : percentiles benchmark dans le dossier (gated DONNÉE :
  `MarketBenchmark` ≥ 5 échantillons réels sur le couple pays×secteur).
- **Feedback (ADR-0155)** : pièce jointe/capture = post-MVP ; bouton surfaces publiques = voie
  anonyme rate-limitée (patron `footprint.scoreInstant`) si besoin.

---

## ⚖️ Décisions de refus honnête (fermées PAR DÉCISION — ne pas rouvrir sans ADR)

- **T9 — plafond CULTE/ICONE × weak-signals Tarsis** : câblage REFUSÉ ([ADR-0137](adr/0137-oracle-stale-refresh-and-tarsis-evidence.md)) —
  le seul writer émet des tendances de MARCHÉ, pas le pull culturel de la marque ; le brancher
  gonflerait le palier sur du bruit sectoriel. Requiert un writer brand-specific (presse non payée,
  imitations, UGC de marque).
- **T14 — 91/94 séquences DRAFT** : promotion de masse REFUSÉE ([ADR-0139](adr/0139-sequence-lifecycle-stub-honest-diagnosis.md)) —
  certifier de l'inexercé = inflation malhonnête ; DRAFT ≠ défaut (exécution identique) ; les
  composers ADR-0091 sont le chemin runtime Oracle. Voie opératoire : édition gouvernée de
  `sequences.ts` pour LA séquence réellement exercée.
- **`ugcGenerationRate` dans le cult index** : exclusion MAINTENUE (ADR-0134 §B2) — mentions jamais
  remplies par le connecteur ; l'absence de mesure n'est pas un zéro.
- **§33 — distribution chiffrée du chemin LLM** *(2026-07-20)* : ne sera JAMAIS mappée vers la
  pyramide du renderer — un pourcentage inventé par le LLM affiché comme mesure = fabrication
  (ADR-0163/ADR-0134). Seul le qualitatif (déclencheurs) est mappé ; la pyramide vient du composer
  (snapshots mesurés).
- **locale OG pleinement dynamique** *(2026-07-20)* : REFUSÉ — `headers()`/`cookies()` au root
  layout forcerait le rendu dynamique de TOUTE l'app (coût perf global pour une méta). Borné shippé :
  `alternateLocale` statiques. Rouvrir seulement si Next expose une méta per-request sans
  dé-optimisation globale.

---

## 🗄️ Archive compressée (clos — l'histoire vit dans CHANGELOG.md et les ADRs)

- **Intake `processIngest` synchrone → « Load failed »** — root fix async v6.27.223 (F1, vérifié
  E2E `verify:intake-async`).
- **Campagne UX 2026-07-19** — i18n funnel ~580 chaînes fr/en/zh CLOS (v6.27.220) ; accents funnel
  restaurés (v6.27.219/223 F5).
- **galileo « Fusée non-dépendante du LLM » (PR #258)** — C5 keystone · C1 · C2 · C7 · scoring figé
  ADR-0102 · gate C6 advisory · OpenRouter 4ᵉ provider · paiement manuel WhatsApp · portail
  communauté · HYBRID fullAuto · self-host — shippés v6.27.x (cf. CHANGELOG).
- **Reclassification ROUTER-MAP / SERVICE-MAP** — CLOS 2026-07-21 : les 46 routers + 26 services
  « À classifier » intégrés aux tables par sous-système APOGEE (governors depuis manifests, statuts
  governance par scan statique — 104/122 routers voie gouvernée), headers/synthèses recomptés
  (118 répertoires / 123 fichiers), 3 manifests manquants comblés (`referral`/`tester-feedback`/
  `value-statement` — Phase 2.6 re-fermée 118/118, audit clean).
- **Phase 23 closure** — 7 epics / 53 stories SHIPPED (ADR-0077…0081), pivots superfans × Overton
  founder-visibles ; restes = § Actions opérateur (sign-off) + growth carry-overs ci-dessus.
- **Phase 21 mégasprint (F-A→F-H)** — closed ADR-0074 ; legacy `enrichOracle` DÉPOSÉ (ADR-0125) ;
  résidus vivants consolidés § Phase 21 ci-dessus.
- **Phase 19 vagues 1+2+3** — 22 sous-clusters shippés MVP (v6.19.x) ; promotions gated § Phase 19.
- **Phase 18 noyau** — bouclé (v6.18.18-25) ; résidus derrière formulaire opérateur (§ Actions).
- **Phase 17 refonte Artemis** — chantiers A-D shippés ; les « transitions calendar-locked »
  (DRAFT→STABLE 21 sequences + 24 wrappers, quality-gate soft→hard) sont SUPERSEDÉES par le
  diagnostic ADR-0139 (store D-bis jamais bâti, promotion de masse refusée — cf. § Décisions de refus).
- **Phase 0 router migration** — 100 % governedProcedure atteint (ADR-0052/0064, Sprint 7) ;
  cache reconciliation Sprint 8 : 0 caller `writePillar` bare unsafe restant, verrouillé C5.
- **Phase 16 Anubis (NSP/MCP)** — shippé ; drift refs ADR corrigés ; residuals vivants § Phase 16.
- **Phase 9 Ptah** — shippé + sprint suite (cron download, asset-impact, MCP wrapper, sentinel
  handlers) ; residuals vivants § Phase 9.
- **Vague de fermeture 2026-04-29 / audit pré-deploy 2026-05-02 / v6.1.x lessons** — historiques ;
  la lesson « chunker tout appel LLM ≥ 10 champs structurés » reste canon (pattern
  `runChunkedFieldGeneration`, `LLM_FIELDS_PER_CHUNK=10`) — les appels structurés passent depuis
  par `executeStructuredLLMCall` (ADR-0067).
- **Won't-do historiques** (V8 sandbox, multi-region, Web Components, GraphQL, Yjs full runtime) —
  inchangés.
