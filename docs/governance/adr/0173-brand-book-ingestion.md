# ADR-0173 — Ingestion d'un brand book officiel → piliers A/D/V + vault

- **Status** : Accepted
- **Date** : 2026-07-22
- **Phase** : Chantier « La Fusée compile » — Lot 1b (Phase 3 ingestion), suite de l'audit d'intégrité ADVE
- **Depends on** : ADR-0172 (normaliser vers le strict), ADR-0060 (manual-first parity), ADR-0067 (LLM structuré), ADR-0023 (édition ADVE = décision opérateur)
- **Supersedes** : —

## Contexte

L'audit ADVE 2026-07-22 a établi que la matière la plus riche pour fonder l'ADVE — le **brand book
officiel** que la marque possède déjà (Motion19 16 p., SPAWT 40 p.) — restait DEHORS : l'opérateur
re-saisissait tout à la main. La chaîne d'upload/extraction PDF existait (`ingestion-pipeline`), mais sans
extracteur **structuré** brand-book ni écriture gouvernée vers les piliers.

## Décision

Un service **`brand-book-ingestion`** (governor MESTOR) fait entrer un brand book sans jamais rien inventer.

- **Contrat `BrandBookExtractionSchema`** (`schema.ts`) : mappe vers `identity`(A) / `distinction`(D) /
  `value`(V) / `visual`(vault). **Chaque champ `.nullable().optional()`** → l'absence est un `null`, jamais
  une valeur inventée (interdit NEFER n°3).
- **Deux extracteurs, parité manual-first (ADR-0060)** convergeant sur le même contrat :
  - `extractor-llm.ts` : `executeStructuredLLMCall` (ADR-0067) + **consigne anti-fabrication DURE** (null sur
    absence, aucun chiffre/nom hors texte) ;
  - `extractor-structured.ts` : parseur **pur déterministe** (couleurs hex, familles de police connues) —
    zéro LLM, plancher sûr ; la prose reste `null`.
- **Preview → confirm** (`index.ts`, motif `market-study-ingestion`) : `previewBrandBook` EXTRAIT sans
  écrire (revue opérateur) ; en mode LLM le plancher déterministe complète sans écraser. L'écriture n'a lieu
  qu'après validation.
- **Écriture gouvernée** : Intent `INGEST_BRAND_BOOK` (handler `ingestBrandBook`) → `persistBrandBookExtraction`
  écrit A/D/V via **`writePillarAndScore`** (C5, `author.system:"INGESTION"`, `fieldProvenance` SOURCE pour
  les faits) + crée les assets visuels (`CHROMATIC_STRATEGY`/`TYPOGRAPHY_SYSTEM`) en **DRAFT** (l'opérateur
  promeut, motif `source-classifier`). L'écriture ADVE reste une **décision opérateur** (ADR-0023, STOP à
  Jehuty) : `operatorProcedure` + preview→confirm.
- **Mapping conservateur** : seuls les champs qui accueillent proprement une valeur de brand book sont
  écrits (chaînes d'identité, sous-promesses, personas avec rang d'ordre). Les **produits** et **valeurs
  Schwartz** (schémas riches à matrice de valeur / enum) ne sont PAS auto-écrits (ils exigeraient d'inventer
  la matrice / l'enum) — l'extraction brute est conservée pour promotion opérateur ultérieure.
- **Nouveau kind `BRAND_BOOK`** (entrée) — distinct de `BRAND_BIBLE` (sortie compilée). Additif (String).

## Conséquences

- **Capacité shippée** : upload → `previewBrandBook` (revue) → `ingestBrandBook` (écriture). tRPC
  `ingestion.previewBrandBook` / `ingestion.ingestBrandBook` (operator-gated). La source uploadée passe
  `certainty="OFFICIAL"`.
- **Zéro fabrication vérifiée** : une extraction entièrement `null` n'écrit RIEN (E2E + test).
- **Tests** : `brand-book-ingestion` (10 — extracteur déterministe, contrat zéro-fab, Intent enregistré) +
  E2E persister (A/D/V + assets DRAFT écrits, null → rien). tsc 0 · gouvernance 1110 verts.
- **0 modèle Prisma** (kind additif String, assets/sources existants), **0 migration**, **cap 7/7**
  (brand-book-ingestion = service sous MESTOR, pas un Neter). 1 Intent kind (`INGEST_BRAND_BOOK`).

## Hors périmètre (déféré — RESIDUAL-DEBT §ADR-0173)

Surface cockpit/console (formulaire upload→revue→apply de l'extraction), promotion produits extraits →
`v.produitsCatalogue` (via le socle produit ADR-0171), extraction du **logo binaire** (pdf-parse ne garde
que le texte → ré-upload image séparé), traduction sémantique des jugements (archétype) vers les enums.

## Lectures associées

- ADR-0172 (gate anti-corruption), ADR-0170/0171 (système produit + intégrité produit), ADR-0169 (rendu
  brand-skinné), audit ADVE 2026-07-22.
