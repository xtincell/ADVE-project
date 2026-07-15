# ADR-0149 — Scoreur à force révélée (Bradley-Terry/Rasch, zéro-LLM)

- **Status** : Accepted
- **Date** : 2026-07-15
- **Phase** : Chantier « Graphes & Scoreur à force révélée » (C3/3) — brief opérateur 137f4f21. Cœur : l'unité de mesure des marques. Consomme C1 (arène E) + C2 (arène T).
- **Depends on** : ADR-0147 (Identity Graph, arène E), ADR-0148 (Overton Graph, arène T), ADR-0126 (échelle de marché / plancher), ADR-0127 (polity), ADR-0135 (last-touch), ADR-0102 (complétude structurelle — INTACTE), ADR-0124 (spine), ADR-0046 (P22-2)
- **Supersedes** : —

## Contexte

La v1 du score **notait des attributs** via des proxys d'opinion (« la DA vaut ce que
disent les awards ») — biais culturel dans le signal, poids arbitraires, aucune
incertitude. La version définitive **inverse le geste** : on ne note plus rien, on
**compte des victoires**. La force θ est le nombre qui explique le mieux l'ensemble
des résultats observés (Elo aux échecs, Rasch aux tests, LMArena aux LLM). `grep -i
"scoreur\|force révélée\|bradley\|epreuve" docs/governance/CODE-MAP.md` → négatif. On
crée, en réutilisant la régression pure-TS de la Phase 23, la polity (ADR-0127), les
gates superfan (ADR-0141) et les deux graphes C1/C2.

## Décision

### 1. Une primitive : l'épreuve dyadique (`Epreuve`, append-only)

Deux formes, un estimateur : **duel** (marque vs rival réel) et **item** (marque vs
must-have canon à difficulté fixée — Rasch). Résultat WIN/LOSS/DRAW **observé, jamais
estimé** ; poids = fiabilité de PREUVE (`{ fort:1, moyen:.5, item:.4 }`) ; source +
date. `BrandRef` = registre léger des adversaires hors-plateforme (rivals/ancres/items)
— **PAS un `Strategy`** (§5.1).

### 2. Estimateur (`src/domain/scoreur/bradley-terry.ts`, pur, déterministe)

`P(i≻j) = 1/(1+10^((θj−θi)/400))`. θ̂ maximise la log-vraisemblance pondérée (montée
de gradient batch, **init déterministe à défaut, JAMAIS `Math.random`, ordre-indépendant**
— discipline `superfan-attribution`). Ancres à θ **fixé** (la jauge, non estimées).
RD = 1/√(information de Fisher) : peu d'épreuves ⇒ intervalle large. Zéro dépendance npm.

### 3. Ligues, ancres, jauge (`anchors.ts` — θ PROPOSÉS, ratification opérateur)

Ligue = polity (secteur × échelle × pays, ADR-0126/0127). `ANCHOR_REGISTRY` : étalons
à θ fixé (Apple 2200, Église catholique 2200, Coca-Cola 2150, France 2100, MJ 2100,
Musk 2050 + panafricains Dangote/MTN/Burna/Nollywood + repères nationaux/quartier).
`GAUGE_BY_SCALE` mappe θ→force 0-40/arène par échelle (l'ICONE mondiale 2200 > l'ICONE
de quartier 1500 : même règle, chacun à sa place). Le biais culturel est résolu
**structurellement** : un maquis d'Abidjan est mesuré sur ses rivaux réels dans sa polity.

### 4. Modulateurs + palier (`palier.ts` — items PROPOSÉS)

Cohérence **R** (dérivée, aucune collecte) = 1 − dispersion normalisée des forces
d'arène. `palier = min(bande(force×R), items)`. `MUST_HAVE_ITEMS` (Michelin, escalade
stricte jamais waivable) : FRAGILE(dirigeant) · ORDINAIRE(mythe, market-fit) ·
FORTE(actif-distinctif, cohérence≥0.7) · CULTE(duel de cadre Overton, masse superfan ≥
plancher de ligue `resolveEvidenceTargets`) · ICONE(tenue, crise survécue). Force sur
**/200** (5 arènes × 40), `classifyTier` réutilisé. **`scoring.ts` (ADR-0102) INTACT** —
deux scores, deux rôles, jamais fusionnés (D9, test HARD).

### 5. Compilateur + single-writer + gouvernance (SESHAT, cap 7/7)

`seshat/scoreur/` = seul écrivain (`Epreuve`/`BrandRef`/`ScoreVerdict`, verrou HARD).
Le compilateur ne compile QUE le mesuré : arène **E** ← superfans dédupliqués (Identity
Graph) vs plancher ; arène **T** ← transitions Overton favorables/adverses. A/D/V ←
épreuves persistées sourcées. Source absente ⇒ épreuve absente ⇒ RD large (P22-2). 2
Intent kinds SESHAT (`SESHAT_RECORD_EPREUVE`, `SESHAT_SCORE_BRAND`), portes
governedProcedure requireOperator. **Leaderboard PUBLIC** `/leaderboard` +
`scoreur.leaderboard`/`verdict` (publicProcedure, verdict-only, aucune PII).

### 6. Verdict = le palmarès

Rendu déterministe : par arène θ±RD + wins/losses/count + couverture % + gates
cochés/manquants + `cappedReason`. Aucune phrase générée.

## Conséquences

- La force devient une **préférence révélée** traçable épreuve par épreuve, avec
  incertitude native et couverture publiée. Reproductible (2 runs = même sortie).
- Vérifié E2E (`scripts/seed-scoreur-demo.ts`, `npm run db:seed:scoreur`) : 3 marques
  d'une ligue scorées, θ reproductibles, paliers gatés, couverture affichée, historisées
  au leaderboard public.
- 0 LLM sur tout le pipeline (LOI 9), single-writer + HARD, migration additive, cap 7/7.

## Dette (incréments suivants)

- **Ratification opérateur** des θ d'ancres (§3) et de la liste d'items must-have (§4)
  — valeurs PROPOSÉES (brief §8 a/b).
- **Scrappeur légit** A/D/V (Google Trends, autocomplete, Trustpilot/G2, Wikipédia,
  presse, awards) — credential/ToS-gated ; aujourd'hui A/D/V via épreuves persistées.
  Pattern `ConnectorResult<T>` P22-1, dégradation honnête.
- **Tenue** : trajectoire de θ dans le temps (snapshots datés `ScoreVerdict`) → item
  ICONE. Aujourd'hui les snapshots sont posés ; la fenêtre glissante reste à câbler.
- Duel de vocabulaire (adoption lexicale) branché aux corpus feeds (helper prêt,
  `measureVocabularyDuel`).
- Ponts inter-ligues (marques multi-ligues) pour la comparaison absolue.
