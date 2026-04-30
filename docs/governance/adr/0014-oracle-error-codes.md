# ADR-0014 — Oracle Error Codes : catalogue gouverné, sérialisation safe, triage admin

**Date** : 2026-04-30
**Statut** : accepted
**Phase de refonte** : phase/11.1

## Contexte

Le bouton **Assembler L'Oracle** ([src/app/(cockpit)/cockpit/brand/proposition/page.tsx](../../src/app/(cockpit)/cockpit/brand/proposition/page.tsx)) déclenchait des erreurs opaques au frontend. Cas observé en production : sur une stratégie 21/21 complete, le clic produit dans le log live :

```
[01] ERREUR: Maximum call stack size exceeded
```

Sans code, sans gouverneur responsable, sans hint de remédiation. L'opérateur ne sait ni où chercher ni comment résoudre. La plomberie de gouvernance ([governed-procedure.ts](../../src/server/governance/governed-procedure.ts)) explosait avant même d'atteindre la logique métier — invisible parce que le frontend ne reçoit que `err.message`.

Trois failures structurelles cumulées :

1. **Cause racine du stack overflow** : [governed-procedure.ts:131-133](../../src/server/governance/governed-procedure.ts) passait le `MiddlewareResult` tRPC complet (qui transporte `ctx` → PrismaClient proxies) à `postEmitIntent` qui le sérialise vers la colonne JSON `IntentEmission.result`. `JSON.stringify` rentrait dans les proxies Prisma → V8 jetait `Maximum call stack size exceeded`.
2. **Pas de codes typés** : tous les `throw` du pipeline (`enrichAllSections`, `enrichAllSectionsNeteru`, executions de framework) propageaient des `Error` génériques. L'opérateur lisait `err.message` sans contexte.
3. **Pas de circuit breaker section-level** : un seul framework qui plante (`ORACLE-201`) abortait l'intégralité du pipeline ; les 20 autres frameworks ne tournaient pas.

Le service `error-vault` (Phase 11) collectait déjà les erreurs runtime avec dédup par signature, mais sans catégorie sémantique pour les erreurs Oracle — impossible de répondre à la question « combien de fois cette semaine un framework Artemis a foiré sur cette stratégie ».

Le drift-test mission (MISSION.md §4) le confirme : si l'Oracle est le livrable phare, il doit être industrialisable — donc l'opérateur doit pouvoir diagnostiquer un incident en moins de 30 secondes. L'opaque message stack overflow viole cet impératif.

## Décision

**On adopte un catalogue de codes d'erreur typés `ORACLE-NNN`**, gouverné par [src/server/services/strategy-presentation/error-codes.ts](../../src/server/services/strategy-presentation/error-codes.ts), porté par une classe `OracleError`, capturé systématiquement dans `error-vault` avec gouverneur + remédiation, exposé au frontend via `TRPCError.cause`, et triable dans `/console/governance/oracle-incidents`.

### 1. Catalogue typé `ORACLE-NNN`

Codes regroupés par ranges sémantiques :

| Range | Famille | Governor par défaut | Recoverable |
|---|---|---|---|
| **ORACLE-1xx** | Pre-conditions (utilisateur a un blocker) | MESTOR / THOT | Oui |
| **ORACLE-2xx** | Exécution (framework / sequence / LLM) | ARTEMIS / SESHAT / MESTOR / INFRA | Oui (sauf cycle) |
| **ORACLE-3xx** | Writeback (refus pillar-gateway / Zod) | MESTOR / SESHAT | Variable |
| **ORACLE-9xx** | Infrastructure (sérialisation, hash chain, fallback) | INFRASTRUCTURE | Non |

Chaque code porte 4 champs : `fr` (message FR), `hint` (où chercher), `governor` (Neter responsable), `recoverable` (boolean).

`OracleError` étend `Error` avec `code`, `entry` (lookup catalogue), `context` (Record), et expose `toCausePayload()` qui produit une structure JSON-safe pour `TRPCError.cause`.

`toOracleError(unknown)` est le **promoter universel** : reconnaît `ReadinessVetoError → ORACLE-101`, `CostVetoError → ORACLE-102`, fallback `ORACLE-999` sinon.

### 2. Fix du stack overflow (ORACLE-901)

Le wrapper `governedProcedure` extrait désormais `.data` du `MiddlewareResult` avant de le persister :

