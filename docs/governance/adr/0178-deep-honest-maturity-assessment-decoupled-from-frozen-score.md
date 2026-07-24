# ADR-0178 — Assessment de maturité PROFOND et honnête, découplé du score structurel gelé

- **Status** : Accepted
- **Date** : 2026-07-24
- **Phase** : Post-ADR-0177 (chantier notoria profondeur) — diagnostic de fond
- **Depends on** : [ADR-0102](0102-adve-structural-score-deterministic-canon.md) (score structurel gelé), [ADR-0177](0177-schema-leaf-inventory-and-notoria-depth.md) (inventaire de feuilles + détecteur profond)
- **Supersedes** : —

## Contexte

Trois rounds successifs (v6.27.319 → v6.27.323) ont patché le **détecteur** de champs vides (`findEmptyLeafPaths`, `findEmptyArrayCellPaths`), et à chaque fois l'opérateur revenait avec le **même symptôme** : un pilier affiché **« 100 % Complet »** + bouton Enrichir répondant **« tous les champs déjà remplis »**, alors qu'un champ requis est **visiblement vide** à l'écran (capture SPAWT : `tonDeVoix.onNeditPas` = « à saisir »).

Diagnostic de fond (« c'est un cas isolé ? » → **non, systémique**) : il existait **trois notions indépendantes de « champ vide »** qui ne se réconciliaient jamais, et la plus superficielle pilotait tout ce que le client voit :

| Système | Profondeur | Ce qu'il pilote |
|---|---|---|
| **Contrat / assessment** (`assessPillar`) | **PLAT** — `is_object` = « objet présent + ≥1 clé reconnue », **jamais** les sous-feuilles requises | le **% Complet**, le pill **« Complet »**, le bouton **Enrichir** (`assessQuery.data.derivable`) |
| **Détecteur** (`findEmptyLeafPaths`) | **PROFOND** — voit `tonDeVoix.onNeditPas` | le remplissage serveur — **s'il est appelé** |
| **Renderer** | montre le champ vide réel | l'humain |

Le contrat plat **gate** le bouton Enrichir : `pillar-page.tsx` construit sa liste de champs à remplir depuis `assessQuery.data.derivable` (issu de l'assessment plat) ; si elle est vide → « tout rempli » → **le détecteur profond n'est jamais invoqué**. Peu importe la qualité du détecteur (3 rounds de patchs), l'UI ne l'appelle pas quand le contrat plat dit « rien ne manque ».

**Audit exhaustif** (8 piliers) : **22 feuilles imbriquées requises / 6 piliers** invisibles au % — `ikigai.*` (A), `tonDeVoix.onDit/onNeditPas` (D), `unitEconomics.budgetCom/caVise` (V, nombres), `aarrr.*` (E), `globalSwot.opportunities/threats` (R), `tamSamSom.*.value/description` (T). Le cas de la capture n'était que 1 des 22.

**Contrainte dure** : le **score structurel** (ADR-0102, gelé, gate les paliers) lit `contract.stages.COMPLETE.length` (`atomesRequis`) + `assessment.satisfied.length` (`atomesValides`) via `advertis-scorer/structural`. **Approfondir le contrat changerait le score et déplacerait les paliers de toutes les marques** — hors mandat. La maturité (chip/% honnête) et le score (palier) sont **deux axes distincts** (cf. CLAUDE.md).

**Bug de données révélé en passant** : la casse `onNeDitPas` (data des 4 canons + Oracle) ≠ `onNeditPas` (schema + cockpit). La valeur atterrissait sous une clé que le schema/renderer ne lisent pas → champ vide à l'écran alors que la donnée existait. Le fix honnête l'a **surfacé** (avant, `is_object` le masquait).

## Décision

**Une seule notion canonique de « feuille vide » = le détecteur (`findEmptyLeafPaths`). L'assessment UI la consomme ; le score reste gelé.**

1. **`assessPillar` réconcilie en profondeur** (`server/services/pillar-maturity/assessor.ts`) : après le calcul contractuel, on **replie** les feuilles imbriquées REQUISES vides (`findEmptyLeafPaths(...).filter(!optional && nested)`) dans les champs **UI-facing** — `missing`, `derivable`/`needsHuman`, `completionPct` (dénominateur gonflé → < 100), et rétrogradation `currentStage` COMPLETE→ENRICHED + `readyForGlory=false`.
   - **INVARIANT DE DÉCOUPLAGE** : on **ne touche NI `satisfied` NI le contrat** (`completeReqs`). `advertis-scorer/structural` les lit → **score ADR-0102 GELÉ** (test canon `scoring-base-canon` toujours vert).
   - **Anti-fabrication (interdit n°3)** : un **NOMBRE** requis vide → `needsHuman` (donnée réelle/dérivée, jamais fabriquée par LLM), jamais `derivable`. `findEmptyLeafPaths` exclut déjà NEEDS_HUMAN + COMPLETE_OPTIONAL.

2. **Alignement de casse `onNeditPas` (schema = source de vérité)** : les 3 canons (`lafusee`/`spawt`/`motion19`) et les lecteurs Oracle (`section-mappers`, `glory-composers`) passent à `onNeditPas` ; les renderers cockpit + Oracle tolèrent la forme legacy `onNeDitPas` (`onNeditPas ?? onNeDitPas`) pour les données DB écrites avant l'alignement.

3. **Prévention (round 4 impossible)** — `tests/unit/governance/pillar-completeness-reconciliation.test.ts` (HARD) :
   - **Pas d'angle mort** : pour chaque feuille imbriquée requise de chaque pilier, la vider ⇒ elle apparaît dans `missing`, `completionPct < 100`, `currentStage !== COMPLETE`.
   - **Réconciliation détecteur ↔ assessment** : toute feuille profonde requise vue vide par le détecteur est dans `missing`.
   - **Prévention DATA** : aucune marque canon n'a de valeur cachée sous une variante de casse/nom d'une clé de schema, ni de feuille requise vide.

## Conséquences

- **Le %, le pill « Complet », le bouton Enrichir sont honnêtes** : un pilier avec un champ requis vide affiche < 100 % / INCOMPLET, et Enrichir invoque enfin le remplissage profond (au lieu de « tout rempli »). Les 22 feuilles sont surfacées.
- **Le score structurel (palier) est INTACT** — découplage vérifié par le test canon ADR-0102 vert + `satisfied`/contrat inchangés.
- **« COMPLET devient honnête »** (décision opérateur du chantier profondeur) : les marques existantes à feuille requise vide **chutent sous 100 %** jusqu'à remplissage (notoria pour le qualitatif, opérateur pour les nombres). C'est la vérité recherchée.
- **Canon nettoyé** : audit 4 marques × 8 piliers → **0 mismatch de casse/nom, 0 feuille requise vide**. `onNeditPas` corrigé partout.
- **Tests** : 12 assertions de réconciliation HARD + score canon ADR-0102 préservé. tsc 0 · lint 0 · cycles 0 · 3367 tests verts. Cap APOGEE 7/7 · 0 modèle Prisma · 0 migration · 0 LLM.
- **Déféré (RESIDUAL-DEBT)** : un garde Zod-`safeParse` canon↔schema (au-delà de la casse — types, enums) formaliserait la prévention DATA complète.

## Addendum 2026-07-24 (v6.27.325) — couche OPTIONNELLE câblée au bouton Enrichir

Le fix ci-dessus a rendu honnête le REQUIS mais la **profondeur OPTIONNELLE** restait invisible : un pilier « 100 % Complet » (requis fait) avait ses personas squelettiques (`personas[i].lifestyle/.fears/.jobsToBeDone`) + Enrichir « tout rempli », car `assessPillar` n'appelait jamais `findEmptyArrayCellPaths` → le gate du bouton (`assess.derivable`) ne voyait pas ces cellules → l'auto-filler (capable) jamais invoqué.

- **Décision** : nouveau champ `optionalFillable: string[]` sur `PillarAssessment`, peuplé dans `assessPillar` (**pillar-agnostic, identique pour les 8 piliers**) via `findEmptyArrayCellPaths` + feuilles imbriquées optionnelles qualitatives (jamais un nombre). **DÉCOUPLÉ du %** : hors `completionPct`/`missing`/`currentStage`/`satisfied`/readiness (les cellules optionnelles ne gatent pas COMPLET — ADR-0177, pas de pression à fabriquer) + exclusion au grain **topKey** (un tableau/objet déjà signalé par le contrat n'est pas redoublé). Le bouton Enrichir fold `optionalFillable` dans ses `fields` → `inScope` de l'auto-filler les admet → remplis INFERRED. Bannière + tooltip + badge « +N à enrichir » rendent la profondeur visible (« 100 % » ne ment plus par omission).
- **Score gelé** : `satisfied`/contrat toujours intacts → ADR-0102 non touché (test canon vert).
- **Tests HARD** (`pillar-completeness-reconciliation.test.ts`) : cellule persona optionnelle vide → dans `optionalFillable`, `%`/stage inchangés, jamais dans `missing` ; découplage topKey-disjoint sur les 8 piliers + zéro faux positif sur base pleine.
- **Renderer** : `pillar-d-fields` affichait `lifestyle`/`familySituation` filled-but-hidden → ROWS ajoutées. **Déféré (RESIDUAL-DEBT)** : audit renderer per-pilier complet (le fill est uniforme sur les 8 ; V affiche déjà ses cellules).
- **Déféré (RESIDUAL-DEBT)** : Gap B — le panneau recos de la page pilier `accepte` mais n'`applique` pas (flux à deux temps via le hub), séparé de ce chantier.
