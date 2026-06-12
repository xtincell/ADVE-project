# ADR-0090 — Rulers déterministes par champ ADVE + gate de remplacement pondéré

**Status** : Accepted (implemented v6.25.16)
**Date** : 2026-06-12
**Phase** : Mégasprint « dernière ligne droite Back-End » — Vague 3 (Refonte du Scoring, suite)
**Owning Neteru** : Mestor (Notoria sub-agent) · Seshat (lecture scores)
**Relates to** : ADR-0088 (function-calling recos), ADR-0089 (ambition selection), ADR-0086 (score multi-dimensions), commit `f42bf7d` (Vague 2 — brand-tier déterministe)

---

## 1. Contexte

La Vague 2 a rendu le **score** déterministe (ladder 6 paliers, evidence ceiling,
zéro LLM dans le scorer — LOI 9). Restait la moitié amont du chantier « Refonte
du Scoring (Déterminisme Radical) » :

> « L'application des recommandations (Notoria) doit impacter dynamiquement le
> score. Chaque reco doit être incontestable. Une nouvelle reco ne doit
> remplacer l'ancienne qu'avec un meilleur score correctement pondéré. Ma
> solution : attribuer un agent/ruler LLM et/ou déterministe à CHAQUE champ de
> l'ADVE pour éviter la dilution de la rigueur. » — mandat opérateur, 2026-06

Constats d'audit (2026-06-12) :

1. `applyRecos` recalculait bien le score (`scoreObject`, lifecycle.ts) — mais
   **aucune comparaison ancien/nouveau contenu** : la dernière reco appliquée
   gagnait toujours, même si elle dégradait un champ riche en boilerplate.
2. **Aucun score par champ** : le structural scorer agrège par pilier ; la
   Variable Bible (~300 specs) ne servait que de prompt LLM + validation de
   forme (`validateAgainstBible`), jamais de juge de qualité.
3. **Aucun preview d'impact** : l'opérateur acceptait une reco sans voir son
   effet sur le composite /200.
4. Bug latent découvert pendant le chantier : `UPDATE_ADVE_FIELD` (payload
   typé ADR-0088) porte la clé pilier **MAJUSCULE** (`ADVE_KEYS`) mais
   `applyPayloadToPillars` indexait la map minuscule → écriture dans un
   pilier fantôme `"A"` jamais persisté. Corrigé dans cette vague.

## 2. Décision

### 2.1 Un ruler DÉTERMINISTE par champ — pas de LLM

Le mandat ouvrait « LLM et/ou déterministe ». La consigne transverse du
mégasprint (« optimise pour dépendre au minimum des LLMs ») tranche :
**ruler 100 % déterministe**, dérivé automatiquement de la Variable Bible pour
chacun des ~300 champs (+ ruler générique pour tout champ hors Bible).
Un LLM-judge aurait réintroduit la variance que la Vague 2 vient de tuer
(LOI 9 : pas de LLM dans le chemin de scoring).

`src/server/services/notoria/rulers.ts` — `evaluateField(pillarKey, field, value)`
retourne un verdict reproductible (variance 0) :

| Dimension | Poids | Ce qu'elle mesure |
|-----------|-------|-------------------|
| presence | 0.25 | non-vide, non-placeholder (TODO, « à définir », lorem…) |
| structure | 0.20 | violations Bible (`validateAgainstBible` réutilisé — pas de doublon) |
| richesse | 0.20 | densité vs bande [minLength, maxLength], remplissage des feuilles |
| specificite | 0.20 | faits concrets (chiffres, noms propres) vs buzzwords génériques |
| conformite | 0.15 | règles métier Bible respectées |

`pass = (aucune violation BLOCK) && score ≥ 40` (RULER_PASS_THRESHOLD).

### 2.2 Le score pondéré « incontestable » d'une reco

```
weightedScore = 0.45 × rulerScore(proposedValue)
              + 0.35 × clamp(50 + scoreImpactEstimate × 10, 0, 100)
              + 0.20 × confidence × 100
```

- `rulerScore` : qualité intrinsèque de la valeur proposée (déterministe).
- `scoreImpactEstimate` : **delta composite /200 simulé** par
  `preview-impact.ts` — même formule que le scorer canonique
  (`getStrategyPillarInputsFromContent` extrait de `advertis-scorer/structural.ts`,
  une seule source de vérité). 50 = neutre, ±10 pts par point composite.
