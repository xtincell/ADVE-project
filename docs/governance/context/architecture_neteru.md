---
name: NETERU — Le Panthéon (5 Neter actifs + 2 pré-réservés)
description: Panthéon de gouvernance La Fusée. 5 Neteru actifs (Mestor, Artemis, Seshat, Thot, Ptah) + 2 pré-réservés (Imhotep, Anubis). Plafond APOGEE = 7. Source narrative complète : PANTHEON.md.
type: project
---

## NETERU = Le Panthéon de La Fusée

Mythologie : panthéon de gouvernance inspiré de l'Égypte ancienne (Neteru = forces divines, pluriel de *Neter*) avec quelques noms grecs admis (Mestor, Artemis). Plafond APOGEE = 7 ([§9](../APOGEE.md)). Source de vérité narrative complète : [PANTHEON.md](../PANTHEON.md).

### Les 5 Neteru actifs

#### MESTOR — Décide et conseille (Guidance)

Cerveau LLM stratégique. Décide, conseille, tranche, dispatcher unique d'Intents.
- **Commandant** = Lead stratégique, jugement LLM de haut niveau
- **Hyperviseur** = Planificateur déterministe, construit et exécute les plans d'orchestration
- **RTIS Cascade** = Génération de contenu pour les piliers R/T/I/S
- **Insights** = Veille proactive, alerte le Commandant
- **Règle d'or** : toute mutation business passe par `mestor.emitIntent()`. Pas de bypass.

#### ARTEMIS — Produit les briefs (Propulsion phase 1)

Orchestre les Glory tools rédactionnels et **produit les briefs**. Output = textes structurés (concept, copy, script, brand-bible, naming, kv-prompt).
- **GLORY Tools (91)** = Son arsenal de thrusters rédactionnels en 4 couches (CR, DC, HYBRID, BRAND)
- **31 Sequences** = Combos d'outils enchaînés (MANIFESTE-A, SPOT-VIDEO, CAMPAIGN-360, etc.). Skill tree avec prérequis par tier.
- **24 Frameworks** = Diagnostics structurés (analyse, enrichissement, croissance)
- **Glory tools brief-to-forge** : produisent un `ForgeBrief` avec `forgeSpec` → handoff downstream à **Ptah** pour matérialisation
- **Glory tools brief-only** : produisent un brief texte qui reste consommé en l'état (ex: brand-bible-extractor)
- **Livrable phare** : **L'Oracle** — le one-shot standard industriel maximal du conseil de marque (livrable, pas moteur).

#### SESHAT — Observe et prévoit (Telemetry)

LLM cerveau de la connaissance. Capte les signaux, indexe, prévoit.
- **Source du pilier T** (Track) — alimente la réalité marché
- **Socle des rapports et études de marché**
- **Knowledge Graph** = benchmarks, case studies, best practices, patterns sectoriels
- **Tarsis** = sub-component (PAS un Neter). Outil de curation de data — collecte/structure les données puis donne les grilles de lecture à Seshat. Interprète les signaux faibles.
  - Exemple : anticiper la montée des prix de la farine chez un fournisseur à partir de plusieurs articles de presse rapportant des problèmes dans des champs de blé d'une zone clé
- **Asset impact tracker** (post-Ptah, Phase 9) — mesure pour chaque AssetVersion déployée : engagement, viralité, conversions superfans → calcule `cultIndexDeltaObserved`. Boucle feedback Ptah.

#### THOT — Maintient en vol (Sustainment + Operations)

Fuel manager. Connaît le propellant restant par operator/brand. Veto/downgrade des Intents qui mettraient la mission en faillite.
- **CHECK_CAPACITY pre-flight** de chaque Intent coûteux
- **Cost gate** Pillar 6 (Phase 3)
- **Tables ROI par manipulation mode** dans `financial-brain/manipulation-roi-tables.ts`
- **Extension Operations Ground Tier** : commission-engine, contracts, escrow, mobile-money — finances Mission et Operations sont la même mécanique

#### PTAH — Forge les assets (Propulsion phase 2, downstream Artemis)

Démiurge créateur par le verbe. **Matérialise les briefs Artemis en assets concrets** (image/vidéo/audio/icône/design layered/stock ingéré/refiné/transformé/classifié) via providers externes.
- **Activation Phase 9** (ADR-0009)
- **4 providers** : Magnific (95% surface multimodale), Adobe Firefly Services (post-prod layered), Figma (design tokens + Variables), Canva (templates branded — gated par flag)
- **Cascade** : Mestor → Artemis brief → Ptah forge → Seshat observe → Thot facture
- **Sentinel Phase H** : `PTAH_REGENERATE_FADING_ASSET` quand engagement chute >30% vs peak (Loi 4 régime apogée)

### Les 2 Neteru pré-réservés (slots 6 et 7)

#### IMHOTEP — Crew Programs (Phase 7+, ADR-0010)

Sage humain égyptien déifié. Master of Crew. Décide qui peut embarquer (matching), évalue le talent (tier-evaluator), forme (académie). Le seul Neter humain divinisé du panthéon.

#### ANUBIS — Comms (Phase 8+, ADR-0011)

Psychopompe égyptien. Master of Comms. Messages cross-portail, ad networks, social posting, broadcast email/SMS. KPI primaire = `cost_per_superfan_recruited` (pas reach/CTR).

## La Manipulation Matrix (paramètre transverse)

4 modes décrivant *comment* la brand transforme l'audience en propellant : **peddler** (transactionnel direct), **dealer** (addiction structurelle), **facilitator** (utilité), **entertainer** (divertissement organique). Stocké dans `Strategy.manipulationMix` (somme = 1). Mestor pre-flight `MANIPULATION_COHERENCE` gate refuse les Intents hors mix. Source : [MANIPULATION-MATRIX.md](../MANIPULATION-MATRIX.md).

## NETERU-SHARED (dual-citizen Mestor ↔ Artemis)

- **Directeurs de Pilier x8** — évaluent (Mestor) + valident avant exécution (Artemis)
- **Hyperviseur** — planifie (Mestor) + recommande des sequences (Artemis)

## L'ORACLE = Le Livrable (pas le moteur)

L'Oracle est THE livrable high-ticket one-shot. Le standard industriel maximal du conseil de marque. Enabler de retainer — le one-shot convertit le prospect en client récurrent.

**Why** : L'Oracle n'est PAS le nom du moteur/architecture. C'est un produit d'Artemis. Le moteur s'appelle NETERU.

**How to apply** : Ne jamais confondre "Oracle" (le livrable client) et "NETERU" (le panthéon de gouvernance). Dans le code : `mestor/`, `artemis/`, `seshat/`, `financial-brain/` (Thot), `ptah/` (Phase 9) — regroupés sous le concept NETERU. Pas de "trio", pas de "quartet" — c'est un **panthéon de 5 Neteru actifs**, plafonné à 7.

## Anti-drift

Sources de vérité synchronisées (test CI `neteru-coherence.test.ts`) :
- `BRAINS` const (`src/server/governance/manifest.ts:23`)
- `Governor` type (`src/domain/intent-progress.ts:29`)
- [LEXICON.md](../LEXICON.md) entrée NETERU
- [APOGEE.md](../APOGEE.md) §4 mapping sous-systèmes
- [PANTHEON.md](../PANTHEON.md) — récit complet
- [CLAUDE.md](../../../CLAUDE.md) §Governance
