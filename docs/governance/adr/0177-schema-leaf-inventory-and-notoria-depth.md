# ADR-0177 — Inventaire canonique des feuilles de schema + profondeur de la notoria + recos lisibles

- **Status** : Accepted
- **Date** : 2026-07-23
- **Phase** : Post-chantier « remplissage profond ADVE » (PR #617)
- **Depends on** : [ADR-0090](0090-field-rulers-deterministic-replacement.md) (rulers + gate de remplacement), Phase 0 chemin profond unifié (`@/lib/pillar-path`), Phase 2 `array_items_complete`
- **Supersedes** : —

## Contexte

Après la clôture du chantier « remplissage profond ADVE » (PR #617), l'opérateur a lancé la notoria sur le pilier A de SPAWT et rapporté **trois défauts** :

1. **Recos non prévisualisables** — l'aperçu résume un objet à 4 champs / un tableau à « N éléments » ; le seul clic de la carte = sélection. L'opérateur ne pouvait pas voir le contenu réellement proposé.
2. **Recos qui remplacent l'existant « sans le préciser »**, alors qu'un système de score (ADR-0090) est censé éviter de recommander pire.
3. **La notoria ignore les champs vides.**

Diagnostic (« un cas isolé ? » → non, **systémique**, trois causes racines distinctes) :

- **Bug 3 (racine)** — trois notions divergentes de « champ vide » coexistaient. Le moteur notoria (`engine.ts`) calculait ses champs vides **au premier niveau seulement** (`currentContent[k]`) : un objet `prophecy = {worldTransformed}` comptait « rempli » alors que `pioneers`/`urgency`/`horizon` étaient vides ; une matrice `produitsCatalogue = [{nom}]` masquait ses cellules. Les feuilles imbriquées vides étaient **structurellement invisibles**. En prime, l'`emptyFields` listait `t.traction` (donnée réelle NEEDS_HUMAN) → risque de **fabrication** par le LLM (interdit NEFER n°3).
- **Bug 2 (racine)** — le panneau lisait `content[fieldName]`, cassé pour un chemin imbriqué (`prophecy.pioneers` → `undefined`) → le bloc « Actuel » ne s'affichait pas → remplacement d'apparence silencieuse. Et le `weightedScore` / verdict ruler / `validationWarning` que le moteur **persiste déjà** (ADR-0090) n'étaient **jamais affichés** : la « logique de score » était invisible.
- **Trou structurel adjacent** — la branche gateway `APPLY_RECOS_RESOLVED` écrivait en `newContent[op.field]` (**object-only**). Une reco ciblant une feuille profonde (`prophecy.pioneers`) créait une clé LITTÉRALE `"prophecy.pioneers"`, ensuite purgée comme artefact → **application silencieusement sans effet**. Le chantier Phase 0 avait unifié l'écriture profonde PARTOUT sauf cette branche.

## Décision

**Une seule notion canonique de « feuille de schema » et de « feuille vide », consommée identiquement par toutes les voies de remplissage — DÉCOUPLÉE du contrat de maturité.**

1. **Primitive canonique** (`pillar-maturity-contracts.ts`, pure) :
   - `listSchemaLeafPaths(pillarKey, maxDepth=4)` — énumère TOUTE feuille remplissable en descendant dans les `ZodObject` imbriqués (`prophecy.pioneers`, `ikigai.love`) et en **s'arrêtant aux tableaux** (un tableau est une feuille ; la profondeur par cellule reste gérée par `array_items_complete` / `expandArrayItemRequirements`). Réutilise `unwrapZod` (une union `object|string` descend par sa branche objet).
   - `findEmptyLeafPaths(pillarKey, content)` — filtre l'inventaire aux feuilles **réellement vides ET sûres** : exclut les clés NEEDS_HUMAN (donnée réelle jamais inférée) et **saute toute feuille sous un ancêtre primitif** (une union rendue en forme string legacy est une valeur complète — y descendre corromprait le réel).
   - **Découplage explicite** : cet inventaire alimente les chemins de REMPLISSAGE, PAS l'assessor. Le contrat de maturité reste top-level → le **% de complétude n'est pas distordu** par la profondeur des feuilles optionnelles (on ne fabrique pas de complétude).

2. **Moteur notoria** (`engine.ts`) — la détection des champs vides passe par `findEmptyLeafPaths`. Le prompt liste les feuilles top-level (SET) et les sous-feuilles imbriquées groupées par objet parent (EXTEND, préserve les sous-champs remplis). `t.traction` n'est plus jamais proposé au LLM.

3. **Auto-filler** (`auto-filler.ts`) — `runFillPass` injecte les feuilles profondes vides (via `findEmptyLeafPaths`) comme cibles INFERRED, **découplées du contrat**, en sautant les objets déjà régénérés en entier par le contrat (pas de conflit d'ordre d'écriture). « Enrichir remplit tout en profondeur » sans bouger le %.

4. **Gateway `APPLY_RECOS_RESOLVED`** — extrait en module pur `apply-resolved-ops.ts` (`coerceValue` + `applyResolvedRecoOps`), **profondeur-conscient** : SET/EXTEND écrivent à la feuille (`setNestedValue`), ADD/MODIFY/REMOVE ciblent le tableau à la feuille (`resolvePillarPath`). Un champ top-level garde l'écriture directe (parité stricte). Base clonée en profondeur (`structuredClone`) → l'instantané PillarVersion précédent n'est plus corrompu par une mutation de tableau en place. Le gateway reste le SEUL écrivain (C5).

5. **Panneau recos** (`pillar-page.tsx`) — `currentValue` résolu via `resolvePillarPath` (le bloc « Actuel » s'affiche pour les chemins imbriqués) ; `weightedScore` + badge de verdict (« Comble un vide » / « Amélioration » / « N'améliore pas l'existant ») + avertissement explicite quand le gate ruler refuserait le remplacement ; prévisualisation COMPLÈTE dépliable (`RecoValueFull`, indépendante de la sélection) ; tri par score décroissant.

## Conséquences

- **La notoria voit et remplit les champs vides en profondeur** (objets imbriqués) ; les recos profondes s'appliquent réellement (fin du no-op silencieux) ; le score déterministe ADR-0090 est enfin **visible** et **trie** les recommandations ; l'opérateur prévisualise tout avant d'accepter.
- **Anti-fabrication renforcé** : `findEmptyLeafPaths` exclut structurellement la donnée réelle (NEEDS_HUMAN) et les formes union-string — le LLM ne se voit jamais demander d'inventer une traction ni d'écraser un récit legacy.
- **Zéro distorsion du score de complétude** : le découplage inventaire ↔ contrat garantit que COMPLET reste défini par le contrat (décision « fondre dans COMPLET » de la Phase 2 inchangée).
- **Tests anti-drift** : `schema-leaf-paths.test.ts` (inventaire + vides + garde union-string + exclusion NEEDS_HUMAN) et `reco-apply-nested.test.ts` (SET/EXTEND/ADD/MODIFY profonds, parité top-level, base non mutée, proto-guard).
- **Périmètre honnête / déféré** : la détection profonde de la notoria couvre les **objets imbriqués**, pas les **cellules de matrice partielles** (un tableau non vide n'est pas « vide ») — ces cellules restent remplies par l'auto-filler (Phase 3, `expandArrayItemRequirements`). Étendre la notoria au per-cellule est tracé RESIDUAL-DEBT. Le panneau per-pilier **accepte** (met en file) mais n'**applique** pas (l'apply + gate vit au hub / `applyBatch`) — comportement pré-existant, tracé.
- Cap APOGEE 7/7 préservé · 0 modèle Prisma · 0 migration · 0 nouvel Intent kind · 0 LLM ajouté au chemin de rendu.
