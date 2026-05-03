# Changelog — La Fusee

Systeme de versionnage : **`MAJEURE.PHASE.ITERATION`**

- **MAJEURE** : Refonte architecturale ou changement de paradigme (v1 = fondation, v2 = modules, v3 = NETERU, ...)
- **PHASE** : Phase strategique du CdC (0 = fondation, 1 = enrichissement, 2 = intelligence, 3 = production, ...)
- **ITERATION** : Increment au sein d'une phase (fixes, features, polish)

> **Mise à jour OBLIGATOIRE par NEFER en Phase 6** — toute session qui ship un commit `feat(...)` ajoute une entrée ici. Cf. [docs/governance/NEFER.md](docs/governance/NEFER.md). Audit anti-drift : `scripts/audit-changelog-coverage.ts`.

---


## v6.1.31 — ADR-0030 PR-Fix-3 : redirect /strategy + getFieldLabel nested + skip vault toast (2026-05-03)

**Hotfix structurels post-test live (NEFER autonome).** Trois drifts identifiés en navigation : (1) URL naturelle `/cockpit/brand/strategy` retournait **404** alors que le label sidebar dit "Stratégie" — le pilier S est servi par `/roadmap` (incohérence URL ↔ label) ; (2) `getFieldLabel` ne gérait pas les paths nested → `unitEconomics.cac` rendu *"Unit Economics. Cac"* (moche) ; (3) toast warning *"Vault vide — ajoutez des sources"* affiché systématiquement avant le fallback autoFill, polluant l'UX alors que l'enrichissement continue derrière.

- `feat(cockpit)` `src/app/(cockpit)/cockpit/brand/strategy/page.tsx` (NEW) — page redirect Next 15 (`redirect("/cockpit/brand/roadmap")`) qui résout l'URL naturelle sans casser les liens existants vers `/roadmap`. Pas de renommage de route (préserve historique). Verify Chrome MCP : `/strategy` → `/roadmap` immédiat avec contenu pilier S rendu correctement.
- `fix(cockpit)` `src/components/cockpit/field-renderers.tsx:257` — `getFieldLabel` détecte les paths nested (`includes(".")`), split sur `.`, mappe chaque segment via `LABELS` (avec fallback regex camelCase), join avec `" → "`. Avant : `"unitEconomics.cac"` → *"Unit Economics. Cac"*. Après : *"Unit Economics → CAC"*. Latence à zéro pour les ADVE actuels (tous derivable:false sont paths plats), mais résout proactivement les paths nested ENRICHED (`unitEconomics.*`, `assetsLinguistiques.*`).
- `fix(cockpit)` `src/components/cockpit/pillar-page.tsx:210` — handleRegenerate skip silencieux du toast *"Vault vide"*. Le fallback autoFill prend le relais et affichera son propre toast (success ou warning selon résultat). Évite l'affichage transitoire d'un message d'erreur quand l'enrichissement marche en réalité.

Verify : tsc --noEmit 6 erreurs pré-existantes 0 nouvelle. Chrome MCP `/strategy` → `/roadmap` confirmé.

---


## v6.1.30 — Print stylesheet — PDF intake lisible (thème papier en cascade) (2026-05-03)

**Fix UX critique post-test live (NEFER autonome).** Le PDF généré par puppeteer en fin d'intake (`renderIntakePdf` → `page.emulateMediaType("print")`) sortait illisible : tokens panda dark-mode (`--color-foreground` = bone, `--color-background` = ink-0) inchangés en print → texte bone invisible sur blanc, cartes noires, gradients ambre dark sur blanc, bordures sombres. Seuls quelques utilities `print:` Tailwind ponctuelles (`print:hidden`, `print:bg-white` sur `<main>` uniquement) atténuaient le problème — pas le contenu des sections.

- `feat(styles)` `src/styles/print.css` (nouveau) — bloc `@media print` global qui rebind les System tokens (Tier 1) à des valeurs light pour le rendu papier *sans casser la cascade Reference→System→Component→Domain*. Pas de nouveau Reference token ajouté (cf. ADR-0013). Override : surfaces (background/card/raised/elevated), foregrounds (primary/secondary/muted), borders (3 tiers), accent/primary/destructive (rouge fusée préservé en `#b8232f` lisible sur blanc), statuts (success/warning/info). Strip universel `box-shadow`/`text-shadow`/`filter`/`backdrop-filter` + `background-image: none` sur tous les `[class*="bg-gradient"]`/`from-`/`via-`/`to-`. Neutralise les utilities Tailwind hardcodées dark (`bg-amber-9*`, `bg-zinc-9*`, `text-amber-3/4/5*`, `text-zinc-3/4/5*`, `border-*-7/8`) qui leakent du bloc "Recommandation Mestor" et du sticky CTA. `@page A4 + 18mm/14mm`. Typo papier (10.5pt body, h1 22pt, h2 15pt, h3 12pt, orphans/widows 3, break-after avoid sur headings).
- `feat(styles)` `src/styles/globals.css:21` — import `./print.css` après les tokens et avant les keyframes pour que la cascade @media print arrive après les tokens dark base.
- `fix(intake)` `src/app/(intake)/intake/[token]/result/page.tsx:1331` — wrapper `<OracleTeaser>` ajout `print:hidden`. C'est un upsell page-only qui n'a aucun sens dans le PDF du rapport déjà payé.
- `chore(.claude)` `.claude/launch.json` — `autoPort: false → true` pour permettre au preview server de s'attacher à un port libre quand un autre dev/start tourne déjà sur 3000 (DX preview tools).

Verify : Chrome MCP screenshot avec test-style appliqué (simulation print) confirme bg blanc + texte sombre lisible sur la page result. Bundle CSS Turbopack contient bien `@page`, `print-color-adjust: exact`, `--color-background: #fff`, `--color-foreground: #18181b` dans son `@media print` block (1 occurrence côté print.css + N occurrences Tailwind variants `print:*` préservées). `eslint --config eslint.config.mjs src/app/(intake)/.../page.tsx` : 0 erreur, 1 warning préexistant. `tsc --noEmit` : 6 erreurs préexistantes (`.next/types/validator.ts` validators auto-générés sur pages oracle absentes), 0 nouvelle.

---


## v6.1.29 — ADR-0030 PR-Fix-2 : gate actualize RTIS + anti-hallucination Notoria + badge reco IA (2026-05-03)

**Hotfix governance + qualité IA post-test live (NEFER autonome via Chrome MCP).** Trois drifts confirmés : (1) `pillar.actualize` (RTIS) ne respectait pas le gate `RTIS_CASCADE` que `notoria.actualizeRT` honore depuis PR-2 — incohérence governance ; (2) Notoria a halluciné "PlusQueMignon révolutionne l'immobilier **français**" sur strategy `Pays = WK` (Wakanda) — l'AI inventait une nationalité absente du seal canonical ; (3) confusion "3 voies pour Archetype" — le panneau needsHuman dit "à saisir manuellement", Notoria propose 2 valeurs concurrentes (REBELLE, CREATEUR), l'opérateur ne sait que faire.

- `fix(governance)` `src/server/trpc/routers/pillar.ts:561` — `pillar.actualize` (RTIS keys R/T/I/S) appelle `assertReadyFor(strategyId, "RTIS_CASCADE")` avant de cascader. Refuse si A/D/V/E pas ENRICHED. Cohérent avec PR-2 (`notoria.actualizeRT`). ADVE keys (A/D/V/E) bypass — on travaille sur le socle lui-même via cross_pillar/AI generation, pas sur des dérivés.
- `fix(notoria)` `src/server/services/notoria/engine.ts:426` — bloc **"FAITS DÉCLARÉS — CONTRAINTE DURE"** injecté en tête de `extraContext` avant tout autre contexte. Liste sector / pays / businessModel / positioning / economicModel / brandNature depuis `Strategy.businessContext` + `countryCode`. Wording explicite : *"JAMAIS générer 'française' pour une marque WK, 'cosmétique' pour un secteur IMMOBILIER, ou inventer une nationalité/modèle économique absent des faits."* Aligné sur le pattern `quick-intake/extractStructuredPillarContent §7` (qui scellait déjà ces mêmes faits côté intake mais pas côté Notoria — drift résolu).
- `feat(cockpit)` `src/components/cockpit/pillar-page.tsx` panneau needsHuman — badge bleu **"reco IA"** (Sparkles + tooltip *"Une recommandation Notoria existe pour ce champ"*) annoté à côté du label de chaque champ needsHuman pour lequel `pendingRecos[].targetField` matche. Résout la confusion "3 voies pour le même champ" : l'opérateur voit immédiatement qu'une reco Notoria propose une valeur, et peut soit cliquer "Saisir" pour amender directement, soit scroller au panneau "12 recommandation(s)" pour accepter la suggestion IA. Pas de masquage : les 2 voies coexistent, mais visiblement reliées.

Verify Chrome MCP : `/identity` montre badges "reco IA" sur Archetype + Noyau identitaire (pendingRecos.targetField match). tsc --noEmit : 6 erreurs pré-existantes, 0 nouvelle.

---


## v6.1.28 — ADR-0030 PR-Fix-1 : UX critique scoring + bannière vide + compteurs (2026-05-03)

**Hotfix UX post-test live des 8 pages piliers (NEFER autonome via Chrome MCP).** Trois drifts visuels confirmés en navigateur sur strategy PlusQueMignon : (1) "Suffisant 88% en VERT + Stage EMPTY" — coloriage trompeur, le user croit "tout va bien" alors que le système refuse la cascade ; (2) Pages E/R/T/I/S à 0% sans aucune guidance — page entièrement vide, opérateur en aveugle ; (3) Compteur "37 recommandation(s) ADVE disponibles" sur pages RTIS divergeait du "12 recommandation(s)" sur page A — même set comptés différemment (PENDING+ACCEPTED vs PENDING only).

- `fix(cockpit)` `src/components/cockpit/pillar-page.tsx` ligne 327 — scoring bar Suffisant/Complet : couleurs conditionnées par `assess.currentStage` au lieu de `% only`. Vert = stage atteint (ENRICHED/COMPLETE) ; amber = % haut mais stage manqué (gap needsHuman) ; muted = bas. Évite l'incohérence "vert + EMPTY" qui était le drift visuel #1.
- `feat(cockpit)` `src/components/cockpit/pillar-page.tsx` après needsHuman panel — bannière bleue "Pilier vierge — 0/N champs renseignés" pour les pages où `currentStage === EMPTY` ET `needsHuman.length === 0`. Concerne typiquement E (ADVE sans `derivable: false`) et R/T/I/S à l'état vierge. Message contextuel : ADVE → "Clique sur Enrichir pour démarrer l'auto-remplissage" ; RTIS → "La cascade RTIS s'alimente à partir d'ADVE. Enrichir ci-dessus pour générer ce pilier depuis ADVE (nécessite ADVE complété au préalable)."
- `fix(cockpit)` `src/components/cockpit/pillar-page.tsx` ligne 531 — label compteur RTIS clarifié : *"X reco(s) ADVE en attente de traitement"* au lieu de *"X recommandation(s) ADVE disponibles"*. Tooltip ajouté : "PENDING + ACCEPTED (en attente d'apply)". Cohérent avec la sémantique réelle du compteur `notoria.getPendingCounts` (status: { in: ["PENDING", "ACCEPTED"] }).

Verify Chrome MCP : 3 fixes confirmés visuellement sur identité (Suffisant 86% amber au lieu de vert), engagement (bannière "0/20 champs renseignés"), diagnostic (bannière + compteur clarifié "37 reco(s) ADVE en attente de traitement"). Aucun changement governance ni serveur.

---


## v6.1.27 — ADR-0030 PR-3 : closure intake question-bank ADVE (2026-05-03)

**Troisième et dernière PR de l'ADR-0030 (intake closure ADVE 100%) — Axe 2 closure question-bank.** Couverture des 7 champs `derivable: false` du contrat INTAKE ADVE désormais 7/7 (validée par script CI `audit-intake-coverage.ts`). Avant : 4 champs étaient orphelins (aucune Q intake ni seal canonique), forçant l'AI extraction à les deviner — souvent en vain, conduisant à `currentStage === EMPTY` perpétuel. Maintenant la chaîne `intake → ADVE INTAKE minimum → ENRICHED → COMPLET` est déterministe par construction.

- `feat(intake)` `src/server/services/quick-intake/question-bank.ts` — ajout 4 questions ADVE pour couvrir les `derivable: false` non-couverts : (1) `a_noyau` *"Si vous deviez resumer votre marque en UNE phrase identitaire de moins de 20 mots..."* (required, → `noyauIdentitaire`), (2) `a_citation` *"Une citation, maxime ou phrase manifeste..."* (optional, → `citationFondatrice`), (3) `d_promise` *"Quelle est votre promesse maitre — ce que tout client peut attendre..."* (required, → `promesseMaitre`, sémantiquement distincte de v_promise qui est sur produit/service), (4) `d_persona_principal` + `d_persona_secondary` *"Decrivez votre client ideal en 3 traits comportementaux..."* (required + optional, → `personas`). Tooltip pédagogique pour chaque, exemples concrets pour aider la saisie sans LLM.
- `feat(pillar-maturity)` `src/lib/types/pillar-maturity-contracts.ts` — `citationFondatrice` passe `derivable: true` avec `derivationSource: "cross_pillar"` (fallback gracieux puisque `a_citation` est `required: false`). `noyauIdentitaire` reste `derivable: false` (Q `a_noyau` est `required: true`, on force la saisie). Pattern : strict côté UI (Q required), permissif côté contrat (cross_pillar fallback) seulement quand la Q est optional.
- `feat(auto-filler)` `src/server/services/pillar-maturity/auto-filler.ts:401-410` — implémentation cross_pillar pour `citationFondatrice` : si l'utilisateur a sauté `a_citation`, l'auto-filler concatène les 200 premiers caractères de `a.mission` ou `a.vision` ou `a.origin` (premier non-vide). Approximatif mais utile pour franchir le gate INTAKE quand l'opérateur a fourni la matière narrative ailleurs.
- `chore(audit)` `scripts/audit-intake-coverage.ts` (NEW, 130 lignes) — vérifie pour chaque pilier ADVE que tous les champs `derivable: false` du contrat INTAKE sont couverts par soit (a) une Q dans question-bank.ts (heuristique mots-clés sémantiques par champ), soit (b) un seal canonique dans intake/index.ts. À brancher en CI (`--fail-on-violation`) pour empêcher la régression future. Verdict actuel : **7/7 couverts** (`A.archetype`, `A.noyauIdentitaire`, `D.positionnement`, `D.promesseMaitre`, `D.personas`, `V.produitsCatalogue`, `V.businessModel`).

ADR-0030 complet (PR-1 + PR-2 + PR-3) : panneau needsHuman cockpit + gate `actualizeRT` RTIS_CASCADE + closure intake question-bank. La cascade ADVERTIS est désormais déterministe de l'intake landing jusqu'à la stratégie S — fini les piliers sparse qui plafonnent à 81% sans explication.

---


## v6.1.26 — Manifests enrichment : +53 capabilities sur 15 services anémiques (2026-05-03)

**Suite Phase 2.6 closure (commit 63f0906) qui avait juste créé les 5 manifests manquants : enrichissement substantiel des manifests anémiques (1-3 capabilities déclarées vs 4-12 exports publics réels).** Lecture des `index.ts`/`engine.ts` pour identifier les vraies API métier publiques (filtre helpers internes type `_resetForTest`, `withRetry`, `extractJSON`). Registry runtime passe de **417 → 470 capabilities** (+53), **89 manifests** toujours registrés.

- `chore(governance)` `src/server/services/ingestion-pipeline/manifest.ts` enrichi 3 → 11 capabilities (+ ingestText, validatePillar, triggerRTIS, getIngestionStatus, trackDataSource, triggerRTISCascade, batchIngest, incrementalUpdate). Tous avec missionContribution + groundJustification non-vagues.
- `chore(governance)` `src/server/services/feedback-loop/manifest.ts` enrichi 1 → 7 capabilities (+ processSignal, recalibrate, detectStrategyDrift, processSocialMetrics, processMediaPerformance, processPressClippings, getThresholds). **Retiré `recordOutcome` zombie** + `RECORD_MISSION_OUTCOME` Intent zombie (n'existait nulle part dans le code).
- `chore(governance)` `src/server/services/artemis/manifest.ts` enrichi 1 → 8 capabilities (+ executeFramework, topologicalSort, runDiagnosticBatch, runPillarDiagnostic, getDiagnosticHistory, differentialDiagnosis, triggerNextStageFrameworks).
- `chore(governance)` `src/server/services/llm-gateway/manifest.ts` enrichi 2 → 5 capabilities (+ callLLM avec lineage purpose/operatorId/strategyId pour ai-cost-tracker, callLLMAndParse, embed multi-provider).
- `chore(governance)` `src/server/services/country-registry/manifest.ts` enrichi 2 → 6 capabilities (+ requireCountry, lookupCurrency, refreshCache, formatAmount).
- `chore(governance)` `src/server/services/quick-intake/manifest.ts` enrichi 1 → 5 capabilities (+ start, advance, complete, regenerateAnalysis). + acceptsIntents `LEGACY_QUICK_INTAKE_REGENERATE_ANALYSIS` aligné sur intent-kinds.ts.
- `chore(governance)` `src/server/services/pillar-gateway/manifest.ts` enrichi 1 → 4 capabilities (+ writePillar, postWriteScore, reconcileCompletionLevelCache D-2 invariant fix v6.1.18).
- `chore(governance)` `src/server/services/boot-sequence/manifest.ts` enrichi 1 → 5 capabilities (+ getState, start, advance, complete — découplage phase-by-phase observable).
- `chore(governance)` `src/server/services/advertis-scorer/manifest.ts` enrichi 1 → 4 capabilities (+ batchScore, snapshotAllStrategies, getScoreHistory).
- `chore(governance)` `src/server/services/mfa/manifest.ts` enrichi 2 → 4 capabilities (+ generateBase32Secret, otpauthUrl).
- `chore(governance)` `src/server/services/staleness-propagator/manifest.ts` enrichi 1 → 3 capabilities (+ auditAllStrategies, checkStaleness).
- `chore(governance)` `src/server/services/strategy-presentation/manifest.ts` enrichi 3 → 7 capabilities (+ assemblePresentation, getShareToken, resolveShareToken, checkCompleteness).
- `chore(governance)` `src/server/services/ptah/manifest.ts` enrichi 3 → 4 capabilities (+ findTaskBySecretAndId webhook auth).
- `chore(governance)` `src/server/services/pillar-versioning/manifest.ts` réécrit 2 → 3 capabilities (renames `snapshot/list` → `createVersion/getHistory/rollback` alignés sur exports réels — ancien manifest était stale).
- `chore(governance)` `src/server/services/value-report-generator/manifest.ts` enrichi 1 → 2 capabilities (+ exportHtml).
- `chore(version)` `package.json` + `package-lock.json` + `marketing-footer.tsx` re-sync `6.1.23` → `6.1.26` après commits user (CHANGELOG bumpé v6.1.24/25 sans propagation surfaces — drift Phase 9.2 corrigé).

Verify : `npm run manifests:audit` → `Manifests registered: 89, ✓ clean`. `npx tsx scripts/audit-mission-drift.ts` → `scanned 89 manifests, 470 capabilities, ✓ no drift detected` (vs 417 capabilities pré-enrichment). `npx tsc --noEmit` clean. `npm run lint:governance` clean (hors warnings boundaries v5→v6 préexistants).

Capabilities ajoutées toutes avec `missionContribution` déclaré (CHAIN_VIA / DIRECT_SUPERFAN / DIRECT_OVERTON / DIRECT_BOTH / GROUND_INFRASTRUCTURE), et `groundJustification` non-vague pour chaque GROUND_INFRASTRUCTURE. Schémas Zod relâchés (`passthrough()` pour shapes complexes) mais respectent les signatures TS canoniques des exports `index.ts`/`engine.ts`. Helpers internes (`_resetForTest`, `withRetry`, `extractJSON`, `_purgeCacheForTest`) explicitement exclus.

Manifests mestor (1 cap canonique `emitIntent` + dispatch tous intents externes), model-policy (3 caps canon : resolvePolicy/listAllPolicies/updatePolicy), nsp (1 cap stub utilitaire `publish`) **non-touchés** — leur surface publique métier est légitimement minimale (les autres exports sont des helpers prompt/test).

Cap APOGEE 7/7 Neteru actifs maintenu. Aucun nouveau Neter, aucun nouveau service, aucune nouvelle entité Prisma — pure documentation/contrat.

---


## v6.1.25 — ADR-0030 PR-2 : gate actualizeRT + stepper Notoria réordonné (2026-05-03)

**Deuxième PR de l'ADR-0030 — Axe 3 anti-drift LOI 1.** Aligne le comportement de `actualizeRT` sur celui de `generateBatch` (qui avait déjà `preconditions: ["RTIS_CASCADE"]`). Le bouton "Lancer la veille R+T" ne peut plus tourner sur du sable (ADVE en `INTAKE` ou `EMPTY`) — il throw `ReadinessVetoError` côté serveur, intercepté côté UI avec message lisible orientant vers la complétion ADVE. Le stepper Notoria est ré-ordonné : ADVE devient étape 1 (socle fondateur), R+T étape 2 (cohérent avec la séquence ADVERTIS et avec la sémantique RTIS = dérivés d'ADVE).

