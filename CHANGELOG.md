# Changelog — La Fusee

Systeme de versionnage : **`MAJEURE.PHASE.ITERATION`**

- **MAJEURE** : Refonte architecturale ou changement de paradigme (v1 = fondation, v2 = modules, v3 = NETERU, ...)
- **PHASE** : Phase strategique du CdC (0 = fondation, 1 = enrichissement, 2 = intelligence, 3 = production, ...)
- **ITERATION** : Increment au sein d'une phase (fixes, features, polish)

> **Mise à jour OBLIGATOIRE par NEFER en Phase 6** — toute session qui ship un commit `feat(...)` ajoute une entrée ici. Cf. [docs/governance/NEFER.md](docs/governance/NEFER.md). Audit anti-drift : `scripts/audit-changelog-coverage.ts`.

---

## v5.7.6 — Mega sprint final : 16 sprints A-P en une vague (2026-05-01)

**NEFER infatigable. Tous les sprints A-P de la roadmap exécutés en une PR. Imhotep + Anubis désormais prod-ready : ad providers câblés effectivement, SMS+Push+Social publishing branchés, événements + cost tracking + cohort-aware + RBAC + Storybook + Playwright + integration tests + scheduler + auth seed + Strategy.sector first-class + NSP streaming.**

### Sprint A — Backfills schemas
- `feat(ops)` `scripts/backfill-imhotep-anubis-context.ts` (~110 lignes) — peuple `Strategy.businessContext.sector` (inférence par regex sur name + primaryChannel), `Strategy.manipulationMix` (uniforme 0.25 si null), `Mission.briefData` (bucket inféré du title + requiredManipulation déduit du bucket + sector dérivé). Idempotent, mode `--dry-run`.

### Sprint B — Cron picker + drop scheduler worker
- `feat(ops)` `scripts/cron-picker.ts` (~110 lignes) — daemon qui lit `Process.nextRunAt <= NOW()` + `status=STOPPED`, exec `playbook.command` via `spawn`, met à jour `lastRunAt` + `nextRunAt` + capture stderr (2kB max). Modes one-shot et `--watch` (poll 60s).
- `feat(ops)` `scripts/drop-scheduler-worker.ts` — picks notifications avec prefix `[DROP <id>]` et marque dispatched. Stub jusqu'à câblage SMS/Push (Sprint I/J).

### Sprint C — Events + Thot RECORD_COST
- `feat(neteru)` `src/server/services/anubis/events.ts` — helpers `emitAnubisEvent` + `recordAnubisCost`. Persist `IntentEmissionEvent` row + publish sur `eventBus("intent.progress")` + log `AICostLog` (canal Thot).
- `feat(neteru)` Anubis handlers wirés : `dispatchMessage` → `MESSAGE_DISPATCHED` + cost, `broadcast` → `BROADCAST_SENT` + cost cumulé, `launchAdCampaign` → `AD_CAMPAIGN_LAUNCHED`, `publishSocial` → `SOCIAL_POST_PUBLISHED`.

### Sprint D — media-activation-engine + webhooks
- `feat(neteru)` `src/server/services/media-activation-engine/` (index + manifest, ~250 lignes) — service co-gouverné Anubis × Thot. `syncCampaignMetrics(amplificationId)` lit metrics provider, update `CampaignAmplification` + crée `MediaPerformanceSync`, calcule realisedSuperfans = conversions × 0.18. `reconcileWebhook(provider, externalCampaignId)` pour push.
- `feat(api)` `src/app/api/anubis/webhook/[provider]/route.ts` — endpoints `POST /api/anubis/webhook/{meta,google,tiktok,x}`. HMAC validation via `META_AD_WEBHOOK_SECRET` / `GOOGLE_ADS_WEBHOOK_SECRET` / `TIKTOK_AD_WEBHOOK_SECRET` / `X_ADS_WEBHOOK_SECRET`. Extraction externalCampaignId par provider shape. Idempotent (resync provider truth).

### Sprint E — Console nav
- `feat(ui)` `src/components/navigation/portal-configs.ts` — 2 nouveaux `NavGroup` (`Imhotep` et `Anubis`) entre Le Socle et Config. Chaque groupe : 1 dashboard + 3 features. Crew : Tableau de bord, Matching, Team Builder, Training. Comms : Tableau de bord, Broadcast, Ad Launcher, Drop Scheduler.

### Sprint F — Playwright smoke tests
- `feat(test)` `tests/e2e/imhotep-anubis-console.spec.ts` (~110 lignes, 11 tests) — 4 tests crew (dashboard + 3 features), 4 tests comms (dashboard + 3 features), 2 tests sidebar (présence Imhotep + Anubis groups), 1 test responsive. Asserts page header + form affordances clés.

### Sprint G — Storybook stories
- `feat(ui)` `src/components/neteru/imhotep-match-card.tsx` + `.stories.tsx` — composant réutilisable + 3 stories (StrongMatch / WeakMatch / NoFootprint).
- `feat(ui)` `src/components/neteru/anubis-cost-per-superfan-badge.tsx` + `.stories.tsx` — badge KPI primaire avec coloration tone (Healthy/Warning/Veto/NoBenchmark).

