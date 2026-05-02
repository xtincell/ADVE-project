# PANTHEON — Le Panthéon Neteru de La Fusée

> *Source unique de vérité narrative sur les Neteru. Toute mention de "trio", "quartet" ou de Neter inconnu doit être réconciliée ici.*

Ce document définit le **panthéon Neteru** — les 7 dieux qui gouvernent l'Industry OS. Il complète :
- [LEXICON.md](LEXICON.md) — vocabulaire normatif
- [APOGEE.md](APOGEE.md) — framework de pilotage de trajectoire
- [FRAMEWORK.md](FRAMEWORK.md) — 5 piliers techniques
- [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md) — paramètre transverse d'engagement audience

**Plafond canonique : 7 Neteru** ([APOGEE.md §9](APOGEE.md)). **État actuel : 7 actifs (Phase 14/15 — full activation)**. Cap APOGEE atteint — toute fonction nouvelle s'absorbe dans un Neter existant ou exige un ADR de relèvement de plafond.

---

## 1. Les 7 Neteru

| # | Nom | Sous-système APOGEE | Statut | Mythologie |
|---|---|---|---|---|
| 1 | **MESTOR** | Guidance (Mission) | Actif | Conseiller mythologique grec ; figure de la délibération |
| 2 | **ARTEMIS** | Propulsion (Mission) | Actif | Déesse grecque de la chasse — vise et lance |
| 3 | **SESHAT** | Telemetry (Mission) | Actif | Déesse égyptienne de l'écriture, mesure, archives |
| 4 | **THOT** | Sustainment + Operations (Mission + Ground) | Actif | Dieu égyptien de la sagesse, calcul, balance |
| 5 | **PTAH** | Propulsion (Mission, downstream Artemis) | Actif (Phase 9 — ADR-0009) | Démiurge égyptien, créateur du monde par le verbe, patron des artisans |
| 6 | **IMHOTEP** | Crew Programs (Ground) | **Actif** (Phase 14, ADR-0019 supersedes ADR-0017) | Sage humain égyptien déifié, architecte, scribe, médecin |
| 7 | **ANUBIS** | Comms (Ground) | **Actif** (Phase 15, ADR-0020 supersedes ADR-0018) | Psychopompe égyptien, guide entre mondes, gardien des secrets |

**INFRASTRUCTURE** n'est pas un Neter — c'est le placeholder pour le sous-système Console/Admin et tout ce qui est méta-config. Intentionnel.

**NEFER** non plus n'est PAS un Neter (ne figure pas dans `BRAINS` const). C'est l'**opérateur expert** (humain ou agent IA) qui sert les **7 Neteru actifs**, exécute leurs Intents, range le vault, et garantit la cohérence. Activation auto via [CLAUDE.md](../../CLAUDE.md) en tête. Identité complète + protocole 8 phases : [NEFER.md](NEFER.md).

---

## 2. Pour chaque Neter — fonction, contribution mesurable, drift signal

Chaque Neter est documenté ici selon trois axes obligatoires. Test CI `audit-pantheon-completeness.ts` vérifie que les trois sections existent pour les 7.

### 2.1 — MESTOR (Guidance)

**Fonction** : Computer de guidage. Reçoit chaque Intent du système, évalue les pré-conditions ([Pilier 4 FRAMEWORK](FRAMEWORK.md)), délibère sur le plan, dispatche aux services downstream. Seul point d'entrée — `mestor.emitIntent()` est l'API canonique de toute mutation métier.

**Contribution mesurable à la mission** :
- Refus précoce d'Intents qui auraient produit des assets ou décisions stériles (compté en `IntentEmission.status = VETOED`).
- Sélection du chemin Glory→Brief→Forge optimal en fonction du palier brand cible (différentes séquences pour pousser de FRAGILE→ORDINAIRE vs FORTE→CULTE).
- Maintien du principe : zéro mutation hors `emitIntent()`. Mesure : `audit-governance.ts` finding count = 0.

**Drift signal** : si `IntentEmission` croît sans que `Strategy.cultIndex` ou `pillar.completionLevel` ne progresse → Mestor dispatche dans le vide. Cron hebdo `audit-mestor-yield.ts` flagge si ratio `intentions/résultats` < seuil.

