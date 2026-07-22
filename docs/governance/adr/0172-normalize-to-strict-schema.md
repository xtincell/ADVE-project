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

### Suite du lot (increments à venir, tracés)

- **Applicateur schéma-guidé** `normalizeToSchema(content, zodSchema)` : walk du schéma (réutilise les
  helpers d'introspection Zod existants de `pillar-maturity-contracts.ts` — `unwrapZod`,
  `inferValidatorFromZod`, `extractObjectKeys`), applique les coercions par champ (enum, uuid, number),
  restructure les formes compactes connues.
- **Gate Zod au seed** : `validatePillarContent` avant persistance → les mismatches ne persistent plus en
  silence (fail-loud).
- **Conformité des canons** actifs (motion19/spawt) passés au normaliseur jusqu'à validation stricte.

## Conséquences

- Base déterministe et testée de la « normalisation vers le strict » ; réutilisable ingestion + canon.
- **Tests** : `tests/unit/domain/schema-normalizer.test.ts` (8 — enums accents/casse/séparateurs, UUID
  stable & reproductible & idempotent, coercion numérique). tsc 0 · lint 0.
- **0 modèle Prisma**, **0 migration**, **0 LLM**, **0 Intent kind**, cap 7/7. Primitives non encore
  câblées (foundation) — l'applicateur + la conformité canon suivent dans ce même lot.

## Hors périmètre (déféré — audit ADVE)

Applicateur schéma-guidé, gate Zod seed, conformité des 4 canons, extracteur d'ingestion (Phase 3),
champs invisibles + CRUD (Lot 2), 22 arêtes de référence (Lot 3). Tout tracé RESIDUAL-DEBT + audit ADVE.

## Lectures associées

- Audit ADVE 2026-07-22, ADR-0171 (socle produit), ADR-0168 (tolérance de forme — 3 champs union)
