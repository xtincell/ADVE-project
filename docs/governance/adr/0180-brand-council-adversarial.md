# ADR-0180 — Conseil de marque (coordinateur + 4 experts A/D/V/E adversariaux)

- **Status** : Accepted
- **Date** : 2026-07-26
- **Phase** : Chantier « Conseil de marque + chat Assistant + MCP réel » — WP3
- **Depends on** : ADR-0179 (surface streaming), ADR-0067 (`executeStructuredLLMCall`), ADR-0060 (manual-first parity), ADR-0126 (contexte marque réel)
- **Supersedes** : —

## Contexte

Demande opérateur : une équipe d'experts de la marque qui exploite l'intel ADVE —
« un coordinateur qui connaît tout l'ADVERTIS en RAG et ses 4 subordonnées qui
connaissent en détail les 4 piliers et qui agissent en adversarial ». Objectif :
donner du muscle au raisonnement stratégique (chat cockpit + accès MCP externe).

Audit anti-doublon (grep CODE-MAP « conseil/council » + 4 surfaces, 2026-07-26) :
- `mestor/swarm.ts` = orchestration hiérarchique d'exécution d'Intents (pas du
  raisonnement advisory multi-persona) ;
- `mestor/commandant.ts` = décideur LLM de recommandations (mono-voix, pas
  adversarial) ;
- `neteru-shared/pillar-directors.ts` = **gates DÉTERMINISTES** de santé/writeback
  par pilier (zéro LLM, pas des critiques) ;
- `LEGACY_CONSULTING_*` (ADR-0113) = chaîne de preuve d'une mission de conseil
  facturée, pas un panel d'experts.

Aucun n'offre un **panel producteur-vs-critique multi-persona** sur la stratégie.
Capacité NOUVELLE → cet ADR. Réutilise `assessAllPillarsHealth` (input
déterministe des experts) plutôt que de le redéfinir.

## Décision

### 1. Sous-service MESTOR — `src/server/services/mestor/council/` (PAS un Neter)

Le conseil est une capacité **advisory en LECTURE SEULE** sous la tutelle Guidance
de Mestor — comme `insights.ts` / `hyperviseur.ts`. **Aucune entrée `BRAINS`,
aucun nouveau Neter (cap APOGEE 7/7 intact)**, aucun nouvel Intent kind : le
conseil n'écrit jamais un pilier, n'émet jamais d'Intent (test HARD).

- `personas.ts` — 5 personas en **constantes TS** (coordinateur sans `pillarKey`
  + 4 experts mappés a/d/v/e). Mandat adversarial explicite : « CHALLENGER au nom
  de ton pilier ; un APPROVE sans critique substantielle est un échec de ton
  mandat ; chaque critique cite un champ précis ». Anti-fabrication imposée.
- `context.ts` — `buildAssistantContext` (dossier complet : 8 piliers verbatim via
  `serializePillar`, score, RAG hybride `getOracleBrandContextByQuery`, communauté
  mesurée) + `buildExpertContext` (SON pilier + RAG scopé + santé déterministe).
  **Chaque bloc `wrapUntrusted`** (pattern i-pillar-sequenced) + `UNTRUSTED_NOTICE`.
- `schemas.ts` — Zod : `councilDraftSchema` / `expertCritiqueSchema` /
  `councilSynthesisSchema` (dont `dissent` — désaccords non résolus livrés tels
  quels, honnêteté > consensus fabriqué).
- `index.ts` :
  - `askCouncilStream` — tour de chat : **1 appel streamé** du coordinateur
    (latence d'abord ; pas de consultation d'experts en interactif v1) ;
  - `askCouncilOnce` — variante non-streamée (tool MCP) ;
  - `deliberate` — mode « analyse approfondie » : draft coordinateur →
    **4 critiques A/D/V/E en parallèle** (`executeStructuredLLMCall`,
    `Promise.allSettled`, timeout 90 s/appel) → synthèse. Dégradations honnêtes :
    0 expert OK → `deliberated:false` (draft seul) ; pre-flight
    `isTextLLMAvailable` → `UNAVAILABLE`. Budget Thot par appel (jusqu'à 6).

### 2. Exposition v1

- Cockpit = chat seul (`askCouncilStream` via `/api/chat`).
- Délibération = tool MCP `council.deliberate` + `mestorRouter.councilDeliberate`
  en `operatorProcedure` (query advisory, précédent `previewAmend` lecture-LLM) —
  **opérateur only** car ~6 appels LLM (le coût reste une décision UPgraders).

## Conséquences

- Tests : `council-uses-gateway.test.ts` (HARD — pas d'import SDK direct,
  `wrapUntrusted` obligatoire, lecture seule, 5 personas + mapping + mandat
  adversarial) + `mestor-council-deliberate.test.ts` (dégradations LLM mocké).
- Cap APOGEE 7/7 préservé.
- **Déféré (RESIDUAL-DEBT)** : persistance des minutes de délibération
  (`BrandAsset kind=COUNCIL_MINUTES` via Intent MESTOR) ; UI cockpit « Analyse
  approfondie » + progression NSP (pattern `oracle-section/stream-events`) ;
  consultation d'experts dans le tour interactif (v2, budget latence).
