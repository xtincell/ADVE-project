# R6 — Yggdrasil → l'Arbre (Ished) + la Sève

> **Chantier A — dissolution conceptuelle.** **Ancrage canon :** Blueprint §0.7 (l'Arbre Ished = image-monde ;
> la Sève = substrat de circulation, 7 racines, ungouverné). **Classe(s) :** S (docs). **Surface vérifiée :**
> **0 fichier `src/`**, 2 docs (ADR-0082, ADR-0083).

## R6.0 — Décision

Dissoudre le nom norrois **Yggdrasil** en deux objets égyptiens canoniques :
- **l'Arbre (Ished)** = la métaphore-ombrelle (La Fusée entière ; au niveau satellite = **Brand Tree**) ;
- **la Sève** = le substrat de circulation de la valeur (7 racines), **ungouverné**, **pas un Neter**.

*Alt. écartée : garder Yggdrasil* (panthéon non-égyptien, interdit absolu Blueprint §0.5).

## R6.1 — Surface (docs uniquement)

| Surface | Action |
|---------|--------|
| `ADR-0082` (substrat de circulation) | renommer le titre/corps `Yggdrasil` → `la Sève` (substrat ungouverné, gates Mestor) |
| `ADR-0083` (Argos placement / Sève seam) | `Yggdrasil seam` → `Sève seam` |
| `LEXICON.md` | entrée `YGGDRASIL` → `SEVE` (+ `ISHED` pour l'Arbre) |
| `PANTHEON.md §7 Substrats` | `Yggdrasil` → `la Sève` ; ajouter l'Arbre (Ished) comme image-monde |
| `APOGEE.md §4.2` | mention substrat |
| `CLAUDE.md` | section Substrats (déjà « Yggdrasil … amended ») → la Sève |
| Test Phase 30-bis | `yggdrasil-three-invariants.test.ts` → `seve-three-invariants.test.ts` (3 invariants Q1/Q2/Q3) |

## R6.2 — Surface Classe P

- **Néant.** Yggdrasil n'a jamais été ni governor ni valeur persistée (0 `src/`). Les **7 racines** (Intent bus, hash-chain, NSP, pillar cascade, RAG arborescent, isolation tenant, layering cascade) **existent déjà** comme mécanismes — la Sève est leur **nom collectif**, pas un nouveau module.

## R6.3 — Invariant à préserver

La Sève reste **ungouvernée** (ADR-0082 amended) : ses **gates** appartiennent à **Sia** (`services/sia/gates/*`)
mais le substrat n'a pas de gouverneur Neter. Le renommage **ne change pas** ce statut. Cap 7/7 intact.

## R6.4 — Critères d'acceptation

```
[ ] grep -rn "yggdrasil\|Yggdrasil\|YGGDRASIL" docs/ src/ → 0
[ ] LEXICON: entrées SEVE + ISHED ; PANTHEON §7 cohérent
[ ] seve-three-invariants.test.ts présent (soft → HARD post stress-test)
[ ] BRAINS toujours 7/7 ; la Sève absente de BRAINS (neteru-coherence vert)
```

## R6.5 — Friction

- **F-R6.** Faible surface, mais c'est la dissolution doctrinale la plus subtile : bien distinguer **l'Arbre (Ished, image-monde)** de **la Sève (substrat)** — ne pas les fusionner en un seul terme.