```ts
const loggablePayload = unwrapMiddlewareResult(result); // .data ou .error.message
await postEmitIntent(ctx, intentId, loggablePayload, finalStatus);
return result; // wrapper renvoyé tel quel à tRPC
```

Le helper `unwrapMiddlewareResult` est défensif : si la forme de tRPC change, il logge un primitive plutôt qu'un proxy. La régression est tracée par `tests/unit/governance/oracle-error-codes.test.ts → toCausePayload est sérialisable sans cycle`.

### 3. Circuit breaker section-level

Dans [enrich-oracle.ts](../../src/server/services/strategy-presentation/enrich-oracle.ts), chaque catch (framework, sequence, writeback, seeding, Seshat-observe, Mestor-prioritize) appelle `captureOracleErrorPublic(new OracleError("ORACLE-NNN", {...}, {cause: err}), {...})` puis **continue** au lieu d'aborter. Un framework qui plante n'empêche plus les autres de tourner. La section concernée passe en `failed`, le pipeline produit un `finalScore` partiel, et l'opérateur voit le détail dans `/console/governance/oracle-incidents`.

### 4. Capture systématique vers `error-vault`

Le helper `captureOracleErrorPublic` (séparé du wrapper pour casser le cycle d'imports) écrit un `ErrorEvent` avec :

```ts
{
  code: "ORACLE-NNN",          // champ existant
  message: "[ORACLE-NNN] ...",
  intentId: "...",             // hash chain
  strategyId: "...",
  trpcProcedure: "governed:ENRICH_ORACLE",
  context: {
    governor: "ARTEMIS",       // dans le JSON existant
    remediation: "...",
    recoverable: true,
    ...err.context,            // frameworkSlug, sectionId, blockers, etc.
  },
}
```

**Aucune migration Prisma nécessaire** : `ErrorEvent` ([prisma/schema.prisma:3757](../../prisma/schema.prisma)) a déjà `code`, `context: Json?`, `intentId`, `strategyId`, `trpcProcedure`. NEFER interdit n°1 (réinventer la roue) respecté.

### 5. Frontend : message numéroté + remédiation

[proposition/page.tsx](../../src/app/(cockpit)/cockpit/brand/proposition/page.tsx) `onError` lit `err.data.cause.{code, governor, remediation}` et affiche :

```
[01] ERREUR ORACLE-201 (ARTEMIS) — Framework Artemis a échoué.
[02] → Voir context.frameworkSlug pour identifier le framework. Re-tenter avec circuit-breaker.
[03] → Voir /console/governance/oracle-incidents pour le triage.
```

Quand `cause` n'est pas présent (erreur non-Oracle), fallback sur l'ancien message brut.

### 6. Page admin `/console/governance/oracle-incidents`

Vue dédiée avec :
- Stats : codes actifs, occurrences, stratégies impactées, % récupérables
- Filtres : non résolus / résolus, fenêtre 24h / 3j / 7j / 30j
- Cluster par code (pas par signature) → impact direct sur le triage Oracle
- Détail expandable : context JSON, stack, stratégies impactées
- Bouton « ✓ Résoudre » qui marque toutes les occurrences d'une signature comme résolues

Le router `errorVault.oracleIncidents` filtre `code: { startsWith: "ORACLE-" }` et clusterise côté serveur.

### 7. Anti-drift CI

[tests/unit/governance/oracle-error-codes.test.ts](../../tests/unit/governance/oracle-error-codes.test.ts) vérifie :
- chaque code matche `^ORACLE-\d{3}$`
- chaque entry a `fr` + `hint` + `governor` valide + `recoverable: boolean`
- `toCausePayload()` sérialise sans cycle (régression ORACLE-901)
- `toOracleError` couvre `ReadinessVetoError`, `CostVetoError`, fallback `ORACLE-999`
- liste hard-codée des codes activement utilisés dans le code source — must-be-in-catalog

### 8. Trois interdits absolus (NEFER §3)

| Interdit | Application Oracle errors |
|---|---|
| Réinventer la roue | `ErrorEvent` réutilisé, pas de nouveau model. `error-vault.capture` réutilisé via `captureOracleErrorPublic`. Pas de doublon. |
| Bypass governance | Tout throw passe par `OracleError`. `captureOracleErrorPublic` est best-effort + recursion-safe. |
| Drift narratif silencieux | LEXICON entrée `OracleError` + `ORACLE_ERROR_CODES` propagée dans CHANGELOG, ROUTER-MAP, PAGE-MAP, CODE-MAP (auto). |

## Conséquences

### Positif

- **Diagnostic en 5 secondes** : opérateur voit `ORACLE-201 (ARTEMIS)` + remédiation, pas un stack overflow opaque.
- **Section-level resilience** : un framework cassé ne tue plus le pipeline. `failed.length` est exposé, l'opérateur peut re-runner cibles.
- **Hash chain préservée** : le fix `unwrapMiddlewareResult` évite de corrompre `IntentEmission.result` avec des proxies.
- **Triage industriel** : la page `/console/governance/oracle-incidents` répond à des questions métier ("quel framework casse le plus cette semaine ?", "quelles stratégies sont impactées ?").
- **Drift impossible** : le test anti-drift force tout nouveau code à utiliser un code listé. Pas de string magique.

### Coûts

- 2 fichiers nouveaux dans `strategy-presentation/` (`error-codes.ts`, `error-capture.ts`) — packagés avec le service, pas de pollution governance.
- Une entrée ajoutée au router `errorVault.oracleIncidents` — additive.
- Une page `/console/governance/oracle-incidents` — additive.

### Non-coûts (explicit)

- Pas de migration Prisma. `ErrorEvent` couvrait déjà tout.
- Pas d'ESLint rule custom `oracle-error-only` (différé phase ultérieure si dérive observée).
- Pas de modification de `error-vault.capture` ni de la page `/console/governance/error-vault` existante — vue Oracle = vue dédiée.

## Alternatives écartées

1. **Migration Prisma `ErrorEvent.oracleCode/governor/remediation`** — rejet : NEFER interdit n°1. Le champ `code` + `context` JSON existants suffisent.
2. **Rule ESLint `oracle-error-only`** — différé : il faut d'abord prouver que la dérive existe avant de bloquer le merge.
3. **Refondre la classe `Error` globale du repo** — out of scope ADR-0014. Les autres services (Ptah, Mestor, Seshat) garderont leurs erreurs natives ; seul le pipeline Oracle est gouverné par codes typés (parce que c'est le pipeline le plus exposé à l'opérateur — livrable phare).
4. **Désactiver `error-vault` capture sur `ORACLE-2xx recoverable`** — rejet : on veut justement la télémétrie agrégée.

## Vérification end-to-end

```bash
# Typecheck + lint + audits
npx tsc --noEmit
npm run lint:governance
npm run audit:cycles

# Test anti-drift catalogue
npx vitest run tests/unit/governance/oracle-error-codes.test.ts

# Manuel : reproduire le scénario "0 sections incomplete + governance crash"
# 1. ouvrir /cockpit/brand/proposition sur une stratégie 21/21
# 2. cliquer "Lancer Artemis"
# 3. attendre la réponse
# - Avant le fix : [01] ERREUR: Maximum call stack size exceeded
# - Après le fix : pipeline réussit (21/21) OU erreur typée ORACLE-NNN avec gouverneur + hint

# Manuel : vérifier la page admin
# 1. ouvrir /console/governance/oracle-incidents
# 2. confirmer que les codes apparaissent groupés avec gouverneur + remédiation
```

## Lectures liées

- [src/server/services/strategy-presentation/error-codes.ts](../../src/server/services/strategy-presentation/error-codes.ts) — catalogue + classe
- [src/server/services/strategy-presentation/error-capture.ts](../../src/server/services/strategy-presentation/error-capture.ts) — capture vers error-vault
- [src/server/governance/governed-procedure.ts](../../src/server/governance/governed-procedure.ts) — wrapper + fix unwrap
- [src/server/services/strategy-presentation/enrich-oracle.ts](../../src/server/services/strategy-presentation/enrich-oracle.ts) — circuit breakers
- [src/app/(console)/console/governance/oracle-incidents/page.tsx](../../src/app/(console)/console/governance/oracle-incidents/page.tsx) — vue admin
- [tests/unit/governance/oracle-error-codes.test.ts](../../tests/unit/governance/oracle-error-codes.test.ts) — anti-drift CI
- [LEXICON.md](../LEXICON.md) — entrée `OracleError` / `OracleErrorCode`
- [ADR-0005](0005-hash-chain-immutability.md) — IntentEmission tamper-evidence (le wrapper unwrap protège la chaîne)
- [ADR-0011](0011-neter-anubis-comms.md), [ADR-0013](0013-design-system-panda-rouge.md) — précédents
