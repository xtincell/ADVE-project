# ADR-0073 — Oracle Progressive UI (Phase 21 F-F)

**Status** : Accepted
**Date** : 2026-05-08
**Phase** : 21 — Oracle Generation Robustness + Manual-First Section Control
**Sub-phase** : F-F — UI Oracle progressive
**Depends on** : ADR-0070 (GENERATE_ORACLE_SECTION), ADR-0071 (Assembler manual-first), ADR-0072 (NSP SSE streaming)

## Contexte

Le screenshot initial qui a déclenché ce mégasprint montrait le bouton "Assembler L'Oracle" en mode bloc opaque pendant N secondes : *"Frameworks Artemis en exécution — les sections se mettent à jour en temps réel…"* mais aucun feedback granulaire. L'opérateur ne savait pas :

- quelle section était en cours,
- laquelle avait foiré,
- ne pouvait pas regénérer une section seule sans tout relancer,
- ne pouvait pas voir le détail d'erreur Zod sur une section FAILED.

F-A → F-E ont livré toute la mécanique backend. F-F matérialise l'expérience opérateur.

## Décision

**Nouveau panel `OracleProgressivePanel`** inséré dans `proposition/page.tsx` (cohabitation avec le bouton legacy `enrichOracle` — pas de remplacement). Composé de 3 composants UI canoniques + 1 hook stream :

### Hook `useOracleStream(strategyId)`

[`src/hooks/use-oracle-stream.ts`](../../src/hooks/use-oracle-stream.ts) :