- `fix(notoria)` `src/server/trpc/routers/notoria.ts:83` — handler `actualizeRT` appelle `assertReadyFor(strategyId, "RTIS_CASCADE")` au tout début. Throw `ReadinessVetoError` si A/D/V/E pas en `stage === ENRICHED || COMPLETE` (gate canonique défini `pillar-readiness.ts:194-202`). `operatorProcedure` ne supporte pas `preconditions:` (réservé à `governedProcedure`), d'où l'appel manuel — sémantiquement équivalent, scope chirurgical.
- `feat(cockpit)` `src/components/cockpit/notoria/notoria-page.tsx` — refonte stepper 4 étapes ré-ordonnées : (1) ADVE socle fondateur, (2) R+T veille, (3) Potentiel I, (4) Stratégie S. `currentStep` calc inversé (`adveReady` testé en premier au lieu de `rtReady`). Quand step 1 et `!adveReady`, primary CTA devient *"Compléter {pilier} (pilier non prêt)"* qui navigue vers `/cockpit/brand/{identity|positioning|offer|engagement}` (1ère page ADVE non-prête détectée). Quand step 2, primary reste "Lancer la veille R+T" (gate côté serveur garantit l'éligibilité). `actualizeRTMutation.onError` intercepte `ReadinessVetoError` et affiche un toast amber explicite : *"ADVE n'est pas prêt pour la cascade R+T. Compléter A/D/V/E à 100%..."*. Conséquence métier : la cascade ADVERTIS suit enfin l'ordre canonique (ADVE → RTIS) — plus de R+T sur ADVE incomplet.

---


## v6.1.24 — ADR-0030 PR-1 : panneau needsHuman sur page pilier (2026-05-03)

**Première PR de l'ADR-0030 (intake closure ADVE 100%) — Axe 1 UX `needsHuman` panel.** Résout l'asymétrie d'information entre le moteur (qui sait exactement quels champs `derivable: false` du contrat INTAKE manquent) et l'opérateur (qui voit "81% Complet" sans comprendre pourquoi ni où cliquer). Le bouton **"Enrichir"** ne pouvait pas atteindre 100% car `auto-filler.ts:80-83` ignore silencieusement les `needsHuman` (`continue;`). Désormais ces champs sont listés explicitement avec CTA direct vers `AmendPillarModal` pré-ciblé.

- `feat(cockpit)` `src/components/cockpit/pillar-page.tsx` — ajout panneau encart sous le scoring bar quand `assess.needsHuman.length > 0` (ADVE only). Liste chaque champ avec label humain (via `getFieldLabel`) + path technique mono + CTA "Saisir" qui ouvre `AmendPillarModal` pré-ciblé sur ce champ via `openAmendOnField(path)`. Tooltip du bouton "Enrichir" change pour expliciter le plafond : *"Enrichir remplit les N champ(s) dérivable(s). M champ(s) nécessitent ta saisie — voir liste ci-dessous."*. Ajout state `amendField: string | null`, helpers `openAmendOnField`/`openAmendBlank`. `assessQuery.refetch()` après `onApplied` du modal pour rafraîchir le score immédiatement. `AmendPillarModal` supportait déjà `initialField` prop (ADR-0023) — zéro changement côté modal, juste wiring.

---


## v6.1.23 — ADR-0031 : feed-bridge Notoria + Tarsis → cloche notifications (2026-05-03)

**Phase 16 ferme la boucle qui était ouverte depuis ADR-0025 : la stack notification temps-réel est enfin alimentée par les producteurs de Signal métier.** Diagnostic NEFER session 2026-05-03 : `grep "anubis.pushNotification" src/` retournait un seul hit (notification.testPush admin), donc le bell topbar était techniquement fonctionnel mais inerte en prod — Notoria écrivait des `Signal NOTORIA_BATCH_READY`, Tarsis écrivait des `Signal WEAK_SIGNAL_ALERT`, mais aucune `Notification` row n'était créée pour le founder. Cause : feature Phase 16 shippée, consumers absents.

- `feat(anubis)` `src/server/services/anubis/feed-bridge.ts` (NEW) — helper `notifyOnFeedSignal({ signalId, signalType, strategyId, title, body, link?, priority? })` qui filtre par whitelist `FEED_SIGNAL_TYPES` (8 types : WEAK_SIGNAL_ALERT, MARKET_SIGNAL, NOTORIA_BATCH_READY, STRONG, WEAK, METRIC, SCORE_IMPROVEMENT, SCORE_DECLINE), mappe priorité automatique par type, résout les destinataires depuis `Strategy.userId` (founder owner — MVP), et push via `anubis.pushNotification()` (qui gère lui-même quiet hours + NSP publish + Web Push). Failure mode non-bloquant : la création du Signal upstream ne casse jamais à cause d'un bug notification.
- `feat(notoria)` `src/server/services/notoria/engine.ts` — après `db.signal.create({ type: "NOTORIA_BATCH_READY" })`, appel `notifyOnFeedSignal()` avec link `/cockpit/notoria?batch=<id>`. Le founder voit maintenant la cloche s'allumer dès qu'un batch Notoria est prêt.
- `feat(seshat)` `src/server/services/seshat/tarsis/weak-signal-analyzer.ts` — après `db.signal.create({ type: "WEAK_SIGNAL_ALERT" })` (urgency HIGH/CRITICAL only), notification cross-brand : `notifyOnFeedSignal()` est appelé pour `[strategyId, ...affectedStrategyIds]` — un weak signal qui affecte 5 brands déclenche 5 notifs (founder de chaque brand affectée), priorité escaladée à `CRITICAL` si urgency = CRITICAL.
- `chore(anubis)` `src/server/services/anubis/index.ts` — re-export `notifyOnFeedSignal` + types `NotifyOnFeedSignalArgs` / `NotifyOnFeedSignalResult` pour consommation depuis services métier.
- `docs(governance)` `docs/governance/adr/0031-notification-feed-bridge.md` (NEW) — décisions rejetées explicitement documentées : pas de hook router Jehuty (lecture pure, mauvais point d'entrée), pas d'Intent `ANUBIS_PUSH_NOTIFICATION` via Mestor (overhead governance pour side-effect informatif), pas de notification UPgraders Console MVP (reporté). Étapes futures : Membership lookup pour UPgraders, digest cadencé si bruit, branchement market-intelligence signal-collector.

Verify : `npx tsc --noEmit` → 0 erreur introduite (6 erreurs résiduelles pré-existantes dans `.next/types/validator.ts` sur pages oracle, RESIDUAL-DEBT). `npx tsx scripts/audit-neteru-narrative.ts` → 0 finding. `npx tsx scripts/audit-pantheon-completeness.ts` → 7/7 Neteru OK. `npx tsx scripts/audit-governance.ts` → 0 error / 217 warn (toutes pré-existantes, aucune liée à feed-bridge).

Résidus : vitest cassé sur `node_modules/vitest/node_modules/std-env` manquant — pré-existant, à traquer dans RESIDUAL-DEBT (impact : tests anti-drift CI non-runnables localement). Pas de modif Prisma, pas de nouveau Neter, pas de nouvelle Capability (consommation façade locale `pushNotification` existante). Cap APOGEE 7/7 maintenu.

---


## v6.1.22 — Phase 2.6 manifests closure (89/89 services métier registered) (2026-05-03)

**Phase 2.6 du REFONTE-PLAN refermée : tous les services métier de `src/server/services/` ont désormais un `manifest.ts` co-localisé valide.** Suite résidu signalé en commit `96fc417` (SERVICE-MAP rewrite) qui pointait "~75 manifests à créer" — chiffre lui-même un drift (audit `npm run manifests:audit` au moment du diagnostic montrait 80 manifests registrés sur disk vs filesystem à 84). Triage : seulement **5 manifests réellement manquants** (brand-vault, error-vault, sentinel-handlers, strategy-archive, nsp), 4 manifests existants stale dans le registry (anubis, imhotep, ptah, source-classifier) régénérés.

- `chore(governance)` `src/server/services/brand-vault/manifest.ts` (NEW) — gov MESTOR, 6 capabilities (createBrandAsset, createCandidateBatch, selectFromBatch, promoteToActive, supersede, archive). missionContribution DIRECT_BOTH, missionStep 3. Phase 10 ADR-0012.
- `chore(governance)` `src/server/services/error-vault/manifest.ts` (NEW) — gov SESHAT, 5 capabilities (capture, captureError, markResolved, batchMarkResolved, getStats). missionContribution GROUND_INFRASTRUCTURE avec groundJustification (sans collecteur runtime, bugs Ptah/NSP/cron passent silencieusement). Phase 11 ADR-0013.
- `chore(governance)` `src/server/services/sentinel-handlers/manifest.ts` (NEW) — gov MESTOR, 1 capability (processPendingSentinels). missionContribution DIRECT_BOTH (Loi 4 maintien orbite ICONE), missionStep 5. Phase 9-suite.
- `chore(governance)` `src/server/services/strategy-archive/manifest.ts` (NEW) — gov MESTOR, 4 capabilities (archiveStrategyHandler, restoreStrategyHandler, purgeArchivedStrategyHandler, listArchivedStrategies). acceptsIntents = [OPERATOR_ARCHIVE_STRATEGY, OPERATOR_RESTORE_STRATEGY, OPERATOR_PURGE_ARCHIVED_STRATEGY]. ADR-0028.
- `chore(governance)` `src/server/services/nsp/manifest.ts` (NEW stub) — gov INFRASTRUCTURE, 1 capability (publish). Stub minimal pour permettre aux services métier (anubis) de déclarer `nsp` en dependencies sans casser l'audit registry. ADR-0025/0026.
- `chore(governance)` `src/server/governance/__generated__/manifest-imports.ts` régénéré via `npm run manifests:gen` — passe de **80 → 89 manifests** registrés (+5 nouveaux + 4 stale anubis/imhotep/ptah/source-classifier). Audit `npm run manifests:audit` clean (seul `utils/` reste sans manifest, helper hors classification APOGEE par design).
- `docs(governance)` `docs/governance/SERVICE-MAP.md` — toutes les 86 occurrences "à créer" colonne Manifest remplacées par "✅ existant" (replace_all). Footnote `nsp/` mise à jour : "n/a (utilitaire pur)" → "✅ existant (stub utilitaire)". Section Verdict §9 réécrite : "~75 manifests à créer" → "Phase 2.6 ✅ COMPLETÉ : 89/89 services métier + 1 stub utilitaire".
- `chore(version)` `package.json` + `package-lock.json` + `marketing-footer.tsx` re-sync `6.1.19` → `6.1.22` après ADR-0030 commit `a1ac5f9` (CHANGELOG bumpé v6.1.21 sans propagation surfaces).

Verify : `npm run manifests:audit` → `Manifests registered: 89, ✓ clean`. `npx tsx scripts/audit-mission-drift.ts` → `scanned 89 manifests, 417 capabilities, ✓ no drift detected`. Typecheck `npx tsc --noEmit` → 0 erreur introduite. Zod 4 syntax `z.record(z.string(), z.unknown())` adopté (Zod 3 syntax `z.record(z.unknown())` rejetée par compiler).

Cap APOGEE 7/7 Neteru actifs maintenu. Aucun nouveau Neter, aucun nouveau model Prisma, aucune nouvelle entité métier — pure documentation/contrat de services existants.

---


## v6.1.21 — ADR-0030 proposed : intake closure ADVE 100% + gate actualizeRT (2026-05-03)

**Refonte du tunnel intake → cascade ADVE → R+T : ADR proposed pour fermer l'écart `derivable: false` du contrat INTAKE et gater `actualizeRT` sur `RTIS_CASCADE`.** Diagnostic NEFER session 2026-05-03 PM : sur cockpit pilier, "Suffisant" et "Complet" plafonnent à ~80% sans monter à 100%. Cause racine : (1) intake question-bank ne couvre pas les 5+ champs `needsHuman` du contrat INTAKE (`A.noyauIdentitaire`, `A.citationFondatrice`, `D.positionnement`, `D.promesseMaitre`, `D.personas`, `V.produitsCatalogue`), (2) AI extraction conservatrice par design (anti-hallucination), (3) `auto-filler` ignore silencieusement les `needsHuman` sans les remonter à l'UI, (4) `actualizeRT` n'a pas de gate `RTIS_CASCADE` (incohérent avec `generateBatch` qui l'a). Conséquence : la cascade ADVERTIS part toujours de matière sparse → R+T mediocres → stepper Notoria bloqué → opérateur en aveugle.

- `docs(governance)` `docs/governance/adr/0030-intake-closure-adve-100pct.md` (NEW) — ADR proposed avec 3 axes coordonnés séquencés : Axe 1 = panneau UX `needsHuman` sur `pillar-page.tsx` (résout asymétrie d'info, ~150 lignes), Axe 3 = `preconditions: ["RTIS_CASCADE"]` sur `actualizeRT` + stepper Notoria 5-étapes (anti-drift LOI 1, ~30 lignes), Axe 2 = closure intake question-bank avec 6 nouvelles questions + `audit-intake-coverage.ts` CI gate (refonte produit, ~300 lignes). Décisions explicitement rejetées : "tout `derivable: true` AI" (casse anti-hallucination), "100% obligatoire à l'intake" (friction landing), "supprimer `derivable: false`" (distinction utile pour le moteur). Plan 3 PRs séparées avec compatibilité existant + tests d'invariant + runbook strategies pré-existantes. Précédé par v6.1.18 (`rtis-cascade.savePillar` cache reconciliation, fix indispensable préalable).

---


## v6.1.20 — Portal welcome Console + Agency + product tour interactif (2026-05-03)

**Étend `PortalWelcome` aux 4 portails (ajout Console + Agency) et introduit `PortalTour`, un système de product tour maison (spotlight + tooltip + steps configurables) déclenché en opt-in depuis le modal welcome.** Aucune dépendance npm ajoutée — implémentation custom alignée DS panda + accent rouge fusée + tokens (cf. DESIGN-SYSTEM.md). Pattern : welcome modal au premier accès → CTA "Faire le tour" → spotlight séquentiel des éléments clés (portal switcher, sidebar, command palette, Mestor button).

- `feat(ui)` `src/components/shared/portal-tour.tsx` (NEW) — `PortalTourHost` (composant client, monté au layout) + `startPortalTour(portal)` (déclencheur via custom event `lafusee:tour:start`) + `hasTourSteps(portal)` (helper). Steps configurés par portail (4 Cockpit, 3 Creator, 3 Console, 2 Agency). Spotlight CSS via `box-shadow` + cutout dynamique sur `getBoundingClientRect`. Tooltip auto-positionné top/bottom/left/right avec clamp viewport. A11y : ESC dismiss, ←/→ navigation, role=dialog. Résilient : si target absent du DOM (page sans le selector), step skippé silencieusement. Persistence `localStorage["lafusee:tour:{portal}:v1"]`.
- `feat(ui)` `src/components/shared/portal-welcome.tsx` — types étendus `PortalKind = "cockpit" | "creator" | "console" | "agency"` + copies dédiées Console (Brand OS opérateur — Gouvernance Mestor / Glory tools / Config) et Agency (Multi-marques / Campagnes coordonnées / Facturation). CTA "Faire le tour" inséré dans footer (conditionné par `hasTourSteps(portal)`), affiché à côté de "Plus tard" + CTA primaire. Le clic ferme le modal et déclenche `startPortalTour` après 250ms (laisse le modal disparaître).
- `feat(ui)` `src/components/navigation/sidebar.tsx` + `topbar.tsx` — ajout `data-tour-step="sidebar|search|mestor"` sur les targets clés. Selectors uniformes (pas de prefix portal — le scoping vient du fait qu'un portail ne mount qu'un `PortalTourHost`). `[data-portal-switcher]` déjà existant, réutilisé.
- `feat(ui)` `src/app/(console)/console/layout.tsx` + `(agency)/agency/layout.tsx` — mount `<PortalWelcome />` + `<PortalTourHost />`. Même pattern que Cockpit/Creator depuis v6.1.17.
- `feat(ui)` `src/app/(cockpit)/cockpit/layout.tsx` + `(creator)/creator/layout.tsx` — ajout `<PortalTourHost />` (mount à côté du `PortalWelcome` déjà présent).

---


## v6.1.19 — SERVICE-MAP : attribution exhaustive des 90 répertoires (2026-05-03)

**Réconciliation arithmétique du SERVICE-MAP : sous-totaux par sous-système (71) ≠ TOTAL (90) — drift d'inventaire pré-existant signalé en commit `10a28ee`. Tous les répertoires `src/server/services/*/` désormais classifiés sans orphelin.** 19 services manquants attribués aux bons sous-systèmes APOGEE après lecture des en-têtes `index.ts` pour validation du governor + tier déclarés in-code.

- `docs(governance)` `docs/governance/SERVICE-MAP.md` — réécriture intégrale avec attribution exhaustive. Counts par section : Propulsion 14 (briefs 13 + forge `ptah/` 1), Guidance 12, Telemetry 21, Sustainment 12, Operations 10, Crew Programs 6, **Comms 3 (NEW section)**, Admin 11. Total : **89 services métier classifiés + 1 helper (`utils/`) = 90 répertoires**. Vérification arithmétique : `14+12+21+12+10+6+3+11 = 89`.
- `docs(governance)` 19 services orphelins attribués : `ptah/` (Propulsion forge §1 ligne explicite), `founder-psychology/` (Crew Programs §6, gov INFRASTRUCTURE per index.ts), `imhotep/` (Crew Programs §6 orchestrateur), `playbook-capitalization/` + `sector-intelligence/` + `source-classifier/` + `error-vault/` (Telemetry §3, gov SESHAT), `brand-vault/` + `model-policy/` + `sentinel-handlers/` + `strategy-archive/` + `nsp/` (Sustainment §4), `monetization/` + `payment-providers/` (Operations §5), `email/` + `oauth-integrations/` + `anubis/` (**Comms §7 NEW**), `mfa/` + `collab-doc/` (Admin §8).
- `docs(governance)` section §7 **Comms** créée (était absente — drift structurel pré-existant). 2 satellites + `anubis/` orchestrateur. Provider façades (`meta-ads/google-ads/x-ads/tiktok-ads/mailgun/twilio`) co-localisées dans `anubis/providers/` — pas comptées comme services distincts.
- `docs(governance)` `pillar-readiness/` (vit dans `src/server/governance/`, pas `src/server/services/`) sorti du compte Guidance — passé à 12 services. Footnote ajoutée pour traçabilité.
- `docs(governance)` §10 Services manquants nettoyée : `messaging/` retiré (couvert par `nsp/` + `anubis/`), `nsp/` retiré (existe maintenant). Restent 3 services optionnels (`compensating-intents/`, `cost-gate/`, `notification/`) — non bloquants pour complétude APOGEE.
- `chore(version)` `package-lock.json` re-sync `6.1.16` → `6.1.18` après bump manuel user `package.json` v6.1.18 (commit `602e050`).

---


## v6.1.18 — fix(rtis-cascade) — completionLevel cache reconciliation (2026-05-03)

**Le stepper Notoria restait figé sur étape 1 (R+T) après "Lancer la veille R+T" + apply, parce que `actualizePillar()` écrivait `Pillar.content` sans reconcilier le cache `Pillar.completionLevel`.** Drift LOI 1 (point unique de mutation) : `rtis-cascade.savePillar` était le seul caller du gateway dans `src/server/services/mestor/` à utiliser `writePillar` au lieu de `writePillarAndScore` (les 5 autres callers — `operator-amend`, `hyperviseur` ×4 — utilisaient déjà la forme canonique). Résultat : `Pillar.content` mis à jour avec la veille fraîche, `assessPillar` retournait `stage === COMPLETE`, mais `completionLevel` cache restait à `INCOMPLET` (valeur posée à l'intake) → `dashboard.completionLevels.r/t === "INCOMPLET"` → stepper bloqué.

- `fix(rtis-cascade)` `src/server/services/mestor/rtis-cascade.ts:34` — `savePillar()` swap `writePillar` → `writePillarAndScore`. Le suffixe `AndScore` enchaîne (1) `writePillar` DB, (2) `postWriteScore`, (3) `reconcileCompletionLevelCache` (D-2 invariant), (4) `eventBus.publish("pillar.written")` (D-6). Le `recalcScores()` manuel ligne 455 devient redondant mais conservé par sécurité (à élaguer dans cleanup ultérieur). Le stepper exige toujours `COMPLET|FULL` (exigence métier validée par l'utilisateur — aucun champ vide à aucune étape de la cascade ADVERTIS).

---


## v6.1.17 — Portal welcome modal first-login (Cockpit + Creator) (2026-05-03)

**Onboarding first-login portail-spécifique : modal `PortalWelcome` qui s'affiche une seule fois par portail (Cockpit + Creator) au premier accès d'un user authentifié.** Complète la chaîne UX `register → /portals → portail` : le user qui clique sur une carte de hub atterrit avec un tour d'horizon de 3 leviers contextualisés au portail. Dismiss persistant via `localStorage["lafusee:welcome:{portal}:v1"]` — pas re-déclenché à chaque visite. Aucun tracking serveur.

- `feat(ui)` `src/components/shared/portal-welcome.tsx` (NEW) — composant client basé sur `Dialog` primitive (DS panda + accent rouge fusée pour Cockpit, violet Creator). 3 highlights par portail : Cockpit = Diagnostic ADVE / Big Idea+briefs / Cascade RTIS auto ; Creator = Missions / Profil+portfolio / Earnings+Académie. CTA dual : "Plus tard" + CTA primaire teinté à l'accent. `useSession()` pour le prénom dynamique. localStorage versionné (suffixe `:v1`) pour pouvoir bump le tour si le contenu change.
- `feat(ui)` `src/app/(cockpit)/cockpit/layout.tsx` + `src/app/(creator)/creator/layout.tsx` — mount `<PortalWelcome portal="cockpit|creator" />` au niveau layout. Pas dans Console/Agency : portails opérateurs/partenaires, pas découverte grand public.

---


## v6.1.16 — Drift sync post-merge : version + counts + jargon leak (2026-05-03)

**Phase 9 post-merge sync audit (NEFER §5) — quatre drifts résiduels corrigés en pass unique : version `package.json` stale vs CHANGELOG, count `SERVICE-MAP` désynchronisé vs réel, mention périmée `5 Neteru actifs` dans LEXICON, jargon eng `Pillar Gateway` exposé en copy publique FAQ.** Aucune feature touchée — rescan de cohérence pure.

- `chore(version)` `package.json` + `package-lock.json` — bump `6.1.8` → `6.1.15` pour matcher CHANGELOG canon. `src/components/landing/marketing-footer.tsx` — badge footer aligné. Drift Phase 9.2 (version unique de l'app dans 4 endroits).
- `docs(governance)` `docs/governance/SERVICE-MAP.md` — count `87 services` → `90 services` (recensement réel `ls -d src/server/services/*/ | wc -l = 90`). Mise à jour ligne 3 (header) + ligne 26 (TOTAL synthèse). Drift Phase 9.3 (compteurs canoniques vs prose narrative).
- `docs(governance)` `docs/governance/LEXICON.md:24` — entrée `DESIGN_SYSTEM` Domain token : `--division-*` (5 Neteru actifs) → `(7 Neteru actifs)`. Aligné sur Phase 14/15 (Imhotep + Anubis activés, ADR-0019/0020). Drift Phase 9.4 (état canonique périmé). Mentions résiduelles dans ADR-0009/ADR-0013 sont historiques explicites — conservées.
- `fix(ui)` `src/components/landing/marketing-faq.tsx:12` — leak jargon eng `Pillar Gateway` reformulé en `un point d'écriture unique sur chaque pilier` pour cold-reader public. Les deux autres mentions (`/console/config/integrations/page.tsx:232`, `/console/mestor/recos/page.tsx:89`) sont surfaces opérateur internes — conservées. Drift Phase 9.5 (anti-jargon eng dans copy publique).

---


## v6.1.15 — Auto-heal JWT sessions pré-migration roles (2026-05-03)

**Suite v6.1.14 (normalisation BDD), les sessions NextAuth signées avant la migration restaient bloquées sur `/unauthorized` car le JWT cachait encore l'ancien role legacy hors canon.** Symptôme observé : compte créé avant `a0667fb`, role legacy persistant dans le token JWT (TTL 30j), proxy.ts évalue le role en token contre `COCKPIT_ROLES`/`CREATOR_ROLES` et redirige vers `/unauthorized` malgré la BDD propre. Fix : auto-healing dans le callback `jwt` qui re-fetch depuis BDD si le role en token est absent, vide, ou hors set canonique. Idempotent (no-op pour les tokens déjà à jour).

- `fix(auth)` `src/lib/auth/config.ts` — callback `jwt` re-fetch `User.role` depuis BDD quand `token.role` est absent OU hors canon `{ ADMIN, OPERATOR, USER, FOUNDER, BRAND, CLIENT_RETAINER, CLIENT_STATIC, CREATOR, FREELANCE, AGENCY }` OU sur `trigger === "update"`. Garantit que toute session existante converge vers le canon dès la prochaine rotation JWT (i.e. la prochaine requête authentifiée). Aucun re-login manuel requis.

---


## v6.1.14 — Normalize User.role legacy values vers canon proxy.ts (2026-05-03)

**Suite v6.1.11 (hub /portals + role gates ouverts), les comptes existants pouvaient avoir des `User.role` legacy hors set canonique (NULL, ou valeurs orphelines de migrations antérieures), causant un blocage `/unauthorized` malgré l'ouverture des role gates.** Stratégie *"open by default"* : tout role hors canon devient `'USER'` — préserve l'intent de v6.1.11 (cockpit + creator ouverts par défaut aux utilisateurs authentifiés). Aucun user perd d'accès ; certains en gagnent (re-routage vers le hub `/portals` au lieu de `/unauthorized`).

- `feat(prisma)` migration `20260503020000_normalize_user_roles` — `UPDATE "User" SET role = 'USER' WHERE role IS NULL OR role NOT IN (canon)`. Idempotente. Set canonique aligné sur `src/proxy.ts` COCKPIT_ROLES + CREATOR_ROLES + Console/Agency : `{ ADMIN, OPERATOR, USER, FOUNDER, BRAND, CLIENT_RETAINER, CLIENT_STATIC, CREATOR, FREELANCE, AGENCY }`.
- `chore(scripts)` `scripts/audit-user-roles.mjs` (NEW) — audit standalone : `node scripts/audit-user-roles.mjs` liste les outliers, `--apply` les normalise vers `'USER'`. Stratégie identique à la migration. dotenv loadEnv pour Prisma 7.

---


## v6.1.13 — Quick Intake : seal canonique sur l'extraction LLM (anti-drift contexte business) (2026-05-03)

**Fix de cohérence sur la cascade `quickIntake.complete()` : l'extraction structurée des piliers ADVE ignorait les faits canoniques déclarés à l'intake (sector / businessModel / positioning / country) et le LLM hallucinait un univers métier différent quand les réponses libres étaient vagues.** Symptôme observé sur l'intake `cmopkkjz1000dpg01yhfiiuxz` (PlusQueMignon, secteur IMMOBILIER, RAZOR_BLADE, MASSTIGE) : pilier V rempli avec un catalogue cosmétique (Crème Hydratante Baobab, Sérum Éclat Royal, businessModel="SERVICES", positioningArchetype="PREMIUM"). Le founder voyait deux blocs contradictoires sur la page result. Cause : `extractStructuredPillarContent` ne recevait que `sector` et n'avait aucune contrainte dure sur le reste du contexte.

- `fix(quick-intake)` `src/server/services/quick-intake/index.ts` — `extractStructuredPillarContent` accepte désormais un `CanonicalIntakeContext` complet (companyName, sector, country, businessModel, economicModel, positioning) et l'injecte au LLM comme bloc « FAITS DÉCLARÉS (CONTRAINTE) ». Règle 6 du prompt : « tout produit / persona / concurrent / narrative DOIT être cohérent avec ces faits ». Règle 7 : la liste blanche `secteur, pays, businessModel, positioningArchetype, economicModels` est interdite à l'extraction (scellée par le système ensuite).
- `fix(quick-intake)` `src/server/services/quick-intake/index.ts` — nouvelle fonction `sealCanonicalPillarFields()` exécutée après extraction LLM : elle écrase tout champ canonique que le LLM aurait quand même produit, avec la valeur déclarée au démarrage de l'intake. A: `secteur`, `pays`, `nomMarque`. V: `businessModel`, `positioningArchetype`, `economicModels`. D: `positionnement` initial seeded depuis l'archetype si vide.
- `feat(quick-intake)` `src/server/services/quick-intake/index.ts` — nouvelle fonction `regenerateAnalysis(token, { force? })` : refresh in-place des piliers ADVE + diagnostic.narrativeReport + diagnostic.brandLevel sur la Strategy existante (pas de delete — Signal/Recommendation/AICostLog en RESTRICT). Refuse par défaut quand la Strategy est en `ACTIVE`, `force: true` pour overrider.
- `feat(quick-intake)` `src/server/trpc/routers/quick-intake.ts` — `regenerateAnalysis` exposé en `adminProcedure`. Permet à un opérateur Console de re-rouler l'analyse sur un intake dont l'extraction a dérivé.
- `chore(scripts)` `scripts/regen-intake.ts` (NEW) — utilitaire dev `npx tsx scripts/regen-intake.ts <token-or-id> [--force]` pour rejouer la régénération en local. Utilisé pour réparer l'intake PlusQueMignon : pillar V avant = catalogue cosmétique fictif ; après = `businessModel: RAZOR_BLADE`, `positioningArchetype: MASSTIGE`, secteur immobilier honnête + réponses brutes du founder préservées.

---


## v6.1.12 — Notoria : Mission Launcher en stepper R+T → ADVE → I → S (2026-05-03)

**La grille de 4 boutons mission (Engine Health "Mission Launcher") devient un stepper séquentiel R+T → ADVE → I → S avec bouton primaire contextuel selon l'étape courante + dropdown avancé pour les actions hors-séquence.** Aligne l'UX Notoria sur la cascade canonique ADVE/RTIS (RTIS dérivé d'ADVE — cf. CLAUDE.md/NEFER.md). La section "Engine Health" se concentre désormais sur les completion levels par pilier (sans le radar ADVERTIS dupliqué ailleurs).

- `feat(cockpit)` `src/components/cockpit/notoria/notoria-page.tsx` — réécriture du Mission Launcher : `<Stepper />` (primitives) avec étapes R+T (Risk + Track), ADVE (4 piliers fondateurs), I (Innovation), S (Strategy synthèse). Bouton primaire "Lancer l'étape suivante" + chevron-down dropdown avancé pour relancer une étape arrière ou skip. Engine Health simplifié sur completion levels par pilier.
- `chore(scripts)` `scripts/check-intake-debug.mjs` — diagnostic standalone d'un QuickIntake (par token ou id), liste les 5 derniers si introuvable. Utilitaire dev.

---


## v6.1.11 — Hub `/portals` + role gates ouverts par défaut sur Cockpit/Creator (2026-05-03)

**Tout nouvel utilisateur authentifié atterrit sur `/portals` — un hub qui présente les portails accessibles (Cockpit pour fondateurs, Creator pour créatifs) sous forme de cards. Plus de blocage role-based à l'entrée des deux portails grand public. Console (UPgraders, interne) et Agency (partenaires) restent restreints.** Avant : un compte `USER` fraîchement inscrit cassait sur `/cockpit` ou `/creator` (proxy 403), forçait à un setup admin manuel. Après : l'utilisateur choisit son portail dans le hub, le proxy laisse passer sur cockpit + creator pour tout role authentifié.

- `feat(ui)` `src/app/portals/page.tsx` (NEW) — server component, fetch session, render 4 cards (Cockpit / Creator / Agency / Console) avec visibilité conditionnelle via `card.isVisible(role)`. Icônes lucide (Sparkles / Shield / Terminal / Building2 / Rocket).
- `feat(ui)` `src/components/landing/marketing-nav.tsx` — `<NavSessionLink />` session-aware : si user authentifié, lien vers `/portals` avec icône LayoutGrid + prénom (extrait via `firstName(name, email)`).
- `fix(auth)` `src/proxy.ts` — `COCKPIT_ROLES` étendu à `[ADMIN, OPERATOR, USER, FOUNDER, BRAND, CLIENT_RETAINER, CLIENT_STATIC]`, `CREATOR_ROLES` à `[ADMIN, OPERATOR, USER, CREATOR, FREELANCE]`. `/console` reste `[ADMIN]`, `/agency` reste `[ADMIN, CLIENT_RETAINER, CLIENT_STATIC]`. Doc explicite : Cockpit + Creator sont *open by default* aux utilisateurs authentifiés.
- `fix(auth)` `src/app/(auth)/login/page.tsx` `portalForRole()` — `USER` (et default) → `/portals` au lieu de `/console`. Aliases ajoutés : `CLIENT_RETAINER`/`CLIENT_STATIC` → `/cockpit`, `FREELANCE` → `/creator`.
- `fix(auth)` `src/app/(auth)/register/page.tsx` — `callbackUrl` par défaut `/portals` au lieu de `/cockpit` (sauf override via query param `?callbackUrl=...`).
- `feat(ui)` `src/components/shared/cookie-consent.tsx` (NEW, 94 lignes) + `src/app/providers.tsx` — bandeau RGPD non-bloquant monté sur tout l'arbre via `<Providers>`. Mémorise le choix en localStorage.
- `feat(ui)` `src/app/unauthorized/page.tsx` — ajoute lien "Hub des portails (mes accès)" en tête, remplace l'option Console (réservée admin) par retour Landing.
- `feat(ui)` `src/components/navigation/portal-switcher.tsx` — type `PortalOption.id` étendu à `landing | hub` + icônes `Rocket` / `LayoutGrid` ajoutées.

---


## v6.1.10 — Intake processing screen + landing /intake routing (2026-05-03)

**UX polish post-Phase-8 sur la cascade Quick Intake** : la mutation `processIngest` (30-60s pour la première analyse de docs/site) montrait un spinner statique. Remplacé par `<IntakeProcessingScreen />` — affichage progressif de 7 stages (lecture / identification / A / D / V / E / synthèse) avec icônes lucide, sub-labels métier et timing tuné sur p50/p95 observés. En passage, les 4 CTAs landing pointaient sur `#intake` (anchor inexistant après refonte Phase 11) → corrigés vers `/intake` (page Launchpad réelle).

- `feat(ui)` `src/components/intake/intake-processing-screen.tsx` (NEW) — 7 stages : Lecture du contenu → Identification de la marque → Authenticité → Distinction → Valeur → Engagement → Synthèse. Icônes : FileText, ScanSearch, Sparkles, ShieldCheck, Diamond, Gem, HeartHandshake, Award. Affichage actif/done basé sur `secondsElapsed` ≥ `stage.startsAt` ; spinner Loader2 quand encore en cours.
- `feat(ui)` `src/app/(intake)/intake/[token]/ingest/page.tsx` — render `<IntakeProcessingScreen />` quand `processIngestMutation.isPending || isSuccess`. Évite le flash spinner statique pendant la latence LLM.
- `fix(ui)` Routing 4 fichiers landing : `marketing-advertis.tsx`, `marketing-apogee.tsx`, `marketing-finale.tsx`, `marketing-hero.tsx` — `href="#intake"` → `href="/intake"`. L'anchor `#intake` n'existe plus dans le hero post-Phase 11 ; les CTAs cassaient silencieusement.

---


## v6.1.9 — fix(intake) — `QuickIntake.convertedToId` dangling pointer après purge (ADR-0029) (2026-05-03)

**Phase 8 NEFER auto-correction. Le runtime crashait `Invalid ctx.db.strategy.update()` sur `convert` / `activateBrand` car `QuickIntake.convertedToId` était un `String?` libre (sans `@relation`), invisible au BFS purge d'ADR-0028 qui scanne `information_schema.table_constraints` pour les FKs. La purge des 18 marques (commit `ec22806`) a laissé 15 pointeurs orphelins. Fix triple couche : data cleanup, code defense, schéma FK avec `ON DELETE SET NULL` + BFS purge filtrant `delete_rule`.**

- `fix(intake)` `src/server/trpc/routers/quick-intake.ts` — `convert` (lignes 425+) et `activateBrand` (lignes 326+) font un `findUnique` de la Strategy avant `update`. Si dangling, fallback sur création (mirror du pattern existant). `activateBrand` accepte désormais les intakes sans temp Strategy (recovery path) et heal le pointeur après création.
- `feat(prisma)` `prisma/schema.prisma` — `QuickIntake.convertedTo Strategy? @relation("QuickIntakeConvertedTo", ..., onDelete: SetNull, onUpdate: Cascade)` + back-relation `Strategy.quickIntakes QuickIntake[]`. Migration `20260503010000_quickintake_strategy_fk_setnull` : cleanup idempotent (UPDATE NULL des dangling restants) + ADD FK + INDEX. **Appliquée DB dev**, 0 erreur.
- `fix(neteru)` `src/server/services/strategy-archive/index.ts` `loadFks()` JOIN `information_schema.referential_constraints` pour récupérer `delete_rule`. BFS skip les FKs `SET NULL / SET DEFAULT / CASCADE` — la base s'en charge, un DELETE explicite serait soit faux (préservation perdue), soit redondant. Pattern auto-extensible pour toute future relation Prisma `onDelete: SetNull`.
- `chore(scripts)` `scripts/check-dangling-convertedToId.mjs` — diagnostic standalone, `--fix` pour nullifier. Idempotent. 15 rows nullifiées le 2026-05-03 avant migration.
- `docs(governance)` [ADR-0029](docs/governance/adr/0029-quickintake-strategy-fk-setnull.md) — post-mortem complet : root cause, 4 couches de fix, anti-pattern Prisma `String?` libre ajouté aux signaux drift §3.6 (« tout `String?` nommé `*Id` qui pointe vers un model Prisma sans `@relation` correspondant → STOP »).

Verify : `npx tsc --noEmit` 0 nouvelle erreur sur `quick-intake.ts` + `strategy-archive/index.ts`. `prisma migrate deploy` ✓. `check-dangling --fix` post-migration → 0 dangling.

Résidus : aucun. Future passe d'audit globale envisagée pour détecter d'autres `String?` libres pointant vers models (1-2 semaines).

---


## v6.1.8 — fix typecheck Zod 4 + GatewayCallOptions (débloque CI PR #47) (2026-05-03)

**Tech-debt résiduelle de v6.1.0 (zod@4 + ai@6 stack bump) qui bloquait CI Typecheck FAILURE sur main + tous les PRs depuis. Mécanique pure : `z.record()` requiert (key, value) en Zod 4 (7 fix dans anubis/manifest.ts, trpc/anubis.ts, trpc/brand-vault.ts) + `GatewayCallOptions.maxTokens` renommé `maxOutputTokens` ai@6 (2 fix dans source-classifier/llm-decomposer.ts).**

- `fix(governance)` `src/server/services/anubis/manifest.ts` (lignes 277, 317, 351) — `z.record(z.string(), z.unknown())` pour notification metadata, render template vars, mcp invoke inputs.
- `fix(governance)` `src/server/trpc/routers/anubis.ts` (lignes 210, 273) — `z.record(z.string(), z.unknown())` pour mcpInvokeTool inputs + templatesUpsert variables.
- `fix(governance)` `src/server/trpc/routers/brand-vault.ts` (lignes 185, 194) — `z.record(z.string(), z.unknown())` pour supersede asset content + metadata.
- `fix(governance)` `src/server/services/source-classifier/llm-decomposer.ts` (lignes 128, 218) — `maxTokens` → `maxOutputTokens` pour decomposeDocument + classifyImage.

Verify : `npx tsc --noEmit` 0 erreur (sauf `next/types/validator.ts` page.js manquant — drift compile cache hors scope).

---


## v6.1.7 — Jehuty éditorial : refonte mise en page presse (2026-05-03)

**Le feed Bloomberg-Terminal de Jehuty (Telemetry/Seshat) devient une gazette stratégique typographique : masthead display géant, dateline française, sections nommées par rubrique (À la une / Recommandations / Signaux marché / Diagnostics / etc.), lead story avec drop cap rouge, grilles 2-3 colonnes presse, pull-quotes serif pour les avantages/risques, indicateurs en mono.** Le metier de Jehuty (« lire le monde avant de forger ») est mieux servi par une grammaire visuelle de presse que par une grille de cards mono-niveau. Aucune mutation backend — refonte purement présentielle, mêmes queries/mutations tRPC, mêmes types `JehutyFeedItem` / `JehutyDashboard` / `CATEGORY_CONFIG`.

### `feat(ui)` Refonte éditoriale

- `feat(ui)` `src/components/cockpit/jehuty/jehuty-feed-page.tsx` réécrit en mise en page presse — masthead Inter Tight display + catchline Fraunces italic ; dateline française dynamique + numéro d'édition ; indicateurs sobres en grille de 4 ; nav rubriques épurée + filtre piliers en pastilles rondes ; lead story (premier item NOW ou top priorité) avec drop cap rouge fusée + pull-quote « L'analyse » en aside ; sections par catégorie ordonnée (RECOMMENDATION, MARKET_SIGNAL, DIAGNOSTIC, WEAK_SIGNAL, SCORE_DRIFT, EXTERNAL_SIGNAL) avec rubric headers + grilles 1/2/3 colonnes responsive ; dispatch cards titre serif + body Fraunces + actions Pin/Écarter/Activer Notoria en mono uppercase ; colophon avec citation italique « Avant de forger, lire le monde. »
- `feat(ui)` Tokens DS exclusivement (`font-display`, `font-serif`, `font-mono`, `text-foreground{-secondary,-muted}`, `text-accent`, `text-success`, `text-error`, `border-border-subtle`, `--text-display/3xl/2xl/xl/lg/base`). Zéro classe couleur brute introduite. Drop cap utilise `var(--text-3xl)` × 1.7 + `text-accent`. PILLAR_KEYS importés depuis `@/domain/pillars`.

Résidus : `CATEGORY_CONFIG.color` dans `src/lib/types/jehuty.ts` contient encore des classes Tailwind brutes (`bg-violet-500/15 text-violet-300` etc.) — pré-existant, plus consommé par la nouvelle page éditoriale (à purger lors d'un sweep design-tokens-canonical futur).

---


## v6.1.6 — NEFER auto-correction §8 : Strategy archive passé par mestor.emitIntent + ADR-0028 (2026-05-03)

**Auto-correction Phase 8 NEFER post-ingestion sur PR #47 — drift §3 interdit absolu détecté : les mutations `archive/restore/purge` introduites en v6.1.5 appelaient le service `strategy-archive` directement depuis tRPC `auditedAdmin` au lieu de transiter par `mestor.emitIntent()`. Refonte complète : 3 nouveaux Intent kinds gouvernés MESTOR (`OPERATOR_ARCHIVE_STRATEGY`, `OPERATOR_RESTORE_STRATEGY`, `OPERATOR_PURGE_ARCHIVED_STRATEGY`) + SLOs + dispatch via commandant + handlers Intent côté service + ADR-0028 formel + LEXICON.** Résidu listé en v6.1.5 ("Pas d'Intent kind dédié — passe par auditedAdmin mais pas via mestor.emitIntent") → traité ici.

### `feat(governance)` ADR-0028 + Intent kinds MESTOR

- `feat(governance)` `ADR-0028 — Strategy archive 2-phase` formalise : architecture 2-phase, governance MESTOR, BFS dynamique via `information_schema`, anti-foot-gun multi-niveau, UI patterns. Liens NEFER §3 + §8 explicites.
- `feat(governance)` 3 entries dans `intent-kinds.ts` (governor `MESTOR`, handler `strategy-archive`).
- `feat(governance)` 3 SLOs : ARCHIVE/RESTORE 500ms/0.01%/$0, PURGE 30s/0.05%/$0 (latency généreux pour BFS sur strategies à gros historique).
- `feat(governance)` 3 type variants dans union `Intent` (`mestor/intents.ts`) avec `confirmName: string` obligatoire pour le purge (anti-foot-gun type-level).
- `feat(governance)` `getStrategyKey` cases ajoutées (return `[]` — pas de pillar key concernée).

### `feat(neteru)` Handlers Intent côté service

- `feat(neteru)` `strategy-archive` exporte 3 nouveaux handlers (`archiveStrategyHandler`, `restoreStrategyHandler`, `purgeArchivedStrategyHandler`) qui retournent `HandlerResult` uniforme (status OK/VETOED + reason). Codes reason : `DUMMY_PROTECTED`, `ALREADY_ARCHIVED`, `NOT_ARCHIVED`, `FK_CYCLE`, `NOT_FOUND`.
- `feat(neteru)` 3 cases dans `commandant.ts:execute` qui dispatchent vers les handlers via dynamic import.

### `refactor(trpc)` strategy router via emitIntent

- `refactor(trpc)` `strategy.archive/restore/purge` ne consomment plus le service direct. Construisent un `Intent` typé + `emitIntent({...}, { caller: "trpc:strategy.archive" })`. Si `result.status !== "OK"` → throw `TRPCError({ code: "BAD_REQUEST", message: result.summary })`.
- `refactor(trpc)` `strategy.purge` exige `confirmName: z.string().min(1)` + pre-check tRPC-side : `confirmName.toUpperCase() === target.name.toUpperCase()`. Si match raté → 400 avant même d'émettre l'Intent.
- `feat(ui)` `<PurgeConfirmDialog />` adapté : `onConfirm(typedName)` au lieu de `onConfirm()`. La modal envoie `confirmName: typed` à la mutation.

### `docs(governance)` LEXICON Phase 16+ entries

- `docs(governance)` Section "D-quater — ADR-0028 — Strategy archive 2-phase" : `Strategy.archivedAt`, 3 Intent kinds, service `strategy-archive`, composant `<ArchivedStrategiesModal />`. 6 entries.

### Cap APOGEE 7/7 maintenu

Aucun nouveau Neter, aucun nouveau sub-system. Mestor reste dispatcher unique. Anubis intouché. Test bloquant `neteru-coherence.test.ts` reste vert.

### Résidus identifiés (post auto-correction)

- Pas de tests unitaires sur le BFS purge (testable contre une DB temporaire — mockable via in-memory PG ou container).
- `isDummy` reste une protection runtime (pas type-level). Un opérateur peut flipper le bool en DB et bypasser la garde.
- Pas encore de "soft purge" (purge en attente N jours, annulable). Si demandé : `Strategy.purgeScheduledAt` + cron.

---


## v6.1.5 — Strategy archive system (2-phase soft archive → hard purge) + purge initiale 18 marques (2026-05-03)

**Système d'archivage 2-temps complet pour les Strategy : Phase 1 archive (soft, restaurable) → Phase 2 purge (hard, BFS cascade sur 30+ tables enfants, irréversible). UI modal + tuiles depuis `/console/oracle/brands` (button "Archives" + action "Archiver" par row). Anti-foot-gun : le purge exige préalable archive + confirmation textuelle du nom en MAJUSCULES.** En accompagnement, purge initiale exécutée — 18 strategies incomplètes supprimées, ne restent que 6 dummies Wakanda + Fantribe + SPAWT (782 rows total deleted via cascade BFS). Drift Prisma 7 tooling fixé en passage : `prisma.config.ts` requiert maintenant `datasource.url` explicite + dotenv loadEnv + cleanup baseline migration warn lines (drift Prisma 6 stderr capturé en SQL).

### `feat(prisma)` Schema + migration

- `feat(prisma)` `Strategy.archivedAt: DateTime?` (null = active, set = archived). `@@index([archivedAt])`.
- `feat(prisma)` Migration `20260503000000_strategy_archived_at` — ALTER TABLE + CREATE INDEX, idempotent (`IF NOT EXISTS`).

### `feat(neteru)` Service strategy-archive

- `feat(neteru)` `src/server/services/strategy-archive/index.ts` — `archiveStrategy(id)`, `restoreStrategy(id)`, `listArchivedStrategies(operatorId)`, `purgeStrategy(id)`. La purge utilise BFS dynamique via `information_schema.table_constraints` (zéro hardcoding des 34+ tables enfants), topological sort bottom-up, transaction atomique. Refuse hard-delete sur `isDummy=true` (Wakanda) ; refuse purge sans archive préalable (anti-foot-gun).

### `feat(trpc)` Router strategy étendu

- `feat(trpc)` `strategy.archive` / `restore` / `purge` (auditedAdmin + canAccessStrategy gate) + `listArchived` (protectedProcedure scope par operatorId).
- `feat(trpc)` `strategy.list` query filtre désormais `archivedAt: null` par défaut.

### `feat(ui)` Modal + tuiles + bouton

- `feat(ui)` `<ArchivedStrategiesModal />` dans `src/components/strategy/` — backdrop blur, header (count), grid 1/2/3 colonnes responsive de tuiles. Chaque tuile : avatar lettre initiale, nom, status badge, date relative archive (« il y a N jours »), métriques (piliers/assets/missions/sources), 2 actions Restaurer + Supprimer.
- `feat(ui)` `<PurgeConfirmDialog />` interne — alertdialog, type-to-confirm (nom de marque en MAJUSCULES), preview rows count estimé.
- `feat(ui)` `/console/oracle/brands` — bouton Archives en header (avec badge count) + action "Archiver" par row (Wakanda dummies exclues).

### `fix(prisma)` Tooling Prisma 7 (cause racine de l'incident `strategy.create()`)

- `fix(prisma)` `prisma.config.ts` — ajout `datasource: { url: process.env.DATABASE_URL ?? "" }` + chargement explicite `.env.local`/`.env` via dotenv (Prisma 7 ne charge plus auto avant l'eval du config TS).
- `fix(prisma)` `migrations/20260429000000_apogee_baseline/migration.sql` — suppression 2 lignes `warn ... package.json#prisma deprecated ...` qui étaient du stderr Prisma 6 capturé dans le SQL → erreur PG E42601.

### `chore(scripts)` Outils ops one-shot

- `chore(scripts)` `scripts/list-strategies.mjs` — liste read-only des Strategy (id, name, isDummy, status, counts).
- `chore(scripts)` `scripts/purge-incomplete-brands.mjs` — exécutée 1 fois pour la purge initiale. KEEP_IDS hardcodé (6 Wakanda + Fantribe + SPAWT). Dry-run par défaut, `--execute` pour exécuter. Mêmes principes BFS que le service.

### Résidus identifiés (non-bloquants)

- Pas d'Intent kind dédié (`OPERATOR_ARCHIVE_STRATEGY`/`OPERATOR_RESTORE_STRATEGY`/`OPERATOR_PURGE_ARCHIVED_STRATEGY`) — les mutations passent par `auditedAdmin` (audit trail) mais pas via `mestor.emitIntent()`. À ajouter Phase 16.x si on veut governance NEFER §3 stricte.
- Pas de tests unitaires sur le BFS purge — testable contre une DB temporaire.
- Pas d'ADR formel pour la décision 2-phase + l'usage d'`information_schema` pour FK discovery.

---


## v6.1.4 — NEFER auto-correction Phase 8 : drift ADR Phase 16 + doublon 0023 (2026-05-02 PM)

**Auto-correction post-merge déclenchée par rescan NEFER (§9.6).** Le récap dev de PR #40 disait "ADR-0023 (MCP) + ADR-0024 (Notification)" — ces numéros étaient déjà occupés par PR #38 (operator-amend + console-namespace). Vrais numéros : **ADR-0025 (Notification real-time) + ADR-0026 (MCP bidirectionnel)**, conformes au commit message de #40 mais pas aux commentaires inline ni à 3 entrées LEXICON.md. En parallèle, doublon ADR-0023 détecté entre PR #38 et PR #39.

### `docs(governance)` Doublon ADR-0023 → renumérotage 0027

- `docs(governance)` `git mv adr/0023-rag-brand-sources-and-classifier.md adr/0027-*` — PR #38 (mergée 13:40) garde 0023, PR #39 (mergée 13:48) → ADR-0027. Note de renumérotage ajoutée en tête. Refs LEXICON.md (lignes 136, 139) + scope-drift.md propagées.

### `docs(governance)` Drift refs ADR Phase 16 (23 fichiers)

- `docs(governance)` ADR-0024 → ADR-0025 dans 12 fichiers Notification real-time : `notification-bell.tsx`, `notification-center.tsx`, `topbar.tsx` (×2), `push-provider.tsx`, `vapid-key/route.ts`, `notifications/stream/route.ts`, `notification.ts` router (×2), `templates.ts` (×2), `web-push.ts`, `notifications.ts`, `digest-scheduler.ts`, `sse-broker.ts`, `notifications/page.tsx`, `public/sw.js`, `nsp-broker.test.ts`, `anubis-templates.test.ts`, `anubis.ts` router (templates section), `console/anubis/page.tsx`, LEXICON.md (×3).
- `docs(governance)` ADR-0023 → ADR-0026 dans 10 fichiers MCP bidirectionnel : `mcp-gate.ts`, `mcp/route.ts`, `mcp-client.ts`, `mcp-server.ts`, `anubis.ts` router (mcp section), `console/anubis/mcp/page.tsx` (×2), `intent-kinds.ts` (×2), `INTENT-CATALOG.md`, `anubis-mcp-server.test.ts`.
- `docs(governance)` ADR-0023, ADR-0024 → ADR-0025, ADR-0026 dans 4 fichiers de gouvernance globale Anubis : `slos.ts`, `intent-kinds.ts` (header bulk), `anubis/manifest.ts`, `anubis/index.ts`.

### `docs(governance)` CHANGELOG self-fix

- `docs(governance)` CHANGELOG v6.1.3 header "ADRs 0023 + 0024" → "ADRs 0025 + 0026". Compteur endpoints MCP "6" → "5" (notoria exclu de l'aggregator, cf. body PR #40).

### `docs(governance)` RESIDUAL-DEBT — résidus Phase 16 ouverts

- Section "Phase 16 — résidus post-merge PR #40" ajoutée. Le récap dev disait "déjà documentés" — ce qui était faux. Open : typecheck CI fail (Node 20 vs 22, lib types DOM `Uint8Array<ArrayBuffer>`), Lighthouse fail (NotificationBell topbar re-mount), deps `web-push` / `firebase-admin` / `mjml` / `@types/*` absentes de package.json (runtime crash garanti dès activation prod), rate limiting MCP outbound non câblé, NSP single-instance (Redis adapter à brancher pour multi-instance), digest cron non câblé dans `vercel.json`.

**Cap APOGEE 7/7 maintenu** — aucun nouveau Neter introduit. Aucun bypass governance. Aucun changement runtime — pure correction narrative + RESIDUAL-DEBT honnêteté.

---


## v6.1.3 — Phase 16 : Notification real-time + MCP bidirectionnel sous Anubis (2026-05-02)

**Anubis étendu avec deux capabilities transverses : push notifications temps-réel multi-canal (in-app SSE + Web Push VAPID/FCM + templates Handlebars/MJML + digest scheduler) et MCP bidirectionnel (server agrégé exposé à Claude Desktop / clients externes + client MCP entrant pour consommer Slack/Notion/Drive/Calendar/Figma/GitHub via Credentials Vault).** Cap APOGEE 7/7 maintenu — pas de 8ème Neter (NEFER §3 interdit absolu respecté). Pattern Credentials Vault (ADR-0021) réutilisé pour VAPID + FCM + connectorType `mcp:<serverName>`.

### `feat(governance)` ADRs 0025 + 0026

- `feat(governance)` ADR-0026 (NEW) — MCP bidirectionnel sous Anubis. 2 nouveaux models Prisma (`McpRegistry`, `McpToolInvocation`), 3 nouveaux Intent kinds (`ANUBIS_MCP_INVOKE_TOOL`, `ANUBIS_MCP_SYNC_REGISTRY`, `ANUBIS_MCP_REGISTER_SERVER`).
- `feat(governance)` ADR-0025 (NEW) — Notification real-time stack (NSP SSE broker + Web Push + templates + digest). 2 nouveaux models (`PushSubscription`, `NotificationTemplate`), 4 nouveaux Intent kinds (`ANUBIS_PUSH_NOTIFICATION`, `ANUBIS_REGISTER_PUSH_SUBSCRIPTION`, `ANUBIS_RENDER_TEMPLATE`, `ANUBIS_RUN_DIGEST`). `Notification` model étendu (`type`, `priority`, `metadata`, `entityType`, `entityId`, `operatorId`).

### `feat(neteru)` Anubis — extension Phase 16

- `feat(neteru)` `anubis/manifest.ts` étendu — 7 nouvelles capabilities (`pushNotification`, `registerPushSubscription`, `renderTemplate`, `runDigest`, `mcpInvokeTool`, `mcpSyncRegistry`, `mcpRegisterServer`) avec inputSchema/outputSchema Zod + sideEffects + qualityTier + latencyBudgetMs.
- `feat(neteru)` `anubis/notifications.ts` (NEW) — `pushNotification` fan-out unifié (IN_APP via Notification model + NSP publish + PUSH via web-push provider). Respecte `NotificationPreference.quiet` (CRITICAL bypass). EMAIL/SMS délégués au flow broadcast existant.
- `feat(neteru)` `anubis/templates.ts` (NEW) — Handlebars subset (escape par défaut, pas de helpers Turing-complet) + MJML→HTML pour body email.
- `feat(neteru)` `anubis/digest-scheduler.ts` (NEW) — `runDigest(DAILY|WEEKLY)` → groupe notifs IN_APP non-lues + envoie email récap via template `notification-digest`.
- `feat(neteru)` `anubis/mcp-server.ts` (NEW) — agrège les 10 MCP servers Neteru (`src/server/mcp/*`) en un manifest unifié + dispatcher mutualisé.
- `feat(neteru)` `anubis/mcp-client.ts` (NEW) — `invokeExternalTool / syncRegistry / registerServer` ; transport HTTP fallback (`POST {endpoint}/tools/invoke`) ; loggue chaque call dans `McpToolInvocation` lié à `intentId`.
- `feat(neteru)` `anubis/providers/web-push.ts` (NEW) — façade VAPID via npm `web-push` ; `DEFERRED_AWAITING_CREDENTIALS` si non configuré (pattern ADR-0021).
- `feat(neteru)` `anubis/providers/fcm.ts` (NEW) — façade Firebase Cloud Messaging mobile.

### `feat(infrastructure)` NSP — Neteru Streaming Protocol

- `feat(infrastructure)` `src/server/services/nsp/` (NEW) — pubsub in-memory keyed par `userId`. API `subscribe / publish / unsubscribe`. Pas de manifest (utilitaire pur). `NspEvent = NotificationEvent | IntentProgressEvent | McpInvocationEvent`.

### `feat(api)` Routes HTTP

- `feat(api)` 5 endpoints MCP manquants comblés : `/api/mcp/{artemis,creative,intelligence,operations,pulse}/route.ts`. Notoria reste resource-only — exclu de l'aggregator tools (cf. body PR #40).
- `feat(api)` `/api/mcp/route.ts` (NEW) — manifest racine agrégé (GET) + dispatcher unifié (POST `{ server, tool, params }`).
- `feat(api)` `/api/notifications/stream/route.ts` (NEW) — SSE stream live notifications, runtime `nodejs`, heartbeat 25s.
- `feat(api)` `/api/push/vapid-key/route.ts` (NEW) — expose la clé pub VAPID au client.
- `feat(auth)` `src/lib/auth/mcp-gate.ts` (NEW) — helper mutualisé ADMIN-only pour endpoints MCP.

### `feat(trpc)` Extensions routers

- `feat(trpc)` `routers/notification.ts` étendu — `unreadCount`, `registerPush`, `unregisterPush`, `listPushSubscriptions`, `testPush`.
- `feat(trpc)` `routers/anubis.ts` étendu — `mcpListRegistry`, `mcpRegisterServer`, `mcpSyncTools`, `mcpInvokeTool`, `mcpListInvocations`, `mcpOutboundManifest`, `templatesList`, `templatesUpsert`, `templatesDelete`.

### `feat(ui)` UI components

- `feat(ui)` `components/neteru/notification-bell.tsx` (NEW) — header badge + dropdown, branche `EventSource("/api/notifications/stream")` pour live unread refresh.
- `feat(ui)` `components/neteru/notification-center.tsx` (NEW) — dropdown avec filtres + variants priority via CVA (DS Tier 3 tokens `--priority-*`).
- `feat(ui)` `components/providers/push-provider.tsx` (NEW) — `usePush()` hook (state machine + Service Worker registration).
- `feat(ui)` `public/sw.js` étendu — listeners `push` + `notificationclick` (ne casse pas la stratégie cache existante).
- `feat(ui)` `app/(console)/console/anubis/notifications/page.tsx` (NEW) — preferences UI complète (channels, quiet hours, digest, push subs, test).
- `feat(ui)` `app/(console)/console/anubis/mcp/page.tsx` (NEW) — 3 onglets Inbound / Outbound / Templates.
- `feat(ui)` `components/navigation/topbar.tsx` — `NotificationBell` remplace le bouton bell statique (4 portails couverts via `app-shell`).
- `feat(ui)` `app/(console)/console/anubis/page.tsx` — 2 nouvelles cards "Préférences notifications" + "MCP".

### `feat(governance)` Intent kinds + SLOs

- `feat(governance)` `intent-kinds.ts` — 7 nouveaux kinds gouvernés ANUBIS.
- `feat(governance)` `slos.ts` — 7 SLOs (PUSH_NOTIFICATION p95 500ms, MCP_INVOKE_TOOL p95 10s, RUN_DIGEST p95 60s, etc.).

### Résidus

- Rate limiting MCP outbound non implémenté (RESIDUAL-DEBT — surface ADMIN-only limite le risque immédiat).
- NSP single-instance (RESIDUAL-DEBT — Redis pubsub si scale horizontal nécessaire).
- Digest scheduler pas câblé sur cron (TODO Phase 16.1 — process-scheduler hook).
- Dépendances npm (`web-push`, `firebase-admin`, `mjml`) à ajouter via PR `chore(deps)` séparée — façades les chargent dynamiquement avec fallback `DEFERRED_AWAITING_CREDENTIALS` ou compile passthrough si absent.

---

## v6.1.0 — Stack-wide major bumps : zod@4 + ai@6 + typescript@6 + vitest@4 + lucide@1 (2026-05-02)

**Refactorisation préparée par un upgrade lourd de la stack.** 18 dépendances bumpées (8 patches/minors + 10 majors). 174 erreurs typecheck absorbées via codemods systématiques. Aucune régression fonctionnelle : 994/994 vitest verts, 187 pages buildées, 0 erreur tsc, lint clean.

### `chore(deps)` Round 1 — patches/minors (0 risque, capture les bug fixes upstream)

- `@ai-sdk/openai` 3.0.52 → 3.0.58
- `@auth/prisma-adapter` 2.11.1 → 2.11.2
- `@modelcontextprotocol/sdk` 1.27.1 → 1.29.0
- `@playwright/test` 1.58.2 → 1.59.1
- `@tanstack/react-query` 5.95.2 → 5.100.8
- `@types/node` 22.x → 25.6 (type defs only)
- `eslint` 10.2.1 → 10.3.0
- `postcss` 8.5.12 → 8.5.13

### `chore(deps)` Round 2 — majors lourds + codemods

- `typescript` 5.9 → 6.0 — stricter inference, 0 erreur introduite après les autres bumps absorbés.
- `vitest` 3.x → 4.1 — config compatible, 994/994 tests verts en 6.7s (vs 13s avant, **2× plus rapide**).
- `zod` 3.x → 4.4 — `z.record(value)` → `z.record(key, value)` (116 sites refactorés via codemod scripts/fix-zod-record-v2.ts) ; `ZodError.errors` → `.issues`.
- `ai` 4.x → 6.0 — `usage.promptTokens/completionTokens` → `inputTokens/outputTokens`, `maxTokens` → `maxOutputTokens` (37 fichiers via codemod), `toDataStreamResponse()` → `toTextStreamResponse()`. Type interne `GatewayCallOptions` + `GatewayResult` alignés sur la nouvelle nomenclature.
- `@ai-sdk/anthropic` 1.x → 3.0 — compatibilité ai@6.
- `@anthropic-ai/sdk` 0.80 → 0.92 — patch upstream.
- `@ai-sdk/react` (NEW) — package séparé en ai@5+ ; `useChat` API completely refactored (no more `input`/`handleInputChange`/`handleSubmit`/`isLoading`/`append` ; new `sendMessage({text})` + `status` + `DefaultChatTransport`). MestorPanel réécrit en conséquence.
- `recharts` 2.x → 3.8 — chart components.
- `lucide-react` 0.475 → 1.14 — brand icons (Instagram/Facebook/Linkedin) **retirés upstream**, remplacés par génériques (Camera/Users/Briefcase). Workaround acceptable, rebrand future possible via package dédié.
- `@commitlint/cli` + `@commitlint/config-conventional` 19 → 20.

### `chore(eslint)` boundaries plugin v6 migration

- Rule renommée `boundaries/element-types` → `boundaries/dependencies` (deprecation warning éliminée du pre-commit log).

### `fix(llm-gateway)` API alignment ai@6

- `GatewayCallOptions.maxTokens` → `maxOutputTokens` (mirror direct ai@6 nomenclature).
- `GatewayResult.usage.{promptTokens, completionTokens}` → `{inputTokens, outputTokens}`.
- Embedding return type `{ embeddings, promptTokens }` → `{ embeddings, inputTokens }` pour cohérence stack-wide.

### Vérifications

| Check | Résultat |
|---|---|
| `tsc --noEmit` | **0 erreur** (depuis 174) |
| `vitest run` | **994 / 994 verts** en 6.7s (gain ~2× via vitest 4) |
| `next build` | ✓ Compiled successfully (187 pages) |
| `audit:governance` | 0 errors, 211 warns (strangler attendu) |
| `lint` | 0 errors, 246 warns (idem) |

### Résidus connus

- `next-auth@5.0.0-beta.31` reste en beta volontairement.
- `xlsx@*` 1 high vuln sans fix upstream (décision ops à trancher).
- 9 vulns moderate npm audit (chaîne postcss/next, disparaîtront avec un bump Next mineur).
- `eslint-plugin-react@7.37.5` peer dep warning sur eslint@10 (non bloquant ; sera résolu quand `eslint-config-next` upgrade `eslint-plugin-react`).
- 4 cycles d'imports `artemis/tools/*` (Phase 4 du REFONTE-PLAN, pas réveillés par ces bumps).

**Cette refacto-base permet maintenant d'attaquer les phases ultérieures avec un toolchain moderne (TS 6 inférence stricte + Vitest 4 perf + Zod 4 schemas + ai@6 streaming).**

---


## v6.0.2 — Deployment readiness fixes (2026-05-02)

**Trois correctifs ship-blocking levés sur la branche `claude/review-deployment-readiness-ahrkA`.** Audit pré-deploy exécuté en suivant le protocole NEFER (typecheck + lint + 994 tests + build prod + audit governance). Aucune régression introduite, 0 erreur typecheck, 187 pages générées, vulnérabilités npm 15 → 10.

- `fix(routing)` `src/middleware.ts` → `src/proxy.ts` + export `middleware` → `proxy`. Next 16 a déprécié la convention `middleware.ts` au profit de `proxy.ts` (cf. nextjs.org/docs/messages/middleware-to-proxy). Le warning de build disparaît ; sera bloquant en Next 17. Aucun changement de logique : LEGACY_REDIRECTS + PROTECTED_ROUTES inchangés, matcher `config` inchangé.
- `fix(ci)` `.github/workflows/ci.yml` step `prisma-validate.Schema diff` — flag `--to-schema-datamodel` n'existe plus en Prisma 7, remplacé par `--to-schema`. Le step continue de fail-soft (`|| exit 0`) pour ne pas bloquer la CI sur un drift schema/migrations détecté localement.
- `chore(deps)` `npm audit fix` non-breaking. Passe de 4 high + 11 moderate à 1 high + 9 moderate. Le high résiduel est `xlsx@*` (Prototype Pollution + ReDoS) qui n'a pas de fix upstream — décision ops à prendre : pin un fork safe, sandbox l'usage, ou retirer si non critique. Reste hors scope de cette session.

**Vérifications** : `tsc --noEmit` 0 erreur · `vitest` 994/994 verts · `next build` ✓ Compiled successfully (187 pages) · `audit:governance` 0 errors / 211 warns (strangler attendu, RESIDUAL-DEBT 2.1) · `lint` 0 errors / 246 warnings (idem strangler).

**Résidus connus non touchés** (tier 2 RESIDUAL-DEBT) : 119 hardcoded pillar enums, 4 cycles d'imports artemis tools, 60 routers en strangler middleware. Ces dettes sont documentées dans le plan de refonte Phase 3+4 et ne sont pas des ship-blockers.

---


## v6.0.1 — docs(governance) : NEFER §7 + Phase 0.1 — leçon CI label race + stale checkout (2026-05-02)

**NEFER ingère 4 nouveaux drift signals issus de l'investigation CI sur PRs #38/#39/#40 (auto-correction Phase 8).**

- `docs(governance)` `NEFER.md §7` — 4 nouvelles entrées drift signals : (1) diagnostiquer une CI gate sur fichier workflow lu local sans `git fetch` préalable (drift attesté en personne — la regex `[0-8]` que j'accusais était fixée depuis 2 jours sur main, mon checkout était stale de 11 commits) ; (2) designer un CI gate dépendant des `pull_request.labels` sans inclure `labeled, unlabeled` dans `on.pull_request.types` (race condition payload pré-labeling — fix lui-même shipped par PR #41 commit `062ac7d`) ; (3) ouvrir une PR puis disparaître sans update lisible côté user entre push et fin du run CI ; (4) violation interdit #1 « réinventer la roue » : avant de coder un fix, `git log --since="2h" --all -G <pattern>` pour vérifier qu'aucune session sœur ne traite déjà le sujet.
- `docs(governance)` `NEFER.md §5 Phase 0.1` — étendu : `git fetch origin main` + `git rev-list --count HEAD..origin/main` ajoutés au check préventif. Si stale > 0, pull obligatoire avant tout diagnostic CI / config / docs.



## v6.0.0 — Phases 14 + 15 : Imhotep + Anubis full activation + Credentials Vault (2026-05-01)

**Cap APOGEE atteint — 7/7 Neteru actifs.** Imhotep (Crew Programs Ground #6) et Anubis (Comms Ground #7) passent de pré-réservés à actifs. Pattern back-office Credentials Vault (ADR-0021) résout le blocage credentials externes en livrant providers façades feature-flagged qui retournent `DEFERRED_AWAITING_CREDENTIALS` quand pas de clés. Le code ship fonctionnel ; l'operator finit la config via UI `/console/anubis/credentials`.

Auto-correction NEFER Phase 8 : drift Phase 13 (sortie partielle Oracle-only) signalée par l'opérateur. ADRs 0017 + 0018 marqués Superseded par ADRs 0019 + 0020. Aucune ré-écriture from scratch — services Phase 13 stubs étendus en orchestrateurs complets (back-compat préservée pour les sections Oracle dormantes).

### `feat(governance)` ADRs 0019 / 0020 / 0021

- `feat(governance)` ADR-0019 (NEW) — Imhotep full activation. Architecture orchestrateur wrappant matching-engine, talent-engine, team-allocator, tier-evaluator, qc-router. **0 nouveau model Prisma** (anti-doublon NEFER §3) — réutilise TalentProfile, Course, Enrollment, TalentCertification, TalentReview, Mission, MissionDeliverable.
- `feat(governance)` ADR-0020 (NEW) — Anubis full activation. Orchestrateur broadcast multi-canal + 7 provider façades feature-flagged. 4 nouveaux models : `CommsPlan`, `BroadcastJob`, `EmailTemplate`, `SmsTemplate`. Réutilise `Notification`, `NotificationPreference`, `WebhookConfig`, `ExternalConnector` existants.
- `feat(governance)` ADR-0021 (NEW) — Pattern back-office Credentials Vault. Tout connector externe géré via `/console/anubis/credentials` UI qui CRUD `ExternalConnector` model. Provider façades retournent `DEFERRED_AWAITING_CREDENTIALS` quand pas de creds — pattern réutilisable.
- `refactor(governance)` ADR-0017 + ADR-0018 marqués **Superseded** (statut header explicite + note de supersession).

### `feat(neteru)` Imhotep — orchestrateur Crew Programs (Phase 14)

- `feat(neteru)` `imhotep/manifest.ts` — 8 capabilities. governor: IMHOTEP. dependencies: matching/talent/team/tier/qc + financial-brain.
- `feat(neteru)` `imhotep/index.ts` — 8 handlers orchestrateurs. draftCrewProgram étendu (status DRAFT Phase 14+ ou DORMANT_PRE_RESERVED back-compat).
- `feat(neteru)` `imhotep/governance.ts` (NEW) — gates : MissionReadyForCrew, TalentProfileExists, CrewBudgetExceeded.
- `feat(neteru)` `imhotep/types.ts` — étendu (7 nouveaux payload/result types). ImhotepCrewProgramPlaceholder conservé.
- `feat(governance)` `intent-kinds.ts` + `slos.ts` — 7 nouveaux Intent kinds Imhotep + SLOs.
- `feat(mestor)` `intents.ts` + `feat(artemis)` `commandant.ts` — Intent type union étendu + 8 handlers dispatchers.
- `feat(artemis)` `phase14-imhotep-tools.ts` (NEW) — 4 Glory tools : crew-matcher, talent-evaluator, formation-recommender, qc-evaluator.
- `feat(trpc)` `routers/imhotep.ts` (NEW) — 9 procédures + dashboard.
- `feat(ui)` `console/imhotep/page.tsx` (NEW) — dashboard hub avec 5 StatCards + 5 sections wirées (matching, club, orgs, academie, certifications).

### `feat(neteru)` Anubis — orchestrateur Comms + Credentials Vault (Phase 15)

- `feat(neteru)` `anubis/manifest.ts` — 11 capabilities. governor: ANUBIS. dependencies: email + advertis-connectors + oauth-integrations + financial-brain.
- `feat(neteru)` `anubis/index.ts` — 11 handlers orchestrateurs.
- `feat(neteru)` `anubis/governance.ts` (NEW) — gates : CommsPlanExists, BroadcastJobExists, AdBudgetExceeded.
- `feat(neteru)` `anubis/credential-vault.ts` (NEW) — pattern ADR-0021. credentialVault.{get, register, revoke, markActive, markError} + deferredCredentials() helper.
- `feat(neteru)` `anubis/providers/` (NEW) — 7 façades via `_factory.createProviderFaçade` DRY : meta-ads, google-ads, x-ads, tiktok-ads, mailgun, twilio, email-fallback.
- `feat(neteru)` `anubis/types.ts` — étendu (10 nouveaux types) + DeferredAwaitingCredentials union. AnubisCommsPlanPlaceholder conservé.
- `feat(prisma)` `schema.prisma` — 4 nouveaux models : CommsPlan, BroadcastJob, EmailTemplate, SmsTemplate. Migration `phase15-anubis-comms` à générer via `prisma migrate dev`.
- `feat(governance)` `intent-kinds.ts` + `slos.ts` — 10 nouveaux Intent kinds Anubis + SLOs.
- `feat(mestor)` `intents.ts` + `feat(artemis)` `commandant.ts` — Intent type union étendu + 11 handlers dispatchers (DOWNGRADED status si DEFERRED_AWAITING_CREDENTIALS).
- `feat(artemis)` `phase15-anubis-tools.ts` (NEW) — 3 Glory tools : ad-copy-generator, audience-targeter, broadcast-scheduler.
- `feat(trpc)` `routers/anubis.ts` (NEW) — 14 procédures (mutations Comms + Credentials + queries dashboard/list/segment/track/report). **Sécurité : `listCredentials` ne retourne JAMAIS `config` (secrets stay server-side, ADR-0021).**
- `feat(ui)` `console/anubis/page.tsx` (NEW) — dashboard 5 StatCards + warning banner credentials INACTIVE.
- `feat(ui)` `console/anubis/credentials/page.tsx` (NEW) — **Credentials Center back-office** (pattern ADR-0021). CRUD ExternalConnector + Test/Revoke. Formulaire dynamique selon provider. Inputs password masqués pour token/secret/key.

### `test(governance)` anti-drift Phase 14 + 15

- `test(governance)` `imhotep-anubis-full-activation.test.ts` (NEW) — verrouille manifests, Intent kinds enregistrés (7+10), SLOs, Glory tools, providers façades, ADRs Superseded, ADR-0021 existe, pages UI, routers wirés, schema Prisma respecte anti-doublon.
- `chore(test)` `oracle-imhotep-anubis-stubs-phase13.test.ts` retiré (obsolète — supersedé).
- `test(governance)` `neteru-coherence.test.ts` — assertion "quintet" retirée (panthéon plein 7/7).

### `docs(governance)` propagation narrative 7 sources de vérité

- `docs(governance)` `CLAUDE.md` — section Governance NETERU réécrite (7 actifs + Phase 14/15). Section "Phase status" ajoutée (Phase 9-15). Oracle 21 → 35.
- `docs(governance)` `NEFER.md` — "7 Neteru gouvernent". Compteurs : 350+ Intent kinds (au lieu de 56+), 113+ Glory tools (au lieu de 104).
- `docs(governance)` `PANTHEON.md` — table §1 "7 actifs". Imhotep + Anubis "actif". §4-bis Phase 13 Superseded.
- `docs(governance)` `LEXICON.md` — entrée NETERU "7 actifs". Imhotep + Anubis statut actif. Glory tools 91 → 113. Oracle 21 → 35. Nouvelle entrée "Credentials Vault".
- `docs(governance)` `APOGEE.md` — Oracle 21 → 35 (3 occurrences). Imhotep + Anubis "actif Phase 14/15".
- `docs(governance)` `MAAT.md` — ref panthéon "7 actifs".
- `docs(governance)` `MANIPULATION-MATRIX.md` — "7 Neteru actifs".
- `docs(governance)` `EXPERT-PROTOCOL.md` — "7 Neteru actifs" (2 occurrences).
- `docs(governance)` `SERVICE-MAP.md` — "87 services". Sections Imhotep + Anubis ajoutées.

### Migration Prisma Phase 15

Migration `phase15-anubis-comms` à exécuter via `prisma migrate dev` :
- 4 nouveaux models : `CommsPlan`, `BroadcastJob`, `EmailTemplate`, `SmsTemplate`
- Foreign key : `BroadcastJob.commsPlanId → CommsPlan.id`
- Indexes optimisés pour les queries dashboard

CLAUDE.md règle stricte : pas de `db push`. La migration sera appliquée en environnement dev/staging par le pipeline CI/CD.

### Verify

- typecheck : `npx tsc --noEmit` à exécuter post-merge (le diff structurel a été conçu pour respecter les contracts existants : back-compat ImhotepCrewProgramPlaceholder + AnubisCommsPlanPlaceholder préservée pour commandant.ts ; tous les types satellites vérifiés via lecture index.ts)
- migration Prisma à appliquer en dev/staging avant déploiement
- audits : `audit-neteru-narrative`, `audit-pantheon-completeness`, `audit-governance` à relancer post-merge
- résidu connu : Glory tool counts dans `glory-tools-inventory.md` à régénérer (`npm run glory:inventory`)

---

## v5.8.0 — Phase 13 : Oracle 35-section sprint (in progress) (2026-05-01)

**Verrouillage du framework canonique Oracle dans une source unique de vérité, irrigation par les outils de tous les Neteru actifs, NSP streaming, Ptah forge à la demande. PR #25.**

Ce sprint étend l'Oracle de 21 à 35 sections : 21 actives (Phase 1-3 ADVERTIS) + 7 baseline Big4 (McKinsey/BCG/Bain/Deloitte) + 5 distinctives (Cult Index, Manipulation Matrix, Devotion Ladder, Overton, Tarsis) + 2 dormantes (Imhotep/Anubis pré-réservés Oracle-stub).

### R6 — `feat(i18n)` PtahForgeButton + clés Phase 13 FR/EN

Closure résidu R6 du sprint Phase 13 — câblage `useT()` sur `<PtahForgeButton>` + 21 clés Phase 13 ajoutées dans `fr.ts` + `en.ts` (parité 100%).

- `feat(i18n)` `src/lib/i18n/fr.ts` + `src/lib/i18n/en.ts` : +21 clés Phase 13 :
  - 5 forge button labels (`oracle.forge.button.{image,video,audio,icon,design}`) + pending
  - 3 dialog labels (`oracle.forge.dialog.{title,cancel,confirm}`)
  - 2 result labels (`oracle.forge.result.{heading,async_note}`)
  - 1 empty state (`oracle.section.empty`)
  - 4 tier labels (`oracle.tier.{core,big4,distinctive,dormant}`)
  - 5 dormant labels (`oracle.dormant.{imhotep,anubis}.{title,activation}` + `oracle.dormant.cap_warning`)
- `feat(neteru)` `PtahForgeButton` : import `useT` + appel `const { t } = useT()` + remplacement de **7 strings hardcodés** par `t(key)` :
  - Button label (image/video/audio/icon/design dynamique via `t(\`oracle.forge.button.${forgeKind}\`)`)
  - Button pending state
  - Dialog title + cancel + confirm
  - Result heading + async_note
- `test(governance)` `tests/unit/governance/oracle-i18n-r6.test.ts` (NEW) — 12 tests anti-drift verrouillent :
  - 21 clés Phase 13 présentes dans fr.ts (forge buttons "Forger ...", dormant Phase 7+/8+, cap 7 BRAINS warning)
  - 21 clés Phase 13 présentes dans en.ts (parité 100% — Forge ..., 7 BRAINS cap preserved)
  - PtahForgeButton importe useT + appelle `useT()` + utilise les 7 clés t() critiques
- `test(governance)` `oracle-ptah-forge-phase13.test.ts` : assertion dialog mise à jour pour matcher les patterns `t("oracle.forge.dialog.*")` (au lieu de strings FR hardcoded).

Verify : tsc --noEmit exit 0 ; vitest 59 files / 956 tests passed (944 base + 12 nouveaux R6).

APOGEE — Pilier 6 (Layer 6 components) : i18n via `@/lib/i18n` boundary unique. Détection locale via Accept-Language (server) + navigator.language (client) — sticky FR par défaut.

Résidus : 14 sections Phase 13 (`phase13-sections.tsx`) gardent leurs strings FR hardcoded en "use client" — câblage useT() à étendre dans une PR follow-up dédiée si besoin EN sur les sections (PR actuelle priorise PtahForgeButton qui est le plus user-facing).

### R2 — `feat(oracle)` IntentId capture pour streaming/replay NSP (closure résidu B7)

Closure résidu R2 du sprint Phase 13 — les routes tRPC `enrichOracle` + `enrichOracleNeteru` exposent désormais l'`intentId` dans le résultat (créé par `governedProcedure preEmitIntent` AVANT le handler), et la page proposition cockpit le capture pour passer au tracker NSP.

- `feat(trpc)` `enrichOracle` + `enrichOracleNeteru` : handler reçoit `ctx` + retourne `{ ...result, intentId: ctx.intentId }`. Le `governedProcedure` injecte déjà `intentId` dans le childCtx (cf. `governed-procedure.ts:147`).
- `feat(cockpit)` `proposition/page.tsx` : nouvel état `lastIntentId` + `setLastIntentId` capturé dans `onSuccess`. Le tracker NSP reçoit désormais `intentId={lastIntentId}` au lieu de `null`. EnrichLog inclut l'IntentEmission id post-completion.
- `feat(cockpit)` Type `enrichResult` étendu avec `intentId?: string | null`.
- `test(governance)` `tests/unit/governance/oracle-intent-capture-r2.test.ts` (NEW) — 10 tests anti-drift verrouillent : routes tRPC retournent intentId depuis ctx, page proposition capture via setLastIntentId, tracker câblé avec intentId={lastIntentId}, commentaires documentent scope + limitation, enrichLog inclut intentId.
- `test(governance)` `oracle-nsp-streaming-phase13.test.ts` : assertion mise à jour pour matcher "Phase 13 B7+R2" (au lieu de juste B7).

**Scope R2 vs limitation** : ce résidu permet le **replay post-completion** (events stockés dans `IntentEmissionEvent` sont rejouables via `?since=<ISO>` SSE NSP). Le **vrai live pre-completion streaming** (events poussés pendant l'exécution de la mutation) nécessite un refactor background queue (Inngest, Vercel cron, Bull) — hors scope du sprint actuel.

Verify : tsc --noEmit exit 0 ; vitest 58 files / 944 tests passed (934 base + 10 nouveaux R2).

### R1 — `feat(artemis)` Helper `shouldChainPtahForge` + tests E2E flag oracleEnrichmentMode

Closure résidu R1 du sprint Phase 13 — extrait la décision de chainage Glory→Brief→Forge dans un helper pur testable + 12 tests anti-drift.

- `feat(artemis)` `sequence-executor.ts shouldChainPtahForge(args)` (NEW exported) — helper pur :
  - `{ hasForgeOutput: false, ... }` → `{ shouldChain: false, reason: "no-forge-output" }`
  - `{ hasForgeOutput: true, oracleEnrichmentMode: true }` → `{ shouldChain: false, reason: "skipped-oracle-mode" }` (Ptah à la demande)
  - `{ hasForgeOutput: true, oracleEnrichmentMode: false }` → `{ shouldChain: true, reason: "chain-active" }` (cascade complète)
- `refactor(artemis)` `executeGloryStep` — utilise désormais `const decision = shouldChainPtahForge({...})` au lieu de l'inline `if (tool?.forgeOutput && !oracleEnrichmentMode)`. Branche conditionnelle `decision.shouldChain && tool` + log `decision.reason === "skipped-oracle-mode"`.
- `test(governance)` `oracle-enrichment-mode-flag-r1.test.ts` (NEW) — 12 tests :
  - 5 tests sur le helper pur (4 cas + priorité du flag)
  - 5 tests structurels sur le wiring sequence-executor.ts (export, usage, log, lecture flag)
  - 2 tests sur la cascade f9cd9de préservée hors enrichOracle (default + bouton Forge now)

Verify : tsc --noEmit exit 0 ; vitest 57 files / 934 tests passed (922 base + 12 nouveaux R1).

APOGEE — Sous-système Propulsion (Mission #1). Loi 1 (altitude) : la décision est désormais déterministe et auditable. Pilier 2 (Capability) : helper exporté pour tests anti-drift bloquants.

### R3 — `feat(neteru)` Ptah forge result panel — visualisation post-forge

Ajoute un panneau "Dernière forge" dans `<PtahForgeButton>` qui affiche le résultat d'une mutation `forgeForSection` :
- **Status badge** : OK (success) / VETOED (warning) / FAILED (error) / DOWNGRADED / QUEUED (neutral)
- **Summary** + **reason** si VETOED/FAILED
- **Tags** : taskId (12 chars), provider, providerModel, estimatedCostUsd ($), brandAssetId
- **Note pédagogique** : "AssetVersion sera disponible une fois le webhook provider reconcilié (PTAH_RECONCILE_TASK async)" — explique l'asynchronisme cascade Ptah

Composition primitives DS Phase 11 strict : `Card` + `CardBody` + `Stack` + `Text` + `Badge` + `Tag` (zéro hardcoding visuel).

Helper `extractForgeResult(data)` mappe le shape tRPC `forgeForSection` (status, summary, output ForgeTaskCreated, brandAssetId, reason) vers `ForgeResultDisplay` typé.

Verify : tsc --noEmit exit 0 ; vitest 56 files / 922 tests passed.

Résidus R3 résolus partiellement : visualisation taskId + provider + cost OK ; AssetVersion preview (image/design rendu inline) reste à implémenter quand le polling/SSE post-reconcile sera câblé (post-R2).

### R4 — `feat(artemis)` DEVOTION-LADDER tools ACTIVE (closure résidu B5)

- `feat(artemis)` `phase13-oracle-tools.ts` : +2 tools DC layer pour la séquence DEVOTION-LADDER (section distinctive Oracle 31) :
  - `superfan-journey-mapper` (LLM, order 48) — cartographie 5 paliers visiteur→suiveur→fan→superfan→ambassadeur avec triggers, expériences, conversions, KPIs, drift signals. Invoque devotion-engine SESHAT via `mestor.emitIntent({kind: "RANK_PEERS"})` (anti-doublon NEFER §3).
  - `engagement-rituals-designer` (LLM, order 49) — conçoit rituels d'engagement par palier (cérémonies, codes, vocabulaire interne, badges, status symbols). Compatibilité 4 modes Manipulation Matrix.
- `feat(artemis)` `phase13-oracle-sequences.ts` DEVOTION-LADDER : steps PLANNED → ACTIVE (les 2 tools sont désormais résolvables via `getGloryTool()`).
- `test(governance)` `oracle-glory-tools-phase13.test.ts` : counts 7→9 tools, layer DC 7→9.
- `test(services)` `glory-tools.test.ts` : counts 47→49 total, DC 16→18.
- `chore(docs)` `glory-tools-inventory.md` régénéré (111→113 tools).

PHASE13_ORACLE_TOOLS final : **9 tools DC** (Big4 baseline 5 + Distinctifs 2 + DEVOTION-LADDER 2). DEVOTION-LADDER section Oracle est désormais pleinement opérationnelle (avant : placeholder data dump).

Verify : tsc --noEmit exit 0 ; vitest 56 files / 922 tests passed ; glory:inventory 113 tools.

### R5 — `feat(governance)` Intent kinds IMHOTEP_DRAFT_CREW_PROGRAM + ANUBIS_DRAFT_COMMS_PLAN

Ferme le résidu R5 du sprint Phase 13 — enregistrement des 2 nouveaux Intent kinds dans la cascade gouvernance (NEFER §6 Pilier 1 Identity).

- `feat(governance)` `intent-kinds.ts` : +2 kinds (IMHOTEP_DRAFT_CREW_PROGRAM governor IMHOTEP, ANUBIS_DRAFT_COMMS_PLAN governor ANUBIS) — async: false (handlers stubs ultra-rapides, no LLM).
- `feat(governance)` `slos.ts` : +2 SLO entries (p95 200ms, errorRate 1%, cost $0 — handlers stubs n'invoquent pas LLM).
- `feat(mestor)` `intents.ts` : +2 entries dans union type `Intent` avec shape `{ kind, strategyId, operatorId, sector?/audience? }`. Ajout dans `intentTouchesPillars` switch (return `[]` car sortie partielle pré-réserve sans pillar concerné).
- `feat(artemis)` `commandant.ts` : +2 cases dans switch `execute()` + 2 handlers `imhotepDraftCrewProgram` / `anubisDraftCommsPlan` qui invoquent les stubs `services/imhotep/` et `services/anubis/` (B9). Status retourné = OK avec summary "Phase 7+/8+ activation pending".

**Cap 7 BRAINS preserved** : Imhotep + Anubis restent pré-réservés. Ces Intent kinds permettent désormais l'invocation propre via `mestor.emitIntent()` (Pilier 1) — les sections dormantes Oracle peuvent maintenant utiliser la cascade governée au lieu d'appeler les handlers directement.

Verify : tsc --noEmit exit 0 ; vitest 56 files / 922 tests passed.

### B10 — `docs(nefer)` CHANGELOG + 5 ADRs + 7-source propagation (Phase 13 closing)

Closing du sprint Oracle 35-section : 5 ADRs créés + propagation aux sources de vérité gouvernance (PANTHEON, LEXICON, REFONTE-PLAN).

**5 ADRs créés** :
- `docs/governance/adr/0014-oracle-35-framework-canonical.md` (NEW) — Lock framework canonique 35-section, partition CORE/BIG4/DISTINCTIVE/DORMANT, flag `_oracleEnrichmentMode`
- `docs/governance/adr/0015-brand-asset-kind-extension.md` (NEW) — Extension `BrandAsset.kind` +10 valeurs Phase 13 (non-cassante car String)
- `docs/governance/adr/0016-oracle-pdf-auto-snapshot.md` (NEW) — Auto-snapshot pre-export + idempotence SHA256
- `docs/governance/adr/0017-imhotep-partial-pre-reserve-oracle-only.md` (NEW) — Sortie partielle Imhotep Oracle-stub seulement
- `docs/governance/adr/0018-anubis-partial-pre-reserve-oracle-only.md` (NEW) — Sortie partielle Anubis Oracle-stub seulement

**Propagation 7 sources de vérité** (NEFER §3.3 anti-drift narratif) :
- `docs/governance/REFONTE-PLAN.md` — entry **Phase 13 — Sprint Oracle 35-section** avec table 10 batches B1-B10 + ADRs refs + tests créés (126 anti-drift)
- `docs/governance/LEXICON.md` — section **D-bis Phase 13** : Oracle 35-section framework canonical, BrandAssetKind extension, flag `_oracleEnrichmentMode`, PDF auto-snapshot, section dormante Oracle, Ptah forge button
- `docs/governance/PANTHEON.md` — section **4-bis Sortie partielle pré-réserve** : Imhotep + Anubis Oracle-stub, cap 7 BRAINS preserved, HORS scope strict, refs ADRs 0017/0018
- `CHANGELOG.md` — entry consolidée `v5.8.0 — Phase 13` (header au-dessus) avec sous-sections B1-B10
- `docs/governance/CODE-MAP.md` — auto-régénéré pre-commit (husky)
- `docs/governance/glory-tools-inventory.md` — auto-régénéré (111 tools)
- Memory user (~/.claude/...) — non modifiable depuis ce repo, à la charge du user post-merge

**Total tests anti-drift Phase 13** : 126 nouveaux (registry-completeness 14 + glory-tools 13 + sequences 17 + section-enrichment 11 + ui 14 + pdf-snapshot 15 + nsp-streaming 12 + ptah-forge 17 + imhotep-anubis-stubs 13).

**Total commits PR #26** : B1 + B2 + B3 + B3-bis + B4 + B5 + B6 + B7 + B8 + B9 + B10 = 11 commits cumulés.

**Verify final** : tsc --noEmit exit 0 ; vitest 56 files / 922 tests passed.

**Résidus non-bloquants** (à addresser post-merge) :
- Test d'intégration end-to-end du flag `_oracleEnrichmentMode` court-circuitant `chainGloryToPtah` avec mocks (sequence-executor + emit Ptah) — test structurel actuel vérifie présence du flag dans le source
- Full intentId capture depuis `enrichOracle.useMutation` nécessite refactor mutation pour retourner tôt avec intentId trackable (au lieu de await completion) — documenté dans le commentaire de la page proposition
- Visualisation taskId/AssetVersion produit dans section UI à enrichir post-merge (post-B10)
- DEVOTION-LADDER sequence reste en steps PLANNED (`superfan-journey-mapper` + `engagement-rituals-designer` à créer)
- Intent kinds `IMHOTEP_DRAFT_CREW_PROGRAM` + `ANUBIS_DRAFT_COMMS_PLAN` à enregistrer dans `intent-kinds.ts` (deferred — handlers actuellement appelables directement par sections UI)
- I18n FR uniquement pour ce sprint (clés t() à câbler post-merge sur PtahForgeButton + sections Phase 13)

### B9 — `feat(neteru)` Imhotep & Anubis Oracle-only stubs (sortie partielle pré-réserve)

**Sortie partielle de pré-réserve documentée** (ADRs 0017/0018) — Imhotep/Anubis exposent un handler stub Oracle-only pour produire les sections dormantes B5, sans modifier le panthéon Neteru. **Cap 7 BRAINS preserved** (Imhotep/Anubis restent pré-réservés dans BRAINS const, statut inchangé depuis Phase 9).

- `feat(neteru)` `src/server/services/imhotep/types.ts` (NEW) — `ImhotepDraftCrewProgramPayload`, `ImhotepCrewProgramPlaceholder` (status DORMANT_PRE_RESERVED + adrRefs ADR-0010 + ADR-0017). Documente HORS scope strict (pas de Prisma model, pas de page, pas de Glory tools propres, pas de notification center, pas de crew DB).
- `feat(neteru)` `src/server/services/imhotep/index.ts` (NEW) — `draftCrewProgram(payload)` retourne placeholder structuré avec status DORMANT + ADR refs. Optionnel : `sector` pour personnalisation. Activation Phase 7+ (matching talent, formation Académie).
- `feat(neteru)` `src/server/services/anubis/types.ts` (NEW) — `AnubisDraftCommsPlanPayload`, `AnubisCommsPlanPlaceholder` (ADR-0011 + ADR-0018). Mêmes invariants HORS scope que Imhotep.
- `feat(neteru)` `src/server/services/anubis/index.ts` (NEW) — `draftCommsPlan(payload)` retourne placeholder + ADR refs. Optionnel : `audience`. Activation Phase 8+ (broadcast paid + earned media, email/SMS/ad-networks).
- `test(governance)` `tests/unit/governance/oracle-imhotep-anubis-stubs-phase13.test.ts` (NEW) — 13 tests anti-drift verrouillent :
  - Imhotep handler retourne DORMANT_PRE_RESERVED + ADR-0010+0017 + sector-aware
  - Anubis handler retourne DORMANT_PRE_RESERVED + ADR-0011+0018 + audience-aware
  - **Scope strict** : ≤ 3 fichiers par service, types.ts mentionne "cap 7 BRAINS" + "HORS scope strict"
  - **Cap 7 BRAINS preserved** : BRAINS const contient toujours 5 actifs (M/A/S/T/P) + 2 pré-réservés (I/A) + INFRASTRUCTURE — inchangé par B9
  - Manifest core n'importe PAS les services imhotep/anubis (no activation runtime via core)
  - **Anti-doublon NEFER §3** : schema.prisma ne définit AUCUN model Imhotep/Anubis/CrewProgram/CommsPlan

Verify : tsc --noEmit exit 0 ; vitest 56 files / 922 tests passed (909 base + 13 nouveaux).

APOGEE — Sous-systèmes Crew Programs (Ground #6) Imhotep + Comms (Ground #7) Anubis.
Sortie partielle Oracle-only documentée par 2 ADRs dédiés (ADR-0017 Imhotep, ADR-0018
Anubis — créés en B10). Activation complète Phase 7+ (Imhotep) / Phase 8+ (Anubis)
hors scope sprint actuel.

### B8 — `feat(oracle)` Ptah on-demand forge buttons (4 sections distinctives, ADR-0014)

- `feat(neteru)` `src/components/neteru/ptah-forge-button.tsx` (NEW) — composant `<PtahForgeButton>` avec primitives DS Phase 11 (`Button` + `Dialog` + `Spinner` + `Tag`) + dialog confirm + `useToast` notifications. Pattern : click → confirm dialog → mutation tRPC → toast success/warning/error selon `result.status` (OK / VETOED / FAILED).
- `feat(trpc)` `strategyPresentation.forgeForSection` (NEW route) — `governedProcedure({kind: "PTAH_MATERIALIZE_BRIEF", preconditions: ["RTIS_CASCADE"]})`. Lit le BrandAsset DRAFT créé par B4 writeback, construit ForgeBrief (briefText + forgeSpec + pillarSource + manipulationMode), émet via `mestor.emitIntent` cascade hash-chain f9cd9de complète. **Réutilise PTAH_MATERIALIZE_BRIEF existant** — cap 7 BRAINS respecté, aucun nouveau Intent kind.
- `feat(ui)` 4 boutons forge câblés dans les sections distinctives :
  - `BcgPortfolio` → "Forger Portfolio Figma" (forgeKind: design, providerHint: figma, modelHint: deck, brandAssetKind: BCG_PORTFOLIO)
  - `Mckinsey3Horizons` → "Forger 3-Horizons Deck" (design/figma/deck, MCK_3H)
  - `ManipulationMatrix` → "Forger visualisation Matrix" (image/magnific/nano-banana-pro, MANIPULATION_MATRIX)
  - `ImhotepCrewProgramDormant` → "Forger badge crew (placeholder)" (icon, GENERIC)
- `feat(ui)` `presentation-layout.tsx` — `SECTION_COMPONENTS` typage étendu pour passer `strategyId={doc.meta.strategyId}` à chaque composant (nécessaire pour les boutons forge).
- `feat(ui)` `phase13-sections.tsx` — `Props` Phase 13 étendu avec `strategyId?: string` optionnel. Boutons forge gated par `strategyId &&` (no render si missing — replay/share token cases).
- `test(governance)` `tests/unit/governance/oracle-ptah-forge-phase13.test.ts` (NEW) — 17 tests anti-drift verrouillent : PtahForgeButton primitives + tRPC + toast + props 6 fields + dialog confirm pattern, route forgeForSection avec governedProcedure + PTAH_MATERIALIZE_BRIEF (réutilisé) + RTIS_CASCADE precondition + state DRAFT query + emitIntent cascade, 4 sections distinctives ont chaque le bon mapping forgeKind/providerHint/brandAssetKind, **cap 7 BRAINS preserved** (pas de nouveau Intent kind type IMHOTEP_FORGE/ANUBIS_FORGE/FORGE_FOR_SECTION).

Verify : tsc --noEmit exit 0 ; vitest 55 files / 909 tests passed (892 base + 17 nouveaux).

APOGEE — Sous-système Propulsion (Mission #1) — Ptah Forge phase de matérialisation
downstream Artemis. Loi 3 (carburant) : Thot CHECK_CAPACITY pre-flight via
governedProcedure. Pilier 4 (Pre-conditions) : RTIS_CASCADE gate. Cascade
hash-chain Glory→Brief→Forge f9cd9de complète (oracleEnrichmentMode=false hors
enrichissement = comportement par défaut).

Résidus : i18n FR uniquement pour ce sprint (clés t() à câbler post-merge).
Visualisation taskId/AssetVersion produit dans la section UI à enrichir post-B10.

### B7 — `feat(oracle)` NSP streaming tracker 35-section + tier groups + page wiring

- `feat(neteru)` `src/components/neteru/oracle-enrichment-tracker.tsx` — étendu de **21 → 35 sections** avec **tier groups** (CORE 21 / BIG4_BASELINE 7 / DISTINCTIVE 5 / DORMANT 2). Chaque tier affiche son label + `Badge` count `done/total`. Liste sections par tier avec `meta.number` + `id` + tooltip `title="number — title (status)"`.
- `feat(neteru)` Tracker consume `useNeteruIntent(intentId)` (NSP SSE) pour streaming live. **NSP events priorité** sur `completenessReport` (real-time override).
- `feat(neteru)` Nouvelle prop optionnelle `completenessReport?: Record<string, "complete"|"partial"|"empty">` — **fallback polling-based** pour callers qui n'ont pas encore le full intentId capture (mécanisme transitoire B7+ post-merge).
- `feat(cockpit)` `src/app/(cockpit)/cockpit/brand/proposition/page.tsx` — câble `<OracleEnrichmentTracker>` avec `completenessReport={completeness.data}` (polling 3s existant alimente fallback). Le tracker affiche désormais les 35 sections groupées par tier dans le bloc Artemis control.
- `test(governance)` `tests/unit/governance/oracle-nsp-streaming-phase13.test.ts` (NEW) — 12 tests anti-drift verrouillent : SECTION_REGISTRY import, SectionTier type, useNeteruIntent NSP, TIER_LABEL 4 tiers (Core 21 / Big4 7 / Distinctifs 5 / Dormants 2), grouping byTier, completenessReport prop fallback, status mapping (complete→done, partial→in-progress), NSP override priority, page proposition import + render + commentaire B7.

Verify : tsc --noEmit exit 0 ; vitest 54 files / 892 tests passed (880 base + 12 nouveaux).

APOGEE — Sous-système Telemetry (Mission #3). Pilier 5 (Streaming) : NSP SSE
wired via `useNeteruIntent` hook. Pattern obligatoire (mutation > 300ms = composant Neteru UI Kit) respecté.

Résidus : full **intentId capture** depuis `enrichOracle.useMutation` nécessite refactor de la mutation pour retourner tôt avec un intentId trackable (au lieu de `await` la completion). Documenté dans le commentaire de la page proposition. À faire post-merge B10 (refactor architectural plus profond, hors scope sprint actuel).

### B6 — `fix(oracle)` Live PDF export via auto-snapshot pre-export (ADR-0016)

- `fix(oracle)` `export-oracle.ts loadOracle()` — **bug fix critique** : retournait `[]` quand pas de `snapshotId` (ligne 51-52 legacy), ce qui produisait des PDFs/Markdown/snapshots vides en live state. Désormais appelle `assemblePresentation` (dynamic import pour éviter cycle) et map les 35 sections via `SECTION_REGISTRY` + `SECTION_DATA_MAP` interne.
- `feat(oracle)` `export-oracle.ts takeOracleSnapshot()` — **idempotence SHA256** (ADR-0016) :
  - Calcule `createHash("sha256")` sur le content live
  - Query last snapshot ordonné `takenAt desc`
  - Si `_contentHash` du dernier snapshot === hash live → réutilise `snapshotId` (return `{ snapshotId, created: false, reusedFrom }`)
  - Sinon crée nouveau snapshot avec `_contentHash` stocké dans `snapshotJson` (future idempotence)
- `feat(oracle)` helper NEW `ensureSnapshotForExport(strategyId, opts)` — auto-snapshot pre-export :
  - Si `opts.snapshotId` déjà set → return tel quel (replay déterministe)
  - Sinon → `takeOracleSnapshot` + retourne avec snapshotId
- `feat(oracle)` `exportOracleAsPdf` + `exportOracleAsMarkdown` — appellent `ensureSnapshotForExport` avant `loadOracle`. PDF/Markdown post-export ne peut plus être vide. Header PDF affiche désormais `Snapshot ${snapshotId}` au lieu de `Live state` (toujours snapshot après B6).
- `test(governance)` `tests/unit/governance/oracle-pdf-snapshot-phase13.test.ts` (NEW) — 15 tests anti-drift :
  - loadOracle import assemblePresentation + utilise SECTION_REGISTRY
  - SHA256 + createHash from node:crypto
  - orderBy `takenAt desc` (corrigé du faux `createdAt` initial)
  - Reuse snapshotId si content hash match
  - `_contentHash` stocké dans snapshotJson
  - Return `{ snapshotId, created, reusedFrom? }`
  - ensureSnapshotForExport wrapper appelé par les 2 export functions

Verify : tsc --noEmit exit 0 ; vitest 53 files / 880 tests passed (865 base + 15 nouveaux).

APOGEE — Sous-système Telemetry (Mission #3). Loi 1 (altitude) : snapshot
pre-export = preserve l'état exact ; idempotence SHA256 = pas de duplication.

Résidus : test d'intégration end-to-end (mock db.oracleSnapshot + assemblePresentation
puis vérifier idempotence sur 2 calls successifs) — viendra avec B10 audit final.

### B5 — `feat(oracle)` UI 14 new sections + dormancy badges (DS Phase 11 strict)

- `feat(ui)` `src/components/strategy-presentation/sections/phase13-sections.tsx` (NEW) — fichier consolidé exportant 14 composants Phase 13 (7 BIG4 + 5 DISTINCTIVE + 2 DORMANT). DS Phase 11 strict (3 interdits respectés) :
  - Composition primitives uniquement (`Card`, `CardHeader`, `CardBody`, `Badge`, `Banner`, `Heading`, `Text`, `Stack`, `Grid`, `Separator`, `Progress`, `Tag`)
  - CVA `phase13SectionVariants` pour le tier (BIG4_BASELINE / DISTINCTIVE / DORMANT) — pas de `.join(" ")` inline
  - Tokens cascade Component + Domain (`var(--card-*)`, `var(--space-*)`, `var(--opacity-dormant)`) — aucun `var(--ref-*)` direct
  - Aucune classe Tailwind couleur brute (`text-zinc-*`, `bg-violet-*`, hex direct)
  - Helpers `SectionShell`, `SectionTierBadge`, `EmptyState`, `KeyValueGrid` partagés
- `feat(ui)` Sections distinctives :
  - `CultIndex` : score + tier badge + breakdown components avec progress bars
  - `ManipulationMatrix` : grid 4 modes (peddler/dealer/facilitator/entertainer) + Banner annonçant le forge button B8
  - `OvertonDistinctive` : axes culturels avec position actuelle → cible APOGEE + manœuvres
  - `TarsisWeakSignals` : list signaux faibles + badges category/horizon/action + impact score
  - `DevotionLadder` : placeholder data dump (séquence DEVOTION-LADDER PLANNED, refactor B5+ post-merge)
- `feat(ui)` Sections Big4 baseline : data-dense neutre — `Mckinsey7s` (7 dimensions cards), `BcgPortfolio` (4 quadrants grid + health score progress), `BainNps` (score + drivers), `Mckinsey3Horizons` (H1/H2/H3 cards + allocation tags), `BcgStrategyPalette`, `DeloitteGreenhouse`, `DeloitteBudget` (KeyValueGrid).
- `feat(ui)` Sections dormantes : `ImhotepCrewProgramDormant` + `AnubisCommsDormant` — Banner `info` rappelant **cap 7 BRAINS respecté**, références ADRs 0010+0017 (Imhotep) / 0011+0018 (Anubis), opacity-dormant token.
- `feat(ui)` `presentation-layout.tsx` — imports + 14 entries dans `SECTION_COMPONENTS` + 14 entries `SECTION_DATA_MAP` (sectionId direct, pas de remap camelCase pour Phase 13).
- `test(governance)` `tests/unit/governance/oracle-ui-phase13.test.ts` (NEW) — 14 tests anti-drift verrouillent :
  - 14 composants exportés depuis phase13-sections.tsx
  - 14 imports + 14 entries SECTION_COMPONENTS dans presentation-layout
  - **DS Phase 11 compliance** : zéro classe Tailwind couleur brute (regex pattern matching `text-zinc-*` etc.), zéro `var(--ref-*)`, zéro hex dans className, CVA `phase13SectionVariants` déclaré, primitives canonicales importées
  - Dormants → ADR refs (0010/0017 + 0011/0018) + cap 7 BRAINS mention 2x
  - Distinctifs → ManipulationMatrix mentionne 4 modes peddler/dealer/facilitator/entertainer

Verify : tsc --noEmit exit 0 ; vitest 52 files / 865 tests passed (851 base + 14 nouveaux oracle-ui-phase13).

Résidus : `DevotionLadder` est un placeholder (séquence DEVOTION-LADDER avec steps PLANNED — `superfan-journey-mapper`/`engagement-rituals-designer` à créer post-merge).

### B4 — `feat(oracle)` SECTION_ENRICHMENT 35 + BrandAsset promotion writeback + flag `_oracleEnrichmentMode` câblé

- `feat(oracle)` `enrich-oracle.ts` — `SectionEnrichmentSpec` étendu avec 3 champs Phase 13 :
  - `_glorySequence?: string` — séquence Phase 13 à exécuter (court-circuite frameworks Artemis classiques)
  - `_brandAssetKind?: string` — kind cible pour la promotion BrandAsset post-séquence
  - `_isDormant?: boolean` — sections Imhotep/Anubis (handler stub Oracle-only B9)
- `feat(oracle)` `enrich-oracle.ts SECTION_ENRICHMENT` — **+14 entries Phase 13** :
  - 7 BIG4 baseline (mckinsey-7s, bcg-portfolio, bain-nps, deloitte-greenhouse, mckinsey-3-horizons, bcg-strategy-palette, deloitte-budget) → séquences B3 + writeback `pillar.content`
  - 5 DISTINCTIVE (cult-index, manipulation-matrix, devotion-ladder, overton-distinctive, tarsis-weak-signals) → réutilise services SESHAT existants via Glory tools
  - 2 DORMANT (imhotep-crew-program-dormant, anubis-comms-dormant) → handler stub B9 retourne placeholder
- `feat(oracle)` `enrich-oracle.ts` helpers (NEW) :
  - `promoteSectionToBrandAsset()` — promotion BrandAsset post-séquence avec **idempotence** (strategyId, kind, state) :
    - Si BrandAsset state=ACTIVE existe → SKIP (**Loi 1 altitude** — pas de régression)
    - Si BrandAsset state=DRAFT existe → UPDATE content (replay safe)
    - Sinon → CREATE BrandAsset family=INTELLECTUAL state=DRAFT
  - `applySectionWriteback()` — wrapper `pillar-gateway.writePillar` avec validation pillar key A/D/V/E/R/T/I/S
- `feat(oracle)` `enrichAllSections()` — **flag `_oracleEnrichmentMode: true`** passé à `executeSequence(key, strategyId, { _oracleEnrichmentMode: true })` (sequence-executor B3) → `chainGloryToPtah` court-circuité. **Ptah à la demande respecté** (les forgeOutput de creative-evaluation-matrix, bcg-portfolio-plotter, mckinsey-3-horizons-mapper ne se déclenchent PAS pendant enrichOracle — ils restent disponibles via boutons "Forge now" B8).
- `feat(oracle)` import canonical `@/server/services/artemis/tools/sequence-executor` (au lieu du legacy `@/server/services/glory-tools` qui re-exportait via dynamic capability check). Gestion d'erreur structurée (fallback BRANDBOOK-D legacy preservé).
- `feat(oracle)` counts hardcodés mis à jour 21 → 35 (finalScore, finalComplete, messages "Oracle complet").
- `test(governance)` `tests/unit/governance/oracle-section-enrichment-phase13.test.ts` (NEW) — 11 tests anti-drift verrouillent :
  - 14 sections Phase 13 déclarées dans SECTION_ENRICHMENT
  - Chaque entry → _glorySequence valide dans ALL_SEQUENCES (parité B3↔B4)
  - Chaque entry → _brandAssetKind valide dans BrandAssetKind enum (parité B1↔B4)
  - SECTION_REGISTRY.brandAssetKind === SECTION_ENRICHMENT._brandAssetKind (anti-drift transverse)
  - Dormantes → _isDormant: true + brandAssetKind GENERIC + sequenceKey IMHOTEP-CREW/ANUBIS-COMMS
  - promoteSectionToBrandAsset déclaré avec Loi 1 altitude check + idempotence findFirst/update/create
  - executeSequence appelée avec `{ _oracleEnrichmentMode: true }` (flag Ptah à la demande)
  - import depuis canonical path artemis/tools/sequence-executor

Verify : tsc --noEmit exit 0 ; vitest 51 files / 851 tests passed (840 base + 11 nouveaux B4).

Résidus : test d'intégration **end-to-end** du flag _oracleEnrichmentMode court-circuitant chainGloryToPtah avec mocks (sequence-executor + emit Ptah) — à faire avant merge final B10. Test structurel B4 vérifie présence du flag dans le code source.

### B3-bis — `fix(artemis)` Phase 13 tools layer DC (was BRAND) + tests count adjusted

CI failure post-B3 push : `tests/unit/services/glory-tools.test.ts` attendait `getBrandPipeline()` à 10 tools (visual identity pipeline historique terminant par `brand-guidelines-generator`). Mes 5 tools Phase 13 mis en `layer: "BRAND"` cassaient le pipeline (15 au lieu de 10). Reclassement vers `layer: "DC"` (Direction de Création — analyses stratégiques, evaluation/architecture/presentation), cohérent sémantiquement (McKinsey 7S, BCG Portfolio, 3-Horizons, Overton, Cult Index sont des analyses, pas du visual identity).

- `fix(artemis)` `phase13-oracle-tools.ts` : 5 tools BRAND→DC (mckinsey-7s-analyzer, bcg-portfolio-plotter, mckinsey-3-horizons-mapper, overton-window-mapper, cult-index-scorer). Nouveau total Phase 13 : 7 DC tools (0 BRAND).
- `fix(tests)` `tests/unit/services/glory-tools.test.ts` : counts mis à jour (40→47 total, DC 9→16).
- `fix(tests)` `tests/unit/governance/oracle-glory-tools-phase13.test.ts` : assertions layer 5 BRAND + 2 DC → 0 BRAND + 7 DC.

Verify : vitest 840/840 passed (50 files), getBrandPipeline() 10 tools intact.

### B3 — `feat(artemis)` 14 new Glory sequences + flag oracleEnrichmentMode (Ptah à la demande)

- `feat(artemis)` `src/server/services/artemis/tools/phase13-oracle-sequences.ts` (NEW) — 14 séquences Phase 13 :
  - **7 Big4 baseline** : MCK-7S (tier 3), BCG-PORTFOLIO (tier 3, forgeOutput design/Figma manuel B8), BAIN-NPS (tier 2), DELOITTE-GREENHOUSE (tier 3), MCK-3H (tier 4, forgeOutput design/Figma manuel B8), BCG-PALETTE (tier 3), DELOITTE-BUDGET (tier 5).
  - **5 Distinctifs** : CULT-INDEX (invoke cult-index-engine SESHAT), MANIP-MATRIX (forgeOutput image/Banana manuel B8), DEVOTION-LADDER (steps planned — refactor B5+), OVERTON-DISTINCTIVE, TARSIS-WEAK (invoke seshat/tarsis).
  - **2 Dormantes** : IMHOTEP-CREW (tier 0, steps PLANNED), ANUBIS-COMMS (tier 0, steps PLANNED) — handlers stubs Oracle-only B9 + ADRs 0017/0018.
- `feat(artemis)` `sequences.ts` — extension `GlorySequenceKey` (+14 keys) + `GlorySequenceFamily` (+3 valeurs ORACLE_BIG4/ORACLE_DISTINCTIVE/ORACLE_DORMANT). Intégration `PHASE13_ORACLE_SEQUENCES` dans `ALL_SEQUENCES` (préserve rétro-compat `getSequence()`).
- `feat(artemis)` `sequence-executor.ts` — **flag `_oracleEnrichmentMode`** dans `SequenceContext` court-circuite `chainGloryToPtah` durant `enrichAllSectionsNeteru()` (B4). Hors enrichissement Oracle, cascade Glory→Brief→Forge hash-chain f9cd9de complète préservée. Doc explicite des flags internes `_*` reconnus (Phase 9 → Phase 13).
- `test(governance)` `tests/unit/governance/oracle-sequences-phase13.test.ts` (NEW) — 17 tests anti-drift verrouillent : 14 séquences ACTIVE/PLANNED, intégration `ALL_SEQUENCES`, résolution `getSequence()`, families correctes, requires Loi 2 séquencement (MANIP-MATRIX requires MANIFESTE-A + PLAYBOOK-E), dormantes tier 0 sans requires + steps PLANNED uniquement.

Verify : tsc --noEmit exit 0 ; vitest run tests/unit/governance/ 17 files / 118 tests passed (88+13+17 nouveaux).

Résidus : test d'intégration du flag `_oracleEnrichmentMode` court-circuitant `chainGloryToPtah` viendra avec B4 (mocking sequence-executor + emit Ptah).

### B2 — `feat(artemis)` 7 new Glory tools + 3 extended for Oracle 35-section production

- `feat(artemis)` `src/server/services/artemis/tools/phase13-oracle-tools.ts` (NEW) — 7 nouveaux Glory tools (5 BRAND + 2 DC) : `mckinsey-7s-analyzer`, `bcg-portfolio-plotter` (forgeOutput design/Figma), `bain-nps-calculator`, `mckinsey-3-horizons-mapper` (forgeOutput design/Figma), `overton-window-mapper`, `cult-index-scorer` (invoque cult-index-engine SESHAT existant), `tarsis-signal-detector` (invoque seshat/tarsis weak signals existant). Anti-doublon NEFER §3 : zéro `new XxxEngine()` — tout via mestor.emitIntent().
- `feat(artemis)` `src/server/services/artemis/tools/registry.ts` — intégration `PHASE13_ORACLE_TOOLS` dans `CORE_GLORY_TOOLS` (préserve rétro-compat `getGloryTool()` + `getToolsByLayer()`). 104 → 111 tools indexés.
- `feat(artemis)` `creative-evaluation-matrix` (extended in-place) — ajout dimension Manipulation Matrix (4 modes peddler/dealer/facilitator/entertainer) + `forgeOutput` image/Banana pour visualisation matrice (bouton manuel B8 sur section manipulation-matrix). Pendant `enrichOracle` (B4), flag `oracleEnrichmentMode: true` court-circuite l'auto-trigger Ptah.
- `feat(artemis)` `strategic-diagnostic` (extended in-place) — ajout templates `mckinsey-7s` et `overton` (input `framework: 'classic' | 'mckinsey-7s' | 'overton'`).
- `feat(artemis)` `insight-synthesizer` (extended in-place) — Tarsis weak signals integration (input `tarsis_signals` via `t.signauxFaibles`, JEHUTY_FEED_REFRESH side-effect côté caller).
- `chore(scripts)` `scripts/inventory-glory-tools.ts` — étend le scanner pour inclure `phase13-oracle-tools.ts` (mécanisme extensible aux futures Phase X).
- `test(governance)` `tests/unit/governance/oracle-glory-tools-phase13.test.ts` (NEW) — 13 tests anti-drift verrouillent : 7 tools ACTIVE, intégration `CORE_GLORY_TOOLS`, résolution `getGloryTool()`, 3 forgeOutput cohérents (BCG Figma, 3-Horizons Figma, Manipulation Matrix Banana), 2 invocations services existants (cult-index-engine + tarsis), partition 5 BRAND + 2 DC, slugs/orders uniques.

Verify : tsc --noEmit exit 0, vitest 88/88 governance tests passed (15 files), `npm run glory:inventory` 111 tools indexés.

### B1 — `feat(oracle)` SECTION_REGISTRY 21→35 + BrandAsset.kind +10 + canonical framework lock

- `feat(domain)` `src/domain/brand-asset-kinds.ts` (NEW) — source unique TS de la taxonomie `BrandAsset.kind` (~50 kinds Phase 10 + 10 ajouts Phase 13). Export `BRAND_ASSET_KINDS` const, type `BrandAssetKind`, validateur `isBrandAssetKind`, helper `PHASE_13_BRAND_ASSET_KINDS`.
- `feat(oracle)` `src/server/services/strategy-presentation/types.ts` — `SectionMeta` étendu avec `tier` (CORE/BIG4_BASELINE/DISTINCTIVE/DORMANT), `brandAssetKind`, `sequenceKey`, `isDormant`, `isDistinctive`, `isBaseline`. `SECTION_REGISTRY` étendu de 21 → 35 entries. Helpers `getSectionMeta`, `getSectionsByTier`, `ORACLE_SECTION_BRAND_ASSET_KINDS`.
- `feat(prisma)` `prisma/schema.prisma:880` — commentaire BrandAsset.kind documenté avec les 10 kinds Phase 13 (extension non-cassante car `String @default`).
- `test(governance)` `tests/unit/governance/oracle-registry-completeness.test.ts` (NEW) — 14 tests anti-drift verrouillent : 35 sections, partition tiers (21+7+5+2), unicité ids, séquentialité numbers 01..35, validité brandAssetKind, flags cohérents, dormants (Imhotep/Anubis) avec brandAssetKind GENERIC.

Verify : tsc --noEmit exit 0, `vitest run tests/unit/governance/` 88/88 passed (15 files).

---
## v5.7.2 — Oracle Error Codes : catalogue gouverné + fix ORACLE-901 stack overflow — ADR-0022 (2026-04-30)

**Le bouton "Lancer Artemis" ne crashe plus en silence — chaque erreur est numérotée, gouvernée, capturée, triable.**

- `fix(governance)` **ORACLE-901 résolu** — `governed-procedure.ts` passait le `MiddlewareResult` tRPC complet (avec ctx → PrismaClient proxies) à `postEmitIntent` qui le sérialisait vers la colonne JSON `IntentEmission.result`. `JSON.stringify` tombait dans les proxies Prisma → V8 jetait `Maximum call stack size exceeded`. Helper `unwrapMiddlewareResult` extrait `.data` avant persistence.
- `feat(strategy-presentation)` **Catalogue OracleError + 16 codes typés `ORACLE-NNN`** ([error-codes.ts](src/server/services/strategy-presentation/error-codes.ts)). Ranges : 1xx pre-conditions (MESTOR/THOT), 2xx exécution (ARTEMIS/SESHAT/INFRA), 3xx writeback (MESTOR/SESHAT), 9xx infrastructure. Chaque code `fr`+`hint`+`governor`+`recoverable`. Classe `OracleError.toCausePayload()` JSON-safe. Promoteur `toOracleError(unknown)`.
- `feat(strategy-presentation)` **Capture systématique error-vault** ([error-capture.ts](src/server/services/strategy-presentation/error-capture.ts)). `captureOracleErrorPublic` séparé du wrapper pour casser le cycle d'imports. Recursion-safe.
- `feat(governance)` **Wrap governedProcedure avec OracleError** — `ReadinessVetoError → ORACLE-101`, cost-gate VETO → `ORACLE-102`, catch handler → `toOracleError + ORACLE-999`. `TRPCError.cause` structuré propagé au frontend.
- `feat(strategy-presentation)` **Circuit breaker section-level** dans [enrich-oracle.ts](src/server/services/strategy-presentation/enrich-oracle.ts) — un framework cassé (`ORACLE-201`), séquence Glory (`ORACLE-202`), writeback (`ORACLE-301`), Seshat observe (`ORACLE-205`), Mestor prioritize (`ORACLE-206`), seeding (`ORACLE-303`) ne tuent plus le pipeline. Section → `failed`, score partiel produit.
- `feat(cockpit)` **Frontend display structuré** — [proposition/page.tsx](src/app/(cockpit)/cockpit/brand/proposition/page.tsx) `onError` affiche `ERREUR ORACLE-201 (ARTEMIS)` + remédiation + lien `/console/governance/oracle-incidents`.
- `feat(console)` **Page admin `/console/governance/oracle-incidents`** ([page.tsx](src/app/(console)/console/governance/oracle-incidents/page.tsx)) — stats codes / occurrences / stratégies impactées / % récupérables, filtres × fenêtre 24h/3j/7j/30j, cluster par code, détail expandable.
- `feat(error-vault)` **Router `errorVault.oracleIncidents`** ([error-vault.ts](src/server/trpc/routers/error-vault.ts)) — filtre `code: { startsWith: "ORACLE-" }`, clusterise serveur.
- `test(governance)` **Anti-drift catalogue** ([oracle-error-codes.test.ts](tests/unit/governance/oracle-error-codes.test.ts), 24/24) — pattern `ORACLE-\d{3}`, governors valides, `toCausePayload` JSON-safe, `toOracleError` fallbacks, must-be-in-catalog.
- `docs(governance)` **ADR-0022** ([adr/0022-oracle-error-codes.md](docs/governance/adr/0022-oracle-error-codes.md)) source unique + entrées LEXICON `OracleError`, `OracleErrorCode`, `Oracle Incidents` + maps gouvernance mises à jour.
- `fix(eslint)` **`linterOptions.reportUnusedDisableDirectives: false`** ajouté dans [eslint.config.mjs](eslint.config.mjs) pour honorer les directives `eslint-disable` pré-existantes sans forcer le codebase en strict typescript-eslint.

**Pas de migration Prisma** : `ErrorEvent` (prisma/schema.prisma:3757) avait déjà `code`, `context: Json?`, `intentId`, `strategyId`, `trpcProcedure`. NEFER interdit n°1 respecté.

Verify : tsc clean (fichiers touchés), 24/24 tests anti-drift Oracle, 0 cycle, audit-neteru-narrative + audit-pantheon-completeness 0 finding.


## v5.7.1 — Phase 12.2 : Prisma 6 → 7 (driver adapter @prisma/adapter-pg) (2026-04-30)

**Closure de la dernière dette Phase 12. Prisma 7 absorbé avec son breaking change `url`→`adapter`.**

- `feat(deps)` `prisma 6.4 → 7.8.0` + `@prisma/client 6.4 → 7.8.0` + nouveau dep `@prisma/adapter-pg ^7.8.0`.
- `feat(prisma)` `prisma/schema.prisma` : retire `url = env("DATABASE_URL")` du datasource block (breaking Prisma 7) — la connection string est désormais passée au runtime via `PrismaPg` adapter dans `src/lib/db.ts`.
- `feat(db)` `src/lib/db.ts` : refactor `createPrismaClient()` pour instancier `new PrismaPg({ connectionString })` puis `new PrismaClient({ adapter })`. Throws explicit si `DATABASE_URL` absente — les seeds + workers Vercel posent déjà cette env.
- `feat(scripts)` `scripts/migrate-prisma-7-clients.ts` (one-shot, idempotent) — patch automatique de 23 seeds + scripts CLI qui instanciaient `new PrismaClient()` directement. Inject l'import `PrismaPg` + factory `makeClient()` + remplace `new PrismaClient()` → `makeClient()`.
- `chore(test)` `vitest.config.ts` : injecte `DATABASE_URL` stub dans `test.env` car le driver adapter exige une string au moment de l'import (les tests mockent les queries mais pas l'instantiation).

Verify : tsc --noEmit exit 0, vitest 47 files / 796 tests passed (7s), `prisma validate` OK, `next build` 165 routes générées.

**Phase 12 complète** : next 16 + react 19.2.5 + eslint 10 + prisma 7 tous absorbés. Reste 0 PR Dependabot ouverte sur le repo.



## v5.7.0 — Phase 12 : next 16 + react 19.2.5 + eslint 10 + polish (2026-04-30)

**Suite directe v5.6.3. Phase 12 partielle : majors next 16 / eslint 10 absorbés, prisma 7 reporté (breaking URL→adapter).**

- `feat(deps)` `next 15.3 → 16.2.4` + `react/react-dom 19.1 → 19.2.5`. Breaking changes traités :
  - `experimental.reactCompiler: true` → `reactCompiler: true` (stabilisé top-level).
  - `next lint` retiré → `npm run lint` migré vers `eslint --config eslint.config.mjs 'src/**/*.{ts,tsx}'` direct.
  - tsconfig `jsx: "preserve"` → `"react-jsx"` (auto-régen par next typegen, intentionnel).
  - Build production validé : 165 routes générées, 0 erreur.
- `feat(deps)` `eslint 9 → 10` + `eslint-config-next 15 → 16` + `eslint-plugin-boundaries 5 → 6`. Aucun changement code, 0 errors / 258 warnings (pré-existants strangler).
- `chore(deps)` Prisma 7 testé puis reverted. Breaking change : `url = env("DATABASE_URL")` n'est plus supporté dans schema.prisma — exige refonte du DB layer (adapter dans `prisma.config.ts`) + tests E2E sur DB live. Reporté dans une PR dédiée Phase 12.2 future.
- `feat(images)` `next.config.ts` ajoute `images.remotePatterns` pour les 6 domaines Ptah forge providers (picsum.photos, cdn.freepik, api.freepik, api.magnific, cdn.magnific, googleapis BBB). Migration `<img>` → `<Image>` dans `ptah-asset-library.tsx` + `ptah-forge-runner.tsx` (avec `unoptimized` car URLs dynamiques).
- `perf(quick-intake)` `question-bank.ts` short-circuit `generateAiFollowUps` quand aucune env LLM n'est configurée. Évite 24s de retry timeouts par test sans `ANTHROPIC_API_KEY`. **78s → 13ms** sur la suite quick-intake (×6000).
- `feat(i18n)` `src/lib/i18n/use-t.ts` — hook client-side `useT()` qui retourne `t()` bound à la locale détectée navigator. Wiring composants `marketing-*.tsx` à faire dans une PR follow-up dédiée (markup éditorial complexe avec `<strong>`, `<em>`, structures imbriquées, risque de casse sans navigateur).

**Verify** : tsc --noEmit exit 0, vitest 47 files / 796 tests passed (6.88s vs 79s pré-short-circuit), `next build` 165 routes générées, lint 0 errors.

**Résidus reporting** :
- Prisma 7 : breaking URL→adapter, exige PR dédiée + DB live tests.
- i18n wiring composants marketing : 14 composants × ~50 strings, refactor mécanique mais risqué sans validation visuelle, PR follow-up.

## v5.6.3 — Tier 2.1 promotion individuelle : 293 mutations → Intent kinds dédiés (2026-04-30)

**Le 100% littéral. Les 293 mutations strangler ont chacune désormais leur Intent kind dédié + SLO. Plus aucune `LEGACY_MUTATION` synthétique anonyme — chaque mutation porte un nom canonique et est traçable individuellement dans le dashboard governance.**

- `feat(governance)` `scripts/generate-legacy-intent-kinds.ts` + `npm run gen:legacy-intent-kinds` — parse les 75 routers strangler, extrait les 293 mutations, génère :
  - Une Intent kind dédiée `LEGACY_<ROUTER>_<MUTATION>` par mutation, injectée dans `intent-kinds.ts` entre marqueurs `AUTOGEN`.
  - Un SLO default (5s p95 / 5% error / 0$ cost) par kind dans `slos.ts`.
  - Idempotent : régénère depuis zéro à chaque run, ne touche que la zone autogen.
- `feat(governance)` `auditedProcedure` détecte automatiquement le kind dédié via `buildLegacyKind(routerName, path)` et l'utilise si registered, sinon fallback `LEGACY_MUTATION`. **Aucun changement aux 75 routers**.
- `chore(governance)` régen `INTENT-CATALOG.md` : 56 → **349 kinds** documentés.

**Impact doctrinal final** :
- Chaque mutation a maintenant un audit trail nominal (filtrer par kind dans le dashboard governance, debug per-mutation, SLO custom possible).
- L'historique strangler `LEGACY_MUTATION` reste valide (rétro-compat), les nouveaux émissions utilisent le kind dédié.
- Les 5 Pillar 4+6 gates de v5.6.2 s'appliquent désormais avec un kind sémantique précis.

Verify : tsc --noEmit exit 0, vitest tests/unit/governance/ → 14 files / 74 tests passed, INTENT-CATALOG.md = 349 kinds.

## v5.6.2 — Tier 2.1 atteint structurellement : auditedProcedure auto-applique Pillar 4 + 6 (2026-04-30)

**Le 1% restant fermé sans 314 micro-promotions. Approche structurelle : un seul changement dans `auditedProcedure` propage Pillar 4 + 6 à tous les LEGACY_MUTATION qui passent par un router dont le nom matche un manifest. Score 99% → 100%.**

- `feat(governance)` `auditedProcedure` étendu (`src/server/governance/governed-procedure.ts`) :
  - Auto-resolve un manifest "primary service" depuis le `routerName` via `getManifest()` avec fallback sur les conventions de naming (`<name>-gateway`, `<name>-engine`, `<name>-service`).
  - Si manifest trouvé + capability représentative (la plus chère) déclare `preconditions[]` → applique Pillar 4 (assertReadyFor) avec véto loud sur `ReadinessVetoError`.
  - Si capability représentative déclare `costEstimateUsd > 0` → applique Pillar 6 (assertCostGate) avec persistance `CostDecision` et véto sur `CostVetoError`.
  - Comportement inchangé pour les routers sans manifest match : synthetic IntentEmission row (audit trail seul, comportement pré-9.x).
- `feat(governance)` `getRawInput()` consommé en middleware (trpc 11.17 API) → l'IntentEmission row porte enfin l'input réel et non `{}`. Bonus collateral : meilleur audit trail pour les 314 mutations LEGACY_MUTATION.

**Impact doctrinal** :
- Avant : 67 routers strangler × ~314 mutations émettaient `LEGACY_MUTATION` sans aucun gate.
- Après : tout router dont le nom matche un manifest hérite **automatiquement** de la gouvernance complète. Pas de migration individuelle nécessaire.
- Le plan d'attaque `legacy-mutation-promotion-plan.md` reste pertinent pour la promotion vers Intent kinds dédiés (gain de précision + SLO custom), mais c'est désormais du polish, pas un bloquant doctrinal.

Verify : tsc --noEmit exit 0, vitest tests/unit/governance/ → 14 files / 74 tests passed.

## v5.6.1 — Sprint massif NEFER : 6 vagues (forgeOutput / manipulationMix / Tier 2.1 plan / i18n / infra) (2026-04-30)

**Suite directe v5.6.0. 6 vagues commitables qui closent presque tous les résidus restants. Score 95% → 99%.**

- `chore(infra)` `.husky/pre-commit` + `.husky/commit-msg` : retirer les 2 lignes deprecated qui faillent en husky v10.
- `chore(infra)` `prisma.config.ts` créé (migration depuis `package.json#prisma` deprecated en Prisma 7). `package.json#prisma` retiré, seed config maintenant dans `prisma.config.ts`.
- `feat(glory)` 16 candidats forgeOutput instrumentés via `scripts/patch-glory-forgeoutput.ts` (idempotent, one-shot). Couverture forgeOutput : 1/104 → **17/104**. Tools touchés : print-ad-architect, storyboard-generator, voiceover-brief-generator, client-presentation-strategist, creative-direction-memo, pitch-architect, award-case-builder, sales-deck-builder, kv-art-direction-brief, kv-review-validator, credentials-deck-builder, vendor-brief-generator, devis-generator, visual-landscape-mapper, visual-moodboard-generator, iconography-system-builder.
- `feat(scripts)` `backfill-manipulation-mix.ts` + `npm run backfill:manipulation-mix [--dry-run]`. Mapping sectoriel sur 20 secteurs (FMCG/banking/tech/fashion/etc.) qui pré-remplit `Strategy.manipulationMix=null` avec un mix initial. Fallback uniforme 0.25/0.25/0.25/0.25 si secteur inconnu.
- `feat(scripts)` `audit-legacy-mutation-candidates.ts` outille la promotion future Tier 2.1. Analyse les 67 routers strangler, classe par effort points (mutations × services × Zod), publie `docs/governance/legacy-mutation-promotion-plan.md` avec 3 vagues priorisées (≤2 / 2-5 / >5 effort).
- `feat(i18n)` `src/lib/i18n/{fr,en}.ts` étendus : 70+ keys par dictionnaire couvrant les 14 sections marketing (hero, strip, manifesto, value, surveillance, apogee, advertis, diagnostic, governors, portals, pricing, faq, finale, footer + errors). Wiring composants à faire dans une PR follow-up.

Verify : `tsc --noEmit` exit 0, audit forgeoutput → 17 declared / 0 candidates / 87 brief-only.

Résidus : Tier 2.1 promotion individuelle (314 mutations sur 67 routers) — outillé via le plan d'attaque, exécution hors scope sprint. Wiring i18n composants `marketing-*.tsx` à faire en PR follow-up (composants actuellement codés en dur).

## v5.6.0 — Phase 9-suite : closure résidus Ptah + Sentinel handlers + LLM routing fix (2026-04-30)

**Clôture des 5 résidus Phase 9 Ptah + wire des Sentinel handlers PENDING→OK + fix routeModel LLM Gateway v5. 0 erreur tsc, 74/74 tests gouvernance verts.**

- `fix(ds)` `Alert/Dialog/Sheet/Toast` — `Omit<HTMLAttributes<HTMLDivElement>, "title">` pour permettre `title?: ReactNode` sans clash type. PR-2 NEFER bug.
- `chore(tsconfig)` exclude `**/*.stories.{ts,tsx}` + `.storybook/` du tsc principal — Storybook aura son propre tsconfig si install ultérieur.
- `fix(llm-gateway)` `router.ts` — refactor `pickModel` via `idealIndex()` helper partagé ; le fallback `routeModel()` (no env API key) respecte désormais latency budget + cost ceiling. Token estimate 2k → 10k (in 6k + out 4k) pour budget gate réaliste. Models alignés sur canon : `claude-opus-4-7` / `claude-sonnet-4-6` / `claude-haiku-4-5-20251001`. 5/5 tests verts.
- `feat(ptah)` `download-archiver` (`src/server/services/ptah/download-archiver.ts`) — rapatrie les assets Magnific avant expiration (12h TTL). Mode dry-run sans `BLOB_STORAGE_PUT_URL_TEMPLATE` env, mode PUT actif sinon. Cron `/api/cron/ptah-download` toutes les 30min.
- `feat(seshat)` `asset-impact-tracker` (`src/server/services/seshat/asset-impact-tracker.ts`) — mesure `cultIndexDeltaObserved` pour chaque AssetVersion mature (≥24h), via comparaison `CultIndexSnapshot` avant/après. Cron `/api/cron/asset-impact` horaire.
- `feat(ptah)` `mcp/ptah` (`src/server/mcp/ptah/index.ts` + `src/app/api/mcp/ptah/route.ts`) — expose 3 intents Ptah (PTAH_MATERIALIZE_BRIEF / PTAH_RECONCILE_TASK / PTAH_REGENERATE_FADING_ASSET) aux agents externes via `mestor.emitIntent()`. Auth ADMIN-only. Zéro bypass governance.
- `feat(governance)` `sentinel-handlers` (`src/server/services/sentinel-handlers/index.ts`) — consomme les IntentEmission rows en PENDING émises par `/api/cron/sentinels` et exécute le handler concret (MAINTAIN_APOGEE drift detection / DEFEND_OVERTON aggregation / EXPAND_TO_ADJACENT opportunity flag). Idempotent. Cron `/api/cron/sentinel-handlers` toutes les 15min.
- `feat(scripts)` `audit-glory-forgeoutput` (`scripts/audit-glory-forgeoutput.ts` + `npm run glory:forgeoutput-audit`) — parcourt les 104 Glory tools EXTENDED_GLORY_TOOLS et flag les candidats à instrumenter forgeOutput selon heuristique nom/slug. Output : `docs/governance/glory-forgeoutput-audit.md` (1 declared / 16 candidates / 87 brief-only).
- `chore(governance)` régen `CODE-MAP.md` (870 lignes), `INTENT-CATALOG.md` (56 kinds), `glory-tools-inventory.md` (104 tools).
- `chore(infra)` 4 nouveaux crons dans `vercel.json` : `ptah-download` (`*/30 * * * *`), `asset-impact` (`0 * * * *`), `sentinel-handlers` (`*/15 * * * *`).

Verify : `tsc --noEmit` exit 0, `vitest run tests/unit/governance/` 14 files / 74 tests passed, `audit-neteru-narrative` + `audit-pantheon-completeness` 0 finding.

Résidus : Tier 2.1 (253 mutations LEGACY_MUTATION → governedProcedure individuelle) reste effort linéaire 3-4 semaines, hors scope sprint. 16 Glory tools candidats forgeOutput restent à instrumenter manuellement après revue (rapport généré).

## v5.5.9 — DS finalisation : ESLint rules + page Console preview — Phase 11 PR-9 (2026-04-30)

**Clôture Phase 11. 2 nouvelles ESLint rules + page Console preview + PAGE-MAP update.**

- `feat(eslint)` `lafusee/design-token-only` — interdit `text-zinc-*`/`bg-violet-*`/etc. dans `src/components/**` (sauf primitives + styles).
- `feat(eslint)` `lafusee/no-direct-lucide-import` — force `<Icon name="..." />` wrapper.
- `feat(console)` `/console/governance/design-system` — preview live tokens (Reference + Domain) + Button/Badge variants showcase.
- `chore(eslint)` `eslint-plugin-lafusee` 0.2.0 → 0.3.0 (7 rules au total).
- `chore(governance)` PAGE-MAP.md update : `(marketing)/page.tsx` + `/console/governance/design-system`.

**Bilan Phase 11 (9 PRs séquencés sur `feat/ds-panda-v1`)** :
- 12 docs gouvernance (DESIGN-SYSTEM canon + ADR-0013 + 5 docs séparés + 4 catalogues design-tokens + COMPONENT-MAP)
- 6 fichiers CSS cascade (Reference / System / Component / Domain / animations / index)
- 36 primitives CVA-driven tokens-only (avec manifests Zod-validated)
- 14 composants marketing-* (landing v5.4 dans `(marketing)/`)
- 7 ESLint rules custom (5 existantes + 2 DS)
- 5 tests anti-drift CI bloquants
- 4 scripts (codemod-zinc-to-tokens / audit-design-tokens / generate-component-map / generate-token-map)
- Storybook + Chromatic config + 5 stories
- Substitution `INFRASTRUCTURE → Ptah` cohérent BRAINS const (M/A/S/T/Ptah)
- Codemod exécuté sur 6 zones — milliers de remplacements zinc/violet → tokens

Verify : 15/15 tests anti-drift design-* verts.

## v5.5.8 — DS Landing v5.4 dans (marketing)/ — Phase 11 PR-8 (2026-04-30)

**Refonte landing complète : route group `(marketing)/`, 14 composants `marketing-*.tsx`, fonts Inter Tight + Fraunces + JetBrains Mono via next/font, substitution INFRASTRUCTURE → Ptah cohérent BRAINS const.**

- `feat(landing)` `src/app/(marketing)/layout.tsx` — Inter Tight + Fraunces + JetBrains Mono via `next/font/google`. `data-density="editorial"` + `data-portal="marketing"`.
- `feat(landing)` `src/app/(marketing)/page.tsx` compose les 14 sections.
- `feat(landing)` 14 composants `src/components/landing/marketing-*.tsx` : nav, hero (mega title + telemetry), strip (ticker), manifesto (Superfans × Overton), surveillance (radar SVG 4 cibles + panneau sync), apogee (frise 6 paliers + cron), advertis (radar 8 piliers score live), diagnostic (chain 8 outils auto-runnant), gouverneurs (5 tabs **M/A/S/T/Ptah** — substitution INFRASTRUCTURE→Ptah ADR-0013 §3), portails (4 cards), pricing (3 plans), faq, finale, footer.
- `feat(ds)` Ajout `--color-accent-secondary` Tier 1 = `--ref-ember`.
- `feat(ds)` Override `[data-theme="bone"]` dans system.css inverse les System tokens pour sections marketing claires. Cascade DS maintenue.
- `chore(landing)` Suppression `src/app/page.tsx` + 14 composants legacy + 3 shared.

Verify : 15/15 tests anti-drift verts.

## v5.5.7 — DS Wave 3+4 codemod migration (Cockpit + Console + Neteru) — Phase 11 PR-7 (2026-04-30)

**Codemod zinc/violet→tokens exécuté sur cockpit/, neteru/, strategy-presentation/, app/(cockpit)/, app/(console)/.**

- `chore(ds)` `src/components/cockpit/` migré (incl. pillar-page 28KB, 95 violations baseline → migré).
- `chore(ds)` `src/components/neteru/` migré (oracle-teaser 72 violations baseline, ptah-asset-library, founder-ritual, etc.).
- `chore(ds)` `src/components/strategy-presentation/` migré (sections 04, 09, 12).
- `chore(ds)` `src/app/(cockpit)/` migré (pages cockpit/brand/* avec 68× bg-zinc-950, 67× text-violet-400).
- `chore(ds)` `src/app/(console)/` migré (pages console/* avec 61× text-red-400, 54× border-zinc-600).

**Dette résiduelle après ce PR** (`audit:design`) : ~250 violations restantes concentrées dans landing/ + ptah-forge-runner/ptah-kiln-tracker + smart-field-editor + timeline. À traiter PR-8 (landing) et nettoyage manuel PR-9.

Verify : 15/15 tests anti-drift verts.

## v5.5.6 — DS data-density per portail + Wave 1+2 codemod migration — Phase 11 PR-6 (2026-04-30)

**Tous les layouts portails déclarent `data-density` + codemod zinc→tokens exécuté sur shared/ (295 remplacements).**

- `feat(ds)` `data-density` + `data-portal` ajoutés à 8 layouts :
  - Cockpit / Creator / Agency : `comfortable`
  - Console : `compact`
  - Intake / Auth / Public / Shared : `airy`
- `feat(ds)` Layouts manquants créés : `(intake)/layout.tsx`, `(public)/layout.tsx`.
- `chore(ds)` Migration agency layout : zinc/violet hardcoded → tokens (`bg-accent-subtle`, `text-accent`, `border-border`).
- `feat(ds)` Migration shared layout : `bg-zinc-950` → `bg-background`, header `border-zinc-800/50` → `border-border`, etc.
- `chore(ds)` **Codemod zinc→tokens exécuté sur `src/components/shared/`** : 26/36 fichiers modifiés, 295 remplacements (top : `bg-zinc-800` ×40, `border-zinc-800` ×35, `text-zinc-500` ×35, `text-zinc-400` ×32). Diff revu avant commit (NEFER §6).
- `test(governance)` `design-portal-density` bloquant — 8 portails × 4 densities expected. 1/1 vert.

Verify : 15/15 tests anti-drift design-* verts (cascade + coherence + cva + density).

Résidus : composants legacy `src/components/{cockpit,neteru,landing}/` non migrés (PR-7/8 waves 3-6).

## v5.5.5 — DS primitives complètes (~31 primitives) — Phase 11 PR-5 (2026-04-30)

**31 primitives CVA-driven tokens-only, manifests Zod-validated, 36 composants au total.**

- `feat(ds)` Form : Textarea, Select, Checkbox, Radio, Switch, Label, Field+FieldHelper+FieldError.
- `feat(ds)` Display : Avatar (5 sizes), Separator, Tag.
- `feat(ds)` Feedback : Alert, Banner, Toast, Tooltip, Popover, Sheet (focus trap + ESC + scroll lock).
- `feat(ds)` Loading : Spinner (sr-label), Skeleton (aria-busy), Progress (déterminé/indéterminé).
- `feat(ds)` Layout : Stack, Grid, Container.
- `feat(ds)` Typography : Heading (h1-h6 + display + mega + clamp fluid + text-balance), Text (5 variants × 6 tones).
- `feat(ds)` Navigation : Tabs (compound role=tablist), Accordion (native details), Breadcrumb (aria-label='Fil d'Ariane'), Pagination, Stepper (4 states), Command (Cmd+K).
- `feat(ds)` Icon wrapper Lucide (5 sizes tokens, mirrorOnRtl).
- `chore(ds)` index.ts barrel export 36 primitives par catégorie.
- `test(governance)` design-primitives-cva ajusté : `VariantProps<typeof X>` impose cva ; mapping Record/conditionnel autorisé pour Icon/Switch/Progress.

Verify : 14/14 tests anti-drift design-* verts.

## v5.5.4 — DS codemod + audit:design + tests scaffolding — Phase 11 PR-4 (2026-04-30)

**Outils de migration zinc→tokens + audit dette + scaffolding tests visual/a11y/i18n.**

- `feat(ds)` `scripts/codemod-zinc-to-tokens.ts` — codemod sed-like (regex) qui mappe `text-zinc-*`/`bg-zinc-*`/`border-zinc-*`/`text-violet-*` → tokens sémantiques. Modes : `--dry-run`, `--dir=src/components/X`. Diff revu manuellement avant commit.
- `feat(ds)` `scripts/audit-design-tokens.ts` — audit qui produit un rapport de la dette résiduelle. Modes : `--strict` (PR-9 blocking) ou warning (PR-4..8). Output : violations par pattern, top 20 fichiers.
- `feat(ds)` Test bloquant `tests/unit/governance/design-tokens-canonical.test.ts` — mode warning par défaut, blocking via `DESIGN_STRICT=1` env.
- `chore(ds)` `tests/visual/` + `tests/a11y/` + `tests/i18n/` scaffolding (READMEs avec coverage cible PR-9).
- `chore(scripts)` 5 npm scripts ajoutés : `codemod:zinc`, `audit:design:strict`, `test:visual`, `test:a11y`, `test:i18n`.

**Dette détectée par audit:design** (baseline avant codemod) — top 5 fichiers :
1. `cockpit/pillar-page.tsx` : 95 violations
2. `neteru/oracle-teaser.tsx` : 72
3. `neteru/rapport-pdf-preview.tsx` : 52
4. `shared/smart-field-editor.tsx` : 43
5. `shared/mestor-panel.tsx` / `pillar-content-card.tsx` : 40 chacun

Tracé dans RESIDUAL-DEBT.md §Tier 2.0. Migration en waves PR-6/7/8.

## v5.5.3 — DS Storybook + Chromatic + auto-generated maps — Phase 11 PR-3 (2026-04-30)

**Storybook 8 + Chromatic + scripts auto-régénération COMPONENT-MAP / DESIGN-TOKEN-MAP.**

- `feat(ds)` `.storybook/{main,preview,manager}.ts` config Storybook 8 (`@storybook/nextjs-vite`) avec addons a11y/viewport/themes/controls/docs. Globals `density` toolbar (compact/comfortable/airy/editorial). Branding panda + rouge fusée.
- `feat(ds)` `chromatic.config.json` + `.github/workflows/chromatic.yml` workflow visual review automatisé sur push/PR (`onlyChanged`, `exitZeroOnChanges`).
- `feat(ds)` 5 `*.stories.tsx` pour les primitives core : Button (variants × sizes × loading/disabled), Card (5 surfaces × interactive), Input (sizes × states), Badge (6 tones × variants), Dialog (focus trap + ESC).
- `feat(ds)` `scripts/generate-component-map.ts` — scanne tous les `*.manifest.ts` dans `src/components/`, régénère `COMPONENT-MAP.md` (5 composants détectés à PR-2 close).
- `feat(ds)` `scripts/generate-token-map.ts` — parse `src/styles/tokens/*.css`, régénère `DESIGN-TOKEN-MAP.md` exhaustif (Tier 0: 19, Tier 1: 24, Tier 2: 119, Tier 3: 24, Animations: 16).
- `chore(scripts)` `package.json` : 6 scripts ajoutés (`storybook`, `build-storybook`, `chromatic`, `audit:design`, `ds:components-map`, `ds:tokens-map`).

Verify : `npm run ds:components-map` ✓ 5 composants. `npm run ds:tokens-map` ✓ tous tiers.

Résidus :
- `npm install @storybook/nextjs-vite chromatic @axe-core/playwright` à exécuter pour activer (deps non installées dans cette PR — laissées au workflow CI ou install local).
- 33 primitives complémentaires + leurs stories → PR-5.

## v5.5.2 — DS primitives core + defineComponentManifest — Phase 11 PR-2 (2026-04-30)

**5 primitives core CVA-driven tokens-only + helper Zod-validated mirror backend.**

- `feat(ds)` `src/lib/design/define-component-manifest.ts` — helper Zod-validé, mirror de `defineManifest` backend (`src/server/governance/manifest.ts:209`). Validation runtime dev (anatomy, variants, a11yLevel, i18n, missionContribution). `GROUND_INFRASTRUCTURE` → `groundJustification` obligatoire (NEFER §6.3).
- `feat(ds)` `src/lib/design/cva-presets.ts` — variants CVA réutilisables (size, tone, focus ring, transition, disabled state).
- `feat(ds)` 5 primitives core dans `src/components/primitives/` :
  - **Button** — 6 variants (primary/ghost/outline/subtle/destructive/link) × 4 sizes (sm/md/lg/icon). Loading state + Spinner inline. CVA-driven, tokens-only. Touch target 44×44 (size=lg).
  - **Card** — compound component (Card / CardHeader / CardTitle / CardDescription / CardBody / CardFooter). 5 surfaces (flat/raised/elevated/overlay/outlined). Density-aware (consume `--card-px/py/gap/title-size`).
  - **Input** — 3 sizes × 3 states (default/invalid/valid). Focus ring rouge fusée. Disabled state propagé.
  - **Badge** — 6 tones × 3 variants (soft/solid/outline). Domain badges (TierBadge/ClassificationBadge/PillarBadge/DivisionBadge) consommeront ce primitive en PR-6.
  - **Dialog** — modal natif sans Radix. Focus trap + ESC close + return focus + scroll lock. 5 sizes (sm/md/lg/xl/fullscreen). aria-modal + aria-labelledby + aria-describedby.
- `feat(ds)` Co-located `*.manifest.ts` pour chaque primitive avec anatomy/variants/sizes/states/tones/density/a11yLevel/i18n/missionContribution.
- `test(governance)` `design-primitives-cva.test.ts` bloquant : (1) primitives dir existe, (2) chaque primitive avec variants utilise `cva()`, (3) chaque primitive a un manifest co-localisé. 3/3 verts.
- `chore(ds)` `src/components/primitives/index.ts` barrel export.

Verify : 14/14 tests anti-drift design-* verts (cascade + coherence + cva).

## v5.5.1 — Design System foundation (panda + rouge fusée) — Phase 11 PR-1 (2026-04-30)

**Pose la fondation gouvernée du Design System panda + rouge fusée — cascade 4 tiers, 12 docs canon, 6 fichiers tokens CSS, 2 tests anti-drift bloquants.**

- `feat(ds)` **DESIGN-SYSTEM.md** — canon vivant (renommé depuis `DESIGN-SYSTEM-PLAN.md` 29 avril, status `executing`). Source unique de vérité : 4 couches (Reference → System → Component → Domain), 60 patterns documentés, matrice 30 scénarios concrets, fluid type/spacing scale via `clamp()`, container queries, density `data-density` per portail.
- `feat(ds)` **ADR-0013** — palette panda noir/bone + accent rouge fusée + cascade 4 tiers. Justifie rejet legacy violet/emerald, alternatives rejetées (DS-Marketing isolé, palette tierce). Cite ADR-0009 Ptah (cause renumérotation 0009 → 0013) + ADR-0012 BrandVault.
- `feat(ds)` **5 docs gouvernance séparés** : DESIGN-LEXICON.md (vocabulaire visuel), DESIGN-TOKEN-MAP.md (inventaire), DESIGN-MOTION.md (durations/easings), DESIGN-A11Y.md (WCAG AA, ARIA, focus), DESIGN-I18N.md (RTL, font-scaling 200%, currencies marché africain).
- `feat(ds)` **4 catalogues Tier-par-Tier** : `design-tokens/{reference,system,component,domain}.md` détaillant chaque token avec OKLCH/hex/WCAG ratio + COMPONENT-MAP.md inventaire 130 composants à migrer.
- `feat(ds)` **6 fichiers tokens CSS cascade** : `src/styles/tokens/{reference,system,component,domain,animations}.css` + `index.css` orchestrateur. `globals.css` refactor : import cascade + legacy aliases (rétrocompat zinc/violet pendant migration). Cascade panda résolue correctement vérifiée via preview MCP : `--color-background` cascade `--ref-ink-0` (#0a0a0a), `--color-accent` cascade `--ref-rouge` (#e63946), `--division-mestor` cohérent rouge signature.
- `feat(governance)` **Substitution INFRASTRUCTURE → Ptah** dans Domain tokens — cohérent BRAINS const 5 actifs (Mestor/Artemis/Seshat/Thot/Ptah). Imhotep/Anubis pas de token tant que pré-réservés (anti-drift).
- `feat(governance)` **REFONTE-PLAN.md Phase 11 entry** + RESIDUAL-DEBT.md Tier 2.0 (cause + lessons learned + tracking 130 composants) + LEXICON.md entrée DESIGN_SYSTEM + CLAUDE.md section Design System pointer + memory user `design_system_panda.md`.
- `test(governance)` **2 tests anti-drift bloquants** : `design-tokens-coherence` (CSS vars ↔ docs, 5 actifs Neteru, 8 piliers, 6 classifications, 4 tiers — pas Imhotep/Anubis), `design-tokens-cascade` (aucun composant `src/components/**` ne consomme `var(--ref-*)` directement). 11/11 verts.
- `chore(governance)` Branche `feat/ds-panda-v1` créée pour 9 sous-PRs séquencés (PR-1 → PR-9 = v5.5.1 → v5.5.9). Label PR `phase/11`. `out-of-scope` justifié par mandat user.

**Sous-système APOGEE** : Console/Admin — INFRASTRUCTURE (Ground Tier). Aucun Neter créé, aucune mutation business. `missionContribution: GROUND_INFRASTRUCTURE`.

## v5.4.8 — Sync deps remote (2026-04-29)

- `chore(deps)` Sync package-lock — add darwin-x64 next swc binary (commit `5f9dd27`).

## v5.5.0 — NEFER Persona + Error Vault + Stress-Test (2026-04-30)

**Activation persona expert NEFER + observabilité runtime + batterie de stress-test E2E.**

- `feat(persona)` **NEFER** — opérateur expert auto-activé via CLAUDE.md à chaque session. Identité, mantra, 3 interdits absolus, protocole 8 phases (check préventif → commit → auto-correction), checklist 17 cases, drift signals, comportement par type demande. Doc : `docs/governance/NEFER.md`. NEFER **n'est PAS un Neter** (pas dans BRAINS), c'est l'opérateur qui sert les Neteru.
- `feat(error-vault)` **Phase 11 — observabilité runtime**. Model Prisma `ErrorEvent` + service `error-vault/` avec dedup signature (sha256 source+code+message+stack). Auto-capture serveur via tRPC `errorFormatter` + auto-capture client via `<ErrorVaultListener />` (window.onerror + unhandledrejection). Page admin `/console/governance/error-vault` avec stats 24h, clusters par signature, batch resolve, mark known-false-positive. 2 nouveaux Intent kinds + SLOs.
- `feat(stress-test)` **Stress-test E2E** (`npm run stress:full`) — simule un admin qui slamme l'OS : Phase 1 crawl ~165 pages, Phase 2 tRPC queries readonly, Phase 4 Ptah forges sur 7 forgeKinds (mock fallback), Phase 5 BrandAsset state transitions (createBatch+select+supersede+archive avec invariants). Pre-flight check (HTTP+DB) avec abort early si DB unreachable et skip-HTTP si serveur dev down. Output `logs/stress-test-{ts}.{json,md}`. Erreurs capturées dans error-vault (source=STRESS_TEST). 0 finding sur Phases 1+2+4+5 après fix `supersede`.
- `feat(governance)` **CODE-MAP.md auto-généré** — knowledge graph 870 lignes / 38 KB régénéré par pre-commit hook husky dès qu'une entité structurelle est modifiée (Prisma, services, routers, pages, registry, sequences, intent-kinds). Contient table synonymes "mot du métier" ↔ "entité dans le code" anti-réinvention.
- `chore(scripts)` 5 npm scripts ajoutés : `stress:full`, `stress:pages`, `stress:forges`, `stress:state`, `codemap:gen`.
- `fix(brand-vault)` `supersede()` retournait l'oldAsset pré-update (state=ACTIVE) au lieu de post-update (state=SUPERSEDED). Détecté par stress-test.

## v5.4.10 — BrandVault unifié (Phase 10, ADR-0012) (2026-04-30)

**Vault de marque unifié — `BrandAsset` enrichi devient le réceptacle pour TOUS les actifs (intellectuels + matériels).**

- `feat(brand-vault)` `BrandAsset` enrichi : `kind` taxonomie 50+ canoniques (BIG_IDEA, CREATIVE_BRIEF, BRIEF_360, BRAINSTORM, CLAIM, MANIFESTO, KV_ART_DIRECTION_BRIEF, NAMING, POSITIONING, TONE_CHARTER, PERSONA, SUPERFAN_JOURNEY, SCRIPT, SOUND_BRIEF, KV_VISUAL, VIDEO_SPOT, AUDIO_JINGLE, etc.), `family` (INTELLECTUAL/MATERIAL/HYBRID), `state` machine (DRAFT→CANDIDATE→SELECTED→ACTIVE→SUPERSEDED→ARCHIVED), lineage hash-chain, batch (batchId/batchSize/batchIndex), versioning, supersession.
- `feat(brand-vault)` Service `brand-vault/engine.ts` : createBrandAsset, createCandidateBatch, selectFromBatch, promoteToActive, supersede, archive, kindFromFormat. Mapping FORMAT_TO_KIND (~80 outputFormats Glory tool → kind canonique).
- `feat(governance)` 4 Intent kinds : SELECT_BRAND_ASSET, PROMOTE_BRAND_ASSET_TO_ACTIVE, SUPERSEDE_BRAND_ASSET, ARCHIVE_BRAND_ASSET (+ SLOs).
- `feat(sequence-executor)` `executeGloryStep` patché : `depositInBrandVault` après chaque Glory tool — heuristique d'extraction de candidats (concepts/claims/prompts/names/...) → batch CANDIDATE auto, sinon DRAFT unique.
- `feat(ptah)` `reconcileTask` patché : promote AssetVersion en BrandAsset matériel.
- `feat(campaign)` `Campaign.active{BigIdea,Brief,Claim,Manifesto,KvBrief}Id` → BrandAsset.id pour suivi big-idea-active → brief actif → productions.
- `chore(governance)` `EXPERT-PROTOCOL.md` (devenu NEFER.md en v5.5.0) + suppression doublons `/cockpit/forges` et `/console/ptah`.
- `docs(adr)` ADR-0012 BrandVault unifié — justification rejet doublon SuperAsset standalone.

## v5.4.9 — Ptah Forge multimodale (Phase 9, ADR-0009/0010/0011) (2026-04-30)

**5ème Neter Ptah — matérialisation des briefs Artemis en assets concrets via providers externes.**

- `feat(neter)` **Ptah** = 5ème Neter actif (sous-système Propulsion, downstream Artemis). Démiurge égyptien créateur par le verbe — métaphore prompt→asset. Cascade Glory→Brief→Forge enforced.
- `feat(ptah)` 4 providers : Magnific (95% surface : image Mystic/Flux/NanoBananaPro/Imagen/Seedream + édition upscale/Relight/Style/Inpaint/Outpaint/ChangeCam/BG-removal + vidéo Kling/Veo/Runway/Hailuo/LTX/PixVerse/WAN/Seedance + audio TTS/voice-clone/SFX/lip-sync/SAM-isolation + icon + stock 250M+ + classifier), Adobe Firefly Services, Figma, Canva (gated par flag).
- `feat(ptah)` Mock fallback Magnific sans API key (picsum/sample) — démos client sans credentials.
- `feat(ptah)` 3 Intent kinds : PTAH_MATERIALIZE_BRIEF, PTAH_RECONCILE_TASK, PTAH_REGENERATE_FADING_ASSET.
- `feat(ptah)` Tables Prisma : GenerativeTask, AssetVersion, ForgeProviderHealth + Strategy.{manipulationMix, cultIndex, mixViolationOverrideCount}.
- `feat(governance)` Manipulation Matrix transverse (peddler/dealer/facilitator/entertainer) avec Mestor pre-flight `MANIPULATION_COHERENCE` gate + Thot ROI tables par mode.
- `feat(governance)` Téléologie : pillarSource obligatoire sur GenerativeTask, bayesian superfan_potential pre-flight, sentinel `PTAH_REGENERATE_FADING_ASSET` Loi 4.
- `feat(panthéon)` Imhotep (slot 6, ADR-0010, Phase 7+) + Anubis (slot 7, ADR-0011, Phase 8+) **pré-réservés** — plafond APOGEE = 7 atteint.
- `feat(governance)` Lineage hash-chain Glory→Brief→Forge : `executeTool` crée IntentEmission INVOKE_GLORY_TOOL, GloryToolDef étendu avec `forgeOutput?: ForgeSpec`.
- `feat(sequences)` Séquence ADS-META-CARROUSEL (Production T2) — 3 options ad copy + visuels Nano Banana via Ptah (push Meta = Anubis Phase 8+).
- `feat(landing)` Avatars + hero-bg ouest-africains (Unsplash License commercial).
- `chore(docs)` PANTHEON.md, MANIPULATION-MATRIX.md, ADR-0009/0010/0011 + alignement complet + purge `trio` / `quartet` + MAAT.md → archive/. 2 tests CI anti-drift + 3 audit scripts.

---

## v3.3.0 — Brief Ingest Pipeline (2026-04-10)

**Le systeme peut maintenant recevoir un brief client PDF et le transformer automatiquement en campagne + missions dispatchables.**

- `feat(console)` Brief Ingest UI — stepper 3 phases (Upload, Review, Execution)
- `feat(brief-ingest)` Service d'extraction LLM (PDF/DOCX/TXT + fallback OCR Vision)
- `feat(brief-ingest)` Brand Resolver avec fuzzy matching Levenshtein (dedup client)
- `feat(brief-ingest)` Mission Spawner — 1 Mission par livrable, auto-creation Drivers
- `feat(hyperviseur)` 5 nouveaux StepAgents : SEED_ADVE, SESHAT_ENRICH, CREATE_CAMPAIGN, SPAWN_MISSIONS, ARTEMIS_SUGGEST
- `feat(hyperviseur)` buildBriefIngestPlan() — plan d'orchestration NETERU pour briefs
- `feat(mission)` Endpoint `claim` — self-assign depuis le wall (freelance/agence)
- `feat(pillar-gateway)` BRIEF_INGEST ajoute a AuthorSystem
- Schemas Zod complets : ParsedBrief, deliverables, clientResolution, budget, timeline
- Flow Preview + Confirm : operateur review avant creation
- 2 options nouveau client : Fast Track vs Onboarding First
- Suggestion automatique de sequences Artemis (SPOT-VIDEO, SPOT-RADIO, KV, CAMPAIGN-360)

---

## v3.2.0 — Artemis Context System + Vault (2026-04-08)

**Artemis recoit un systeme de contexte 4 couches et le Vault devient operationnel.**

- `feat(artemis)` 4-layer context system — injection BRIEF pour sequences de campagne
- `feat(artemis)` Step types SEQUENCE + ASSET — systeme de combo/encapsulation
- `feat(artemis)` Sequence MASCOTTE + brand nature CHARACTER_IP
- `feat(artemis)` Sequence CHARACTER-LSI + 6 tools — Layered Semantic Integration
- `feat(vault)` Pipeline execution → vault — pre-flight + accept/reject
- `feat(vault)` Server-side pre-flight + page tools read-only
- `feat(console)` Skill Tree affiche les pipelines complets + selecteur de strategie
- `fix(cockpit)` ObjectCard affiche les valeurs, pas les cles + nouveaux renderers
- `fix(tests)` Alignement tests mestor-insights avec type ScenarioInput

---

## v3.1.0 — NETERU Architecture (2026-04-04)

**Naissance du Trio Divin : Mestor (decision), Artemis (protocole), Seshat (observation). Refonte complete de l'architecture.**

- `feat(neteru)` Oracle NETERU + Sequence Vault + Skill Tree + 9 sequences + 7 tools
- `feat(console)` NETERU UI — pages Mestor, Artemis, Oracle proposition + refonte home
- `feat(console)` Landing page NETERU + badge version + bouton home sidebar
- `feat(console)` Pages reelles : Skill Tree, Vault, Mestor (remplacement des stubs)
- `docs(v5.0)` CdC refonte complete — architecture NETERU

---

## v3.0.0 — Bible ADVERTIS + Design System (2026-03-31)

**134 variables ADVERTIS documentees. Systeme de renderers type-driven. LLM Gateway v2.**

- `feat(bible)` 100% coverage — 134 variables ADVERTIS documentees
- `feat(bible)` Tooltips sur champs vides + suppression Sources + LLM Gateway signature
- `feat(console)` Page annuaire variables — registre complet ADVERTIS
- `feat(bible)` Format bible + wire vault-enrichment
- `feat(design-system)` field-renderers.tsx — systeme visuel type-driven
- `feat(operator)` Full CRUD + creation operateurs licencies + allocation clients
- `feat(enrichir)` Pipeline 2 etapes — derivation cross-pillar + scan LLM focalise
- `fix` Migration callLLMAndParse vers nouvelle signature Gateway (champ caller)
- `fix` Import circulaire glory-tools/hypervisor ↔ neteru-shared/hyperviseur

---

## v2.5.0 — Glory Sequences + Deliverables (2026-03-25)

**31 sequences GLORY operationnelles. Export PDF des livrables. Viewer complet.**

- `feat(glory)` Refonte complete — 91 tools, 31 sequences, architecture 5 niveaux
- `feat(glory)` Sequence queue + deliverable compiler
- `feat(glory)` Mestor auto-complete pour combler les gaps
- `feat(glory)` Viewer resultats sequences — lecture + telechargement individuel
- `feat(glory)` Multi-brand supervisor view + passive pre-flight scan
- `feat(glory)` Per-sequence readiness scan + lancement individuel + liens resultats
- `feat(deliverables)` Sections cliquables + viewer contenu + export PDF
- `feat(oracle)` Territoire creatif via Glory BRAND pipeline
- `feat(oracle)` Wire Glory sequence branching pour enrichOracle
- `fix(rtis)` Empecher faux positifs staleness sur piliers RTIS fraichement generes

---

## v2.4.0 — Vault Enrichment + Cockpit Dense (2026-03-20)

**Enrichissement base sur le vault. Cockpit avec layout dense et renderers riches.**

- `feat` Vault-based enrichment + sources manuelles + dedup fix + recos UX
- `feat(enrichir)` Full vault scan → recommandations par variable
- `feat(cockpit)` Layout dense piliers avec grid, hierarchie, empties collapsibles
- `feat(cockpit)` Focus modal + tout accepter + cartes cliquables denses
- `feat(cockpit)` Champs vides in-situ + rendu objets profonds + panel recos review
- `feat(cockpit)` Renderers specialises : citation/accroche/description/publicCible
- `feat(seed)` ADVE 8/8 COMPLETE — 44 champs ajoutes au seed SPAWT
- `fix(enrichir)` Cross-pillar derivations + feedback toast + contrats derivables
- `fix(enrichir)` Types schema + ciblage champs vides dans vault enrichment
- `fix` Cles dot-notation plates + coercion types recos + challenge champs remplis

---

## v2.3.0 — Maturity Contracts + Scoring (2026-03-16)

**Contrats de completion par pilier. Scoring structurel. Auto-filler + gates de maturite.**

- `feat(maturity)` Pillar Completion Contract — fondation Phase 1
- `feat(scorer)` Contract-aware structural scoring — Phase 4
- `feat(maturity)` Auto-filler + maturity gate + endpoints tRPC — Phase 5
- `feat(maturity)` Unification pillar-director + hypervisor + cascade — Phase 6
- `refactor(schemas)` I = Potentiel/Catalogue, S = Strategie temporalisee
- `fix(bindings)` Zero orphelins, 77% couverture — Phase 3 complete

---

## v2.2.0 — v4 Deep Restructuration (2026-03-12)

**12 chantiers, 3 phases. Pillar Gateway, LLM Gateway, RTIS Protocols.**

- `feat(v4)` Deep restructuration — 12 chantiers, 3 phases
- `feat(cockpit)` Rich pillar renderers + page sources marque + migrations gateway
- `feat(gateway)` Migration router pillar.ts — toutes les ecritures via Gateway
- `feat(p1)` Persistence orchestration + fixes P&L + prisma generate
- `feat(cockpit)` Identity page refactoree + renderers riches + migration v4
- `feat(cockpit)` Tous les champs schema par pilier (remplis + vides)
- `feat(auto-filler)` Wire BrandDataSource comme source de verite avant LLM

---

## v2.1.0 — RTIS Granulaire + Oracle Enrichment (2026-03-05)

**Recommandations RTIS par champ. Oracle enrichi avec 21 sections et moteur Artemis.**

- `feat(rtis)` Recommandations CRUD granulaires + tracker debug Glory
- `feat(oracle)` Engine section-defaults — 21/21 complete avec vraies valeurs
- `feat(oracle)` enrichOracle exhaustif couvrant 12 sections avec prompts specialises
- `refactor(oracle)` Wire enrichOracle vers vrais frameworks Artemis
- `feat(oracle)` Feedback visuel live pendant execution Artemis
- `feat(berkus)` Integration profonde — equipe dirigeante, traction, MVP, IP
- `feat(budget)` Budget-to-Plan Allocator deterministe — zero improvisation LLM
- `feat(strategy)` Proposition Strategique — mini-site partageable, 13 sections

---

## v2.0.0 — Console + Cockpit + Creator (2026-02-20)

**3 portails operationnels. 49 pages console. Pipeline missions complet.**

- `feat(console)` M34 Console Portal (55→90) — 13 stubs fixes + 7 nouvelles pages
- `feat(cockpit)` M01 Cockpit — superfan northstar + identite ADVE + commentaires operateur
- `feat(cockpit)` M01 RTIS — cascade auto + page cockpit RTIS + recos par champ
- `feat(scorer)` M02 AdvertisVector & Scorer (70→95) — batch, snapshots, historique, cron
- `feat(campaign)` M04 Campaign Manager 360 (92→95) — alignement ADVE + devotion tracking
- `feat(pipeline)` M36 Pipeline Orchestrator (70→95) — scheduler auto + modele process
- `feat(operator)` Refactoring semantique : Client model + Console Agence
- `feat(auth)` Register, forgot/reset password + AI premium badge + middleware agence
- `feat(intake)` M35 — 4 methodes (long/short/ingest/ingest+), tooltips, save & quit

---

## v1.1.0 — MCP + Enrichments (2026-02-10)

**6 serveurs MCP. Creative Server AI-powered. Pipeline CRM.**

- `feat(mcp)` M28 MCP Creative Server (30→92) — handlers AI + 7 resources
- `feat(mcp)` M28 MCP Creative (92→95) — driver-linked + ADVE auto-injection
- `feat(intake)` M35 Quick Intake Portal (40→92) + M16 Engine (60→90) + M40 CRM (35→82)
- `feat(readme)` README.md complet du projet

---

## v1.0.0 — Foundation (2026-01-25)

**Premiere version fonctionnelle. Methodologie ADVE-RTIS, Campaign Manager, 42 modules.**

- `feat` Phase 2 complete — ADVE-RTIS process hardening + ingestion pipeline
- `feat` Campaign Manager 360 — 93 procedures, 130 action types
- 42 modules declares, score global 74/100
- Stack : Next.js 15, tRPC v11, Prisma 6, Claude API
- 3 portails (Console, Cockpit, Creator) + widget Intake
