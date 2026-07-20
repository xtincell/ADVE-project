# RESIDUAL DEBT — inventaire honnête des résidus

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

- **Audit d'ownership des mutations `governedProcedure` founder-lane** *(suivi ADR-0166, inscrit
  2026-07-20)* : la lane protected est close ; les mutations gouvernées `requireOperator:false`
  (guilde, paiements, candidatures, cockpit founder — flags audités PR #447) n'ont PAS toutes une
  garde d'ownership explicite sur leurs ids d'entités (2 seules posées : `strategy.delete`,
  `monetization.cancelSubscription`). **Plan** : réutiliser le scanner span de
  `strategy-ownership-guard.test.ts` sur la lane governed, vérifier procédure par procédure (les
  kinds calendrier/social sont déjà couverts par firewall de zones ADR-0131 + `canAccessStrategy`),
  étendre le test HARD. **Effort** : ~½ session. **Déclencheur** : prochaine session backend.
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

### Docs / registres

- **Reclassification ROUTER-MAP / SERVICE-MAP** : 34 routers + 23 services post-Phase 19 en
  § « À classifier » (couverture honnête). **Plan** : attribuer sous-système APOGEE + tier + statut
  governance à chaque entrée, re-fusionner, refaire les synthèses. **Effort** : ~1 session mécanique.
  **Déclencheur** : prochaine session docs.

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
