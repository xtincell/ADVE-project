# PANTHEON — Le Panthéon Neteru de La Fusée

> *Source unique de vérité narrative sur les Neteru. Toute mention de "trio", "quartet" ou de Neter inconnu doit être réconciliée ici.*

Ce document définit le **panthéon Neteru** — les 7 dieux qui gouvernent l'Industry OS. Il complète :
- [LEXICON.md](LEXICON.md) — vocabulaire normatif
- [APOGEE.md](APOGEE.md) — framework de pilotage de trajectoire
- [FRAMEWORK.md](FRAMEWORK.md) — 5 piliers techniques
- [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md) — paramètre transverse d'engagement audience

**Plafond canonique : 7 Neteru** ([APOGEE.md §9](APOGEE.md)). État actuel : **7 actifs** (Phase 7/8 wakeup mai 2026 — promotion Imhotep + Anubis de pré-réservés à actifs).

---

## 1. Les 7 Neteru

| # | Nom | Sous-système APOGEE | Statut | Mythologie |
|---|---|---|---|---|
| 1 | **MESTOR** | Guidance (Mission) | Actif | Conseiller mythologique grec ; figure de la délibération |
| 2 | **ARTEMIS** | Propulsion (Mission) | Actif | Déesse grecque de la chasse — vise et lance |
| 3 | **SESHAT** | Telemetry (Mission) | Actif | Déesse égyptienne de l'écriture, mesure, archives |
| 4 | **THOT** | Sustainment + Operations (Mission + Ground) | Actif | Dieu égyptien de la sagesse, calcul, balance |
| 5 | **PTAH** | Propulsion (Mission, downstream Artemis) | Actif (Phase 9 — ADR-0009) | Démiurge égyptien, créateur du monde par le verbe, patron des artisans |
| 6 | **IMHOTEP** | Crew Programs (Ground) | Actif (Phase 7+ — ADR-0010, mai 2026) | Sage humain égyptien déifié, architecte, scribe, médecin |
| 7 | **ANUBIS** | Comms (Ground) | Actif (Phase 8+ — ADR-0011, mai 2026) | Psychopompe égyptien, guide entre mondes, gardien des secrets |

**INFRASTRUCTURE** n'est pas un Neter — c'est le placeholder pour le sous-système Console/Admin et tout ce qui est méta-config. Intentionnel.

**NEFER** non plus n'est PAS un Neter (ne figure pas dans `BRAINS` const). C'est l'**opérateur expert** (humain ou agent IA) qui sert les Neteru, exécute leurs Intents, range le vault, et garantit la cohérence. Activation auto via [CLAUDE.md](../../CLAUDE.md) en tête. Identité complète + protocole 8 phases : [NEFER.md](NEFER.md).

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

### 2.6 — IMHOTEP (Crew Programs) — actif

**Fonction** *(activé Phase 7+ — mai 2026)* : Master of Crew. Décide qui peut embarquer sur quelle mission (matching), quel niveau de talent est suffisant (tier-evaluator), quelle formation manque (académie). Le seul Neter humain divinisé — pertinent pour le sous-système qui gère des humains. Service `src/server/services/imhotep/`. 5 intent kinds : `IMHOTEP_MATCH_CREATOR`, `IMHOTEP_COMPOSE_TEAM`, `IMHOTEP_EVALUATE_TIER`, `IMHOTEP_ROUTE_QC`, `IMHOTEP_RECOMMEND_TRAINING`. Téléologie : matching basé sur devotion-potential (footprint sectoriel + manipulation strengths), pas CV brut.

**Contribution mesurable à la mission** :
- `Creator.devotionFootprint` — historique de superfans recrutés par creator dans chaque secteur. Le matching prioritise le devotion footprint, pas seulement la compétence brute.
- Taux de complétion mission par équipe assemblée — un mauvais matching tue la mission même si chaque humain est compétent individuellement.

**Drift signal** : si les missions échouent (`status = FAILED` mais sans veto Thot), souvent c'est un matching humain défaillant. Cron `audit-crew-fit.ts` corrèle `mission.outcome` avec `team.composition`.

**Comportement par manipulation mode** :
- *peddler* — prioritise creators à conversion rapide (sales-DNA)
- *dealer* — prioritise creators avec récurrence (drops-DNA)
- *facilitator* — prioritise creators éducateurs / formateurs
- *entertainer* — prioritise creators narratifs / artistes

### 2.7 — ANUBIS (Comms) — actif

**Fonction** *(activé Phase 8+ — mai 2026)* : Psychopompe — guide les messages entre les ponts (Console/Cockpit/Agency/Creator/Launchpad) et vers le monde extérieur (ad networks, social, email/SMS). Préside à l'embaumement → préservation/transmission de l'historique de communication. Service `src/server/services/anubis/`. 5 intent kinds : `ANUBIS_DISPATCH_MESSAGE`, `ANUBIS_BROADCAST`, `ANUBIS_LAUNCH_AD_CAMPAIGN`, `ANUBIS_PUBLISH_SOCIAL`, `ANUBIS_SCHEDULE_DROP`. Téléologie : KPI primaire = `cost_per_superfan_recruited` (pas reach/CTR/CPM). Thot vetoe une campagne paid si projected cost > 2× benchmark sectoriel (gate `ANUBIS_COST_PER_SUPERFAN_OVER_BENCHMARK`).

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
