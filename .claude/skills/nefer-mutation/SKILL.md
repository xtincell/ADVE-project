---
name: nefer-mutation
description: Phases 1-4 NEFER — cadrage et exécution de toute MODIFICATION du repo La Fusée (code, entité, page, service, Intent, Glory tool, séquence). À invoquer après nefer-boot et AVANT d'écrire la première ligne. Impose l'examen APOGEE, l'audit anti-doublon grep CODE-MAP, le choix du Neter de tutelle et les patterns de mutation gouvernée (spine, gateway).
---

# NEFER Phases 1-4 — Mutation gouvernée

**Procédure impérative. Chaque étape produit une sortie vérifiable avant de passer à la suivante. AUCUNE improvisation : toute déviation = drift → Phase 8 immédiate.**

## Les trois interdits absolus (à réciter avant de concevoir)

1. **Réinventer la roue** — toute entité métier nouvelle DOIT être justifiée par un grep CODE-MAP négatif + ADR.
2. **Bypass governance** — toute mutation métier passe par le spine d'émission (voir Phase 4). Pas de raccourci, pas de « juste pour ce cas ».
3. **Drift narratif silencieux** — toute modification de vocabulaire/concept canon DOIT propager dans les 7 sources de vérité simultanément (→ skill `nefer-docs`).

## PHASE 1 — Examen APOGEE

1.1 **MUST** : nommer UN sous-système parmi les 8 — Mission : Propulsion (Artemis briefs + Ptah forge) / Guidance (Mestor) / Telemetry (Seshat + Tarsis) / Sustainment (Thot) — Ground : Operations (Thot ext.) / Crew Programs (Imhotep) / Comms (Anubis) / Console-Admin (INFRASTRUCTURE).

1.2 **MUST** : vérifier les 3 Lois — Loi 1 conservation d'altitude (pas de régression silencieuse ; `COMPENSATING_INTENT` si écrasement) · Loi 2 séquencement des étages (pre-conditions pilier) · Loi 3 conservation carburant (cost-gate Thot — le spine l'applique aux deux chemins depuis ADR-0124).

1.3 **MUST** : vérifier les 5 Piliers FRAMEWORK — Identity (`mestor.emitIntent` unique) · Capability (manifest) · Concurrency (`tenantScopedDb`) · Pre-conditions (`governedProcedure`) · Streaming (NSP si > 300 ms).

## PHASE 2 — Audit anti-doublon (commandes exactes)

```bash
# 2.1 CODE-MAP (mot-clé + TOUS les synonymes plausibles)
grep -i "<mot-clé>" docs/governance/CODE-MAP.md
grep -i "<synonyme>" docs/governance/CODE-MAP.md

# 2.2 Les 4 surfaces structurelles
grep -E "^model.*<nom>" prisma/schema.prisma
ls src/server/services/ | grep -i "<nom>"
ls src/server/trpc/routers/ | grep -i "<nom>"
find src/app -name "page.tsx" -path "*<nom>*"

# 2.3 Manifests + ADRs
grep -rE "service: \"<nom>\"|governor:" src/server/services/ | grep -i "<nom>"
ls docs/governance/adr/

# 2.4 Maps
grep -i "<nom>" docs/governance/SERVICE-MAP.md docs/governance/ROUTER-MAP.md docs/governance/PAGE-MAP.md
```

- **Verdict obligatoire, documenté** : « X existe → j'étends » **OU** « X n'existe pas (greps négatifs cités) → ADR à créer ». Pas de troisième voie.
- **2.5 Propagation ADVE** (`PROPAGATION-MAP.md`) : tracer entrée → transformation → sortie → pilier ADVE source. Si la chaîne vient « d'un littéral / d'un mock / de rien » → c'est un **trou** : soit brancher un pilier réel, soit afficher honnêtement (EmptyState / flag `mocked`) **ET** l'inscrire au registre. **NEVER combler un trou en inventant des données.**

## PHASE 3 — Conception