**Comportement par manipulation mode** :
- *peddler* — sélectionne séquences courtes, drops, urgence
- *dealer* — séquences récurrentes, hooks compulsifs (drops réguliers)
- *facilitator* — séquences éducatives, démonstration, tutoriels
- *entertainer* — séquences narratives, fiction de marque, world-building

### 2.2 — ARTEMIS (Propulsion — phase brief)

**Fonction** : Thrust controller. Allume les thrusters Glory tools dans le bon ordre, séquence les manœuvres orchestrées (Glory sequences). **Produit les briefs et assets rédactionnels** — output texte structuré (concept, copy, script, brand-bible, naming, kv-prompt). Quand un brief contient un `forgeSpec`, il est handoff à Ptah.

**Contribution mesurable à la mission** :
- Briefs qui débouchent sur des assets matérialisés (`GenerativeTask.sourceIntentId` chaîné à un `INVOKE_GLORY_TOOL`) — taux de matérialisation effectif vs taux de briefs sans aval.
- Score qualité des briefs (mesuré par Seshat post-déploiement : engagement de l'asset matérialisé issu du brief).

**Drift signal** : briefs qui n'aboutissent jamais à un asset (orphelins) — gaspillage LLM. Cron `audit-orphan-briefs.ts` flagge si > 15% briefs sans matérialisation downstream.

**Comportement par manipulation mode** :
- *peddler* — prompts brefs, CTA explicites, urgence textuelle ("act now", "limited")
- *dealer* — prompts à hooks récurrents, structure répétitive addictive
- *facilitator* — prompts informatifs, structurés, valeur d'usage
- *entertainer* — prompts narratifs, esthétiques, worldbuilding

### 2.3 — SESHAT (Telemetry)

**Fonction** : Processeur de télémétrie central. Indexe (BrandContextNode), répond aux requêtes (ranker), capte les signaux faibles via sa sous-fonction **Tarsis** (`seshat/tarsis/`). Mesure l'impact réel des actions sur l'audience.

**Contribution mesurable à la mission** :
- `cultIndexDelta` mesuré par asset déployé — signal direct de superfan accumulation.
- `overtonDeflection` calculé via `sector-intelligence.computeBrandDeflection` — signal direct de déplacement Overton.
- Détection des concurrents qui imitent le narratif (alimente Sentinel `DEFEND_OVERTON`).

**Drift signal** : si Seshat n'observe rien (pas d'intégration `ASSET_FORGED` → cron tracking), le système est aveugle. Cron `audit-seshat-coverage.ts` vérifie que chaque AssetVersion déployée a un `cultIndexDeltaObserved` calculé sous 30 jours.

**Comportement par manipulation mode** :
- Tarsis classifie les signaux entrants par mode (engagement court vs long terme).
- Pour *peddler* / *dealer* : track conversion rapide (heures/jours), churn ; for *facilitator* / *entertainer* : track engagement durable (semaines/mois), partage organique, citation.

### 2.4 — THOT (Sustainment + Operations)

**Fonction** : Fuel manager. Connaît le propellant restant par operator/brand, alerte avant flame-out. `CHECK_CAPACITY` pre-flight de chaque Intent coûteux. Veto/downgrade des Intents qui mettraient la mission en faillite. Étend naturellement vers Operations Ground Tier (commission-engine, contracts, escrow, mobile-money) — finances Mission et Operations sont la même mécanique.

**Contribution mesurable à la mission** :
- `cost_per_superfan_recruited` agrégé par Strategy — KPI primaire d'efficacité.
- Tables ROI par manipulation mode dans `financial-brain/manipulation-roi-tables.ts` — calibre le seuil de veto par mode.
- Cash positive UPgraders — sans Operations, l'OS s'arrête en 2 mois indépendamment de la qualité des missions ([APOGEE.md §4 Pourquoi ce découpage](APOGEE.md)).

**Drift signal** : si `cost_per_superfan_recruited` croît sans que `cultIndex` ne suive → Thot vetoe trop tard. Cron `audit-thot-roi.ts` flagge.

**Comportement par manipulation mode** :
- *peddler* / *dealer* : seuil ROI agressif (court terme), veto rapide si pas de conversion observée sous J+7.
- *facilitator* / *entertainer* : seuil ROI patient (long terme), tolère J+30 voire J+60 sans veto.