- `confidence` : la confiance déclarée à la génération (LLM ou typed).

Persisté sur chaque `Recommendation` (migration additive nullable) :
`rulerScore`, `rulerVerdict` (Json), `scoreImpactEstimate`, `weightedScore`,
`predecessorId` (lineage de remplacement).

### 2.3 Le gate de remplacement (hard à l'application)

`compareForReplacement(old, new)` :

- champ vide → remplissage **toujours autorisé** ;
- nouvelle valeur en violation BLOCK Bible → **toujours refusé** ;
- sinon : la nouvelle doit battre l'existant d'au moins
  **RULER_REPLACEMENT_MARGIN = 2 pts** (hystérésis anti-churn). Le titulaire
  est évalué avec baseline neutre (impact 0, confidence 1 — bénéfice du
  contenu en production).

Deux points d'application :

1. **À la génération** (`engine.persistBatch`) : verdict + impact + weighted
   calculés pour TOUTE reco ; si le remplacement serait refusé →
   `applyPolicy = requires_review` + `validationWarning` visible. Le
   catalogue Notoria reste complet (Notoria catalogue, ne censure pas).
2. **À l'application** (`lifecycle.applyRecos`) : gate **dur**. Les recos
   inférieures sont marquées `REJECTED` avec
   `revertReason = RULER_REPLACEMENT_BLOCKED` + warning détaillé. Périmètre :
   mutations qui REMPLACENT du contenu (legacy SET/MODIFY + payload typé
   `UPDATE_ADVE_FIELD`). Les mutations id-ciblées (SET_RISK_STATUS,
   SELECT_INITIATIVE, ADD_*, SELECT_ROADMAP_ROUTE) passent sans comparaison.

**Le chemin manuel `OPERATOR_AMEND_PILLAR` n'est PAS gaté** — l'humain dispose
(ADR-0060 manual-first, Blueprint §5.6). Le ruler n'y produit que des warnings.

### 2.4 Lineage de remplacement

Chaque reco APPLIED reçoit `predecessorId` = la reco APPLIED/REVERTED la plus
récente sur le même (pilier, champ). L'historique de remplacement d'un champ
devient une chaîne auditable — alignée Q1 traçabilité.

### 2.5 Preview opérateur

tRPC `notoria.previewRecoImpact({ strategyId, recoIds })` → par reco :
`{ compositeBefore, compositeAfter, delta, perPillar }`. Simulation pure
(deep-clone, zéro écriture, zéro LLM). UI cockpit Notoria : chip « ◈ N »
(weightedScore) avec tooltip ruler/impact.

## 3. Alternatives écartées

- **LLM-judge par champ** : réintroduit la variance et le coût ; viole la
  consigne mégasprint + LOI 9. Écarté.
- **Blocage dès la génération** (ne pas persister les recos inférieures) :
  casse la doctrine « Notoria catalogue les futurs possibles » (Blueprint
  §3.7) et prive l'opérateur de visibilité. Écarté au profit du
  requires_review à la génération + hard gate à l'application.
- **Gate aussi sur OPERATOR_AMEND_PILLAR** : violerait « l'humain dispose ».
  Écarté — warnings seulement.
- **Recompute score par reco pendant le batch apply** : O(N) écritures
  ScoreSnapshot pour un seul geste opérateur ; le recompute batch final +
  preview par reco couvre les deux besoins. Écarté.

## 4. Conséquences

- Une reco ne peut plus dégrader silencieusement un champ : le remplacement
  est gagné au mérite, tracé, reproductible.
- Le score composite reste la grandeur unique (Vague 2) ; cette vague ajoute
  la grandeur **par champ** qui manquait pour rendre chaque reco défendable.
- 4 nouveaux invariants testés : déterminisme du ruler (variance 0), poids
  sommant à 1, gate refuse l'inférieur / autorise le supérieur, simulation
  pure sans mutation d'entrée. `tests/unit/services/notoria-rulers.test.ts`
  + `preview-impact.test.ts`.
- Migration Prisma additive `20260612060000_adr0090_reco_rulers` (5 colonnes
  nullable — aucune donnée existante touchée).
- Cap APOGEE 7/7 préservé — Notoria reste un sub-agent de Mestor, le ruler
  est une mécanique interne de Notoria, pas un Neter.
