# ADR-0168 — Tolérance de forme des piliers : compacte (canon/humain) vs riche (Glory)

- **Status** : Accepted
- **Date** : 2026-07-22
- **Phase** : Post-audit « déclaré jamais câblé » (suite du mandat « gère le tout ») — signalement opérateur pilier Distinction
- **Depends on** : ADR-0023 (`OPERATOR_AMEND_PILLAR` voie d'édition ADVE), ADR-0060 (manual-first parity), ADR-0091 (Oracle compose déterministe)
- **Supersedes** : —

## Contexte

L'opérateur a constaté que le **pilier Distinction (D)** de Motion19 n'affichait **ni sa direction
artistique ni ses proof points** — alors que la donnée existe et est réelle (Brand Book officiel
Motion19 : palette `#4867B0` / `#3384FF` / `#1D1D1D` / `#B5B5B5`, typo Exo 2 + Roboto, motif isométrique ;
4 proof points datés). L'affichage montrait « à saisir » sur des champs pourtant renseignés.

**Diagnostic (ground-truth base + code)** : ce n'était **ni un manque de donnée, ni un besoin d'invoquer
des Glory tools pendant l'ADVE** — c'était un **mismatch de contrat de forme** entre le producteur et le
consommateur.

- Les fichiers **canon** (`motion19-canon.ts`, `spawt-canon.ts`, `lafusee-canon.ts`) écrivent une forme
  **compacte** (la matière réelle d'un Brand Book, saisie à la main) :
  - `directionArtistique = { univers: string, principes: string[] }`
  - `proofPoints = string[]` (pilier D) · `preuvesAuthenticite = string[]` (pilier A)
- Le **schéma Zod canonique** (`pillar-schemas.ts`) et donc le **renderer bespoke** qui le suit
  (`pillar-d-fields.tsx`) n'attendaient que la forme **riche** (sortie des Glory créatifs) :
  - `directionArtistique = { semioticAnalysis, moodboard, chromaticStrategy, typographySystem, … }`
  - `proofPoints = { type, claim, evidence, source }[]`

Le renderer cherchait `moodboard`/`chromaticStrategy`/… → introuvables → 7 lignes « à saisir » ; et
lisait `.type`/`.claim` sur des chaînes → `undefined` → « Proof points · 4 » avec 4 lignes vides.
Bug d'affichage réel — **données bien collectées, mal shapées** — pas un état vide légitime.

La donnée est écrite **directement** par les seeds (`prisma.pillar.upsert`, hors gateway), donc la forme
compacte persiste telle quelle ; la validation du gateway est **warnings-only** par défaut (le
`strictSchemaValidation` d'ADR-0063 reste opt-in pour les protocoles RTIS), donc rien ne stripait ni ne
bloquait — seul l'affichage échouait.

## Décision

**Deux formes légitimes coexistent, en citoyennes de première classe.** La compacte est la matière
humaine (un paragraphe de Brand Book, une preuve écrite en clair) ; la riche est la sortie structurée des
Glory créatifs. Aucune n'est « la bonne » — le renderer affiche **celle qui est présente**, sans jamais
inventer de structure absente (interdit NEFER n°3 : ne jamais combler un trou en inventant des données).

### 1. Schéma tolérant (`src/lib/types/pillar-schemas.ts`)

- `directionArtistique` accepte `univers?: string` + `principes?: string[]` **en plus** des sous-objets
  riches (tous `optional`). Clés désormais connues ⇒ non stripées, plus de warning de validation.
- `proofPoints` (pilier D) et `preuvesAuthenticite` (pilier A) : `z.array(z.union([ z.string(), <objet
  structuré> ]))`. Une preuve peut être une chaîne nue OU un objet `{type, claim, …}`.

### 2. Renderer tolérant (`src/components/cockpit/pillars/`)

- **`pillar-kit.tsx` — `ProofList`** : un item chaîne (au lieu d'un objet) est rendu en **ligne
  d'affirmation** unique. Correctif au niveau de la **primitive partagée** ⇒ bénéficie à *tous* les
  piliers (D `proofPoints`/`symboles`/`barriersImitation`, A `preuvesAuthenticite`, …).
- **`pillar-kit.tsx` — `str()`** : rend désormais **toutes** les valeurs d'un objet imbriqué (l'ancienne
  version ne gardait que la 1re chaîne, écrasant silencieusement moodboard/chromaticStrategy/…) et **saute
  la plomberie interne** (`gloryOutputId`, clés `_`-préfixées) jamais destinée à l'écran. Non-lossy.
- **`pillar-d-fields.tsx` — `DirectionArtistique`** : composant dédié qui affiche `univers` (énoncé) +
  `principes` (tags) quand présents, **et** les sous-objets riches présents. Remplace l'`ObjCard` rigide
  qui ne connaissait que la forme riche. DS-compliant (réutilise `ACard`/`TagRow`/`EmptyBody`, tokens,
  zéro couleur brute).

## Conséquences

- La direction artistique + les proof points **réels** de Motion19 s'affichent immédiatement, sans
  regénérer quoi que ce soit ni fabriquer de donnée. **Vérifié sur la base** (Motion19 pilier D :
  `directionArtistique` non vide, univers + 3 principes rendus ; 4 proof points rendus).
- Les futures sorties Glory riches continuent de s'afficher (les deux chemins cohabitent).
- **Tests** : `tests/unit/types/pillar-shape-tolerance.test.ts` (8) — les deux formes valident (D + A),
  `str()` non-lossy + saut `gloryOutputId`, `isEmpty` sur objet. Suites `pillar-schema-coherence`,
  `design-tokens-cascade`, `design-primitives-cva` inchangées vertes.
- **0 nouveau modèle Prisma**, **0 LLM**, **0 migration**, cap APOGEE 7/7 préservé.

## Hors périmètre (déféré, tracé RESIDUAL-DEBT)

- **`personas` (pilier D)** présente le même motif compacte↔riche (canon écrit une forme divergente de
  `PersonaSchema` : `name`/`rank`/`motivations` scalaires). Le renderer `Personas` est **déjà tolérant**
  (affiche correctement via `str()`/normalisation array), donc c'est **warnings-only**, pas un bug
  d'affichage — tracé mais non bloquant.
- **L'étape de compilation** (produire un Brand Book *designé*, brand-skinné, à partir de l'ADVE + du
  vault, comme le Brand Book V2 fourni par l'opérateur) reste le grand chantier aval : l'Oracle compile
  déjà 35 sections déterministes + export PDF lisible (ADR-0091/0138), mais dans le gabarit générique
  UPgraders, pas encore à la palette/typo/logo/motif de la marque. Tracé RESIDUAL-DEBT §Compilation
  Brand Book.

## Lectures associées

- ADR-0023 (édition ADVE), ADR-0060 (manual-first parity), ADR-0091 (Oracle compose), ADR-0138 (export lisible)
