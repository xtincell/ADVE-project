# ADR-0094 — BrandAction : base d'actions canonique requêtable (projection des initiatives du pilier I)

**Status** : Accepted (implemented v6.25.28 — Slice A backbone)
**Date** : 2026-06-13
**Phase** : 24 (Core Engine — action database)
**Depends on** : ADR-0088 (relational backbone : ids uuid + FK lineage, S calculé, recos function-calling), ADR-0093 (Thot atomized action-costing), ADR-0060 (manual-first parity), ADR-0023 (ADVE éditable / RTIS dérivé)
**Branch** : `claude/vigilant-goldberg-clv7y4`

## Contexte

Audit NEFER 2026-06-13 (mandat opérateur « le système d'action ne fonctionne toujours pas autour d'une base de données ; les actions consultées dans le pilier I sont hétérogènes »).

Diagnostic — les « actions » du pilier I existaient en **5+ formes sur 4 substrats**, et l'UI/Oracle lisaient le **blob JSON `Pillar.content "i"`** (`catalogueParCanal`, `actionsByDevotionLevel`, `actionsByOvertonPhase`, `innovationsProduit`) **+ fabriquaient des défauts** (`defaultCatalogueParCanal`) quand le blob était vide :

- Le modèle Prisma `BrandAction` (les fondations) existait depuis ADR-0088 mais était **orphelin** : 4 call-sites, **aucun routeur tRPC ni composant UI ne le lisait** (`create` best-effort try/catch avalé dans l'extracteur, `findFirst` idempotence, `findMany` pour SYNTHESIZE_S, `update` costing). Table write-mostly.
- **Budget quadri-typé** : `budgetEstime` qualitatif (LOW/MED/HIGH) vs `budget` numérique vs `BrandAction.budgetMin/Max` vs `ActionCostEstimate.totalTtc`.
- **Coût V14 (ADR-0093) jamais auto-câblé** : rien ne mappait une action I (`format`/`touchpoint` texte libre) vers un `ActionCostTemplate.actionKey`.
- ADR-0088 avait déjà construit `collectNormalizedInitiatives()` — le normaliseur pur qui aplatit les 3 collections en **un seul format** `NormalizedInitiative` (id stable, dédup) — mais il n'était pas consommé partout.

Audit anti-doublon (NEFER interdit #1, grep CODE-MAP) : `BrandAction` (33 champs) existe ; `collectNormalizedInitiatives` existe ; le catalogue de coût `ACTION_COST_CATALOG` (12 archétypes) existe. **Donc : étendre/brancher en place, ne pas dupliquer.**

## Décision

`BrandAction` devient la **projection lecture canonique, homogène et requêtable** des initiatives du pilier I. Le blob reste le **substrat d'écriture + cascade** (ADR-0088, intact) — `BrandAction` n'est jamais une SSOT inverse, c'est une matérialisation déterministe du blob.

### 1. Backbone DB (migration additive)

`BrandAction` (`20260613140000_phase24_brandaction_strategy_relation`) :
- `strategy Strategy @relation(onDelete: Cascade)` — purge en cascade avec la marque (la table était sans FK).
- `sourceInitiativeId String?` + `@@unique([strategyId, sourceInitiativeId])` — **clé de matérialisation**. NULLs distincts en Postgres → les lignes opérateur (sans initiative source) ne collisionnent jamais.

### 2. Materializer déterministe (zéro LLM)

`syncBrandActionsFromBlob(strategyId)` (`artemis/action-db/materializer.ts`) :
- lit `collectNormalizedInitiatives(pillar.i)` (réutilise le normaliseur ADR-0088),
- **upsert** par `(strategyId, sourceInitiativeId)` — idempotent,
- mappe canal → touchpoint, infère AARRR, normalise le budget en numérique (le `budgetEstime` qualitatif → médiane via `BUDGET_ESTIME_FCFA` est déjà fait par `normalizeInitiative`),
- résout `costTemplateKey` via le resolver pur (§3) + `costZoneCode` depuis `Strategy.countryCode`,
- **réconcilie** : supprime les lignes `source = "MATERIALIZED"` dont l'initiative a disparu du blob. **Ne touche jamais** les lignes opérateur (`source !== "MATERIALIZED"`).

Câblé automatiquement dans le handler `GENERATE_I_ACTIONS` (gouverné) après la génération Notoria, et dans le seed.

### 3. Auto-câblage du coût (ADR-0093 ↔ I)

`resolveActionTemplateKey({ title, format, channel, touchpoint, objectif })` (`action-costing/resolve-template.ts`) : pur, déterministe, accent-insensible, règles ordonnées (spécifique → générique) → un des 12 `actionKey` du catalogue, ou `null` (pas d'estimation fabriquée). Test de parité verrouille chaque clé émise contre `CATALOG_BY_KEY`.

### 4. Surface de lecture

Routeur tRPC `actions` (`byStrategy` filtré, `summary` agrégé, `sync` refresh de projection). Reads purs ; `sync` est une reconstruction de projection idempotente (pas de mutation sémantique — analogue à `thot.calc.*`). Les **mutations métier** (ajouter/sélectionner une initiative) restent sur le blob via les payloads function-calling `ADD_INITIATIVE`/`SELECT_INITIATIVE` (ADR-0088), puis re-sync — **pas de bypass gouvernance**. Manual-first parity (ADR-0060) préservée : l'opérateur agit sur le blob, la projection suit.

## Conséquences

**Positives** : base d'actions **homogène et requêtable** (fin des 5 formes / 4 substrats au niveau lecture) ; coût V14 auto-résolu par action ; budget unifié numérique en lecture ; FK lineage + cascade purge ; cap APOGEE 7/7 préservé (sous-domaine Mestor, aucun nouveau Neter) ; aucun nouveau Intent kind (zéro churn registre/neteru-coherence).

**Négatives / résidus** :
- **Slice B (repoint lecture)** : le cockpit pilier I + Oracle §6/§10/§17 lisent encore le blob + `defaultCatalogueParCanal`. À repointer sur `actions.byStrategy` + retrait des défauts fabriqués (vide honnête). *Suit dans cette phase.*
- **Extracteur héritage** `i-action-extractor.ts` (reco-dérivé, heuristique, source `NOTORIA_GENERATED`, sans `sourceInitiativeId`) cohabite ; la lecture canonique cible `source = "MATERIALIZED"`. Dépréciation après repoint Slice B vérifié.
- `source = "MATERIALIZED"` est une valeur additive (le champ est un String libre, pas un enum DB).

## Anti-drift

- `tests/unit/services/resolve-action-template.test.ts` : parité resolver↔catalogue + mapping SPAWT + null sur indéterminable + accent-insensibilité.
- Invariant materializer : ne mute que les lignes `source = "MATERIALIZED"` (les lignes opérateur sont préservées).
