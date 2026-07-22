# Audit d'intégrité de l'ADVE — 2026-07-22

**Contexte** : avant l'ingestion (Phase 3 du chantier « La Fusée compile »), balayage exhaustif des 8
piliers ADVE-RTIS sur 3 dimensions (affichage · éditabilité · intégrité des références & formes). Objectif
opérateur : « examiner tout l'ADVE pour ne rien manquer lorsqu'on implémentera ». 3 sous-agents Explore +
recoupement. **Verdict : le modèle est riche mais son contrat interne est cassé en profondeur — l'ingestion
de vraie donnée le révélerait brutalement.** Ce document est la carte ; les fixes sont tracés RESIDUAL-DEBT.

---

## Fait d'architecture transverse (la cause commune)

**Le seed écrit le canon directement en base SANS gate Zod** (`prisma/seed-motion19.ts:117,125` :
`content: p.content as InputJsonValue`, jamais `validatePillarContent`). Les formes malformées, enums
accentués et ids non-UUID **persistent intacts** et ne se voient que plus tard :
- **rendu** : la mauvaise forme → champ blanc ;
- **action « valider strict »** (`pillar.ts:174,212`) → mur d'erreurs Zod sur des champs jamais touchés ;
- le **cross-validator** est une lecture de score, jamais un gate d'écriture.
Les 4 canons (motion19/spawt/upgraders/lafusee) montrent les **mêmes** divergences — y compris marqués « VALIDATED ».

---

## Dimension 1 — Affichage (champs collectés mais INVISIBLES)

`pillar-page.tsx:1066-1082` : rendu **soit** bespoke **soit** `AutoField` — et comme les 8 piliers ont un
renderer bespoke, la grille générique n'est **jamais** rendue. Aucun renderer bespoke n'a de catch-all →
**tout champ schéma omis disparaît en silence** (la classe du bug pilier D, systémique).

| Pilier | Champs invisibles (valeur fondateur) |
|---|---|
| **R** | **`globalSwot`** — REQUIS, toujours peuplé, jamais rendu (le plus gros trou) |
| **S** | **`selectedFromI` / `rejectedFromI`** (traçabilité I→S + raisons de rejet), `devotionFunnel`, `recommandationsPrioritaires` (deprecated) |
| **E** | **`channelTouchpointMap`** (orchestration canal→touchpoint) |
| **T** | `lastMarketDataRefresh`, `sectorKnowledgeReused` (métadonnées, LOW) |
| **I** | `generationMeta` (interne, LOW) |
| **A/D/V** | 0 champ top-level invisible (D corrigé ADR-0168) |

**Résidu de forme** (visible mais dégradé) : `A.prophecy`/`A.doctrine` = union `objet|string` — `ObjCard`
n'est PAS tolérant à la variante string (la carte s'affiche vide si donnée legacy). `R.microSWOTs`,
`S.strategieDeplacement` = structures riches aplaties en blob `str()` (labels perdus).
`proprieteIntellectuelle.licences` non déclaré dans l'ObjCard V → invisible.

---

## Dimension 2 — Éditabilité & CRUD

**`SmartFieldEditor` + `field-registry` = code ORPHELIN** (importés seulement l'un par l'autre, montés
nulle part). L'édition réelle passe par **2 chemins JSON bruts** :
1. `cockpit/brand/edit/page.tsx` — formulaires typés pour **A** + partiel **D** ; **textarea JSON du pilier
   entier pour V/E/R/T/I/S**.
2. `AmendPillarModal` → `OPERATOR_AMEND_PILLAR` — ADVE-only, **un champ top-level en textarea JSON**
   (remplacement de la valeur entière).

Les renderers `pillar-*-fields.tsx` sont **read-only** (affichage). `productSystem` est affiché, jamais édité en formulaire.

**Item-level CRUD** : **5 helpers, tous ADD-only** (`addValue`/`addPersona`/`addProduct`/`addTouchpoint`/
`addRitual`). **Aucun `update*`/`remove*` pour aucun tableau.** L'édition dot-path (`personas[0].name`)
est **cassée** (`setNestedValue` ne gère pas les index de tableau). `addValue` a un plafond 7 qui
contredit le schéma `.max(3)`.

Le `SmartFieldEditor` orphelin est pourtant **récursif profondeur illimitée** (supporte l'arbre 3-niveaux
du `productSystem`). Le trou n'est pas la profondeur — c'est qu'il n'est **jamais monté**.

---

## Dimension 3 — Intégrité des références & formes canon

### 3a. 0 / 23 arêtes de référence validées
`entityId = z.string().uuid()` mais **aucune** des 23 arêtes n'a de validation de résolution. Dangles
**LIVE confirmés en base seedée** :
- motion19 `V.personaSegmentMap.personaName` → ne matche **aucun** `D.personas[].nom`.
- motion19 `V.personaSegmentMap.productNames` → ne matche **aucun** `produitsCatalogue[].nom`.
- motion19 `E.superfanPortrait.personaRef` → pas un nom de persona.
- spawt (« VALIDATED ») : idem ; **2 seeds spawt en désaccord** sur les noms.
- **Arête impossible par construction** : `S.strategieDeplacement.riskId` → `R.overtonBlockers[].id`, mais
  `overtonBlockers` **ne définit aucun `id`**.

