---
name: ADVE-RTIS Philosophy & Pipeline
description: Core philosophy of LaFusee Industry OS — 3-phase pipeline, superfan north star, Artemis/Mestor/Seshat triangle, Oracle as living deliverable
type: project
---

## LaFusee = industrialiser la création de cultes + monitorer l'industrie

La north star universelle est le **superfan** — pas un KPI, le critère de succès de tout l'écosystème.

## Protocole ADVE-RTIS en 3 phases

**Phase 1 — ADVE : L'audit gratuit (intake)**
- A (Authenticité), D (Distinction), V (Valeur), E (Engagement)
- Analyse l'existant de la marque. Ce que tu ES.

**Phase 2 — R+T : L'audit profond (recalibre ADVE)**
- R = SWOT interne (forces/faiblesses/menaces/opportunités de la marque)
- T = SWOT externe (marché, concurrents, tendances, validation terrain)
- R+T sont des **piliers dérivés** (rows `Pillar` avec `pillarKey` r/t — jamais édités à la main, contrainte type-level ; refresh via `ENRICH_R_FROM_ADVE` / `ENRICH_T_FROM_ADVE_R_SESHAT`) qui **fonctionnent comme des outils de diagnostic** pour recalibrer ADVE — on ne les « remplit » pas
- Boucle itérative : R+T révèlent les lacunes d'ADVE → l'opérateur les corrige (via `OPERATOR_AMEND_PILLAR`, décision manuelle — ADR-0085) → les scores montent

**Phase 3 — I+S : Les recommandations (one-shot ou retainer)**
- I = Catalogue EXHAUSTIF de tout ce que la marque PEUT faire (assets, formats, canaux, activations)
- S = Fenêtre d'Overton + plan d'action + roadmap pour créer des superfans
- Ne vient qu'une fois ADVE suffisamment solide

**Why:** Le user a clarifié que R n'est PAS le plan d'action (c'est S), I n'est PAS un sprint 90j (c'est le catalogue complet), et l'intake ne crée que les 4 premiers piliers ADVE.

**How to apply:** Toute modification de l'UX, des labels, ou du flow doit respecter cette séquence. Les scores sont secondaires — l'output principal est L'Oracle (présentation stratégique vivante).

## Triangle Artemis-Mestor-Seshat

- **Artemis** : 28 frameworks analytiques en 9 couches (IDENTITY→VALUE→EXPERIENCE→VALIDATION→EXECUTION→MEASUREMENT→GROWTH→EVOLUTION→SURVIVAL — registre `FRAMEWORKS`, recompte 2026-07-11). Moteur qui alimente des sections de L'Oracle (runner `FRAMEWORK`).
- **Seshat** : écoute marché, knowledge graph, signaux faibles, benchmarks. Comme Aladdin de BlackRock.
- **Mestor** : aide à la décision proactive. Synthétise Artemis + Seshat en prescriptions actionnables.
- Cascade : quand un pilier ADVE change → la staleness se propage aux dérivés (RTIS, sections Oracle) ; le refresh est déclenché par Intents gouvernés explicites — **jamais d'auto-écriture silencieuse** (STOP à Jehuty, ADR-0085 ; frameworks lançables manuellement post ADR-0125).

## L'Oracle

Document stratégique VIVANT (pas un PDF statique) en **35 sections / 3 tiers** (23 CORE + 7 BIG4_BASELINE + 5 DISTINCTIVE — ADR-0014/0045, `SECTION_REGISTRY`). Se met à jour quand les données changent (staleness per-section + assemblage read-time).

## Acteurs de l'industrie

| Acteur | Portail | Rôle |
|--------|---------|------|
| Marque | Cockpit | Le sujet — se transforme en culte |
| Agence | Agency | L'architecte de la transformation |
| Freelances | Creator | Les mains — produisent les assets du culte |
| Opérateur | Console | Le pilote — orchestre l'industrie |
| Consommateurs | (Superfan tracking) | La preuve — deviennent des fidèles |
| Régies | (Media/Distribution) | L'amplification |