### 2.5 — PTAH (Propulsion — phase forge)

**Fonction** : Forge master. Matérialise les briefs Artemis en assets concrets (image, vidéo, audio, icône, design layered, asset stock ingéré, asset refiné/transformé/classifié) via providers externes (Magnific, Adobe Firefly, Figma, Canva). **Tous les assets matériels** de l'OS passent par Ptah — point unique de matérialisation.

**Contribution mesurable à la mission** :
- `expectedSuperfans` (bayesien pre-flight) vs `realisedSuperfans` (post-déploiement Seshat) — précision de la prédiction.
- `pillarSource` obligatoire sur chaque `GenerativeTask` — chaque asset traçable à un pillar A/D/V/E/R/T/I/S qui le justifie. Mesure : 100% des tasks ont un pillarSource (sinon refus à création).
- Sentinel `PTAH_REGENERATE_FADING_ASSET` (Phase H) — maintient la masse en orbite ([APOGEE.md §13 Loi 4](APOGEE.md)).

**Drift signal** : assets sans pillarSource (refus à création par la précondition) — drift = 0 cas par construction. Mais drift secondaire : assets dont `realisedSuperfans` < 10% de `expectedSuperfans` — Ptah hallucine son potentiel. Cron `audit-ptah-precision.ts`.

**Comportement par manipulation mode** :
- *peddler* — visuels CTA-first, scarcity cues, prix proéminent
- *dealer* — visuels addictifs, micro-narratives répétables (drops series), patterns de retour
- *facilitator* — visuels démonstratifs, tutoriels, infographies
- *entertainer* — visuels esthétiques, story-rich, world-building, characters

### 2.6 — IMHOTEP (Crew Programs) — **actif Phase 14**

**Fonction** : Master of Crew. Décide qui peut embarquer sur quelle mission (matching), quel niveau de talent est suffisant (tier-evaluator), quelle formation manque (académie). Le seul Neter humain divinisé — pertinent pour le sous-système qui gère des humains.

**Architecture** : Imhotep est un **orchestrateur** qui wrappe les services satellites existants (matching-engine, talent-engine, team-allocator, tier-evaluator, qc-router) sous gouvernance unifiée Mestor → Imhotep → satellite. **0 nouveau model Prisma** (anti-doublon NEFER §3) — réutilise TalentProfile, Course, TalentCertification, TalentReview, Mission existants.

**Capabilities Phase 14** : `draftCrewProgram`, `matchTalentToMission`, `assembleCrew`, `evaluateTier`, `enrollFormation`, `certifyTalent`, `qcDeliverable`, `recommendFormation`. Service : `src/server/services/imhotep/`. Page hub : `/console/imhotep/page.tsx`.

**Contribution mesurable à la mission** :
- `Creator.devotionFootprint` — historique de superfans recrutés par creator dans chaque secteur. Le matching prioritise le devotion footprint, pas seulement la compétence brute.
- Taux de complétion mission par équipe assemblée — un mauvais matching tue la mission même si chaque humain est compétent individuellement.

**Drift signal** : si les missions échouent (`status = FAILED` mais sans veto Thot), souvent c'est un matching humain défaillant. Cron `audit-crew-fit.ts` corrèle `mission.outcome` avec `team.composition`.

**Comportement par manipulation mode** :
- *peddler* — prioritise creators à conversion rapide (sales-DNA)
- *dealer* — prioritise creators avec récurrence (drops-DNA)
- *facilitator* — prioritise creators éducateurs / formateurs
- *entertainer* — prioritise creators narratifs / artistes

### 2.7 — ANUBIS (Comms) — **actif Phase 15, étendu Phase 16**

**Fonction** : Psychopompe — guide les messages entre les ponts (Console/Cockpit/Agency/Creator/Launchpad) et vers le monde extérieur (ad networks, social, email/SMS, MCP servers tiers). Préside à l'embaumement → préservation/transmission de l'historique de communication. Phase 16 ajoute la couche temps-réel (notifications live SSE + Web Push) et la couche MCP bidirectionnelle (sortant pour clients externes type Claude Desktop, entrant pour consommer Slack/Notion/Drive/Calendar/Figma/GitHub).

