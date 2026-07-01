# CAHIER DE CHARGES — LaFusée Industry OS
# PARTIE 3/3 — BUILD, CONTRAINTES & ACCEPTATION (Sections 8-12)

---

## 8. PHASES DE BUILD

### Phase 0 — Fondation ADVE Protocol + Quick Intake (Semaines 1-4)

**Objectif** : le protocole ADVE est pervasif, le Quick Intake est live, la capture Knowledge Graph est active.

| Tâche | Type | Division | Effort |
|-------|------|----------|--------|
| Implémenter AdvertisVector (Zod type + helpers) | Nouveau | Transversal | S |
| Ajouter `advertis_vector Json?` sur Strategy, Campaign, Mission, TalentProfile, Signal, GloryOutput, BrandAsset | Refactor | Transversal | M |
| Implémenter `advertis-scorer` service (scoring AI-assisted via Mestor) | Nouveau | Transversal | L |
| Implémenter router `advertis-scorer` (scoreObject, batchScore, getHistory) | Nouveau | Transversal | M |
| Ajouter phase QUICK_INTAKE sur Strategy | Refactor | L'Oracle | S |
| Implémenter modèle QuickIntake + router | Nouveau | L'Oracle | M |
| Implémenter `quick-intake-engine` service (questionnaire adaptatif, scoring partiel) | Nouveau | L'Oracle | L |
| Implémenter pages `/intake` (landing + questionnaire + résultat) — PUBLIC, sans auth | Nouveau | L'Oracle | L |
| Implémenter DevotionSnapshot modèle + router `devotionLadder` | Nouveau | L'Oracle | M |
| Connecter CultIndexSnapshot à DevotionSnapshot | Refactor | Le Signal | S |
| Unifier scoring : ScoreSnapshot + AdvertisVector en /200 cohérent | Refactor | Transversal | M |
| Implémenter modèle KnowledgeEntry | Nouveau | Le Signal | S |
| Implémenter service `knowledge-capture` (écriture passive à chaque événement) | Nouveau | Le Signal | M |
| Implémenter modèle Operator (UPgraders comme seul opérateur) | Nouveau | Transversal | S |
| Ajouter `operatorId` sur User et Strategy | Refactor | Transversal | S |
| Câbler Quick Intake → CRM (Quick Intake complété crée un Deal en PROSPECT) | Refactor | La Fusée (SOCLE) | S |
| Réconcilier AmbassadorProgram avec Devotion Ladder (ambassadeurs = segment 5) | Refactor | L'Arène | S |

**Livrable** : tout objet du système peut être scoré /200. Le Quick Intake est partageable par lien et crée automatiquement un Deal dans le CRM. La Devotion Ladder est mesurable et réconciliée avec le programme ambassadeurs. Le Knowledge Graph capture passivement. Un DG peut recevoir un lien, scorer sa marque en 15 min, et voir "Ordinaire — 94/200". Le fixer voit le pipeline de conversion.

### Phase 1 — Brand Instance complète (Semaines 5-9)

**Objectif** : chaque client a un Brand OS complet avec Drivers, guidelines, feedback loop.

| Tâche | Type | Division | Effort |
|-------|------|----------|--------|
| Implémenter modèle Driver + DriverGloryTool + router `driver` | Nouveau | La Fusée | L |
| Implémenter `driver-engine` service (generateSpecs, translateBrief) | Nouveau | La Fusée | L |
| Lier GLORY tools aux Drivers via DriverGloryTool | Refactor | La Fusée | M |
| Implémenter `guidelines-renderer` service | Nouveau | La Fusée | L |
| Implémenter router `guidelines` (generate, get, export, shareLink) | Nouveau | La Fusée | M |
| Structurer BrandVault en 3 niveaux (système/opérateur/production) | Refactor | La Fusée | M |
| Implémenter tagging ADVE sur assets (`asset-tagger` service) | Nouveau | La Fusée | M |
| Implémenter garbage collection (expiration, alertes, purge) | Nouveau | La Fusée | S |
| Implémenter DeliverableTracking modèle + router | Nouveau | La Fusée | M |
| Câbler `feedback-loop` service (Signal → scoring → ARTEMIS → recalibration → alerte) | Nouveau | Transversal | L |
| Enrichir permissions avec droits granulaires par Strategy | Refactor | Transversal | M |
| Enrichir approval workflow avec check ADVE par pilier | Refactor | La Fusée (BOOST) | M |
| Connecter SocialConnection aux Drivers sociaux (INSTAGRAM ↔ Driver Instagram, etc.) | Refactor | La Fusée | M |
| Câbler SocialPost.metrics → Signal automatiquement (métriques sociales → feedback loop) | Refactor | La Fusée | M |
| Câbler MediaPerformanceSync → CampaignAmplification (données réelles média) | Refactor | La Fusée (BOOST) | M |
| Lier PressRelease aux Drivers PR + ajouter advertis_vector | Refactor | La Fusée | S |
| Câbler PressClipping → Signal (reach + sentiment → pillar impact via feedback loop) | Refactor | Le Signal | S |
| Connecter résultats Market Study → Knowledge Graph (KnowledgeEntry type SECTOR_BENCHMARK) | Refactor | Le Signal | M |
| Étendre `guidelines-renderer` en `brand-document-renderer` (guidelines + présentations stratégiques + réutilisant les 8 renderers HTML existants) | Refactor | La Fusée | M |

