# ADR-0083 — Argos placement : Seshat sub-domain + Hunter sub-agent + seam Yggdrasil

**Status** : Accepted
**Date** : 2026-05-15
**Phase** : 22 (Argos by LaFusée — formalisé upstream 2026-05-15, commits `82acd53` / `4f001a4` / `28dbb95`)
**Depends on** : ADR-0021 (Credentials Vault), ADR-0025 (NSP SSE broker), ADR-0026 (MCP bidirectional), ADR-0082 (Yggdrasil)
**Complements** : REFONTE-PLAN.md Phase 22, `_bmad-output/project-context.md §27-bis`, `docs/external-design/argos-hunter-v1/VENDOR-NOTICE.md`

## Contexte

Phase 22 = "Argos by LaFusée" a été formalisée upstream 2026-05-15 par 3 commits qui ont posé les décisions de fondation (monorepo turborepo / sous-DS Argos hérite Tier 0 / auto-publish on PASS) + vendorisé le code Hunter v1 dans `docs/external-design/argos-hunter-v1/`. La planification opérationnelle (sub-phases 22-A0 backend / A1 bridge / A2 UI retarget / A3 cross-links / A4 newsletter) est dans REFONTE-PLAN.md et `project-context.md §27-bis`.

**Ce qui manquait** : la **place canonique** d'Argos + Hunter dans le panthéon Neteru, dans la topologie Yggdrasil (ADR-0082), et dans la séparation substrate/connector/Neter. Sans cette ADR, le futur port risque de drift sur les questions : "Hunter est-il un Neter ?", "où dans `src/server/services/` ?", "qui le gouverne ?", "comment alimente-t-il Yggdrasil ?".

## Décision

### 1. Argos = sous-domaine de SESHAT (pas un Neter)

Argos n'est **pas** un Neter — c'est un **sous-domaine de Seshat**, exactement comme Tarsis (`seshat/tarsis/`) est un sous-domaine de Seshat.

| Sous-domaine Seshat | Rôle | Source de signal |
|---|---|---|
| **Tarsis** (`seshat/tarsis/`) | Signal sectoriel temps-réel | Tarsis-monitoring API (Phase 23 wiring) |
| **Argos** (`seshat/argos/` à créer) | Signal culturel historique curé | Hunter agent (4-phases) + dossiers signés `CampaignReferenceDossier` |
| `market-study-ingestion/` | Études de marché batch | Imports manuels / providers |
| `external-feeds/` | Flux externes divers | Connectors via Credentials Vault |

**Cap APOGEE 7/7 préservé** — Argos est un sous-domaine, pas un gouverneur.

### 2. Hunter = sub-agent (pas un Neter, pas un opérateur)

Hunter = l'agent 4-phases (harvest → coerce Zod → ingest → projections) qui *produit* les `CampaignReferenceDossier`. **C'est un sub-agent** au sens NEFER : un programme dirigé qui exécute des Intents sous gouvernance — comme NEFER lui-même est l'opérateur exécutant qui sert les 7 Neteru.

Distinction tranchée :

| Entité | Type | Cap APOGEE | Exemples |
|---|---|---|---|
| **Neter** | Gouverneur (sub-système APOGEE) | Compte vers 7/7 | Mestor, Artemis, Seshat, … |
| **Sub-agent** | Programme exécuteur d'Intents sous un Neter | Ne compte pas | Hunter (Seshat), Notoria (cockpit reco), Jehuty (Seshat reads), Tarsis weak-signal-analyzer |
| **Opérateur** | Exécutant humain ou agent IA d'Intents | Ne compte pas | NEFER |
| **Substrat** | Protocole / topologie système | Ne compte pas | Yggdrasil, NSP, layering cascade, hash-chain |
| **Connector** | Façade externe (Credentials Vault) | Ne compte pas | Tarsis-monitoring API, CRM provider, ad networks |

Hunter loge sous `src/server/services/seshat/argos/` (Phase 22-A0 port). Il **dépend** de Mestor (Intent emission per run), Thot (LLM Gateway cost gate), Anubis (NSP SSE progress), Artemis (downstream consumer of dossiers via `seshat/references.ts`).

### 3. Le seam Argos ↔ Yggdrasil

Le flux complet de circulation de valeur produite par Hunter, en respect des 3 invariants Yggdrasil :

```
Hunter run (Phase 22-A0)
  │
  ▼
Mestor.emitIntent({ kind: "ARGOS_HUNT_REFERENCE", ... })   ← Q3 gouvernance
  │
  ├── Thot fuel gate (LLM Gateway cost)
  ├── Mestor pre-flight gate (rate limit, signal sufficiency, …)
  ▼
Hunter 4 phases (harvest → coerce → ingest → projection-decide)
  │
  ▼
CampaignReferenceDossier signed + persisted
  │
  ▼
IntentEmission append-only hash-chained                    ← Q1 traçabilité
  │
  ▼
NspEvent {{ kind: "argos_hunt_done", dossierRef }}         ← Q2 observabilité
  │
  ▼ (Mestor verdict gate sur safety.verdict)
  │
  ├── PASS → 2 projections via Yggdrasil :
  │   ├── (a) Artemis interne : seshat/references.queryReferences()
  │   │       + enrichBrief() (hook existant — pas de duplication)
  │   └── (b) Argos public (`apps/argos/`) : auto-publish via API
  │           `/api/seshat/argos/dossiers/published`
  │
  ├── QUARANTINE → projection (a) uniquement (interne Artemis)
  │
  └── REJECT → purge (pas de circulation)
```

