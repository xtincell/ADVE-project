# ADR-0095 — Oracle : les modules dévorent les vraies données ADVERTIS (zéro invention)

**Status** : Accepted (implemented v6.25.29)
**Date** : 2026-06-14
**Phase** : Audit Oracle « inspecte chaque module » (branche galileo) — suite ADR-0094
**Owning Neteru** : Artemis (sections) · Mestor (cohérence livrable)
**Relates to** : [ADR-0094](0094-oracle-cult-tier-coherence-readtime-compose.md), [ADR-0091](0091-oracle-deterministic-compose-fallback.md) (même doctrine d'honnêteté), `index.ts` en-tête (« Strategy invents NOTHING — it only pulls from existing data »)

---

## 1. Contexte

La mission canonique de l'Oracle est inscrite en tête de
`strategy-presentation/index.ts` : **« Strategy invents NOTHING — it only pulls
from existing data. »** Or l'implémentation la contredisait frontalement :
`section-defaults.ts` (469 lignes) était un **moteur d'invention** générant des
personas (« Le Décideur Pragmatique »), un SWOT générique, 12 KPIs passe-partout,
une roadmap 7-phases, une équipe fictive (« Directeur de création »), etc., et
les 21 mappers CORE le branchaient en fallback (`?? defaultX()`).

Audit de provenance sur données réelles (CIMENCAM 126/200, UPgraders ADVE 100 %),
compilation sans LLM. Verdict initial : **5 sections majoritairement inventées +
8 mixtes** (CIMENCAM), **1 + 9** (UPgraders) — alors même que la donnée existait.
Deux causes :

1. **Mappings cassés** : la donnée riche existait sous des clés/piliers que le
   mapper ne lisait pas. Ex. CIMENCAM `d.personas` (profils LF8/Schwartz/
   jobsToBeDone complets) sous `name`/`age`/`fears` ; le mapper lisait
   `nom`/`trancheAge`/`freinsAchat` → ratait tout → inventait par-dessus. Idem
   `a.valeurs` sous `value`/`customName`/`rank`.
2. **Invention pure** : quand la donnée canonique manquait, le module fabriquait
   au lieu de chercher une source alternative réelle (autre pilier, relation).

## 2. Décision

### 2.1 Lecteurs multi-clés — dévorer toutes les formes réelles

Helpers `pickStr(obj, keys[])` / `pickArr(obj, keys[])` : essaient plusieurs clés
(`name`/`nom`, `age`/`trancheAge`, `value`/`valeur`, `rank`/`rang`,
`fears`/`barriers`/`freins`, `motivations` string|array…) avant d'abandonner.
Appliqués à personas, valeurs, touchpoints (nom←canal), équipe, etc.

### 2.2 Cascade de branchement vers les sources réelles alternatives

Chaque module cherche la donnée là où elle vit, à travers piliers ET relations :

| Section | Source canonique | Sources alternatives réelles branchées |
|---|---|---|
| §10 Catalogue | `i.catalogueParCanal` | `i.annualCalendar` (groupé par driver) + `i.sprint90Days` (par owner) |
| §12 Overton | `s.fenetreOverton`/`roadmap` | `d.positionnement` + `s.visionStrategique` + `s.axesStrategiques` + `i.annualCalendar` + `i.sprint90Days` |
| §15 Superfan | `e.superfanPortrait` | persona `d` au plus fort `devotionPotential` (AMBASSADEUR/EVANGELISTE) |
| §17 Croissance | `e.programmeEvangelisation` | `e.rituels` + `s.axesStrategiques`/`recommandationsPrioritaires` + `v.produitsCatalogue` |
| §18 Budget | `s.globalBudget` | `i.globalBudget`/`budgetBreakdown` (CIMENCAM y stocke) |
| §19/§20 Équipe/Gouvernance | `a.equipeDirigeante` | `i.teamStructure` / `s.teamStructure` |
| §21 Étapes | `s.sprint90Days` | `i.sprint90Days` + `s.recommandationsPrioritaires` |
| §07 SWOT | `r.globalSwot` (4 quadrants) + `r.mitigationPriorities` | `d.paysageConcurrentiel` (menaces) + `t.marketReality` (opportunités) |
| §16 KPIs | `e.kpis` | `s.kpiDashboard` / `s.northStarKPI` |

### 2.3 EmptyState honnête = dernier recours uniquement

Quand AUCUNE source réelle n'existe, le module rend vide (`[]`/`null`/`{}`) — un
état honnête « non renseigné », jamais un placeholder fabriqué. Suppression
intégrale de `section-defaults.ts` et de tous les `default*()` (personas, valeurs,
SWOT, KPIs, roadmap, jalons, mitigations, touchpoints, rituels, media, superfan,
growth loops, expansion, innovation, catalogue, glory outputs, équipe). Les
distributions/scores inventés depuis le vecteur (devotion 40/25/15…, NPS, BMF
= vector × 4) sont également supprimés — seules les mesures réelles (snapshots)
s'affichent.

## 3. Conséquences

- Audit de provenance après refonte : **0 section inventée, 0 mixte** sur les
  deux marques (vs 5+8 / 1+9 avant). Chaque module se nourrit de vraies données
  ADVERTIS ou reste honnêtement vide.
- `section-defaults.ts` supprimé (−469 lignes ; le moteur d'invention ne peut
  plus être re-câblé par erreur).
- 817 tests governance + composers + domain verts ; tsc + eslint clean.
- Cap APOGEE 7/7 préservé.

## 4. Suite (non couvert ici)

L'**alignement du rendu sur la DA** (composants React §1-35 : couleurs brutes à
tokeniser, dumps génériques `StructuredValue`/`JSON.stringify` à remplacer par
des visualisations dédiées, §33 Devotion Ladder à brancher sur `devotion-pyramid`)
est évalué séparément — ADR à suivre.