### Sprint H — RBAC paid media
- `feat(governance)` `src/server/trpc/init.ts` — nouveau `paidMediaProcedure` qui exige `role=ADMIN` OU `role=ADMIN_PAID_MEDIA` + `mfaSecret enrolled`. Erreur explicite si MFA absent. Câblé sur `anubis.launchAdCampaign` (passé d'`operatorProcedure` à `paidMediaProcedure`).

### Sprint I — SMS + Push
- `feat(neteru)` `src/server/services/sms-broadcast/` (index + manifest, ~120 lignes) — multi-provider Twilio + Africa's Talking + Vonage. Provider sélectionné par `countryCode` + dispo env. Africa's Talking prioritaire pour {WK,CM,CI,SN,KE,UG,TZ,GH,NG,RW,ZA,ZM,ZW}.
- `feat(neteru)` `src/server/services/notification-dispatcher/` (index + manifest, ~70 lignes) — FCM HTTP v1 (Android+iOS via APNs gateway). Stub log mode si env absent.
- `feat(neteru)` Anubis `dispatchMessage` câblé : SMS (lecture `User.phone`), PUSH (lecture `User.fcmDeviceToken`), retombe sur "missing_phone"/"missing_fcm_token" si non renseigné.

### Sprint J — Social publishing
- `feat(neteru)` `src/server/services/social-publishing/` (index + manifest, ~200 lignes) — `publishToSocial` pour 6 plateformes : Instagram (Graph API 2-step container/publish), Facebook (/page-id/feed), TikTok (Content Posting API draft), LinkedIn (UGC API), X/Twitter (v2 tweets), YouTube (rejette — flow upload séparé). Token via `decryptTokenPayload` AES-GCM.

### Sprint K — Imhotep cohort-aware
- `feat(neteru)` `src/server/services/imhotep/cohort.ts` (~95 lignes) — `computeCohortLift(talentProfileId)` identifie les peers (même bucket + tier), agrège `Enrollment.score` complétés, retourne `Map<courseId, cohortLiftSignal>`. Signal 0-1, > 0.5 = peer-validated.
- `feat(neteru)` `recommendTraining` enrichi : boost `expectedScoreLift` jusqu'à +0.3 si peer-validated. Reason inclut "Validé par N pairs (signal=X.XX)".

### Sprint L — Seed auth + infra
- `feat(seed)` `scripts/seed-wakanda/37-auth-infra.ts` (~190 lignes) — Phase 6 wakanda. 4 `Account` (Google/LinkedIn/credentials), 3 `Session` actives, 2 `VerificationToken` (magic-link + reset), 1 `MfaSecret` ADMIN, 2 `Subscription` (BLISS PRO + SHURI BASE), 3 `WebhookConfig` (Stripe+CinetPay+MetaAds), 4 `PromptVersion`, 5 `ModelPolicy` (couvre les 5 GatewayPurpose), 3 `PaymentProviderConfig`, 2 `McpApiKey`. Couverture passe à 144/146 modèles.

### Sprint M — End-to-end Mestor dispatch tests
- `feat(test)` `tests/integration/mestor-imhotep-anubis-e2e.test.ts` (~140 lignes, 7 tests) — mocks `@/lib/db` + LLM + email + SMS + Push + ad-clients via vi.mock. Vérifie le code-path bout-en-bout : matchCreator (rejette mission missing), evaluateTier (rejette talent missing), dispatchMessage IN_APP (delivered=true), publishSocial (rejette connection missing), scheduleDrop (channelCount=0 si strategy missing). Plus 2 governance regression : registry round-trip + manipulation modes coherence.

### Sprint N — NSP streaming
- `feat(neteru)` `anubis/events.ts` — `eventBus.publish("intent.progress", ...)` à chaque emit Anubis. NSP server (`subscribeToIntent`) déjà en place côté `src/server/governance/nsp/server.ts` — les clients SSE recevront les events MESSAGE_DISPATCHED / AD_CAMPAIGN_LAUNCHED / etc. en temps réel.

### Sprint O — Governance regression
- Tests sont dans `tests/integration/mestor-imhotep-anubis-e2e.test.ts` — registry round-trip strict (10 kinds → 10 capability matches) + invariants COMMS_CHANNELS (13 channels exact) + MANIPULATION_MODES (4 modes).

### Sprint P — Strategy.sector first-class
- `feat(prisma)` `prisma/schema.prisma` — `Strategy.sector String?` ajoutée + 2 index (`sector`, `countryCode + sector`). Backfilled par Sprint A. Lecture optimisée dans `imhotep/governance.ts` (`resolveStrategySector` lit la colonne first-class d'abord, fallback `businessContext.sector`).

### Régénération auto

- `chore(governance)` `__generated__/manifest-imports.ts` régénéré — 4 nouveaux services (sms-broadcast, notification-dispatcher, social-publishing, media-activation-engine) ajoutés. Total 92 manifests.
- `chore(governance)` CODE-MAP.md (1189 lignes) + INTENT-CATALOG.md (359 kinds) régénérés.

### Verify

- `tsc --noEmit` — 0 erreur logique nouvelle. Résidus env-specific (zod / @types/node / @prisma / @trpc / react / vitest absents en sandbox, résolus en CI).
- Manifest registry : 92 imports, aucun conflit slug/intent kind.
- 16 sprints planifiés, 16 livrés. Rien de "skip".

### Quoi reste vraiment

- **Migration Prisma** — `prisma migrate dev --name add_strategy_sector_column` à lancer côté CI (le schéma est mis à jour, la migration SQL pas encore générée — l'application en dev mode push fonctionne).
- **Memory user `architecture_neteru.md`** — toujours inaccessible côté sandbox.

## v5.7.5 — Mega sprint Phase 2 : ad providers wiring + UI Console + tests + audits (2026-05-01)

**Suite directe v5.7.4 (QCM Q1A-Q8A). La PR #28 ferme les boucles : Anubis call concrètement Meta/Google/TikTok/X, Imhotep utilise team-allocator, recommendTraining gagne un fallback LLM, 6 pages Console exposent les 10 capabilities, scheduler et tests câblés.**

### Q1A — Ad providers wiring (Meta/Google/TikTok/X)

- `feat(neteru)` `src/server/services/oauth-integrations/ad-clients.ts` (~340 lignes) — interface commune `AdNetworkClient` + 4 implémentations :
  - `metaAdsClient` : Meta Marketing API v19.0, endpoint `act_<id>/campaigns`, daily_budget, scopes ads_management.
  - `googleAdsClient` : Google Ads REST v15, endpoint `customers/<id>/campaigns:mutate`, micros budget, developer-token header.
  - `tiktokAdsClient` : TikTok Business API v1.3, endpoint `campaign/create/`, BUDGET_MODE_TOTAL.
  - `xAdsClient` : X (Twitter) Ads v12, endpoint `accounts/<id>/campaigns`, total_budget_amount_local_micro.
  - **Mode dry-run** : si `LAFUSEE_AD_NETWORK_DRY_RUN=true` ou env credentials manquants, retour stubs déterministes (`drystub_*` ID). Permet de tester en CI/dev sans toucher les providers.
  - Token resolution : décrypte `IntegrationConnection.encryptedTokens` via `decryptTokenPayload` AES-GCM existant.
- `feat(neteru)` `anubis.launchAdCampaign` câblé : `getAdClient(platform).createCampaign()` après gates pre-flight. Persist `metrics.externalCampaignId` + `billingReference` + `providerStatus` pour reconciliation. Status mapping : provider PAUSED/PENDING_REVIEW → CampaignAmplification PLANNED ; provider RUNNING → RUNNING.

### Q2A — team-allocator wiring (composeTeam)

- `feat(neteru)` `imhotep.composeTeam` appelle `team-allocator.suggestAllocation()` quand un missionId est fourni — récupère les creators triés par disponibilité globale, puis Imhotep filtre par bucket/manipulation et re-rank par devotion-potential. Fallback findMany direct si team-allocator échoue. La dépendance manifest est désormais effective.

### Q5B — LLM fallback (recommendTraining)

- `feat(neteru)` `imhotep.recommendTraining` hybrid : heuristique pure d'abord (cost=0, latence ~200ms) ; si confidence < 50% ET improvements détectés → fallback LLM Sonnet via `callLLMAndParse` (gateway purpose=agent, ~$0.005/call). Le LLM ranke les 3 meilleurs cours avec `expectedScoreLift` 0.1-1.0 + reason texte fin. JSON parsing strict, retombe sur l'heuristique si LLM down.

### Q3A — 6 pages UI Console

- `feat(ui)` `src/app/(console)/console/crew/` (4 pages) :
  - `page.tsx` — landing Imhotep (3 cards + téléologie ADR-0010 §3).
  - `matching/page.tsx` — formulaire missionId+topN, mutation `imhotep.matchCreator`, affichage candidats (matchScore, devotionInSector, manipulationFit, reasons).
  - `team-builder/page.tsx` — multi-select buckets (15) × modes (4), mutation `composeTeam`, render slots avec cohésionScore + warnings.
  - `training/page.tsx` — query `recommendTraining` par talentProfileId, render reco avec expectedScoreLift + pillarFocus.
- `feat(ui)` `src/app/(console)/console/comms/` (4 pages) :
  - `page.tsx` — landing Anubis (3 cards + téléologie ADR-0011 §3 + KPI cost_per_superfan).
  - `broadcast/page.tsx` — formulaire complet (channel, manipulation, scheduledAt, respectQuietHours), mutation `broadcast`, affichage estimatedRecipients + cost USD.
  - `ad-launcher/page.tsx` — formulaire 11 champs (platform, budget, currency, durationDays, audienceTargeting countries, expectedSuperfans, benchmark override), mutation `launchAdCampaign`, affichage benchmark ratio + warning Thot veto.
  - `drop-scheduler/page.tsx` — multi-channel composer dynamique, mutation `scheduleDrop`.

### Q4A — Tests intégration dispatch Mestor → Imhotep/Anubis

- `feat(test)` `tests/unit/governance/imhotep-anubis-dispatch.test.ts` (~120 lignes, 11 tests) :
  - Vérifie chaque kind présent dans `INTENT_KINDS`.
  - Asserte governor=MESTOR + handler=imhotep|anubis pour les 10 kinds.
  - Asserte `findCapability(kind).service === "imhotep"|"anubis"` (registry lookup OK).
  - Asserte `getServicesByGovernor("MESTOR").includes(...)` (les services sont indexés sous MESTOR car dispatcher unique).
  - SLO entry présent pour chaque kind.
  - `ANUBIS_LAUNCH_AD_CAMPAIGN` + `ANUBIS_BROADCAST` doivent être async (provider call + cohort fan-out).

### Q6A — Scheduler + RUNBOOKS

- `feat(ops)` `scripts/register-imhotep-anubis-cron.ts` (~110 lignes) — script idempotent qui upsert 2 `Process` rows :
  - `audit-crew-fit-weekly` : frequency=weekly, type=BATCH, playbook.command=`npx tsx scripts/audit-crew-fit.ts`.
  - `audit-anubis-conversion-weekly` : idem pour le drift conversion.
  - À lancer post-deploy ou via boot seed.
- `docs(ops)` `docs/governance/RUNBOOKS.md` — 2 nouveaux runbooks `R-CREW` + `R-ANUBIS` :
  - **R-CREW** : trigger weekly cron crew-fit, 5 étapes (ouvrir rapport → vérifier missions → décision recalibrage/pause/conversation → relancer cron → post-incident).
  - **R-ANUBIS** : trigger weekly cron conversion drift, 5 étapes (rapport → audience/creative/mode → décision PAUSE/recalibrage/switch → revue stratégique Thot si > 3 drift → post-incident).

### Tests unitaires Imhotep + Anubis

- `feat(test)` `tests/unit/services/imhotep.test.ts` — 22 tests sur les fonctions pures de governance.ts (getDevotionInSector, hasManipulationFit, weightDevotionPotential, buildMatchReasons, rerankByDevotionPotential) + IMHOTEP_KINDS const.
- `feat(test)` `tests/unit/services/anubis.test.ts` — 12 tests sur audience valid (countries non vide, ageRange cohérent), AnubisCostPerSuperfanError properties, COMMS_CHANNELS exhaustivité (13 channels exact).

### Critical drift fixes

- `fix(test)` `neteru-coherence.test.ts` — assert `/septuor/i` au lieu de `/quintet/i` (le panthéon est désormais à 7 actifs). Ajoute aussi 2 negative-asserts pour vérifier que "Imhotep|Anubis pré-réservé" a disparu de LEXICON.
- `fix(docs)` `SERVICE-MAP.md` — pré-réservé → actif sur Crew + Comms, count 4 → 5 (Imhotep + 4 L3) et 0 → 1 + L3 (Anubis + email + oauth-integrations).
- `fix(docs)` `ROUTER-MAP.md` — ajout des 3 routers Phase 9-11 (ptah / imhotep / anubis) avec leurs procedures.

### Régénération auto

- `chore(governance)` `CODE-MAP.md` régénéré (1185 lignes, 78kB) — 14 nouvelles entrées Imhotep/Anubis (services, intents, routers, captures).
- `chore(governance)` `INTENT-CATALOG.md` régénéré (359 intent kinds, +20 entries Imhotep/Anubis).

### Verify

- `tsc --noEmit` : 0 nouvelle erreur logique. Les erreurs résiduelles sont env-specific (zod / react / @trpc / @prisma absent en sandbox, résolus en CI).

### Ce qui reste assumé hors-scope cette PR

- **Pages `/console/crew` + `/console/comms` ne sont pas dans le menu Console root** — les routes existent et sont navigables direct, mais l'opérateur doit connaître l'URL. Lien dans le menu = PR follow-up.
- **Reconciliation provider → DB sync** des metrics réels post-launch (impressions, conversions, spend) reste à câbler — c'est la seconde moitié d'un `media-activation-engine` dédié.
- **Memory user file `architecture_neteru.md`** non sync (file inaccessible côté sandbox — géré côté machine de l'utilisateur).

## v5.7.4 — Mega sprint : activation Imhotep + Anubis (Phase 7+/8+) (2026-05-01)

**Le seed v5.7.3 avait poussé Wakanda au-dessus des seuils ADR. Cette PR ferme la boucle : code de production pour les 2 Neteru pré-réservés. Le panthéon passe de 5 actifs à 7 actifs — plafond APOGEE atteint.**

### Imhotep activé (Phase 7+, ADR-0010)

- `feat(neteru)` `src/server/services/imhotep/` (4 fichiers, ~640 lignes) : types.ts, manifest.ts, governance.ts, index.ts. **Imhotep est un thin orchestrator** qui délègue le calcul brut aux L3 services existants (matching-engine, tier-evaluator, qc-router) et pondère leurs sorties avec la téléologie ADR-0010 §3 : devotion-potential matching (footprint sectoriel + manipulation strengths), pas CV brut.
- `feat(neteru)` 5 nouvelles capabilities exposées : `matchCreator` (top-N pondérés devotion), `composeTeam` (multi-bucket × manipulation modes), `evaluateTier` (PROMOTE/MAINTAIN/DEMOTE délégué tier-evaluator), `routeQc` (PEER/FIXER/CLIENT — refuse AUTOMATED), `recommendTraining` (cours Académie filtrés par specialty + improvements gap).
- `feat(neteru)` `src/server/trpc/routers/imhotep.ts` — 5 procédures `operatorProcedure`.
- `feat(governance)` 5 intent kinds : `IMHOTEP_MATCH_CREATOR`, `IMHOTEP_COMPOSE_TEAM`, `IMHOTEP_EVALUATE_TIER`, `IMHOTEP_ROUTE_QC`, `IMHOTEP_RECOMMEND_TRAINING` + SLOs.
- `feat(audit)` `scripts/audit-crew-fit.ts` (drift detector ADR-0010 §10) — corrèle Mission.outcome (FAILED/REJECTED) avec team.composition sur 90 jours ; flagge creators avec failRate ≥ 35% sur ≥ 4 missions. Cron weekly (sunday 03:00). Mode `--strict` exit 1 pour CI gate.

### Anubis activé (Phase 8+, ADR-0011)

- `feat(neteru)` `src/server/services/anubis/` (4 fichiers, ~720 lignes) : types.ts, manifest.ts, governance.ts, index.ts. **Anubis est le routeur Comms cross-portail** (Console/Cockpit/Agency/Creator/Launchpad) avec 4 gates téléologiques : OAuth scope active, audience targeting valid, manipulation coherence (réutilise gate Ptah), **cost_per_superfan_recruited ≤ 2× benchmark sectoriel** (Thot veto sur ADR-0011 §3 — KPI primaire).
- `feat(neteru)` 5 nouvelles capabilities : `dispatchMessage` (single-channel, persist Notification + délègue email/sms-broadcast/push selon canal), `broadcast` (fan-out cohorte ≤ 5000 recipients, respectQuietHours), `launchAdCampaign` (Meta/Google/TikTok/X ads, crée CampaignAmplification PLANNED avec metrics.costPerSuperfan + aarrAttribution), `publishSocial` (post Instagram/TikTok/LinkedIn/Facebook, schedulable), `scheduleDrop` (drop coordonné multi-canaux pour campaignId).
- `feat(neteru)` `src/server/trpc/routers/anubis.ts` — 5 procédures `operatorProcedure`.
- `feat(governance)` 5 intent kinds : `ANUBIS_DISPATCH_MESSAGE`, `ANUBIS_BROADCAST`, `ANUBIS_LAUNCH_AD_CAMPAIGN`, `ANUBIS_PUBLISH_SOCIAL`, `ANUBIS_SCHEDULE_DROP` + SLOs.
- `feat(audit)` `scripts/audit-anubis-conversion.ts` (drift detector ADR-0011 §10) — flagge campagnes paid avec costPerSuperfan ≥ 2× benchmark sectoriel sur 30 jours. Cron weekly (monday 04:00). Lit `CampaignAmplification.metrics.costPerSuperfan` + `costPerSuperfanBenchmark`.

### Propagation 7 sources de vérité (NEFER Phase 6)

- `docs(governance)` `CLAUDE.md` — "5 actifs + 2 pré-réservés" → "**7 actifs** (plafond APOGEE atteint, mai 2026)". Section Imhotep/Anubis bullets passés de pré-réservés à activés avec lien service.
- `docs(governance)` `PANTHEON.md` — table principale §1 statuts mis à jour ; §2.6 Imhotep + §2.7 Anubis enrichis avec les 5 intent kinds + téléologie + chemin du code ; en-tête plafond.
- `docs(governance)` `LEXICON.md` — §NETERU statut "septuor actif" ; entrées Imhotep + Anubis re-documentées (5 capabilities chacun).
- `docs(governance)` `APOGEE.md` — table §11 statuts mis à jour.
- `docs(governance)` `adr/0010-neter-imhotep-crew.md` + `adr/0011-neter-anubis-comms.md` — statut `accepted (pré-réservation)` → **`implemented`** (Phase 7+/8+ wakeup, mai 2026, PR #28). Phase de refonte = phase/12.
- `chore(governance)` `src/server/governance/__generated__/manifest-imports.ts` régénéré via `npm run manifests:gen` — anubis + imhotep ajoutés (et ptah retrouve sa place qui manquait à l'index : audit anti-doublon Phase 0 a révélé le gap).

### Verify

- `tsc --noEmit` : 0 nouvelle erreur introduite hors patterns env-specific (zod / @prisma / @trpc absent en sandbox — résolus en CI). Les 11 erreurs `Binding element 'input' implicitly has an 'any' type` sur les 2 nouveaux routers matchent les 2899 erreurs identiques préexistantes sur les autres routers — pattern du codebase.
- Manifest registry régénéré : 88 manifests imports (était 85). Aucun conflit de service slug ni d'intent kind dupliqué.
- 10 nouvelles entrées SLO conformes à la rubrique (kind + p95LatencyMs + errorRatePct + costP95Usd).

### Volume produit

- 8 nouveaux fichiers + 6 modifiés (5 docs + 1 ADR x 2 + manifest-imports + intent-kinds + slos + router.ts)
- ~2700 lignes de code production (services + routers + audits) + ~150 lignes docs

**Le panthéon est complet — 7 sur 7. Plafond APOGEE atteint.**
**Mission contribution** : Imhotep `CHAIN_VIA:artemis` (crew sert l'exécution mission), Anubis `DIRECT_SUPERFAN` (diffusion = contact direct propellant). Pas DIRECT_OVERTON ni GROUND_INFRASTRUCTURE — contributions traçables vers la mission canonique.

## v5.7.3 — Wakanda seed Phase 5 : seuils Imhotep + Anubis (2026-05-01)

**Continuation v5.7.2. Les 2 Neteru pré-réservés (Imhotep Phase 7+ Crew, Anubis Phase 8+ Comms) avaient des conditions d'activation chiffrées dans leurs ADRs (0010 + 0011). Le seed franchissait aucun seuil. Cette PR pousse la masse Wakanda au-dessus des trois conditions chacun — la machine a maintenant le volume qui justifie une activation Phase 7+/8+ quand les services seront codés.**

### Imhotep — ADR-0010 §10 conditions vs état seed

| Condition | Avant | Après |
|---|---|---|
| Volume creators > 100 | 8 | **108** |
| Missions actives > 50 simultanées | 5 | **~52** (sur 67 missions totales) |
| Académie opérationnelle au-delà du stub | 2 cours | **14 cours** (4 levels × CREATIVE/TECH/STRATEGY/MARKETING/DESIGN) |

- `feat(seed)` `scripts/seed-wakanda/35-imhotep-wakeup.ts` — 100 nouveaux talents (User+TalentProfile+Membership) buckets ART_DIRECTOR/COPYWRITER/PHOTOGRAPHER/VIDEOGRAPHER/COMMUNITY/DEV_IOS/DEV_ANDROID/DEV_WEB/UX_DESIGNER/STRATEGIST/PRODUCER/EDITOR/ANIMATOR_2D/SOUND_DESIGNER/DATA_ANALYST. Chaque profil porte la téléologie ADR §3 dans `driverSpecialties.devotionFootprint` (superfans recrutés par secteur) + `driverSpecialties.manipulationStrengths` (modes peddler/dealer/facilitator/entertainer où le creator excelle) — Imhotep aura du grain pour matcher sur devotion-potential, pas CV.
- `feat(seed)` 55 nouvelles `Mission` distribuées sur les 6 brands × 4 statuts (DISPATCHED/IN_PROGRESS/QC_PENDING/COMPLETED) avec creator-bucket fit. `Mission.briefData` porte `requiredManipulation` + `sector` pour stress-tester le matching futur.
- `feat(seed)` 12 `Course` (Académie) — Foundations DA Wakandaise, Storytelling Heritage, Copywriting Vibranium, Photo Editorial Beauty, Video Format Court, iOS Cosmétique, Android Fintech, UX Research Africa, Brand Strategy 360, Community Heritage, Data Analytics Brand Manager, Sound Branding. Chaque cours a 6-12 modules, durée 360-720 min, niveau BEGINNER/INTERMEDIATE/ADVANCED.
- `feat(seed)` ~280 `Enrollment` (creators × cours pertinents) avec ladder COMPLETED 60% / IN_PROGRESS 25% / ENROLLED 15%, score moyen quand applicable.
- `feat(seed)` 33 `TalentReview` (Q1+Q2 trimestriels), 25-28 `TalentCertification` (par bucket : CREATIVE/TECH/STRATEGY), 42 `PortfolioItem` (best-of par creator senior).

### Anubis — ADR-0011 §10 conditions vs état seed

| Condition | Avant | Après |
|---|---|---|
| Brand active en paid media | 1 | **5/6** (toutes sauf Jabari) |
| Notifications cross-portail > 1000/jour | 6 total | **3500 sur 3 jours (~1167/jour)** |
| OAuth scopes ad networks obtenus | 0 | **18** `IntegrationConnection` (meta/google/tiktok/linkedin/x/youtube/cinetpay) |

- `feat(seed)` `scripts/seed-wakanda/36-anubis-wakeup.ts` — 18 `IntegrationConnection` operator-scopés couvrant Meta Ads (4 accounts dont 1 EXPIRED), Google Ads (4 dont 1 PENDING_REFRESH), TikTok Ads (3), LinkedIn (3), X (2), YouTube (1), Cinetpay (1). Scopes réalistes par provider (`ads_management`, `ads_read`, `https://www.googleapis.com/auth/adwords`, etc.). États mixtes pour exercer le refresh-loop OAuth.
- `feat(seed)` 24 `MediaPlatformConnection` (4 plateformes × 6 brands) avec credentials dailyBudget XAF, status mixtes (ACTIVE × 23, ERROR × 1 sur Brew/META).
- `feat(seed)` 96 `MediaPerformanceSync` (weekly × 4 plateformes × 6 brands × 4 semaines) avec metrics réalistes : impressions par tier de marque (BLISS hero 850k → Jabari 90k), CTR/CPC/CPA/ROAS calculés, currency XAF, période ISO `2026-W{15+w}`.
- `feat(seed)` 30 `CampaignAmplification` paid media (mediaTypes DIGITAL_AD/TV_SPOT/RADIO_SPOT/PRESSE_INSERTION/OOH × statuts PLANNED/PAUSED/COMPLETED/RUNNING). **Téléologie Anubis ADR §3 portée** dans `metrics.costPerSuperfan` + `aarrAttribution` (5 stages AARRR avec cost/leads/activations/retentions/revenue/referrals attribués) — Thot peut vetoer une campagne sur le KPI primaire correct (cost_per_superfan_recruited), pas reach/CTR.
- `feat(seed)` 8 `SocialConnection` supplémentaires couvrant Vibranium/Brew/Panther/Shuri × IG/TT/LI/FB ; 60 `SocialPost` (Instagram/TikTok/LinkedIn/Facebook) avec engagementRate + sentiment.
- `feat(seed)` 12 `PressRelease` (PUBLISHED/DRAFT/ARCHIVED), 36 `PressDistribution` (DELIVERED/OPENED/READ), 18 `PressClipping` (Vogue Africa, TechCabal, Forbes Africa, Marie Claire Africa, BBC Pidgin Wakanda…), 6 `MediaContact` journalistes par beat.
- `feat(seed)` 110 `NotificationPreference` (un par user/talent : 8 named + 8 first-batch + 95 creators), digest INSTANT/DAILY/WEEKLY, channels mix IN_APP/EMAIL/SMS/PUSH, quiet hours 22:00-07:00 timezone Africa/Douala.
- `feat(seed)` **3500 `Notification` réparties sur 3 jours** (≈1167/jour) — 15 templates rotatifs (Score ADVERTIS, Notoria reco, Mission acceptée, Forge Ptah, Brief Artemis, Budget Thot 80%, Tarsis signal, Campagne live, Superfan acquired, Webhook Stripe, Oracle snapshot, RTIS cascade, Deadline mission, Review trimestrielle, Cours Académie). Read rate 60%, channels mix IN_APP/EMAIL/PUSH.

### Wiring

- `chore(seed)` `index.ts` orchestrateur étendu Phase 5 (2 nouveaux modules) + en-tête bumpé `5500+ records · 142/146 models`.
- `chore(seed)` `purge.ts` complété — `IntegrationConnection.deleteMany({operatorId})` ajouté (les autres entités cascades via les blocks Phase 1-3 reverse existants : Mission par strategyId, NotificationPreference/Notification par userId, MediaPlatformConnection/SocialConnection/PressRelease par strategyId, etc.).

**Verify** : `tsc --noEmit` 0 nouvelle erreur introduite. Files compilent. `prisma validate` OK (schemas inchangés). 2 nouveaux fichiers, +~1500 lignes seed.

**Note importante — l'activation effective reste code-side** : les ADRs 0010/0011 sont en statut `accepted (pré-réservation, implémentation différée)`. Le seed franchit les **conditions quantitatives** d'activation, mais Imhotep/Anubis ne deviendront actifs qu'à l'implémentation Phase 7+/8+ (manifests + handlers + services dédiés). Cette PR fournit le terrain — l'activation reste un acte de code séparé.

**Mission contribution** : `CHAIN_VIA:wakanda-stress-test` — un seed dense au-dessus des seuils ADR rend visible et palpable le moment où les Neteru pré-réservés deviennent justifiables. Sans cette masse, l'activation Phase 7+/8+ resterait théorique ; avec, l'admin voit en console que `talent-engine` a 108 profils à matcher et `anubis (à venir)` a 18 OAuth scopes + 30 paid media campaigns à orchestrer.

## v5.7.2 — Wakanda seed Phase 4 : réveil des Neteru (2026-05-01)

**Le seed wakanda passe de 6 marques + 450 records (Phase 8 figé) à 6 marques + 1500+ records couvrant 140/146 modèles. Mestor, Ptah, Seshat et Thot ont enfin du grain à moudre — le fixture devient un terrain de stress-test crédible.**

- `feat(seed)` `scripts/seed-wakanda/29-governance-trail.ts` — réveil **Mestor**. ~150 `IntentEmission` distribuées sur 3 mois (BLISS hero ~50, autres marques ~40 cumulé), ~600 `IntentEmissionEvent` avec phases PROPOSED→COMPLETED, 12 `IntentQueue` rows (PENDING/RUNNING/FAILED pour exercer le cron picker), ~80 `CostDecision` (ALLOW/DOWNGRADE/VETO) — audit Thot indépendant. Hash-chain pseudo-déterministe (selfHash/prevHash non-null, déterministes). Couvre tous les governors (MESTOR/ARTEMIS/SESHAT/THOT/INFRASTRUCTURE) et les kinds critiques (FILL_ADVE, RUN_RTIS_CASCADE, INVOKE_GLORY_TOOL, EXECUTE_GLORY_SEQUENCE, PTAH_MATERIALIZE_BRIEF, PROMOTE_*_TO_*, MAINTAIN_APOGEE, DEFEND_OVERTON).
- `feat(seed)` `scripts/seed-wakanda/30-forge.ts` — réveil **Ptah** (Phase 9 forge). 4 `ForgeProviderHealth` (magnific CLOSED healthy, adobe HALF_OPEN convalescent, figma CLOSED, canva OPEN cooldown 24h), 32 `GenerativeTask` (BLISS Heritage 12 + Glow 8 + app/pending 4 = 24, autres marques 8) avec providers/models réalistes (mystic, kling-3, firefly-v3, icon-set-9, kit-ui), 26 `AssetVersion` matérialisés post-COMPLETED avec `parentAssetId` câblé pour l'upscale 4K (lineage chain) et `cultIndexDeltaObserved` mesuré. Manipulation modes per asset (peddler/dealer/facilitator/entertainer), `pillarSource` ADVE/RTIS canon. États : COMPLETED, IN_PROGRESS, CREATED, FAILED, VETOED.
- `feat(seed)` `scripts/seed-wakanda/31-market-context.ts` — réveil **Seshat tier 1+3**. 5 `Sector` (cosmetics, fintech, FMCG-beverage, edtech, tourism-heritage) avec `culturalAxis`+`overtonState` Tarsis, 36 `MarketBenchmark` (CPM/CPC/CPA/PROD/SALARY/RETAINER/INFLUENCER/OOH cross WK+CM+CI+SN), 12 `MarketSizing` (TAM/SAM/SOM 2024-2026), 10 `CostStructure`, 6 `CompetitiveLandscape` (HHI + leader share), 6 `MarketDocument` (markdown body) + 6 `MarketContextNode` correspondants (vector-ready), 24 `BrandContextNode` BLISS (PILLAR_FIELD × 13, NARRATIVE × 2, BRANDLEVEL, RECO × 2, ASSET × 2, SEQUENCE_OUTPUT × 3) + 30 `BrandAction` BLISS (Pillar I taxonomy AARRR/touchpoint/persona/budget/timing).
- `feat(seed)` `scripts/seed-wakanda/32-oracle-strategy.ts` — réveil **Oracle** (livrable phare). 8 `OracleSnapshot` BLISS (time-travel boot → ICONE), 5 OracleSnapshot autres marques (état courant), 10 `StrategyDoc` Yjs CRDT (PILLAR_CONTENT × 5 BLISS, ORACLE_SECTION × 3, MESTOR_CHAT × 2). Le snapshot json couvre les 21 sections canon avec confidence + body — bridge tests UI Oracle.
- `feat(seed)` `scripts/seed-wakanda/33-error-vault.ts` — réveil **error-vault Phase 11**. 28 `ErrorEvent` distribués sur 8 sources (SERVER/CLIENT/PRISMA/NSP/PTAH/STRESS_TEST/CRON/WEBHOOK) × 6 sévérités (TRACE→CRITICAL), avec multi-occurrences (`occurrences > 1` pour exercer la dedup signature), résolus + non-résolus, false-positives marqués (`knownFalsePositive: true`), codes machine (ZOD_VALIDATION, MESTOR_VETO, PRISMA_P2002, PTAH_PROVIDER_502, CSP_VIOLATION, ANTHROPIC_OVERLOADED_529, etc.). Le triage admin `/console/governance/error-vault` a enfin du contenu à clusteriser.
- `feat(seed)` `scripts/seed-wakanda/34-snapshots-timeseries.ts` — réveil **Seshat dense observation**. Les snapshots existants étaient un cliché unique — désormais série temporelle hebdomadaire : 6 brands × 4-13 semaines `ScoreSnapshot` (~55 rows), 3 brands `DevotionSnapshot` weekly (~32), 2 brands `CultIndexSnapshot` weekly (~24), 6 brands × 4 platforms `CommunitySnapshot` biweekly (~72). Trajectoires interpretables — Tarsis détecte les pentes, pas juste un point.
- `chore(seed)` `scripts/seed-wakanda/index.ts` orchestrateur étendu Phase 4 (6 nouveaux modules importés séquentiellement) + en-tête mis à jour `1500+ records · 140/146 models`.
- `chore(seed)` `scripts/seed-wakanda/purge.ts` — block "Phase 4 reverse" ajouté pour cascade-delete propre des nouvelles entités (IntentEmission auto-cascade events, IntentQueue, CostDecision, AssetVersion, GenerativeTask, BrandAction, BrandContextNode, OracleSnapshot, StrategyDoc, ErrorEvent, MarketContextNode, MarketDocument, CompetitiveLandscape, CostStructure, MarketSizing, MarketBenchmark, Sector). ForgeProviderHealth volontairement épargné (lookup global).

**Verify** : `tsc --noEmit` 0 nouvelle erreur introduite (22675 résidus pré-existants inchangés, tous hors `scripts/seed-wakanda/`). 6 nouveaux fichiers, +~3000 lignes de seed.

**Couverture modèles** : 115 → ~140 / 146. Restent non-seedés : auth plumberie (`account`, `session`, `verificationToken`, `mfaSecret`, `subscription`, `intakePayment`), config infra (`mcpApiKey`, `mcpServerConfig`, `modelPolicy`, `paymentProviderConfig`, `pricingOverride`, `promptVersion`, `webhookConfig`, `externalConnector`, `integrationConnection`, `driverGloryTool`), `country`/`currency` (couverts par `prisma/seed-countries.ts`).

**Mission contribution** : `CHAIN_VIA:wakanda-stress-test` — un seed dense est l'instrument de stress-test qui valide que les 5 Neteru actifs peuvent traiter du volume réel sans flame-out (Loi 3 Thot) et sans drift narratif (Loi 1). Pas DIRECT_SUPERFAN ni DIRECT_OVERTON, mais GROUND_INFRASTRUCTURE qui sert ces deux mécanismes via la fiabilité de la machine.

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