**Livrable** : un client onboardé a un profil ADVE vivant, des Drivers actifs qui produisent des briefs qualifiés, des guidelines et présentations exportables. Le feedback loop reçoit des données réelles (métriques sociales, performance média, clippings presse) et mesure l'impact. Les études de marché alimentent le Knowledge Graph.

### Phase 2 — Mission Forge + Guilde (Semaines 10-15)

**Objectif** : les missions sont dispatchées ou co-créées, le QC est distribué, la Guilde est structurée.

| Tâche | Type | Division | Effort |
|-------|------|----------|--------|
| Ajouter mode DISPATCH/COLLABORATIF sur Mission | Refactor | La Fusée | S |
| Implémenter `matching-engine` service | Nouveau | L'Arène | L |
| Implémenter brief generator (Mestor + Driver + contexte ADVE) | Nouveau | La Fusée | L |
| Implémenter router `matching` (suggest, override, getHistory) | Nouveau | L'Arène | M |
| Ajouter `tier GuildTier` sur TalentProfile + métriques perf | Refactor | L'Arène | M |
| Implémenter GuildOrganization modèle + router `guildOrg` | Nouveau | L'Arène | M |
| Implémenter QualityReview modèle + router `qualityReview` | Nouveau | L'Arène | L |
| Implémenter `qc-router` service (routing par tier × criticité) | Nouveau | L'Arène | M |
| Implémenter QC automatisé (conformité technique + scoring IA) | Nouveau | L'Arène | L |
| Implémenter feedback structuré par pilier dans QC | Nouveau | L'Arène | M |
| Implémenter `tier-evaluator` service | Nouveau | L'Arène | M |
| Implémenter PortfolioItem modèle | Nouveau | L'Arène | S |
| Implémenter router `guildTier` | Nouveau | L'Arène | M |
| Enrichir statuts Mission (brief_generated → delivered_to_client) | Refactor | La Fusée | S |
| Implémenter SLA tracking (alertes J-2, J-1, escalade) | Nouveau | La Fusée | M |
| Connecter SESHAT via `seshat-bridge` service (si SESHAT prêt) | Nouveau | L'Académie | M |
| Intégrer Market Pricing au matching-engine (référentiel tarifaire pour scoring) | Refactor | L'Arène | S |
| Intégrer Translations aux Drivers multi-marchés (adaptation linguistique par Driver/marché) | Refactor | La Fusée | M |
| Permettre conversion InterventionRequest → Mission | Refactor | La Fusée (BOOST) | S |
| Enrichir Attribution et Cohorts → alimenter Knowledge Graph | Refactor | Le Signal | M |

**Livrable** : un brief qualifié est généré automatiquement via Driver (avec adaptation linguistique si multi-marché), le bon créatif est matché (avec tarif de référence marché), le QC est distribué par tier, le créatif progresse dans la Guilde, les agences de prod sont des GuildOrganizations. Les demandes d'intervention peuvent devenir des missions.

### Phase 3 — Portals (Semaines 16-22)

**Objectif** : les 3 populations + le funnel public ont leur interface.

