# ADR-0036 — AD/OPS Art Direction Operations Glory tools

**Status** : Accepted
**Date** : 2026-05-04
**Supersedes** : —
**Related** : ADR-0028 (Glory tools as primary API surface), ADR-0009 (Ptah forge), ADR-0012 (BrandVault SuperAssets)

## Contexte

Un prototype HTML standalone — `adops_console.html` — a circulé interne sous le titre **AD/OPS — Art Direction Operations Console** (Xtincell · Atelier instrumental). C'est un poste de pilotage 6 modules pour DA seniors organisé autour d'une seule query :

1. **Expand** — champ sémantique 5D (mouvements, artistes, matériaux, époques, adjacents)
2. **Cross** — hybridation conceptuelle A × B (brief + 3 tensions)
3. **Launch** — lanceur multi-plateformes (Pinterest, Behance, Are.na, Cosmos, Fonts In Use, ZCOOL CN, pixiv JP, Nataal AF, etc. — 9 catégories)
4. **Decode** — grille d'analyse formelle 8 axes (composition, palette, typo, lumière/matière, posture humaine, mouvement référencé, narrative, distinctiveness)
5. **Defend** — speech défensif 6 sections (pari → ancrage stratégique → audience → références → distinctiveness → closing)
6. **Vault** — capture documentaire structurée (titre, source, tags, why-it-matters)

Le prototype tourne 100% côté client (localStorage, pas de backend). L'enjeu : internaliser ces 6 capabilités dans la cascade Glory→Brief→Forge afin que les outputs nourrissent directement le vault des marques (BrandAsset.kind=REFERENCE) et les briefs Artemis en amont des productions T2.

## Décision

**Internaliser les 6 modules en Glory tools Artemis** (file `adops-tools.ts`) + 1 séquence orchestrée `ADOPS-AD-DIRECTION` (file `adops-sequences.ts`), exposés via `EXTENDED_GLORY_TOOLS` only.

### Cardinalité préservée

Les 6 outils sont ajoutés à `EXTENDED_GLORY_TOOLS` **et pas à `CORE_GLORY_TOOLS`** — préserve la cardinalité 57 du test legacy `tests/unit/services/glory-tools.test.ts` qui enforce le compte canonique. Même pattern que Higgsfield (ADR-0028).

### Mapping module HTML → Glory tool

| Module HTML | Glory tool slug | Layer | Execution | Pillar | Forge ? |
|---|---|---|---|---|---|
| Expand | `adops-expand-semantic-field` | DC | LLM | D | non (brief amont) |
| Cross | `adops-cross-pollinate-concepts` | DC | LLM | D | non (brief amont) |
| Launch | `adops-launch-research-vector` | HYBRID | COMPOSE | D | non (recherche) |
| Decode | `adops-decode-reference-grid` | DC | LLM | D | non (analyse) |
| Defend | `adops-defend-creative-direction` | DC | LLM | D + V | non (speech) |
| Vault | `adops-vault-capture` | HYBRID | COMPOSE | D | non — promu en BrandAsset.kind=REFERENCE par mestor.emitIntent |

### Pas de cascade brief-to-forge automatique

Aucun outil AD/OPS ne déclare `forgeOutput`. Ces tools produisent des artefacts **textuels et structurels** (champs sémantiques, grilles, speeches, captures) qui alimentent en amont la Direction Artistique avant qu'un KV / spot / packaging ne soit forgé par Ptah dans une séquence aval (KV, PACKAGING, OOH, etc.).

L'opérateur peut promouvoir une capture Vault en BrandAsset matériel via `mestor.emitIntent({ kind: "BRAND_ASSET_CREATE_REFERENCE", ... })`.

### Tier free

Pas de `requiresPaidTier: true` — ces outils tournent en LLM Gateway / pure COMPOSE sans connecteur externe payant. La séquence `ADOPS-AD-DIRECTION` peut être paywall-able au niveau séquence si le Cockpit business le décide ultérieurement.

### Pillar source : D (Distinction)

L'Art Direction est le bras armé de Distinction. `defend-creative-direction` ajoute V (Value) en secondaire car il articule explicitement la valeur défendue.

### Séquence ADOPS-AD-DIRECTION

Tier 1 (Identity), family STRATEGIC, requires PILLAR D maturity ENRICHED. Chaîne les 6 outils en flow Art Direction senior complet : Expand → Launch → Cross → Decode → Defend → Vault.

## Conséquences

### Positives

- **Réutilisabilité** : les capabilities AD/OPS deviennent invocables par toute séquence Artemis, pas seulement le module standalone.
- **Vault unifié** : les captures DA atterrissent dans `BrandAsset` et participent au scoring ADVE de la marque.
- **Lineage hash-chain** : chaque exécution AD/OPS est tracée (sourceIntentId, pillarSource, manipulationMode si applicable) via le sequence-executor.
- **Pas de drift NEFER** : la cardinalité du test legacy est préservée, pas de doublon avec un service existant (grep CODE-MAP négatif sur "art direction operations" / "adops").

### Négatives / risques

- **Coût LLM** : 4 outils LLM dans la séquence — Thot pre-flight `CHECK_CAPACITY` doit être respecté.
- **Pas de pré-condition formelle sur D maturity** côté outils unitaires (seule la séquence l'impose). Acceptable car les outils peuvent être invoqués en exploration libre sans pilier D enrichi.

### Migration

Aucune. Pas de breaking change, pas de changement de schema Prisma. Les 6 outils + 1 séquence sont strictement additifs sur `EXTENDED_GLORY_TOOLS` et `ALL_SEQUENCES`.

## Compliance APOGEE

- **Loi 1 — Conservation altitude** : pas de régression silencieuse, ajout pur.
- **Loi 2 — Séquencement étages** : ADOPS-AD-DIRECTION est tier 1 (Identity), s'enclenche après PILLAR D ENRICHED.
- **Loi 3 — Conservation carburant** : 4 LLM steps — Thot doit valider via `CHECK_CAPACITY`.
- **Pillar 1 (Identity)** : tous via mestor.emitIntent — la séquence est invoquée par l'executor existant.
- **Pillar 2 (Capability)** : déclarés dans le registry avec governor implicite Artemis.
- **Pillar 4 (Pre-conditions)** : `requires` PILLAR D ENRICHED imposé sur la séquence.
- **Mission contribution** : `CHAIN_VIA:artemis` — l'Art Direction senior alimente Distinction → superfans accumulés via reconnaissance immédiate des codes culturels (cf. MISSION.md §4).