- **3.1 Neter de tutelle** (PANTHEON §3) : décider qui gouverne. Le cap est **7/7 — NEVER créer un 8ᵉ Neter** (test CI bloquant). Sub-agents/opérateurs/connectors ≠ Neteru.
- **3.2 Emplacement** : respecter la layering cascade `domain → lib → server/governance → server/services → server/trpc → components/neteru → app` (ESLint + madge la bloquent).
- **3.3 Manipulation mode** : si un actif/asset audience est produit → déclarer `peddler/dealer/facilitator/entertainer` (doit ⊆ `Strategy.manipulationMix` — gate pre-flight sinon veto).
- **3.4 Pillar source** : tout output Phase 9+ déclare `pillarSource` ∈ A/D/V/E/R/T/I/S.
- **Glory-tools-first (NEFER §3.1)** : toute capacité de production passe par un Glory tool existant ou nouveau — un Intent direct sans tool n'est accepté QUE pour une primitive write/persistence pure sans orchestration (le documenter dans l'ADR).

## PHASE 4 — Exécution (patterns non négociables)

| Geste | Voie UNIQUE | Interdit correspondant |
|---|---|---|
| Mutation métier depuis un router | `governedProcedure({ kind, inputSchema, caller, requireOperator? })` | `protectedProcedure` qui mute du métier ; service appelé direct depuis router (Q3, lint `lafusee/no-direct-service-from-router`) |
| Mutation métier depuis un service/handler | `mestor.emitIntent(intent, { caller })` | dispatch inline, appel cross-Neter direct |
| Persistance d'émission | le spine `openEmission`/`closeEmission` (`src/server/governance/emission-spine.ts`, ADR-0124) — les deux voies ci-dessus l'utilisent déjà | `db.intentEmission.create` nu (test HARD `emission-spine-unified` ; allowlist « à mes risques » uniquement avec hole id + reason + `reroutePlanned`) |
| Écriture de contenu pilier | `writePillar` / `writePillarAndScore` (`src/server/services/pillar-gateway/`) | `db.pillar.update({ content })` nu (keystone C5, test HARD `no-bare-pillar-content-write`) |
| Édition ADVE | Intent `OPERATOR_AMEND_PILLAR` (décision humaine, ADR-0023/0085) | cascade auto qui écrit l'ADVE ; STOP à Jehuty |
| RTIS | dérivation par Intents `ENRICH_R_FROM_ADVE` / `ENRICH_T_FROM_ADVE_R_SESHAT` / `GENERATE_I_ACTIONS` / `SYNTHESIZE_S` | toute édition manuelle (le type `pillarKey` la refuse — ne pas contourner) |
| Nouvel Intent kind | entrée `INTENT_KINDS` (`src/server/governance/intent-kinds.ts`) + SLO dans `slos.ts` + manifest `acceptsIntents` | kind non catalogué ; kind sans SLO |
| Sortie LLM structurée | `executeStructuredLLMCall` + `outputSchema` Zod (ADR-0067) | parse maison ; coercion silencieuse ; `_noSchemaJustification` sans justification réelle |
| UI | skill `nefer-ds` + skill `nefer-vocab` obligatoires | tokens bruts, vocabulaire interne rendu au client |

- **MUST** : incréments commitables — si la cohérence exige 38 fichiers, toucher les 38 (pas de « moitié plus tard » sans justification calendar-locked).
- **NEVER** : `npm audit fix --force` (incident 2026-06-29 — downgrade Next 16→9). Transitives → champ `overrides`.
- **NEVER** : mock/stub silencieux en production — l'absence de donnée est un état first-class (`INSUFFICIENT_DATA`, `DEFERRED_AWAITING_CREDENTIALS`, `_mocked: true`).

## Conditions STOP

- Grep CODE-MAP positif ET l'opérateur a demandé une « nouvelle » entité → reformuler en « j'étends Y » et continuer (pas une question).
- Le geste exige un 8ᵉ Neter, une écriture ADVE automatique, ou un bypass du spine → **STOP net** : c'est structurellement interdit ; proposer la voie gouvernée équivalente.
- Valeur business non-inférable requise pour concevoir → **1 question ciblée**.

## Enchaînement obligatoire

Exécution terminée → invoquer **`nefer-ship`** (vérification + commit). Si l'exécution a changé du vocabulaire, des concepts, des comptes ou des entités → invoquer **`nefer-docs`** AVANT `nefer-ship`.