| Tâche | Type | Division | Effort |
|-------|------|----------|--------|
| Restructurer `/cockpit` en Client Portal (Cult Dashboard → operate → brand → insights) | Refactor | L'Oracle | L |
| Page d'accueil cockpit : Cult Index + Devotion Ladder + radar 8 piliers | Nouveau | L'Oracle | L |
| Construire `/creator` complet (dashboard, missions, qc, progress, earnings, profile, learn, community) | Nouveau | L'Arène + L'Académie | XL |
| Implémenter visibilité par tier dans Creator Portal | Nouveau | L'Arène | M |
| Implémenter `/creator/learn` (fondamentaux ADVE, guidelines Driver, cas d'étude, ressources) | Nouveau | L'Académie | L |
| Construire `/console` complet (oracle, signal, arene, fusee, academie, socle, ecosystem, config) | Nouveau | Toutes | XL |
| Implémenter Mestor contextuel (scope selon le portal) | Refactor | Transversal | M |
| Implémenter view modes existants sur le nouveau Client Portal | Refactor | L'Oracle | S |
| Intégrer Club (Upgraded Brands Club) dans `/console/arene/club` et comme widget client | Refactor | L'Arène | M |
| Intégrer Events (Summit, meetups) dans `/console/arene/events` et `/creator/community/events` | Refactor | L'Arène | M |
| Intégrer Messaging dans les 3 portals (`/cockpit/messages`, `/creator/messages`, `/console/messages`) — contextualisé par Strategy/Mission | Refactor | Transversal | M |
| Placer PR dans `/console/fusee/pr` | Refactor | La Fusée | S |
| Placer Social dans `/console/fusee/social` | Refactor | La Fusée | S |
| Placer Media Buying dans `/console/fusee/media` | Refactor | La Fusée | S |
| Placer CRM/pipeline dans `/console/socle/pipeline` | Refactor | La Fusée (SOCLE) | S |
| Placer Market Study dans `/console/signal/market-study` | Refactor | Le Signal | S |
| Placer Attribution + Cohortes dans `/cockpit/insights/attribution` et `/console/signal/attribution` | Refactor | Le Signal | S |
| Placer Interventions dans `/cockpit/operate/requests` | Refactor | La Fusée | S |
| Intégrer factures freelance dans `/creator/earnings/invoices` (Serenite côté créatif) | Refactor | La Fusée (SOCLE) | S |
| Migrer pages `/os/*`, `/impulsion/*`, `/pilotis/*` vers les portals (redirections + fallback) | Refactor | Transversal | M |

**Livrable** : chaque acteur a son interface complète. Le client voit son Brand OS centré cult marketing. Le créatif gère ses missions, progresse, apprend l'ADVE, et voit ses factures. Le fixer a son god mode structuré par les 5 divisions avec PR, Social, Media, CRM, Market Study et interventions accessibles. La messagerie inter-acteurs fonctionne dans les 3 portals.

### Phase 4 — Value Capture + Scheduler + Boot Sequence (Semaines 23-28)

**Objectif** : la valeur est capturée, le système s'auto-organise, l'onboarding est complet.

| Tâche | Type | Division | Effort |
|-------|------|----------|--------|
| Enrichir Commission modèle + implémenter `commission-engine` service | Nouveau | La Fusée (SOCLE) | L |
| Implémenter Membership modèle + router | Nouveau | La Fusée (SOCLE) | M |
| Implémenter `value-report-generator` service | Nouveau | L'Oracle | L |
| Implémenter router `valueReport` (generate, list, export) | Nouveau | L'Oracle | M |
| Implémenter `upsell-detector` service | Nouveau | La Fusée (SOCLE) | M |
| Implémenter Process modèle + `process-scheduler` service | Nouveau | La Fusée | L |
| Implémenter `team-allocator` service | Nouveau | La Fusée (BOOST) | M |
| Implémenter contention management | Nouveau | La Fusée | M |
| Implémenter Boot Sequence complet (`boot-sequence` service + UI) | Nouveau | L'Oracle | L |
| Intégration paiement Mobile Money (webhooks Orange/MTN/Wave) | Nouveau | La Fusée (SOCLE) | L |
| Implémenter operator fees et reporting pour licenciés (prêt mais pas activé) | Nouveau | Transversal | M |

**Livrable** : les commissions sont calculées automatiquement, les retainers justifiés par des Value Reports, les processus sont schedulés, les goulots détectés, le Boot Sequence produit un profil ADVE calibré en 60-90 min. Mobile Money opérationnel.

### Phase 5 — Knowledge Graph + Antifragilité (Semaines 29-35)

**Objectif** : le système apprend, se renforce, et devient irremplaçable.

| Tâche | Type | Division | Effort |
|-------|------|----------|--------|
| Implémenter `knowledge-aggregator` service (batch — active l'intelligence sur les données capturées depuis P0) | Nouveau | Le Signal | XL |
| Implémenter benchmarks sectoriels (agrégation cross-strategy) | Nouveau | Le Signal | L |
| Implémenter framework performance ranking | Nouveau | L'Oracle | M |
| Implémenter creator performance profiling | Nouveau | L'Arène | M |
| Implémenter brief optimization patterns | Nouveau | La Fusée | M |
| Implémenter campaign templates data-driven | Nouveau | La Fusée (BOOST) | M |
| Connecter Tarsis au Knowledge Graph | Refactor | Le Signal | M |
| Implémenter `diagnostic-engine` (extension ARTEMIS + diagnostic différentiel + localisation) | Nouveau | L'Oracle | L |
| Implémenter 5ème serveur MCP : Guild | Nouveau | L'Arène | L |
| Implémenter 6ème serveur MCP : SESHAT | Nouveau | L'Académie | L |
| Anonymisation des données cross-client | Nouveau | Transversal | M |
| Data export par client (RGPD-like) | Nouveau | Transversal | M |
| Score /200 comme standard public : page de stats, widget embeddable | Nouveau | Transversal | M |

**Livrable** : le Knowledge Graph agrège les patterns depuis P0. ARTEMIS apprend des résultats passés. Les benchmarks sectoriels sont disponibles. Le matching utilise la performance historique. Le système est antifragile — il s'améliore avec chaque transaction.

---

## 9. CONTRAINTES TECHNIQUES

### 9.1 Performance

| Métrique | Seuil |
|----------|-------|
| Chargement dashboard (tout portal) | < 2s |
| Scoring ADVE (un objet) | < 5s (AI-assisted) |
| Matching engine | < 3s |
| Génération brief qualifié | < 15s (AI-assisted) |
| Génération Value Report | < 30s |
| Génération Guidelines | < 20s |
| Knowledge Graph query | < 1s |
| Batch knowledge-aggregator (par run) | < 5 min |
| Quick Intake (bout-en-bout) | < 15 min (UX) |
| Quick Intake (scoring final) | < 10s |

### 9.2 Scalabilité

| Dimension | Capacité cible V1 |
|-----------|-------------------|
| Opérateurs | 1 (UPgraders) — modèle prêt pour N |
| Brand Instances simultanées | 50 |
| Créatifs dans la Guilde (individuels) | 100 |
| Guild Organizations | 20 |
| Missions actives simultanées | 200 |
| Processus (daemons + batch) | 500 |
| KnowledgeEntry | 100 000 |
| Assets BrandVault (tous clients) | 50 000 |
| Quick Intakes (total) | 10 000 |

### 9.3 Sécurité

- **Isolation stricte des Brand Instances** : filtrage applicatif systématique sur `strategyId` + `operatorId`. Un client ne voit jamais les données d'un autre client.
- **Isolation des créatifs** : un freelance ne voit que les missions qui lui sont assignées ou disponibles pour son profil/tier.
- **Knowledge Graph anonymisé** : `sourceHash` au lieu de `strategyId` pour toute donnée cross-client.
- **Quick Intake** : données stockées séparément des Brand Instances. Conversion explicite avec consentement.
- **Commissions et revenus** : visibles uniquement par le concerné + ADMIN.
- **McpApiKey** : étendues aux nouveaux serveurs (Guild, SESHAT).
- **Rate limiting** : 10 req/min pour les endpoints AI.
- **Operator isolation** (future) : un opérateur licencié ne voit que ses propres Brand Instances et créatifs.

### 9.4 Migration

- Tous les nouveaux champs JSON sont nullable (`Json?`) — le système existant continue de fonctionner sans vecteur ADVE.
- Les nouvelles routes sont ajoutées sans modifier les routes existantes.
- Les modèles existants reçoivent des champs additifs, jamais de suppression.
- La migration est progressive : Phase 0 peut être déployée sans Phase 1.
- Chaque phase est autonome et déployable indépendamment (sauf dépendances marquées).
- Les Surfaces v2 actuelles (mission-control, brand-pulse, studio, backstage) sont maintenues comme fallback pendant la transition vers les 3 Portals.

### 9.5 Intégrations externes

| Intégration | Protocole | Division | Usage | Phase |
|-------------|-----------|----------|-------|-------|
| SESHAT | API REST ou MCP | L'Académie | Références créatives pour les briefs | Phase 2 |
| Mobile Money (Orange, MTN, Wave) | Webhooks + API | La Fusée (SOCLE) | Paiement commissions et memberships | Phase 4 |
| Social Media APIs | Webhooks entrants | Le Signal | Signaux pour le feedback loop | Phase 1 |
| Calendriers (Google/Outlook) | API REST | La Fusée | Sync pour le scheduler | Phase 4 |

---

## 10. CRITÈRES D'ACCEPTATION

### 10.1 Phase 0 — Fondation ADVE Protocol + Quick Intake

- [ ] Un objet Strategy peut être scoré /200 sur les 8 piliers et le score est persisté
- [ ] Le score composite /200 est calculé et historisé en time series
- [ ] Mestor peut scorer n'importe quel objet quand invoqué avec le contexte approprié
- [ ] La Devotion Ladder est mesurable et les snapshots sont stockés
- [ ] Une alerte est générée quand un score passe sous un seuil configurable
- [ ] Le Quick Intake est accessible par lien partageable, sans compte
- [ ] Le Quick Intake guide l'utilisateur en 15 min et produit un score /200 + classification
- [ ] Le résultat Quick Intake est partageable et montre le radar 8 piliers
- [ ] Un Quick Intake complété peut être converti en Brand Instance (Strategy)
- [ ] Le fixer reçoit une notification à chaque Quick Intake complété
- [ ] Chaque scoring, mission close, et QC écrit un KnowledgeEntry (capture passive)
- [ ] Le modèle Operator existe avec UPgraders comme seul opérateur
- [ ] Un Quick Intake complété crée automatiquement un Deal dans le CRM (statut PROSPECT)
- [ ] Le fixer voit le pipeline de conversion Quick Intake → Deal → Brand Instance
- [ ] L'AmbassadorProgram est réconcilié avec la Devotion Ladder (ambassadeurs = segment 5)

### 10.2 Phase 1 — Brand Instance

- [ ] Un Driver peut être créé, activé, et lié à une Strategy
- [ ] Un Driver activé génère des specs initiales basées sur le profil ADVE du client
- [ ] Un brief qualifié est générable via un Driver (stratégie + direction + specs + critères QC)
- [ ] Les assets BrandVault sont tagués par pilier et recherchables
- [ ] Les guidelines sont générées automatiquement depuis le profil ADVE et exportables en PDF
- [ ] Un Signal entrant recalcule le score du pilier concerné
- [ ] Un seuil de dérive déclenche un diagnostic ARTEMIS + alerte fixer
- [ ] Les SocialConnection sont liées aux Drivers correspondants (même plateforme)
- [ ] Les métriques de SocialPost alimentent automatiquement le feedback loop via Signal
- [ ] Les MediaPerformanceSync remontent les données réelles dans les CampaignAmplification
- [ ] Les PressClipping génèrent des Signals qui alimentent le feedback loop (reach + sentiment → pillar impact)
- [ ] Les résultats de Market Study produisent des KnowledgeEntry (type SECTOR_BENCHMARK)
- [ ] Le `brand-document-renderer` peut produire guidelines ET présentations stratégiques (8 piliers)

### 10.3 Phase 2 — Mission Forge + Guilde

- [ ] Une mission peut être créée en mode DISPATCH ou COLLABORATIF
- [ ] Le matching engine retourne les 2-3 meilleurs créatifs pour un brief donné
- [ ] Le QC est routé automatiquement selon le tier du soumetteur
- [ ] Le QC produit un verdict structuré par pilier avec feedback
- [ ] Un créatif voit son chemin de progression avec critères mesurables
- [ ] Le fixer peut valider une promotion de tier
- [ ] En mode collaboratif, le créatif peut enrichir le brief et ses contributions sont trackées
- [ ] Une GuildOrganization peut être créée et ses membres sont liés
- [ ] Le matching-engine utilise le MarketPricing comme référence tarifaire
- [ ] Les Drivers multi-marchés peuvent produire des briefs culturellement adaptés (via Translation)
- [ ] Une InterventionRequest peut être convertie en Mission
- [ ] Les AttributionEvent alimentent le Knowledge Graph

### 10.4 Phase 3 — Portals

- [ ] Le Client Portal affiche le Cult Index + Devotion Ladder + radar 8 piliers en page d'accueil
- [ ] Le Client Portal permet de soumettre un brief et valider des livrables (section /operate)
- [ ] Les guidelines sont navigables et interrogeables via Mestor dans le Client Portal
- [ ] Le Creator Portal montre les missions disponibles filtrées par profil/tier
- [ ] Le Creator Portal montre les métriques de performance et le chemin de progression
- [ ] Le Creator Portal inclut une section /learn avec fondamentaux ADVE et guidelines Driver
- [ ] La Fixer Console expose les 5 divisions avec drill-down complet
- [ ] Le Club et les Events sont intégrés dans la navigation
- [ ] Mestor est contextuel selon le portal d'invocation
- [ ] Les view modes (EXECUTIVE, MARKETING, FOUNDER, MINIMAL) fonctionnent sur le Client Portal
- [ ] La messagerie est accessible dans les 3 portals, contextualisée par Strategy/Mission
- [ ] Le PR, le Social et le Media Buying sont accessibles dans la Fixer Console (/console/fusee)
- [ ] Le CRM/pipeline est accessible dans /console/socle/pipeline
- [ ] Le Market Study est accessible dans /console/signal/market-study
- [ ] Les demandes d'intervention sont gérables dans /cockpit/operate/requests
- [ ] L'attribution est consultable dans /cockpit/insights/attribution
- [ ] Les factures freelance sont visibles dans /creator/earnings/invoices
- [ ] Les pages legacy (/os, /impulsion, /pilotis) redirigent vers les portals

### 10.5 Phase 4 — Value Capture + Scheduler

- [ ] Les commissions sont calculées automatiquement par mission selon le tier
- [ ] Un Value Report mensuel est générable et exportable par client
- [ ] Le Value Report contextualise les baisses de score (causes exogènes identifiées)
- [ ] Les daemons sont schedulables et des alertes sont émises quand ils s'arrêtent
- [ ] La contention entre missions/daemons est détectée et des arbitrages sont proposés
- [ ] Le Boot Sequence complet produit un profil ADVE calibré en 60-90 minutes
- [ ] Le paiement Mobile Money est opérationnel pour les commissions

### 10.6 Phase 5 — Knowledge Graph + Antifragilité

- [ ] Les benchmarks sectoriels sont calculés cross-strategy (anonymisés)
- [ ] Le diagnostic ARTEMIS recommande les frameworks basé sur les résultats passés
- [ ] Le matching engine utilise la performance historique du créatif sur des briefs similaires
- [ ] Les templates de campagne sont enrichis par les données réelles
- [ ] Un client peut exporter l'intégralité de ses données
- [ ] Les 6 serveurs MCP sont opérationnels (Intelligence, Operations, Creative, Pulse, Guild, SESHAT)
- [ ] Le score /200 est citeable et partageable comme standard de marché

---

## 11. LEXIQUE

| Terme | Définition |
|-------|------------|
| **UPgraders** | Écosystème à 5 divisions (Oracle, Signal, Arène, Fusée, Académie) pour l'industrie créative africaine. "De la Poussière à l'Étoile". |
| **LaFusée** | Le SaaS Industry OS qui encode les 5 divisions d'UPgraders. Le Brand OS est le produit. L'Agency OS est l'infrastructure. L'ADVE est le protocole. |
| **ADVE-RTIS** | Méthodologie propriétaire 8 piliers (Authenticité, Distinction, Valeur, Engagement, Risk, Track, Implementation, Stratégie). Méthode de création de culte de marque. |
| **Vecteur ADVERTIS** | Objet JSON : 8 scores /25 + composite /200 + confidence. Attachable à tout objet transactionnel. |
| **Score /200** | Score composite ADVE. 0-80 Zombie, 81-120 Ordinaire, 121-160 Forte, 161-180 Culte, 181-200 Icône. |
| **Brand Instance** | L'ensemble des données d'un client : Strategy + piliers + drivers + assets + scores + feedback. Son Brand OS. |
| **Driver** | Machine de traduction stratégie → canal. Transforme le profil ADVE en specs de production pour un canal donné (Instagram, packaging, event, etc.). |
| **Devotion Ladder** | Échelle de progression d'audience en 6 niveaux : Spectateur → Intéressé → Participant → Engagé → Ambassadeur → Évangéliste. |
| **Guilde** | Réseau structuré de créatifs avec hiérarchie méritocratique (Apprenti → Compagnon → Maître → Associé). |
| **GuildOrganization** | Agence opérationnelle/de production membre de la Guilde en tant qu'entité collective. |
| **Mission Forge** | Système de création et dispatch de missions. Produit des briefs qualifiés via Driver. |
| **QC distribué** | Quality Control réparti par tier : Maîtres valident Compagnons, Compagnons valident Apprentis. |
| **Knowledge Graph** | Intelligence accumulée cross-client (anonymisée) : patterns, benchmarks, performance créatifs, optimisation briefs. |
| **Feedback Loop** | Boucle fermée : Output → Signal → Diagnostic → Recalibration → Output ajusté. |
| **Boot Sequence** | Onboarding client complet (60-90 min) qui calibre le profil ADVE. |
| **Quick Intake** | Diagnostic express (15 min), public, partageable par lien. Score /200 + classification. Porte d'entrée du funnel. |
| **Fixer** | L'orchestrateur stratégique (Alexandre / ADMIN) qui opère l'écosystème. Protocol Owner. |
| **Opérateur** | Entité qui opère des Brand Instances via LaFusée. UPgraders est le premier et seul opérateur en V1. Les agences licenciées ADVE seront des opérateurs futurs. |
| **L'Oracle** | Division stratégie (IMPULSION™, Retainer, diagnostics ARTEMIS). |
| **Le Signal** | Division intelligence (RADAR™, Tarsis, benchmarks, Knowledge Graph). |
| **L'Arène** | Division communauté (Guilde, Upgraded Brands Club™, Upgrade Summit™, matching). |
| **La Fusée** | Division ingénierie (ADVERTIS SaaS, BOOST™ ops, SOCLE™ finance, GLORY tools, MCP servers). |
| **L'Académie** | Division transmission (Certification ADVE™, bootcamps, playbooks, SESHAT). |
| **ARTEMIS** | Batterie de frameworks analytiques pour le diagnostic de marque. |
| **SESHAT** | Système de curation de références créatives, filtrable par profil ADVE. |
| **GLORY** | 39 outils créatifs/opérationnels liés aux Drivers. |
| **Mestor** | AI assistant (Claude) contextuel selon le portal d'invocation. |
| **RADAR™** | Produit d'intelligence marché (baromètres sectoriels, benchmarks). Division Le Signal. |
| **Value Report** | Rapport mensuel justificatif du retainer, quantifiant la valeur produite par pilier. |
| **Upgraded Brands Club™** | Communauté de marques clientes. Network effect. Division L'Arène. |
| **Upgrade Summit™** | Événement flagship annuel. Acquisition + positionnement. Division L'Arène. |
| **SOCLE™** | Infrastructure admin/finance (contrats, factures, escrow, commissions, Mobile Money). |
| **BOOST™** | Gestion de projet créatif et accélération (Campaign Manager 360, missions, dispatch). |
| **Flywheel** | Stratégie → Création → Communauté → Demande → Solutions → Finance → Croissance. Les 5 divisions s'alimentent mutuellement. |

---

## 12. INVENTAIRE TECHNIQUE COMPLET

### 12.1 Stack

| Couche | Technologie |
|--------|------------|
| Framework | Next.js 16 (App Router, React 19, React Compiler) |
| Language | TypeScript (strict mode, `noUncheckedIndexedAccess`) |
| API | tRPC v11 (superjson, Zod validation) |
| Database | PostgreSQL 16 via Prisma ORM |
| Auth | NextAuth.js 5 (JWT sessions, Credentials + Google OAuth) |
| AI | Anthropic Claude via Vercel AI SDK (`@ai-sdk/anthropic`) |
| Styling | Tailwind CSS v4 (OKLCH color system, `@theme` syntax) |
| Components | shadcn/ui (Radix UI primitives, CVA variants) |
| MCP | Model Context Protocol SDK v1.26.0 |
| Testing | Vitest (unit), Playwright (e2e) |

### 12.2 Chiffres cibles

| Dimension | Actuel | Cible finale |
|-----------|--------|-------------|
| Modèles Prisma | 87 | ~99 |
| tRPC Routers | 43 | ~61 (18 nouveaux + 30 modifiés) |
| Services | 65+ | ~85+ |
| MCP Servers | 4 (74 tools) | 6 (~92 tools) |
| Pages/Routes | ~45 | ~58 (3 portals + intake + pages manquantes) |
| Routers existants enrichis | — | 30 (16 initiaux + 14 ajoutés par Annexe E) |
| Phases de build | — | 6 (0-5), ~35 semaines |
