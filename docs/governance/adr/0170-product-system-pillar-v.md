# ADR-0170 — Le système produit dans le pilier Valeur (« penser produit »)

- **Status** : Accepted
- **Date** : 2026-07-22
- **Phase** : Chantier « La Fusée compile » — Phase 2 (« penser produit dans le pilier Valeur », mandat opérateur)
- **Depends on** : ADR-0059/0061 (brand-tree multi-archétype — patterns Layer-0 réutilisés), ADR-0023/0085 (édition ADVE = décision opérateur), ADR-0060 (manual-first parity), ADR-0067 (`executeStructuredLLMCall`)
- **Supersedes** : —

## Contexte

Mandat opérateur : « **La Fusée doit penser produit dans le pilier Valeur.** » Le Brand Book de SPAWT
(40 p.) consacre une strate entière à son **Système Palais** — 5 axes gustatifs × 13 archétypes ×
5 stades de maturité × 3 modes UX × cartes collectibles — c'est-à-dire au **mécanisme interne** du
produit : ce qui le fait fonctionner et crée de la valeur *structurellement*.

Or `PillarVSchema` (`src/lib/types/pillar-schemas.ts`) ne modélisait que l'**économie** du produit
(catalogue, product ladder, unit-economics, MVP, IP, ROI, expérience). **Aucun champ ne modélisait le
système produit.** Audit anti-doublon (grep CODE-MAP + 4 surfaces + schémas piliers, 2026-07-22) :
`productSystem` n'existe nulle part — greps négatifs. Le Palais de SPAWT vivait en **prose éparse**
(dispersé dans `proofPoints`, `sacredObjects`, `proprieteIntellectuelle.secretsCommerciaux`,
`packagingExperience`) — non structuré, non queryable, non éditable comme tel.

## Décision

### 1. Domaine Layer-0 — `src/domain/product-system.ts`

Foyer **générique** (pas SPAWT-spécifique) au mécanisme produit, six dimensions canoniques
(`PRODUCT_SYSTEM_DIMENSIONS`) : `axes` (dimensions du mécanisme) · `archetypes` (profils émergents) ·
`progressionStages` (paliers ordonnés) · `modes` (contextes d'usage) · `artifacts`
(collectibles produits) · `mechanics` (règles fondatrices) — + un `coreConcept`. `ProductSystemSchema`
Zod pur (réutilise l'idiome `brand-tier`/`market-scale`/`brand-nature-archetypes`). Helpers purs
`productSystemDepth` (0-6) et `isProductSystemEmpty`.

**Toutes les dimensions optionnelles** : un produit physique simple remplit `mechanics` + `artifacts`
et laisse le reste vide ; une plateforme gamifiée remplit les six. **Un système vide reste vide — pas de
fabrication** (interdit NEFER n°3).

### 2. Composé dans le pilier V — `v.productSystem`

`productSystem: ProductSystemSchema.optional()` ajouté à `PillarVSchema` — **additif, aucune migration**
(le contenu pilier est du JSON). Loi 1 respectée : les marques existantes (champ absent) sont inchangées.
Propagation du champ éditable : entrée `BIBLE_V` (`variable-bible.ts`, `canonicalCode "V8"`,
`editableMode: STRATEGIC_REWRITE`) + `FieldDef` structuré dans `PILLAR_V` (`field-registry.ts`, `object`
imbriquant six `array-of-objects`). Édition via `OPERATOR_AMEND_PILLAR` existant — **aucune plomberie
neuve** ; l'écriture ADVE reste une décision opérateur (ADR-0085, STOP à Jehuty).

**Exempté du contrat COMPLETE (100 %)** : `deriveSchemaRequirements` (`pillar-maturity-contracts.ts`)
faisait de tout champ schéma une exigence 100 %. `productSystem` y est **exclu** (nouveau set
`COMPLETE_OPTIONAL_BY_PILLAR`) : contrairement aux champs toujours présents (positionnement, personas…),
le mécanisme gamifié n'existe pas pour tout produit — l'exiger forcerait la fabrication (le tool refuse
d'en inventer). Une marque reste 100 % complète sans système produit. Défaut réparé en passant (le contrat
auto-dérivé aurait sinon cassé le 100 % du canon UPgraders + forcé la fabrication).

### 3. Visible au cockpit — `pillar-v-fields.tsx`

Nouvelle section « Système produit » : composant `ProductSystem` qui affiche `coreConcept` + une carte
par dimension **renseignée** (empty-state honnête « À générer » si tout est vide). Le founder voit son
mécanisme produit ; il ne dort plus en prose.

### 4. Assist LLM — Glory tool `product-system-architect`

Nouveau Glory tool HYBRID (`registry.ts`, `PHASE2_TOOLS`, via `defineHybridTool` → parité manuelle
ADR-0060 garantie : `manualFormSchema = outputSchema = ProductSystemSchema`). Lit A/D/V
(`pillarBindings`), propose un `ProductSystem` structuré. Invocable via `glory.executeHybrid` existant
(émission gouvernée `INVOKE_GLORY_TOOL` — **aucun nouveau Intent kind**). Le prompt interdit la
fabrication (« ne remplis une dimension QUE si l'offre la porte »). La sortie est un **draft** que
l'opérateur applique via l'amend — jamais un auto-write ADVE.

**Cap APOGEE 7/7 préservé** : tutelle Artemis (Propulsion) pour le tool, sous-domaine de Mestor pour le
schéma — aucun 8ᵉ Neter.

## Conséquences

- Le pilier Valeur **pense produit** : le mécanisme d'un produit a un foyer structuré, éditable, visible,
  et générable (assist). SPAWT pourra formaliser son Palais ; Motion19 son « Setup » ; toute plateforme
  sa gamification.
- **Tests** : `tests/unit/domain/product-system.test.ts` (6 — le schéma accueille le Palais RÉEL de SPAWT
  depuis le brand book, helpers profondeur/vacuité, dimensions figées, vide sans fabrication). Suites
  `pillar-schema-coherence`, `glory-tools` (56 CORE inchangé — le tool vit dans EXTENDED),
  `phase22-glory-hybrid` vertes.
- **0 modèle Prisma**, **0 migration**, **0 Intent kind**, **1 Glory tool** (EXTENDED 149 → 150),
  **1 variable canonique** (V8). Glory core inchangé (56).

## Hors périmètre (déféré, tracé RESIDUAL-DEBT)

- **Seed du Palais SPAWT complet** dans `spawt-canon.ts` : sera peuplé par l'**ingestion** du brand book
  (Phase 3) — l'encoder à la main maintenant risquerait la fabrication (données d'axes/stades partielles).
- Annotation `applicableGloryTools` du tool par nature (`brand-nature-archetypes.ts`) — discovery UI
  nature-scopée ; le tool est déjà invocable par slug.
- Rendu du système produit dans le **Brand Book PDF** deux-strates — Phase 4 du chantier.

## Lectures associées

- ADR-0061 (brand-nature-archetypes — idiome Layer-0), ADR-0085 (édition ADVE opérateur), ADR-0060 (manual-first parity)
