# ADR-0166 — Gardes d'ownership par marque sur les routeurs tRPC (middleware + verrou CI)

- **Status** : Accepted
- **Date** : 2026-07-20
- **Phase** : purge RESIDUAL-DEBT (mandat opérateur « gère le tout »)
- **Depends on** : ADR-0129 (StrategyCollaborator + chokepoint `canAccessStrategy`), ADR-0124 (spine d'émission — lane gouvernée), ADR-0004 (governedProcedure strict)
- **Supersedes** : — (généralise la garde de lecture posée le 2026-07-16 `_strategy-read-guard.ts` et les fixes ponctuels gazette Jehuty v6.27.230)

## Contexte

Recensement RESIDUAL-DEBT 2026-07-20 (suite à la fuite gazette Jehuty, prouvée exploitable,
colmatée v6.27.230) : **56 routeurs sur 123** contenaient des procédures `protectedProcedure`
acceptant un `strategyId` (ou un id d'entité résoluble en marque) **sans aucune vérification
d'accès** — tout compte authentifié pouvait lire, et dans certains cas muter, les données
d'une autre marque en passant un id arbitraire.

Le recensement fichier-niveau sous-estimait la classe : le scan **au niveau procédure**
(spans entre déclarations) a révélé des fuites dans des fichiers « déjà gardés ailleurs » —
dont `cockpit-router.dashboard` (piliers complets + missions + campagnes), 11 procédures
`glory.*` (outputs des tools = contenu de marque, santé des piliers), `jehuty.dashboard`
(strategyId optionnel : ni vérifié quand fourni, ni scopé quand absent), 4 `social.*`
(métriques + snapshots), `strategy.validateSynthesis` (mutation de validation du pilier S),
`campaign-manager.listBriefsForStrategy`/`getSimulatorData`, `messaging.getConversation`
(historique complet de N'IMPORTE QUELLE conversation par id) et l'arbre de marque entier
(`brand-node.*` : structure, noms, **piliers effectifs par nodeId**).

## Décision

### 1. Middleware canonique `strategyScopedProcedure`

`src/server/trpc/middleware/strategy-scope.ts` :

- `strategyScopedProcedure` — remplace `protectedProcedure` quand l'input a un `strategyId`
  REQUIS top-level. Lit le raw input (`getRawInput`), refuse l'appel sans `strategyId`
  (BAD_REQUEST), résout l'accès via le chokepoint ADR-0129 (`getOperatorContext` +
  `canAccessStrategy` : owner / opérateur / collaborateur ACTIVE / god-mode), 403 sinon.
- `assertRawStrategyScope(userId, raw, { optional })` — pour les bases composées
  (`auditedProcedure(protectedProcedure, …).use(…)` — campaign-tracker,
  deliverable-orchestrator, source-classifier) et les inputs à `strategyId` optionnel
  (payment, market-study-ingestion, messaging.createConversation).
- `accessibleStrategyIds(userId)` — ids des marques accessibles (`null` = ADMIN, pas de
  filtre) pour scoper les modèles à lien `strategyId` **lâche** (sans relation Prisma :
  `Conversation`, `CrmContact`, `ActionCostEstimate`) via `strategyId: { in: ids }`.

### 2. Application (85 swaps de builder + gardes inline)

- **Catégorie A (strategyId requis)** : 85 procédures / 30 routeurs basculées
  `protectedProcedure` → `strategyScopedProcedure` (notoria, oracle, pillar ×14,
  brand-vault, signal, cult-index, boot-sequence, strategy-presentation, value-report,
  advertis-scorer, guidelines, analytics, sequence-vault, staleness, framework, driver,
  ambassador, attribution-router, glory ×10, cockpit-router.dashboard, …).
- **Catégorie B (strategyId optionnel)** : garde-si-fourni + scope-si-absent — les listes
  ne renvoient plus jamais du cross-marques (`contract.list`, `driver.list`,
  `intervention.list`, `process.list`, `newsletter.subscribersList`, `thot.estimateHistory`,
  `messaging.listConversations`/`getUnreadCount`, `jehuty.dashboard`) ; asserts optionnels
  sur `payment.initSubscription`/`initManualSubscription` et
  `market-study-ingestion.confirm`/`preview`/`runResearch`.
- **Catégorie C (résolution par entité)** : `driver.getSocialConnection`/`getMediaConnection`
  (driverId → strategy), `glory.getOutput` (outputId → strategy),
  `messaging.assertConversationAccess` (participant OU marque accessible OU ADMIN),
  `brand-node.assertNodeAccess` (ADMIN · même opérateur · marque attachée accessible ·
  marque du caller sur la chaîne ancêtre/descendant — cas founder commutator/breadcrumbs),
  appliqué à 10 procédures de l'arbre.
- **Flips de lane** (agrégats cross-marques = surfaces console) :
  `error-vault.oracleIncidents` et `knowledge-graph.getFrameworkRanking` → `operatorProcedure`.
- **Champs morts retirés** : `strategyId` jamais consommé sur `framework.diagnosticBySymptom`,
  `market-study.list`, `market-study-ingestion.list` (pool marché global par conception).

### 3. Verrou CI HARD

`tests/unit/governance/strategy-ownership-guard.test.ts` — scan statique au niveau
procédure : tout span `protectedProcedure` (ou base `audited…` non enveloppée) référençant
`strategyId` doit contenir un motif de garde (`strategyScopedProcedure` n'est pas concerné —
builder différent ; helpers `assert…`/`enforce…` suffixés Access/Read/Write/Scope ;
chokepoints `canAccessStrategy`/`scope*` ; `accessibleStrategyIds` ; `resolveOperatorId` ;
`getOperatorContext`) OU figurer dans une allowlist justifiée qui ne peut que décroître
(3 entrées : `deliverable-orchestrator.listSupportedKinds` statique,
`strategy.myDelegatedBrands` et `strategy.getMyAccess` — requêtes par caller uniquement).

## Conséquences

- La classe de fuite « strategyId arbitraire » est fermée sur les 123 routeurs et ne peut
  plus réapparaître silencieusement (le test casse le build).
- Sémantique d'erreur : 403 explicite sur les gets/mutations ; silent-empty (intersection
  de scope) sur les listes — cohérent avec l'existant.
- Les lanes `operatorProcedure`/`adminProcedure`/`governedProcedure` restent exemptes par
  conception (opérateurs cross-marques ; spine ADR-0124 + audit requireOperator PR #447).
  `publicProcedure` reste vérifiée au cas par cas (capacité par token — intake, verdict).
- Limite honnête : l'analyse du verrou est textuelle — un helper de garde no-op le
  tromperait ; la sémantique des helpers `assert…`/`enforce…` relève de la revue de code.
- Les lectures **métadonnées pures** de brand-node (natures/applicabilité tools, stats de
  cache) restent non gardées — aucune donnée de marque exposée.
- Suivi restant tracé RESIDUAL-DEBT : audit d'ownership équivalent sur les mutations
  `governedProcedure` founder-lane (requireOperator=false) — classe distincte, spine déjà
  auditée PR #447, à balayer procédure par procédure.
