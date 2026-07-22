# ADR-0171 — Socle produit : ids stables + intégrité des références

- **Status** : Accepted
- **Date** : 2026-07-22
- **Phase** : Chantier « La Fusée compile » — Phase 2-bis (socle produit, prérequis Phase 3), suite du mandat « fermer tous les gaps »
- **Depends on** : ADR-0170 (système produit), ADR-0023/0085 (édition ADVE opérateur)
- **Supersedes** : —

## Contexte

Question opérateur : « tu t'es assuré que les gammes / le système reposent bien sur les produits ? que
La Fusée sait recommander / mettre à jour / supprimer ? » Audit → **non**. Le catalogue
`V.produitsCatalogue` est la source de vérité produit, mais son intégrité référentielle était fragile :

1. **`ProduitServiceSchema.id` optionnel et jamais assigné** (`addProduct` ne posait pas d'id) → les
   gammes `V.productLadder.produitIds` référençaient des ids que les produits **n'avaient pas** →
   **références fantômes**. Les gammes « reposaient » sur les produits *nominalement*, pas *réellement*.
2. **Aucune validation** que `produitIds` / `personaSegmentMap.productNames` résolvent vers un vrai
   produit (le cross-validator vérifiait la sémantique promesse↔produit, jamais l'intégrité des refs —
   0/23 arêtes de référence validées, cf. audit ADVE 2026-07-22).
3. **Le système produit (ADR-0170) ne reposait PAS sur le catalogue** — champ libre, aucun lien.

## Décision

### 1. Socle pur — `src/domain/product-catalog.ts`

- **Ids stables** : `ensureProductIds(catalogue)` backfill déterministe (slug de `nom`, dédup homonymes),
  **jamais d'écrasement d'id existant** (stabilité des références). `addProduct` l'applique.
- **Résolution tolérante** : `resolveProductRef(catalogue, ref)` résout par **id OU nom OU slug** — robuste
  même sur les catalogues historiques sans id (les références marchent par nom en attendant les ids).
- **Détection des fantômes** : `danglingProductRefs(vContent)` recense toute référence produit qui ne
  résout pas, sur les trois surfaces : gammes (`produitIds`), persona×segment (`productNames`), système
  (`anchorProductIds` + `modes/artifacts/archetypes.relatedProductIds`).

### 2. Le système produit repose sur le catalogue

`ProductSystemSchema` (ADR-0170) gagne `anchorProductIds` (top — les produits socles) +
`relatedProductIds` sur `modes`/`artifacts`/`archetypes`. Optionnels : SPAWT (Palais, app-wide) ne les
utilise pas ; Motion19 (« Le Setup » combine des produits) oui.

### 3. Première règle d'intégrité référentielle — cross-validator rule 31

`validateCrossReferences` gagne une règle : les références produit **résolvent vers le catalogue**
(INVALID + liste chiffrée des fantômes sinon). C'est la **1ʳᵉ des 23 arêtes de référence** à être
validée (le reste tracé RESIDUAL-DEBT / audit ADVE).

### 4. Éditable (latent) — field-registry

`anchorProductIds` / `relatedProductIds` déclarés dans `field-registry.ts`. **NB (audit 2026-07-22)** : le
`SmartFieldEditor` + `field-registry` sont aujourd'hui **du code orphelin** (l'édition réelle passe par
des textarea JSON brutes) — ces déclarations sont correctes mais **latentes** jusqu'au recâblage de
l'éditeur (tracé RESIDUAL-DEBT).

## Conséquences

- Les gammes ET le système **reposent réellement** sur les produits : références résolues (id-ou-nom) et
  validées ; les fantômes sont surfacés honnêtement, jamais cachés.
- **Tests** : `tests/unit/domain/product-catalog.test.ts` (5 — ids stables/dédup/idempotent, résolution
  tolérante, détection des fantômes sur les 3 surfaces). tsc 0 · lint 0 · cycles 0 · 2691 tests verts.
- **0 modèle Prisma**, **0 migration**, **0 LLM**, **0 Intent kind**, cap 7/7.

## Hors périmètre (déféré — audit ADVE 2026-07-22)

L'audit transverse a révélé des trous de fond bien plus larges (portée de la Phase 3) : **22 autres
arêtes de référence** non validées ; **dizaines de mismatches canon↔schéma** (HARD, l'ingestion seed
bypasse Zod) ; champs schéma **invisibles** au cockpit (R.globalSwot requis, S.selectedFromI…) ;
`SmartFieldEditor` orphelin + **aucun CRUD item-level** (update/remove). Tout est cartographié dans
[docs/audits/ADVE-INTEGRITY-AUDIT-2026-07-22.md](../../audits/ADVE-INTEGRITY-AUDIT-2026-07-22.md) et
tracé RESIDUAL-DEBT. Ce socle est le **premier acompte** (produit) sur cette dette.

## Lectures associées

- ADR-0170 (système produit), audit ADVE 2026-07-22 (la carte complète), ADR-0168 (tolérance de forme)