Les 3 invariants Yggdrasil sont satisfaits :
- **Q1** : `CampaignReferenceDossier.intentEmissionId` pointe vers l'Intent ancêtre.
- **Q2** : `NspEvent` `argos_hunt_started` / `argos_hunt_progress` / `argos_hunt_done` (à ajouter à la discriminated union NspEvent quand Phase 22-A0 livre).
- **Q3** : 2 gates Mestor — `ArgosFuelGate` (pré-Hunter) et `ArgosVerdictGate` (post-Hunter, contrôle l'auto-publish).

### 4. `apps/argos/` (site public) = projection target, pas substrat OS

Le site public Argos (`apps/argos/` dans le monorepo turborepo) est un **consommateur** de Yggdrasil — il lit l'API `/api/seshat/argos/*` exposée par le backend LaFusée. Il **n'a pas** d'accès direct à la DB Prisma, ne contient pas de logique business gouvernée, ne fait pas d'écriture côté LaFusée. C'est une projection-cible, équivalent conceptuel d'un canal Anubis broadcast.

Le code Argos UI vendorisé (`docs/external-design/argos-hunter-v1/`) est **réutilisé tel quel** au port (correction de scope 2026-05-15 22:08, commit `28dbb95`) — pas rebuild en sous-DS LaFusée. Les 3 swaps ciblés (~50 lignes JSX) sont :
- `fetch` Anthropic direct → endpoint LaFusée `/api/seshat/argos/hunt`
- `window.storage` (client-side) → API REST `/api/seshat/argos/dossiers`
- Suppression panel "Clé Anthropic" client-side (les clés vivent côté LaFusée via LLM Gateway)

### 5. Distinction Argos ↔ Tarsis ↔ market-study-ingestion ↔ external-feeds

Tous sous-domaines Seshat — frontière formelle :

| | Tarsis | Argos | market-study | external-feeds |
|---|---|---|---|---|
| **Temporalité** | Temps-réel | Historique curé | Batch ingestion | Variable |
| **Origine signal** | API monitoring sectoriel | Hunter (LLM-curé) | Imports manuels | Connectors divers |
| **Output canonique** | `TarsisSignal` (vocab/claim/press/embedding) | `CampaignReferenceDossier` (DNA palette/typo/voice/visual/keyPhrases/axes) | `MarketStudy` (Prisma) | Selon le connector |
| **Consommateurs principaux** | `sector-intelligence`, `culture.tarsisBridge` | Artemis briefs via `seshat/references` | Glory tools market-research | Variable |
| **Verdict gate** | n/a | `PASS / QUARANTINE / REJECT` | n/a | n/a |
| **Publication publique** | non | oui (PASS → `apps/argos/`) | non | non |

Aucun doublon. Chaque sous-domaine sert une slice distincte de la surface Seshat.

## Conséquences

### Propagation aux 7 sources

| Source | Mise à jour |
|---|---|
| **PANTHEON.md §2.3** (Seshat) | Ajouter Argos à la liste des sous-domaines Seshat aux côtés de Tarsis. |
| **LEXICON.md** | Entrée `Argos` mise à jour ; entrée `Hunter` ajoutée ; entrée `CampaignReferenceDossier` ajoutée à l'occasion du port Phase 22-A0. |
| **CLAUDE.md** | "Phase status" — entrée Phase 22 = Argos PLANNED. Note dans Governance NETERU : "Argos = sous-domaine Seshat, Hunter = sub-agent ; cf. ADR-0083." |
| **APOGEE.md §4.3** (Telemetry Seshat) | Bullet ajouté : "Sous-domaines actifs : Tarsis (temps-réel) + Argos (curé historique, Phase 22)." |
| **CODE-MAP.md** | Synonymes ajoutés au port Phase 22-A0 : "référence campagne" / "DNA asset" / "décodage culturel" → `CampaignReferenceDossier`. Auto-régénéré pre-commit. |
| **`BRAINS` const** | **Inchangé** — Argos n'est pas un Neter. |
| **`Governor` type** | **Inchangé** — Argos n'est pas un Neter. |

### Trigger port = explicite Alexandre (NE PAS auto-shiper)

Conformément à `_nefer-facts.md §10` (2026-05-15) : avant toute action Phase 22 / Argos, lire REFONTE-PLAN.md Phase 22 + `project-context.md §27-bis` en full, puis vérifier que l'utilisateur a demandé le port. Cette ADR clarifie le placement ; elle ne déclenche pas le port.

### Pas d'impact code immédiat

Cette ADR canonise un placement. Le port effectif (Phase 22-A0 → A4) reste un chantier distinct, déclenché par demande Alexandre.

### Code Hunter vendorisé = artefact de référence

Le code dans `docs/external-design/argos-hunter-v1/` reste **gelé** (VENDOR-NOTICE.md, 3 interdits absolus). Le port le réécrira sous `src/server/services/seshat/argos/` avec ré-architecture pour passer par LLM Gateway / Mestor / Thot / NSP.

## Lectures associées

- [ADR-0082](0082-yggdrasil-value-circulation-substrate.md) — Yggdrasil substrate canon
- [ADR-0021](0021-external-credentials-vault.md) — Credentials Vault (pattern connector)
- [ADR-0026](0026-mcp-bidirectional-anubis.md) — MCP bidirectional (Anubis transport pour publication Argos)
- [REFONTE-PLAN.md Phase 22](../REFONTE-PLAN.md) — plan opérationnel complet 22-A0/A1/A2/A3/A4
- [`_bmad-output/project-context.md §27-bis`](../../_bmad-output/project-context.md) — Greenfield #1 detail
- [`docs/external-design/argos-hunter-v1/VENDOR-NOTICE.md`](../external-design/argos-hunter-v1/VENDOR-NOTICE.md) — 3 interdits absolus sur le code vendorisé
