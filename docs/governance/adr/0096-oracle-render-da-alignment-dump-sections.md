# ADR-0096 — Oracle : alignement du rendu sur la DA — refonte des 5 sections en dump générique

**Status** : Accepted (implemented v6.25.30)
**Date** : 2026-06-14
**Phase** : Audit Oracle « inspecte chaque module » (branche galileo) — suite ADR-0094/0095
**Owning Neteru** : Artemis (sections) · Guidance (composants Layer 6)
**Relates to** : [ADR-0095](0095-oracle-mappers-real-data-no-invention.md) (données réelles), [ADR-0013](0013-design-system-panda-rouge.md) (DA panda + rouge fusée), [ADR-0014](0014-oracle-35-framework-canonical.md)

---

## 1. Contexte

Après l'alignement de la couche **données** (ADR-0095 : 0 invention), l'évaluation
du **rendu final réel** (screenshots Playwright du lien partagé public, deux
marques seedées) a révélé un désalignement DA que la lecture du code seul ne
montrait pas :

- **5 sections rendaient via un dump générique** (`StructuredValue` recursif ou
  `JSON.stringify`) au lieu d'une visualisation dédiée comme les sections sœurs
  (§24 7S, §25 BCG, §31 Cult Index…).
- Pire, le helper `StructuredValue` coupait à `depth≥2` et affichait des
  **boîtes vides « N champs »** à la place des tableaux d'objets — §27 (profils
  d'équipe) et §33 (déclencheurs de conversion) apparaissaient littéralement
  vides au client.
- §33 « Devotion Ladder » portait des **libellés d'échelle faux** dans sa
  description (« Visiteur → Suiveur → Fan ») et **n'utilisait pas** le composant
  `devotion-pyramid` pourtant fait pour ça.
- §30 affichait un artefact de letter-spacing « L o w / M e d i u m / H i g h ».

**Constat important** : les ~80 « couleurs Tailwind brutes » signalées par
l'audit statique **rendent correctement et restent dans la DA** (le SWOT
4-quadrants §07 est premium). C'est de l'hygiène de token (invisible au client),
pas un désalignement visuel — donc hors scope de cette refonte.

## 2. Décision

Rendu dédié DS-conforme (primitives `@/components/primitives` + composants
partagés existants) pour les 5 sections, branché sur la shape réelle des
composers déterministes (ADR-0091/0095), `EmptyState` honnête en dernier recours :

| § | Avant | Après |
|---|---|---|
| 33 Devotion Ladder | dump + boîtes « N champs » + libellés faux | **`DevotionPyramid`** réutilisé (distribution canon) + score + superfans + déclencheurs en cartes + portrait ; description canon (Spectateur→…→Évangéliste) |
| 27 Deloitte Greenhouse | boîtes « N champs » sur les profils | **cartes de profil** (nom/rôle/compétences) + complémentarité (Progress) + gaps |
| 29 BCG Strategy Palette | dump plat | **environnement** (Badge) + approche recommandée + signaux 3-colonnes + justification |
| 30 Deloitte Budget | dump + artefact « L o w » | budget total + allocation par poste + **histogramme d'intensité** (Économique/Modéré/Intensif) + alternatives |
| 05 Territoire Créatif | `JSON.stringify` + quasi vide | champs `directionArtistique` rendus (UNIVERS/PRINCIPES) + `renderValue` gracieux (jamais de JSON brut) + EmptyState |

**Filet de sécurité** : `StructuredValue` ne produit plus de boîtes « N champs » —
à profondeur, il rend un résumé inline des valeurs scalaires réelles (pour les
shapes LLM résiduelles non couvertes par un rendu dédié).

## 3. Conséquences

- Rendu vérifié sur les deux marques (Playwright) : §33 affiche une vraie
  pyramide colorée, §27 des cartes de profil (Alexandre Djengue, NEFER), §29
  l'environnement « VISIONARY », §30 « 180 000 000 FCFA » + intensités propres,
  §05 les champs UNIVERS/PRINCIPES. Plus aucune boîte vide « N champs ».
- 796 tests governance (dont DS anti-drift couleurs/CVA) verts.
- Aucune nouvelle couleur brute introduite (territoire : `text-orange-400` →
  `text-accent`). Cap APOGEE 7/7 préservé.

## 4. Suite (non couvert — chantier optionnel)

Tokenisation des ~80 couleurs brutes existantes (hygiène DS, invisible client)
et refonte de l'export PDF `export-oracle.ts` (parcours texte jspdf qui ne porte
pas la DA) restent évalués mais hors scope de cette refonte ciblée.
