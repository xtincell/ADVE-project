# ADR-0150 — Canon du scoreur éditable par l'opérateur (ratification a posteriori)

- **Status** : Accepted
- **Date** : 2026-07-15
- **Phase** : Suite du chantier Scoreur (ADR-0149) — demande opérateur : « possible de modifier les θ des ancres et les items must-have dans un écran a posteriori ? ». Ferme la dette « ratification opérateur » (brief §8 a/b) tracée à ADR-0149.
- **Depends on** : ADR-0149 (scoreur à force révélée), ADR-0124 (spine), ADR-0046 (P22-2)
- **Supersedes** : —

## Contexte

Les valeurs canon du scoreur (θ des ancres-étalons, jauge par échelle, liste des
items must-have) étaient livrées **PROPOSÉES**, figées en code (`anchors.ts`/
`palier.ts`). Les changer exigeait un redéploiement. L'opérateur veut les **ratifier
et ajuster dans un écran**, sans redeploy — exactement la « surface opérateur +
preview d'impact » prévue par l'artefact (comme les `notoria/rulers`).

## Décision

### 1. Cœur pur rendu injectable (`src/domain/scoreur/`)

Les fonctions de jauge (`thetaToForce`/`gaugeForScale`/`defaultThetaForScale`) et de
palier (`itemsTier`/`computeVerdict`) acceptent un paramètre **optionnel** de canon
(`gauge`, `items`) dont le **défaut reste la constante code**. `scoreFromEpreuves`
gagne `canon?: { gauge?; items? }`. Zéro changement de comportement sans override
(tests historiques verts). Zéro-LLM.

### 2. Override de donnée par-dessus le défaut code (`ScoreurCanonOverride`)

Modèle Prisma additif (`kind` GAUGE|ITEM, `key`, `data` Json, `active`) — migration
`20260715071557`. Absent ⇒ la valeur code s'applique ; présent ⇒ il gagne.
`resolveScoreurCanon()` fusionne les overrides actifs sur les défauts (jauge par
échelle ; items : edit / déplacement de palier / ajout / retrait via `removed:true`).
Les **θ des ancres/items** vivent déjà sur `BrandRef.fixedTheta` — **édités en place**
(pas de nouveau modèle).

### 3. Écriture gouvernée (SESHAT) + preview

Service `seshat/scoreur/canon.ts` : `upsertGaugeOverride` / `upsertItemOverride` /
`removeItemOverride` / `resetCanonOverride` / `updateAnchorTheta`. 2 Intent kinds
gouvernés `requireOperator` : `SESHAT_EDIT_SCOREUR_CANON` (op discriminée SET_GAUGE /
SET_ITEM / REMOVE_ITEM / SET_ANCHOR_THETA) + `SESHAT_RESET_SCOREUR_CANON`. `scoreBrand`
charge le canon résolu et l'injecte. `scoreur.previewBrand` re-score sans persister
(voir l'effet d'un edit avant de le garder).

### 4. Écran opérateur (`/console/signal/scoreur-canon`)

Édite les θ des étalons, la jauge par échelle, et les portes must-have (palier/arène/
libellé, ajout, retrait, reset) + preview d'impact. Chaque geste = un Intent gouverné.
DS-compliant, jamais exposé au client (GROUND_INFRASTRUCTURE).

## Conséquences

- Les valeurs canon deviennent **ratifiables et ajustables sans redéploiement**.
  Vérifié E2E (`scripts/verify-scoreur-canon.ts`) : éditer la jauge change la force
  d'une marque déjà scorée (106.8 → 112.9), reset la restaure — réversible.
- Le défaut code reste la source de vérité tant qu'aucun override n'existe (P22-2 :
  pas de valeur fabriquée ; un override est un geste opérateur explicite, audité).
- 0 LLM (LOI 9), 1 modèle additif, cap APOGEE 7/7 préservé, `scoring.ts` intact (D9).

## Dette (incréments suivants)

- Preview d'impact **agrégé** (re-score toutes les marques d'une ligue + diff de
  paliers) au lieu d'une marque à la fois.
- Historique des overrides (qui a changé quoi, quand) au-delà de `updatedByUserId`.
- Verrou HARD single-writer sur `ScoreurCanonOverride` (table de config, risque faible
  — non bloquant).