- Ouvre `EventSource` sur `/api/notifications/stream` (endpoint SSE existant Phase 16, ADR-0025).
- S'abonne aux 6 sub-kinds canoniques d'F-E (oracle_section_started/completed/failed + oracle_assembler_started/progress/done).
- Filtre par `strategyId` (multi-strategy guard — l'opérateur peut avoir plusieurs Strategy partageant le même socket userId).
- Maintient `Map<sectionId, OracleSectionStreamState>` + `OracleAssemblerStreamState` + log array.
- Cap log à `MAX_LOG_LINES = 500` (no unbounded growth).
- Reset propre quand `strategyId` change (cleanup EventSource).

### Composants UI

#### `OracleSectionCard`
[`src/components/cockpit/oracle/section-card.tsx`](../../src/components/cockpit/oracle/section-card.tsx)

Affiche 1 section avec :
- Numéro + titre + tier badge (CORE / BIG4 / DISTINCT).
- Status icon + label (En attente / Génération en cours / Complète / Échec / Périmée).
- Stale-aware : badge "un pilier amont a muté" si `dbSection.staleAt != null`.
- Bouton contextuel : Générer (FRESH) / Régénérer (REGEN) / Retry (RETRY).
- **Précédence stream > dbStatus** : si `streamPhase === "generating"`, affiche GENERATING même si DB pas encore mise à jour (UI feedback transitoire).
- Click "voir l'erreur" sur FAILED → ouvre le modal d'erreur.

#### `OracleLiveConsole`
[`src/components/cockpit/oracle/live-console.tsx`](../../src/components/cockpit/oracle/live-console.tsx)

Console terminal-style qui affiche les events au fur et à mesure :

```
[10:23:14] §07 SWOT Interne — GENERATING (FRAMEWORK/fw-22, mode=FRESH)
[10:23:22] §07 SWOT Interne — COMPLETE (8.2s, conf 0.78)
[10:23:22] §22 Crew Program — GENERATING (GLORY_SEQUENCE/IMHOTEP-CREW, mode=FRESH)
[10:23:35] §22 Crew Program — FAILED [ZOD_VALIDATION_FAILED] LLM Zod validation failed (after 3 attempts)
```

- Auto-scroll sur dernier event (`scrollIntoView` smooth).
- Trois niveaux : `info` (gris) / `ok` (emerald) / `fail` (rose).
- ARIA `aria-live="polite"` pour accessibilité.

#### `OracleSectionFailureModal`
[`src/components/cockpit/oracle/section-failure-modal.tsx`](../../src/components/cockpit/oracle/section-failure-modal.tsx)

Modal détaillé sur clic "voir l'erreur" :
- Section number + title.
- errorCode + errorMessage + attempts + durationMs.
- Bloc Zod issues formatté JSON pretty-printed.
- Aide contextuelle si `errorCode === "ZOD_VALIDATION_FAILED"` : *"Le LLM n'a pas réussi à produire un payload conforme au schéma Zod après N tentatives. Le retry relancera une nouvelle session avec un prompt repropulsé. Si l'échec persiste, vérifier la complétude des piliers ADVE amont."*
- Bouton "Réessayer §X" → émet `oracle.retrySection` (mode RETRY explicite).

### Panel `OracleProgressivePanel`
[`src/components/cockpit/oracle/progressive-panel.tsx`](../../src/components/cockpit/oracle/progressive-panel.tsx)

Orchestrateur :
- Header avec stats (X complets / Y ratés / Z périmés / W en attente).
- Bouton "Assembler L'Oracle" rouge fusée + dropdown scope (ALL / MISSING / STALE).
- Live progress bar du stream `assemblerState` (currentSectionId + completed/total).
- Console live (`OracleLiveConsole`).
- Grid 35 sections (`OracleSectionCard` × 35).
- Modal erreur (`OracleSectionFailureModal`) en overlay sur clic FAILED.

### Cohabitation avec le legacy

Le panel est **additionnel** au bouton "Lancer Artemis" legacy de `proposition/page.tsx`. Pas de remplacement automatique :
- `enrichOracle` legacy reste dispo (bouton vert/rouge en haut).
- `OracleProgressivePanel` ajouté en-dessous avec intitulé clair + badge ADR-0073.

L'opérateur peut basculer entre les 2 modes selon préférence. Deprecation formelle du legacy **après audit completion** (suite mégasprint).

## Cap APOGEE

**7/7 préservé.** Pure UI consumer des APIs F-A→F-E. Aucun nouveau Neter, aucun nouveau Intent, aucun nouveau service backend.

## Tests anti-drift (20 tests passing)

[`tests/unit/governance/oracle-progressive-ui.test.ts`](../../tests/unit/governance/oracle-progressive-ui.test.ts) :

**Hook `useOracleStream`** (6 tests) :
- File exists at canonical path.
- Subscribes to all 6 NSP sub-kinds exhaustively.
- Filters events by strategyId (multi-strategy guard).
- Opens EventSource sur `/api/notifications/stream` (pas de path custom).
- Returns sectionsState + assemblerState + log + isStreaming + clearLog.
- Caps log at MAX_LOG_LINES (no unbounded growth).

**UI components** (4 tests) :
- 4 composants exportés depuis canonical paths.

**SectionCard precedence** (3 tests) :
- `resolveEffectivePhase` prefers streamPhase=generating over dbStatus.
- Offers FRESH / REGEN / RETRY action modes.
- RETRY mode pour FAILED + STALE phases.

**Panel surface** (4 tests) :
- Consume oracle.listSections / generateSection / retrySection / assembleOracle.
- Use `useOracleStream` hook (pas de custom EventSource).
- Scope dropdown ALL / MISSING / STALE.
- Renders les 4 composants enfants.

**Page integration** (3 tests) :
- Import + render `OracleProgressivePanel`.
- Preserve legacy `enrichOracle` button (cohabitation).

## Doctrine NEFER §1.1

- **Pas de notion de temps humain** — 4 composants + 1 hook + integration page + 20 tests, livrés en une session.
- **Pas d'économie de tokens** — chaque composant entièrement documenté, hook avec types précis (Map<sectionId, ...> au lieu de Record générique).
- **Profondeur > raccourci** — précédence stream > dbStatus pour UI feedback transitoire ; modal Zod issues pretty-printed avec aide contextuelle ; cap log MAX_LOG_LINES anti-leak.
- **Manual-first parity** — F-D test bloquant reste valide, F-F ne touche pas aux primitives backend.

## Suite mégasprint

- ✅ **F-A** (LLM output enforcement, ADR-0067)
- ✅ **F-A.5** (Readiness UI parity, ADR-0069)
- ✅ **F-B** (OracleSection first-class, ADR-0068)
- ✅ **F-C** (GENERATE_ORACLE_SECTION, ADR-0070)
- ✅ **F-D** (Assembler manual-first, ADR-0071)
- ✅ **F-E** (NSP SSE streaming, ADR-0072)
- ✅ **F-F** (UI progressive, ADR-0073) — celui-ci
- ⏳ **F-G** Tests anti-drift complets (parity HARD baseline maintenue, integration end-to-end mock NSP listener).
- ⏳ **F-H** Documentation governance complète (CODE-MAP régen, LEXICON entry "section Oracle" first-class, REFONTE-PLAN mark Phase 21 done).

Cleanup post-F-F : deprecation formelle du legacy `enrichOracle` (~1300 lignes inline dispatch) après audit completion.
