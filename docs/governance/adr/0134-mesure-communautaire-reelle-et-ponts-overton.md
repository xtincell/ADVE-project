# ADR-0134 — Mesure communautaire réelle et ponts Overton (le circuit de mesure branché sur la donnée collectée)

- **Status** : Accepted
- **Date** : 2026-07-13
- **Phase** : vague de remédiation de l'audit [BRIEF-ORACLE-SCORING-PIVOT-AUDIT-2026-07-13](../../audits/BRIEF-ORACLE-SCORING-PIVOT-AUDIT-2026-07-13.md) (mandat opérateur carte blanche : « l'important c'est l'intention » — suivre superfans × Overton sur la base des vraies interactions collectées)
- **Depends on** : ADR-0124 (spine d'émission), ADR-0126 (scale-aware + pattern d'annotation `preUnitsFix`), ADR-0127 (Overton par polity), ADR-0128/0133 (collecte sociale réelle), ADR-0046 (no-magic-fallback), ADR-0060 (manual-first), ADR-0091 (composers déterministes Oracle)
- **Supersedes** : —

## Contexte

L'audit 2026-07-13 a établi que les **mécaniques pivot de la mission** (superfans × Overton — MISSION.md) tournaient sur du manuel/seed/vide pendant que le système collecte **quotidiennement** de la vraie donnée sociale (cron `social-sync` : `FollowerSnapshot`, `SocialPost` + engagement, `SocialInboxItem` avec identités d'auteurs, `Signal COMMERCE_METRICS` ; cron `external-feeds` : digests RSS réels) :

- `CommunitySnapshot` n'avait **aucun écrivain de production** (seeds uniquement) → `communityCohesion` (15 % du cult index) structurellement vide (T8) ;
- la devotion ladder dérivait exclusivement de `SuperfanProfile` saisis à la main + boosts internes — **aucune entrée sociale réelle**, et son moteur n'avait **aucun déclencheur de production** (T17) ;
- les `SuperfanProfile` eux-mêmes n'étaient jamais actualisés par les interactions réelles, et aucun mécanisme ne détectait les fans récurrents de l'inbox ;
- deux ponts Overton étaient **codés + testés mais jamais appelés** : `bridgeTarsisToSectorIntelligence` (RSS→axe sectoriel, T10) et `buildOvertonRealSignalForOracle` (mesures→Oracle §34, T1) — la table `Sector` n'ayant par ailleurs aucun writer ;
- la cascade de staleness Oracle ne couvrait pas les écritures pilier bare (T4/T5 — annexe).

## Décision

### 1. Unités canoniques `CommunitySnapshot` + relaxation additive

`size` = compte absolu · `health`/`sentiment`/`activeRate` = **fractions 0-1** · `velocity` = fraction de croissance ~30 j (négative possible). Migration `20260713100000_adr0134_community_snapshot_measured` : les 4 taux deviennent **nullables** (`null` = non mesuré — P22-2, jamais un 0 fabriqué) + colonne provenance `source` (`MANUAL` | `CONNECTOR`, null = historique). Les seeds (déjà en fractions) restent valides ; le seul lecteur incohérent (devotion-engine, lecture `/100` pourcentage — bug d'unités T16) est corrigé.

### 2. Écrivain de production + Intent `SESHAT_CAPTURE_COMMUNITY_SNAPSHOT`

`cult-index-engine/community-snapshot-writer.ts` (extension du service qui possède REQ-4 — pas un nouveau module) : pure `composeCommunitySnapshotRow` + I/O `captureCommunitySnapshots`. Par plateforme suivie (dernier `FollowerSnapshot` ≤ 90 j = base ; **pas de base → pas de row**) :

- `size` = dernier relevé followers ;
- `velocity` = croissance vs relevé de référence le plus proche de J-30 dans [J-45, J-7] (null sans référence, clamp ≥ -1) ;
- `health` = moyenne des `SocialPost.engagementRate` mesurés ≤ 30 j (null si aucun post mesuré) ;
- `activeRate` = auteurs uniques `SocialInboxItem` ≤ 30 j / followers — **null hors couverture inbox v1** (FACEBOOK/INSTAGRAM seulement, ADR-0133) ; 0 auteur sur plateforme scannée = mesure réelle ;
- `sentiment` = **null toujours en v1** (aucune source ne mesure le sentiment — les champs existent sans écrivain).

Nouveau kind **`SESHAT_CAPTURE_COMMUNITY_SNAPSHOT`** (governor SESHAT, sync, SLO 15 s / 0 $, catalogué + union + case commandant). Le handler enchaîne la **chaîne de mesure quotidienne** : community → `devotion-engine.calculateAndSnapshot(strategyId, "social-sync")` → `cult-index-engine.calculateAndSnapshot(strategyId)` — **uniquement sur mesure LIVE** (une marque sans base sociale garde son comportement historique : aucun snapshot fabriqué). Cela donne au moteur devotion son premier déclencheur de production (T17). Émission par le cron `social-sync` quotidien via `emitIntentTyped` (`caller: "cron:social-sync:community"`) — jamais un appel service direct (spine ADR-0124, parité avec `runDuePublications`).

Lecteurs alignés : cult `communityCohesion` = moyenne des `health` **mesurés** sur fenêtre bornée ≤ 90 j / 12 relevés (une moyenne all-time se figerait avec un écrivain quotidien) et **sort du dénominateur** (`unavailable`, mécanisme ADR-0126) quand rien n'est mesuré ; `community-dashboard` types → `number | null` + panel masque les métriques null (libellé « Engagement moyen » pour `health` — c'est ce que la mesure EST).

