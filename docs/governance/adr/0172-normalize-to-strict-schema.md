# ADR-0172 — Normaliser vers le schéma strict (stratégie + primitives)

- **Status** : Accepted
- **Date** : 2026-07-22
- **Phase** : Chantier « La Fusée compile » — Lot 1 (prérequis Phase 3 ingestion), suite de l'audit d'intégrité ADVE
- **Depends on** : ADR-0171 (socle produit), audit ADVE 2026-07-22
- **Supersedes** : —

## Contexte

L'[audit d'intégrité ADVE](../../audits/ADVE-INTEGRITY-AUDIT-2026-07-22.md) a établi que la matière humaine
(canons, futurs brand books ingérés) **ne respecte pas** le schéma Zod strict : ids lisibles
(`risk-m19-001`) vs `z.string().uuid()`, enums accentués (`"Engagé"`) vs `ENGAGE`, prix en texte
(`"≈150 000 FCFA"`) vs `z.number()`, formes objet-vs-scalaire. Le seed écrit **sans gate Zod**, donc ces
divergences persistent et cassent le rendu (blanc) ou la validation stricte (mur d'erreurs).

**Décision opérateur (2026-07-22)** : entre *normaliser la donnée vers le schéma strict*, *assouplir les
schémas*, ou *hybride* → **normaliser vers le strict**. Le schéma reste la loi ; le canon et l'ingestion
s'y conforment.

## Décision

**Un normaliseur déterministe unique** (`src/domain/schema-normalizer.ts`, Layer-0 pur, zéro LLM, zéro
`Math.random`/`Date.now`) rapproche une valeur brute de sa forme stricte. Il sert **deux** usages : (a)
l'ingestion Phase 3 (données neuves), (b) la mise en conformité des canons existants — **une seule
mécanique, deux points d'application.**

### Primitives (ce lot)

- `coerceEnum(raw, allowed)` — accents/casse/séparateurs → membre canonique (« Engagé » → `ENGAGE`,
  « in-store » → `IN_STORE`) ; match exact sur clé normalisée puis préfixe non-ambigu ; null sinon.
- `stableUuid(seed)` / `normalizeId(id)` — id lisible → **UUID reproductible** (cyrb128 pur). Clé de la
  conformité : convertir un id ET ses références produit la **même** valeur → **les arêtes croisées
  restent cohérentes** après remap. `normalizeId` est idempotent (passe-plat sur un UUID existant).
- `coerceNumber(raw)` — « ≈150 000 FCFA » → 150000 ; conservateur (null si non-extractible).

### Applicateur (shippé)

- **`normalizeToSchema(content, zodSchema)`** (`schema-normalizer.ts`) : walk du schéma Zod, coercions par
  champ (enum fold, id lisible→UUID stable, numérique string→number), récursif objets/arrays/records. Ne
  fabrique jamais — valeur non-coercible laissée intacte. Réservé à l'**ingestion** (Phase 3, donnée neuve
  messy) ; pour le canon la normalisation leaf est classifiante seulement (persistance brute — cf. gate).

### Le gate anti-corruption + sa sémantique honnête (shippé)

Le canon et le schéma strict se sont révélés être **deux modèles de données** (~450 divergences/canon,
non « des douzaines »). Les forcer TOUTES à zéro exigerait soit d'assouplir le schéma (écarté), soit
d'**inventer du contenu** (interdit n°3 — placeholders « à calibrer »→number, bios non publiques, champs
manquants). Le gate (`pillar-conformance.ts`) distingue donc ce qui **casse le rendu** (à refuser) de
l'état DRAFT légitime (à tolérer, visiblement) :

- **SHAPE (HARD-FAIL)** : un objet/tableau attendu là où on reçoit un scalaire (ou l'inverse). Le renderer
  fait `.map()`/`.champ` → écran blanc. Reshapeable sans fabriquer. **Refusé** (throw au seed).
- **ENUM / TYPE / LENGTH / MISSING (advisories, tolérés)** : enum FR non-canonique (rend en l'état),
  placeholder numérique (« à calibrer »), longueur, champ absent (DRAFT — `validationStatus DRAFT` +
  `fieldCertainty INFERRED` marquent précisément l'incomplétude ; l'opérateur complète via l'amendement).

Classification **par `code` Zod** (robuste — insensible aux messages custom/i18n ; `validatePillarContent`
expose `code`/`expected`/`received`).

### Conformité des 4 canons via le précédent ADR-0168 (shippé)

La corruption SHAPE (~85/canon) est fermée en étendant le **précédent ADR-0168** (`z.union([string, objet])`
+ renderer tolérant) aux formes duales récurrentes — **jamais** en réécrivant la donnée (qui supprimerait
du contenu INFERRED réel) ni en fabriquant les sous-champs manquants. **Le schéma reste STRICT** : une
union `string ∪ objet` accepte DEUX formes légitimes, pas n'importe quoi. Levier : **une union corrige le
champ dans les 4 canons à la fois** (ils partagent le style d'écriture). Résultat : **motion19 · spawt ·
upgraders · lafusee = A→I SHAPE=0** (S exclu — computed par `computePillarS`, pas authored).

## Conséquences

- **Gate câblé** aux 4 seeds (`seed-motion19` · `seed-upgraders` (upgraders+lafusee) · `seed-spawt`),
  throw sur SHAPE, advisories journalisées. Persistance **brute** (ids lisibles + refs intacts — la
  normalisation d'id/enum est déférée à l'ingestion + Lot 3).
- **Test CI** `tests/unit/governance/canon-conformance.test.ts` (loi universelle sans DB) : les 4 canons
  A→I SHAPE=0 + classifieur SHAPE-vs-advisory + le gate jette sur une vraie corruption.
- **Tests** : `schema-normalizer` (12) + `canon-conformance` (33). tsc 0 · lint 0 · lint:governance 0 ·
  audit:cycles clean · 1304 tests verts. **E2E** : `db:seed:motion19` passe le gate, advisories logguées.
- **0 modèle Prisma**, **0 migration**, **0 LLM**, **0 Intent kind**, cap 7/7.

## Hors périmètre (déféré — RESIDUAL-DEBT §ADR-0172)

Traduction sémantique enum FR→canonique (advisory, ~120/canon), normalisation id lisible→UUID au seed
(déférée Lot 3 pour préserver l'intégrité des refs), S computed vs seedé-brut pour upgraders/lafusee
(incohérence pré-existante — motion19 le calcule), extracteur d'ingestion (Phase 3, Lot 1b), champs
invisibles + CRUD (Lot 2), 22 arêtes de référence (Lot 3).

## Lectures associées

- Audit ADVE 2026-07-22, ADR-0171 (socle produit), ADR-0168 (tolérance de forme — 3 champs union)