**Architecture** : Anubis est un **orchestrateur** qui wrappe les services satellites comms existants (email, advertis-connectors, oauth-integrations) + introduit le **Credentials Vault** (ADR-0021) pour gérer les API keys externes via UI back-office au lieu de variables d'env. Provider façades feature-flagged retournent `DEFERRED_AWAITING_CREDENTIALS` si pas de creds — code ship-able sans clés. Phase 16 (ADR-0023 + ADR-0024) ajoute deux couches transverses : MCP bidirectionnel et notification real-time.

**Capabilities Phase 15** (11) : `draftCommsPlan`, `broadcastMessage`, `buyAdInventory`, `segmentAudience`, `trackDelivery`, `registerCredential`, `revokeCredential`, `testChannel`, `scheduleBroadcast`, `cancelBroadcast`, `fetchDeliveryReport`.

**Capabilities Phase 16** (7 nouvelles, ADR-0023 + ADR-0024) : `pushNotification`, `registerPushSubscription`, `renderTemplate`, `runDigest`, `mcpInvokeTool`, `mcpSyncRegistry`, `mcpRegisterServer`.

Service : `src/server/services/anubis/`. Pages : `/console/anubis/` + `/console/anubis/credentials/` + `/console/anubis/notifications/` + `/console/anubis/mcp/`.

**4 models Prisma Phase 15** : `CommsPlan`, `BroadcastJob`, `EmailTemplate`, `SmsTemplate`.
**4 models Prisma Phase 16** : `PushSubscription`, `NotificationTemplate`, `McpRegistry`, `McpToolInvocation`. `Notification` étendu (`type`, `priority`, `metadata`, `entityType`, `entityId`, `operatorId`).
Réutilise `NotificationPreference`, `WebhookConfig`, `ExternalConnector` existants (anti-doublon NEFER §3).

**Contribution mesurable à la mission** :
- `cost_per_superfan_recruited` par campagne (ad networks) — KPI primaire, pas reach/CTR.
- Taux de propagation organique (forwards, partages, citations) post-broadcast.
- Détection de fuites Overton (diffusion non alignée au mode stratégique → Mestor reçoit signal de drift).

**Drift signal** : campagnes Anubis qui consomment du budget Thot mais ne convertissent pas en devotion ladder up-step. Cron `audit-anubis-conversion.ts`.

**Comportement par manipulation mode** :
- *peddler* — paid search, retargeting, urgence
- *dealer* — push notifs récurrentes, séries d'emails, drops timing
- *facilitator* — newsletters utiles, content syndication, guides
- *entertainer* — earned media, viral plays, brand storytelling

---

## 3. Frontières (qui fait quoi vs qui ne fait pas)

