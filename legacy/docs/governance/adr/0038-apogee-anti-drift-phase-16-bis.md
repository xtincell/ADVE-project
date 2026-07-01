# ADR-0038 — APOGEE anti-drift Phase 16-bis

**Date** : 2026-05-05
**Statut** : ACCEPTÉ
**Phase** : 16-bis (interphase entre 16 et 17, sans nouveau Neter)
**Supersedes** : —
**Superseded by** : —
**Lectures associées** : [APOGEE.md](../APOGEE.md), [NEFER.md](../NEFER.md), [MANIPULATION-MATRIX.md](../MANIPULATION-MATRIX.md)

---

## Contexte

L'audit APOGEE de mai 2026 (transcript session NEFER 2026-05-05) a révélé **7 drifts effectifs** entre la prose canonique APOGEE et la réalité du code, malgré la prétention de [APOGEE.md §7](../APOGEE.md) (« Aucun concept de La Fusée n'est étranger à APOGEE »). Vérifié par grep direct, pas par lecture des MAPs.

| # | Drift | Vérification | Sévérité |
|---|-------|--------------|----------|
| 1 | 86 % des routers tRPC bypass governance (`mestor.emitIntent` / `governedProcedure`) | 11/78 conformes | 🔴 critique |
| 2 | `IntentEmission.observationStatus` jamais migré (promis APOGEE §10) | 0 occurrence dans `prisma/schema.prisma` | 🔴 critique |
| 3 | Postconditions interface définie, **0 manifest l'utilise** | grep `postconditions:\s*\[` → 0 | 🟠 majeur |
| 4 | Loi 1 — APOGEE.md cite `COMPENSATING_INTENT` / `UNLOCK_PILLAR` / `RESET_STAGE` qui n'existent PAS dans `intent-kinds.ts` | les vrais kinds sont `ROLLBACK_*` / `DEMOTE_*` / `DISCARD_*` (lignes 95-105) | 🟡 narratif |
| 5 | `MANIPULATION_COHERENCE` cité en commentaires mais **gate inexistant** | 2 commentaires-fantômes, 0 enforcement | 🟠 majeur |
| 6 | `<ApogeeMaintenanceDashboard>` jamais créé (promis APOGEE §13) | composant absent → cron `/api/cron/sentinels` tourne en silence | 🟠 majeur |
| 7 | Plugin sandboxing (ADR-0008) — déclaratif sans enforcement runtime | conséquence directe du drift #1 | 🟡 mineur |

**Cause racine** : la prose canonique a évolué plus vite que le code. APOGEE est solide en *narrative* + *services* (89/89 manifests, 7/7 Neteru actifs, sentinels câblés cron+handlers) mais **les mécanismes de sécurité annoncés** (Loi 1 effective, post-burn checks, observation async, gate manipulation) sont restés des stickers — pas des câbles.

## Décision

Cette ADR fige **Phase 16-bis** : interphase d'auto-correction APOGEE entre Phase 16 (Glory tools as primary API + Higgsfield MCP, [ADR-0048](0048-glory-tools-as-primary-api-surface.md) — anciennement ADR-0028) et Phase 17b (Deliverable Forge, [ADR-0050](0050-output-first-deliverable-composition.md) — anciennement ADR-0037). **Aucun nouveau Neter** (cap APOGEE 7/7 préservé). Aucun nouveau modèle Prisma majeur — uniquement extension `IntentEmission`.

### Décisions concrètes

