# ADR-0154 — Canon des trois scores + surface gouvernée « Prospect Scoring »

- **Statut** : Accepted
- **Date** : 2026-07-15
- **Gouverneur** : Seshat (scoreur, ADR-0149 ; Hunter = sub-agent Argos, ADR-0100)
- **Cap APOGEE** : 7/7 — 1 seul point LLM (`SESHAT_HUNT_VICTORIES`), 1 modèle additif

## Contexte

Un opérateur veut **scorer un prospect et son concurrent, et les placer sur le
leaderboard public** pour créer l'envie de se positionner (*Buffalo Grill Abidjan
#2 · 41/200 vs Burger King CI #1 · 88/200*). Jusqu'ici c'était possible seulement
via des scripts de dev jetables (`scripts/run-moulinette.ts`,
`scripts/onboard-external-brand.ts`) — une rustine.

## Décision — 1. Canon des trois scores

Trois scores distincts, **jamais fusionnés** (invariant D9) :

| Score | ADR | Exposition | Rôle |
|---|---|---|---|
| **Complétude structurelle /200** | 0102 | **interne** (console/cockpit opérateur, jamais public) | instrument de travail du conseil — à quel point l'ADVE est rempli/mûr |
| **Empreinte /100** | 0151 (`/scorer`) | **public anonyme** (sans email, éphémère) | quick-win du haut de funnel — le hook |
| **Force révélée /200** | 0149 (`/leaderboard`) | **public mérité** | pour les **engagés** : les victoires accumulées, le championnat |

Le leaderboard est **publiquement visible** (vitrine aspirationnelle) mais on n'y
figure qu'en étant **mesuré** (engagé). Le prospect y est **placé par l'opérateur**
pour créer la traction ; il y grimpe en travaillant avec La Fusée. Le scoreur ne
lit **jamais** les piliers ADVE — la force révélée n'exige pas l'ADVE (données
publiques : footprint, victoires). L'ADVE = l'étape d'après (diagnostic).

## Décision — 2. La surface gouvernée

### Lane governedProcedure (pas d'orchestrateur bus)

`SESHAT_SCORE_BRAND` et `ENRICH_E_FROM_PUBLIC_FOOTPRINT` sont des kinds
**governedProcedure-lane** (absents du `Intent` union / du commandant). Un
orchestrateur serveur façon `ASSEMBLE_ORACLE` ne peut donc pas les `emitIntent`
sans les **promouvoir en bus Intents** — promotion fragile (switch exhaustif). On
**refuse** cette promotion et on oriente vers l'**orchestration côté client,
par-marque** : le bouton « Mesurer et placer » fait boucler le client sur une
mutation gouvernée **par marque**. Chaque marque = **une émission gouvernée**
(audit granulaire, spine ADR-0124). Pas de NSP (mutations courtes, spinner par
marque). Plus robuste que le monolithe, pas moins.

### 3 kinds governedProcedure-lane (governor SESHAT, requireOperator)

1. `SESHAT_SCORE_PROSPECT` (sync, **0 LLM**) — pour une marque : shell
   Client+Strategy (secteur canonicalisé ADR-0152, échelle déclarée ADR-0126) →
   `rerunPublicEnrichmentForStrategy` (footprint → pilier E → arènes A/V, ADR-0121
   /0153) → `scoreBrand(persist)`. Idempotent.
2. `SESHAT_HUNT_VICTORIES` (sync, **LLM via Gateway** — seul point LLM) — pour un
   couple (sujet, rival) : Hunter cherche des **victoires dyadiques documentées
   sourcées** → `EpreuveCandidate[]`. Réutilise le harnais Argos (Brave grounding
   + `executeStructuredLLMCall`, ADR-0067/0100). Ajouté au manifest Seshat avec
   `sideEffects:["LLM_CALL"]` → cost-gate Thot (Loi 3).
3. `SESHAT_DECIDE_EPREUVE_CANDIDATE` (sync, **0 LLM**) — APPROVE → `recordEpreuve`
   (voie unique existante) ; REJECT → statut.

Comme `SESHAT_HARVEST_REFERENCE` (argos), `SESHAT_HUNT_VICTORIES` est un Intent
direct **sans Glory tool** : primitive de récolte-vers-quarantaine, pas de
production d'asset (justification NEFER §3.1).

### Modèle `EpreuveCandidate` (la quarantaine) — nouveau, justifié

Anti-doublon (greps Phase 2) : pas de `model Prospect` (→ Client+Strategy shell,
ADR-0098) ; footprint déjà collecté (→ `ENRICH_E`) ; scoring existant (→
`SESHAT_SCORE_BRAND`). **Un seul modèle nouveau** : `EpreuveCandidate`.

**Refus explicite** d'un simple statut sur `Epreuve` : le registre `Epreuve` est
LA seule donnée du scoreur, **lue intégralement** par le compilateur. Y mettre du
non-revu obligerait à filtrer partout — un oubli = **victoires LLM fabriquées dans
le score** (violation P22-2 structurelle). La quarantaine DOIT être un modèle
séparé. Précédents : `MissionApplication` (candidater→revue→décision),
`BrandAssetState` CANDIDATE→SELECTED.

**Gardes déterministes** : candidate **sans `sourceUrl` → auto-REJECT** (aucune
victoire non sourcée n'atteint la file) ; dédup par `dedupHash`.

## Invariants (verrous CI HARD)

1. Single-writer `EpreuveCandidate` (seul `scoreur/candidates.ts`).
2. **Quarantaine étanche** : le compilateur / `scoreBrand` ne référencent jamais
   `epreuveCandidate` → une victoire non approuvée ne peut pas entrer dans un score.
3. `victory-hunt` n'écrit jamais `Epreuve` ni n'appelle `recordEpreuve`.
4. `sourceUrl` obligatoire (garde auto-REJECT testé).
5. Manual-first (ADR-0060) : `recordEpreuve` (voie manuelle) précède le LLM ;
   `decideCandidate` l'appelle.

## Conséquences

- Le prospect **apparaît sur le leaderboard public dès que l'opérateur le mesure**
  (décision validée) — données 100 % publiques, 0 PII, couverture affichée.
- Les scripts `run-moulinette`/`onboard-external-brand` restent des harnais dev ;
  la voie produit est `/console/signal/prospect-scoring`.
- Cap APOGEE 7/7. 1 migration additive. PROPAGATION-MAP entrée A15.

## Déféré (RESIDUAL-DEBT)

- Hunter LLM contract-gated : sans clé LLM/Brave → **DEFERRED honnête**, 0 candidate.
- Planchers d'audience (ADR-0153) ratifiables par marché (pattern ADR-0150).