*(Rule 31 ADR-0171 valide désormais les arêtes PRODUIT — 1/23 fermée.)*

### 3b. Mismatches canon↔schéma (HARD = échoue `validatePillarContent`)
Systémique sur **tous** les piliers. Familles :
- **ids non-UUID** : `risk-m19-001`, `hyp-m19-001`, `M1`… vs `z.string().uuid()` → **chaque pilier R/T/I/S
  seedé échoue la validation stricte**, indépendamment de la forme. *(fix le plus haut levier)*
- **enums accentués/langue** : `"Engagé"`/`"Activation"`/`"OPPORTUNITY"`/`stadeAarrr` vs `ENGAGE`/
  `AARRR_STAGES`/`TOUCHPOINT_TYPES`. Pervasif E/V/R/T/I.
- **objet-vs-scalaire** : seuls 3 champs élargis en union (`proofPoints`, `preuvesAuthenticite`,
  `directionArtistique`) ; **non réconciliés** : `valeurs`, `personas`, `sousPromesses`,
  `hierarchieCommunautaire`, `equipeComplementarite`, `charismaScore`, `productLadder`,
  `produitsCatalogue`, `touchpoints`, `rituels`, `kpis`, `sacredCalendar`, `packagingExperience`…
- **numériques string** : `prix:"≈150 000 FCFA"`, `severity:"CRITICAL"`, `globalBudget:"HYPOTHÈSE…"`,
  `kpis.target:"à calibrer"` vs `z.number()`.

### 3c. Provenance / needsHuman
Honnête en intention, **non-enforcé** : la provenance vit en commentaires (`// INFERRED`), le
`fieldCertainty` DB n'est posé que pour a/d/v/e (R/T/I/S sans marqueur), et aucun validateur n'empêche une
valeur INFERRED de nourrir `computePillarS` comme si elle était DECLARED.

---

## Punch-list priorisée (pour l'implémentation)

**Le fix le plus haut-levier (prérequis dur Phase 3)** :
1. **Réconcilier canon↔schéma** — soit assouplir les schémas (unions/coercions tolérantes, comme ADR-0168
   l'a fait pour 3 champs), soit corriger les canons. Décision de fond : *le schéma doit-il accepter la
   matière humaine réelle (accents, prose, ids lisibles) ou l'ingestion doit-elle normaliser vers le
   schéma strict ?* → **c'est LE choix de conception de la Phase 3** (l'extracteur structuré normalise).
2. **ids : accepter les ids lisibles** (`risk-m19-001`) OU normaliser en UUID à l'ingestion — trancher.
3. **enums : coercion casse/accents** (`"Engagé"`→`ENGAGE`) au write, OU accepter title-case.

**Chantiers bornés (chacun un lot)** :
4. Rendre visibles les champs à valeur fondateur : **R.globalSwot**, S.selectedFromI/rejectedFromI,
   E.channelTouchpointMap (ajout aux renderers bespoke). `ObjCard` tolérant à la variante string (A.prophecy/doctrine).
5. **22 arêtes de référence** restantes → règles cross-validator (motif rule 31 ADR-0171 généralisé).
6. **Monter le `SmartFieldEditor`** (fin des textarea JSON) OU acter le raw-JSON — + **CRUD item-level**
   `update*`/`remove*` (aujourd'hui add-only) + réparer le dot-path `setNestedValue`.
7. Enforcement provenance/needsHuman (INFERRED ne nourrit pas le computed sans revue).

**Down-payment déjà livré** : ADR-0171 (socle produit — ids stables, résolution tolérante, rule 31, lien
système↔catalogue). ADR-0168 (3 champs élargis en union). ADR-0169 (skinning). ADR-0170 (système produit).

---

## Fichiers-clés
- Schémas : `src/lib/types/pillar-schemas.ts` · taxonomies `src/lib/types/taxonomies.ts`
- Renderers : `src/components/cockpit/pillars/pillar-{a,d,v,e,r,t,i,s}-fields.tsx` + `pillar-kit.tsx` + shell `pillar-page.tsx`
- Éditeur orphelin : `src/components/shared/smart-field-editor.tsx` + `src/lib/types/field-registry.ts`
- Amend : `src/server/services/mestor/operator-amend.ts` · gateway `src/server/services/pillar-gateway/index.ts` (`setNestedValue`)
- Cross-validator : `src/server/services/cross-validator/index.ts` (29 règles + rule 31)
- Canons : `src/server/services/canon/{motion19,spawt,upgraders,lafusee}-canon.ts` · seed `prisma/seed-motion19.ts`
- CRUD : `src/server/trpc/routers/pillar.ts`