1. **Migration Prisma `IntentEmission.observationStatus`** (drift #2)
   - Colonne `observationStatus String @default("PENDING_OBSERVATION")` + `observedAt DateTime?` + `observationError String?`.
   - Index `[observationStatus, emittedAt]`.
   - Sémantique : `status` couvre l'exécution synchrone du handler ; `observationStatus` couvre la boucle Seshat asynchrone (asset-impact, knowledge graph, weak signals Tarsis).
   - Migration à exécuter via `prisma migrate dev --name observation_status`.

2. **Postconditions effectives** (drift #3)
   - `governedProcedure` invoque maintenant `assertPostConditions` après le handler, avant le flip status=OK. Échec → status=FAILED + `reason="POSTCONDITION:<name>"`.
   - 3 manifests pivot câblés en référence : `pillar-gateway` (write-succeeded + score-in-range), `ptah` (task-created-with-provider-id + reconcile-produced-assets). Les autres manifests s'alignent au fil des PRs.

3. **`MANIPULATION_COHERENCE` gate effectif** (drift #5)
   - Nouveau fichier `src/server/services/mestor/gates/manipulation-coherence.ts` exposant `applyManipulationCoherenceGate`.
   - Wiring pre-flight dans `mestor/intents.ts:emitIntent` pour les Intents qui portent un `manipulationMode` (PTAH_MATERIALIZE_BRIEF aujourd'hui ; sequences à suivre).
   - VETOED si mode hors `Strategy.manipulationMix` ; DOWNGRADED si poids < 0.10 ; OK sinon.
   - Override possible via `overrideMixViolation: true` (tracé dans IntentEmission.payload).

4. **Loi 1 alignment narratif** (drift #4)
   - APOGEE.md §3 Loi 1 ré-écrit pour citer les vrais kinds compensating (`ROLLBACK_*`, `DEMOTE_*`, `DISCARD_*`, `REVERT_*`) au lieu des `COMPENSATING_INTENT` / `UNLOCK_PILLAR` / `RESET_STAGE` fantômes.
   - Mention explicite que le pattern « COMPENSATING_INTENT » nominal n'existe pas — c'est les 10 kinds nommés explicitement (un par mutation réversible) qui matérialisent la Loi 1.

5. **`<ApogeeMaintenanceDashboard>`** (drift #6)
   - Composant React `src/components/neteru/apogee-maintenance-dashboard.tsx` exporté via le Neteru UI Kit.
   - Page cockpit `/cockpit/insights/apogee-maintenance` qui consomme `governance.listRecentSentinels` (nouvelle procédure tRPC).
   - Affiche les derniers runs des 3 sentinels + composite score + drift detected.

6. **Router governance containment** (drifts #1 + #7)
   - **PAS de refonte des 67 routers en bypass** dans cette ADR. Trop large, déjà cadré Phase 0 du REFONTE-PLAN.
   - Mais : nouveau script `scripts/audit-router-governance.ts` qui compte le ratio gouverné / bypass et **fail** au-dessus du ceiling 86 % (baseline mai 2026). Le ceiling se resserre PR par PR.
   - Suite : voir REFONTE-PLAN.md Phase 0 — la migration long-tail des 67 routers reste l'objectif. Cette ADR pose l'infrastructure de mesure, pas la refonte elle-même.

## Conséquences

### Bénéfices
- Loi 1 (conservation altitude) effective : `assertPostConditions` empêche les handlers de prétendre OK avec un état corrompu.
- Loi 4 (maintien orbite) lisible : le founder ICONE voit enfin les sentinels qui défendent son orbite — fin du silence cron.
- Manipulation Matrix opposable : un Glory tool / Ptah forge ne peut plus produire un asset hors mix sans veto explicite.
- Drift narratif APOGEE résorbé : la prose ↔ le code parlent la même langue sur la Loi 1.
- Drift router structurel mesuré (mais non résolu — c'est la Phase 0 du REFONTE-PLAN qui s'en charge).

### Coûts / risques
- Migration Prisma : 1 colonne ajoutée, défaut `PENDING_OBSERVATION` rétro-compatible (anciennes rows passent automatiquement). Aucun backfill destructif.
- `MANIPULATION_COHERENCE` peut produire des VETOED nouveaux sur des Intents qui passaient avant — d'où l'override flag pour les opérateurs qui valident l'écart en UI.
- `assertPostConditions` ajoute un round-trip DB potentiel (selon les checks). Latence maîtrisée par `idempotent` flag des manifests.
- 3 manifests câblés seulement (pillar-gateway + ptah). Les 86 autres seront alignés au fil des PRs — RESIDUAL-DEBT en témoigne.

### Suite (NOT in scope)
- Migration des 67 routers en bypass → REFONTE-PLAN Phase 0 (long-tail).
- Backfill `observationStatus=OBSERVED` pour les rows existantes confirmed-observed (cron de rattrapage à écrire).
- Ouvrir tous les manifests aux postconditions (pattern posé, dérouler).
- Plugin sandboxing concret (drift #7) : suppose drift #1 résolu d'abord.

## Cap APOGEE

**7/7 Neteru actifs préservé.** Aucun nouveau Neter introduit. NEFER reste l'opérateur (pas dans BRAINS const). Les 8 sous-systèmes APOGEE sont inchangés. Cette ADR est une consolidation de gouvernance, pas une extension de panthéon.

---

*Le bon sens dérive. Le protocole tient. Le repo reste propre.*