| Action | Neter responsable | Neter qui ne le fait PAS |
|---|---|---|
| Décider quel Intent émettre | Mestor | (tous les autres délèguent à Mestor) |
| Produire un brief texte | Artemis (via Glory tools) | Ptah, Mestor, Seshat |
| Matérialiser un asset visuel/audio/vidéo | Ptah | Artemis (qui produit le brief, pas l'asset) |
| Observer l'engagement de l'asset post-déploiement | Seshat | Ptah ne mesure pas son propre output |
| Veto budget | Thot | Mestor ne décide pas du budget |
| Apparier humain à mission | Imhotep | Mestor décide *quelle* mission, pas *qui* |
| Diffuser un message vers l'audience | Anubis | Ptah forge l'asset, Anubis le diffuse |
| Créer un compte / config méta | INFRASTRUCTURE | (intentionnellement pas un Neter) |

---

## 4. Dépendances mutuelles

```
Mestor ──┬─► Artemis ──► Ptah ──► (asset URL)
         │                          │
         │                          ▼
         │                    Anubis ──► (audience reached)
         │                          │
         │                          ▼
         │                    Seshat ◄─── observation flux
         │                          │
         ▼                          ▼
       Thot ◄──── tous les Neter notifient leurs coûts
         │
         ▼
       Imhotep ──── matching humain pour exécution mission
```

- **Mestor** dépend de tous (dispatcher) et est dépendance de tous (point d'entrée).
- **Artemis** dépend de Mestor (input) ; Ptah / Anubis sont ses downstream.
- **Ptah** dépend d'Artemis (brief input) et de Thot (budget pre-flight).
- **Seshat** est dépendance asynchrone de tous (capte les events emis).
- **Thot** veto sur tous.
- **Imhotep** dépend de Seshat (signal sur creators) et alimente Mestor (matching propose composition).
- **Anubis** dépend de Ptah (asset), Thot (budget ad), Mestor (autorisation broadcast).

---

## 4-bis. ⚠️ Phase 13 sortie partielle — **Superseded par Phase 14 + 15** (mai 2026)

> **Note historique conservée pour traçabilité.** Le scope partial Oracle-only de Phase 13 (ADRs 0017/0018) n'avait pas été demandé par l'opérateur (drift Phase 8 NEFER détecté). Phase 14 (Imhotep) + Phase 15 (Anubis) supersèdent cette sortie partielle par une activation full des deux Neteru, comme initialement prévu par ADR-0010 + ADR-0011.

**Cap 7 atteint** : 7/7 Neteru actifs. Imhotep + Anubis désormais inscrits dans le registry (Capability declared via manifest), avec services orchestrateurs complets, Glory tools, Intent kinds, pages UI, et — pour Anubis — pattern Credentials Vault (ADR-0021) qui résout le blocage credentials externes via UI back-office.

ADRs Phase 14/15 :
- [ADR-0019](adr/0019-imhotep-full-activation.md) — Imhotep full activation (supersedes ADR-0017)
- [ADR-0020](adr/0020-anubis-full-activation.md) — Anubis full activation (supersedes ADR-0018)
- [ADR-0021](adr/0021-external-credentials-vault.md) — External Credentials Vault pattern

ADRs Phase 13 historiques (Superseded) :
- [ADR-0017](adr/0017-imhotep-partial-pre-reserve-oracle-only.md) — Superseded by ADR-0019
- [ADR-0018](adr/0018-anubis-partial-pre-reserve-oracle-only.md) — Superseded by ADR-0020

---

## 5. Évolution du panthéon

Ajouter un 8ème Neter exige un **ADR de relèvement de plafond** ([APOGEE.md §9](APOGEE.md)) et un argument que :
- Les 7 existants ne couvrent pas la fonction
- La fonction nouvelle est de gouvernance, pas opérationnelle
- La mythologie est cohérente
- Le naming ne crée pas de confusion

Sinon, la fonction nouvelle doit s'absorber dans un Neter existant via extension de capabilities.

Retirer un Neter exige aussi un ADR + dépréciation cycle (voir [REFACTOR-CODE-OF-CONDUCT.md](REFACTOR-CODE-OF-CONDUCT.md)).

---

## 6. Anti-drift

Sources de vérité synchronisées :
- `BRAINS` const ([src/server/governance/manifest.ts:23-29](../../src/server/governance/manifest.ts)) — liste runtime
- `Governor` type (src/domain/index.ts) — liste compile-time
- `LEXICON.md` entrée NETERU — liste narrative
- `APOGEE.md` §4 — mapping sous-systèmes
- Ce document `PANTHEON.md` — récit complet
- `CLAUDE.md` §Governance — résumé project memory
- `MEMORY.md` user — résumé personal memory

Test CI `tests/governance/neteru-coherence.test.ts` vérifie que les 7 noms apparaissent dans les 7 sources, exactement une fois (hors ADRs historiques). Échec = CI red, merge bloqué.

---

## Lectures associées

- [APOGEE.md](APOGEE.md) — framework de pilotage
- [LEXICON.md](LEXICON.md) — glossaire
- [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md) — paramètre transverse d'engagement
- [adr/0001-framework-name-apogee.md](adr/0001-framework-name-apogee.md) — bascule MAAT → APOGEE
- [adr/0009-neter-ptah-forge.md](adr/0009-neter-ptah-forge.md) — introduction Ptah
- [adr/0010-neter-imhotep-crew.md](adr/0010-neter-imhotep-crew.md) — pré-réservation Imhotep
- [adr/0011-neter-anubis-comms.md](adr/0011-neter-anubis-comms.md) — pré-réservation Anubis