### 3. `ugcGenerationRate` : exclusion MAINTENUE (§B2)

Décision négative explicite : les mentions ne sont **jamais** remplies par le connecteur (`FollowerSnapshot.mentionsCount` = saisie console ; inbox v1 = COMMENT only) et toute normalisation count→0-100 serait une **constante inventée** (pattern Phase 23 : seuils calibrés à sign-off direction). La dimension reste exclue du composite (renormalisation ADR-0126). Dérivation future tracée RESIDUAL-DEBT §Audit 2026-07-13 : inbox v2 `kind="MENTION"` + mentions connecteur + constante validée direction.

### 4. Devotion ladder sur audience réelle (§B3)

`devotion-engine.calculateDevotion` intègre la **base d'audience mesurée** quand elle existe : `totalFollowers` (Σ dernier relevé par plateforme ≤ 90 j) et `inboxParticipants30d` (auteurs uniques). `spectateur` = followers − rungs supérieurs ; `participant` = max(compte actuel, commentateurs réels) ; distribution en **pourcentages à 2 décimales** (l'arrondi entier écrasait 90/45 000 = 0,2 % à 0 — perte de signal). **Garde plancher** : aucune base mesurée → comportement legacy STRICTEMENT inchangé. Le boost `CommunitySnapshot` historique (bug d'unités) est supprimé, remplacé par les participants inbox réels.

**Loi 1 (conservation d'altitude)** : l'intégration de la base réelle DILUE mécaniquement les pourcentages hauts (3 superfans sur 45 000 followers ≈ 0,01 % — c'est la densité de dévotion honnête, pas une régression du travail accompli). Pattern d'annotation ADR-0126 reconduit : constante `DEVOTION_AUDIENCE_BASE_DATE` exportée + flag `preAudienceBase` sur le trend — l'historique reste immuable et comparable à référentiel connu. Conséquence assumée : le cult `engagementDepth` chute vers sa valeur honnête ; le plafond d'évidence CULTE/ICONE n'est PAS touché (sa direction est anti-inflation — un cult composite plus honnête RESSERRE l'évidence). Provenance : `DevotionSnapshot.trigger = "social-sync"`.

### 5. Superfans réels depuis l'inbox (§B4)

`seshat/superfan-ingest.ts` devient **LE single-writer** de `SuperfanProfile` (le corps d'upsert déménage du router vers ce service ; le test HARD single-writer suit — un seul fichier writer, deux portes gouvernées du même kind : tRPC `superfan.register` + case commandant pour le cron).

- `aggregateInboxAuthors` : agrégation déterministe par auteur (clé `authorHandle ?? authorExternalId` — asymétrie FB/IG), fenêtre 90 j : interactions, jours actifs distincts, récence.
- `computeInboxEngagementDepth` : formule déterministe documentée — 0.25 (commenter = PARTICIPANT, canon devotion-ladder) + 0.02×min(interactions,10) + 0.10 si ≥3 jours actifs + 0.05 si actif ≤14 j, **CAP DUR 0.60** : la preuve « commentaires seuls » ne peut JAMAIS franchir le seuil superfan actif (0.65) — le bras d'évidence CULTE/ICONE reste inatteignable par simple footprint (anti-inflation ADR-0126 renforcé).
- `updateKnownSuperfansFromInbox` (étape cron) : **actualise les profils DÉJÀ nés uniquement** (matchs par (platform, handle)), sémantique jamais-dégrader (max sur depth/interactions/lastActiveAt), émission `SESHAT_REGISTER_SUPERFAN` `source:"SOCIAL"`. **AUCUNE création automatique.**
- **File de candidats** : query `superfan.candidates` (`operatorProcedure` — PII de tiers), agrégats − profils existants, seuil conservateur ≥ 3 interactions ET ≥ 2 jours actifs, calcul à la volée (zéro modèle). Panel « Fans détectés » sur le suivi communauté (visible opérateur uniquement) : **la naissance reste un geste humain** — 1 clic = intent gouverné.
- `registerSuperfanProfile` MERGE le `metadata` (l'upsert du router écrasait la provenance à chaque update — T18).

### 6. Registre `Sector` + caller du pont RSS→axe Overton (§B6)

`seshat/tarsis/sector-refresh.ts` (l'orchestrateur vit hors de `sector-intelligence/`, qui reste pur) :

- `ensureSectorRegistryRows` : provisionne les rows `Sector` de **REGISTRE** (slug/nom/pays) — la table n'avait AUCUN writer, donc le refresh connector répondait `SECTOR_NOT_FOUND` à vie. `culturalAxis`/`overtonState` restent null tant que rien n'est MESURÉ — aucune donnée culturelle inventée.
- `refreshSectorsFromRecentDigests` : digests `EXTERNAL_FEED_DIGEST` ≤ 48 h → secteurs distincts ; idempotence `ALREADY_FRESH` (`Sector.lastObservedAt` ≥ digest) ; pour chaque secteur, une stratégie porteuse de campagne → **`bridgeTarsisToSectorIntelligence`** (le caller manquant — T10) ; sans campagne → `fetchSectorSignal` + `refreshSectorOvertonFromConnector` directs (`via: "SECTOR_ONLY"`) ; états SKIPPED remontés tels quels (P22-1).
- Ancrage : cron `external-feeds` après `refreshAllPriorityPairs()`. Pas de nouveau kind (précédent accepté Phase 23 : chemin d'ingestion canonique écrit `Sector` directement ; le cron est une étape de collecte, pas une mutation métier nouvelle).

### 7. Signal Overton réel dans l'Oracle §34 (§B7)

`composeOverton` (composer déterministe) devient async et appelle `buildOvertonRealSignalForOracle` (import lazy anti-cycle, try/catch → omission honnête). Garde writeback : section sans axes déclarés ET signal non-OK → `{}` (EmptyState inchangé, pas de BrandAsset fabriqué). Le composer servant les deux chemins (génération + read-time), un seul point d'injection suffit ; l'UI rendait déjà `realSignal` (branche morte T1 réactivée).

### Annexe — cascade staleness Oracle (T4/T5, shippée vague V1)

`markAllSectionsStale` déplacé dans `writePillar` (chemin commun post-commit — les callers bare C1/C2/ai-filler n'invalidaient jamais l'Oracle) ; doublon retiré de `writePillarAndScore` ; variante ciblée `markSectionsStale` (code mort) déposée ; évasion par alias (`writePillarRTIS`) fermée au test HARD `no-bare-writepillar` (verrou anti-renommage).

## Conséquences

- **La chaîne de mesure des deux mécaniques pivot est branchée sur le réel** : followers/posts/commentaires collectés → CommunitySnapshot mesurés → devotion sur audience réelle → cult index avec cohésion mesurée → plafond d'évidence nourri par des profils actualisés ; RSS réel → axe sectoriel Overton → radar founder + Oracle §34.
- **Aucune donnée inventée nulle part** : null/exclusion/INSUFFICIENT_DATA à chaque absence de mesure ; naissance des superfans = geste humain ; sentiment = null tant que sans source ; axes culturels jamais fabriqués.
- 1 migration additive/relaxante, 1 nouveau kind (+ union + SLO + case), 0 nouveau modèle Prisma, 0 nouveau Neter (cap 7/7 — tout sous SESHAT, collecte ANUBIS inchangée), 0 LLM sur tout le périmètre (LOI 9).
- Scores : dilution honnête documentée (§4) — annotation `DEVOTION_AUDIENCE_BASE_DATE` + `preAudienceBase`, pattern ADR-0126.
- Tests anti-drift : `community-snapshot-writer.test.ts` (formules pures), `community-measure-chain.test.ts` (kind/SLO/case/cron/single-writer d'écriture CommunitySnapshot), `devotion-real-audience.test.ts` (parité legacy + dilution + annotation), `superfan-ingest.test.ts` (cap 0.60, jamais-dégrader, aucune création auto), `tarsis-sector-bridge-wiring.test.ts` (caller du pont + registre sans invention), `overton-real-signal-wired.test.ts` (§34), `oracle-staleness-cascade.test.ts` (annexe).
- Résidus tracés RESIDUAL-DEBT §Audit 2026-07-13 : dérivation `devotionTransitionsObserved` (labels d'attribution — JAMAIS fabriqués), granularité Overton par polity, `ugcGenerationRate`, Signal TARSIS writer, dispatch COMPOSE_DELIVERABLE, refresh auto STALE.
