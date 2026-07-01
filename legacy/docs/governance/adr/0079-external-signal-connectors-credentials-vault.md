# ADR-0079 — External signal connectors via Credentials Vault (Tarsis + CRM)

**Status** : Accepted
**Date** : 2026-05-16
**Phase** : 23 (Câblage pivots mission)
**Parent** : ADR-0077 (Phase 23 pivot-mechanics wiring)
**Depends on** : ADR-0021 (Credentials Vault), ADR-0046 (no-magic-fallback), ADR-0067 (LLM output structured enforcement — `executeStructuredLLMCall` precedent for retry semantics), ADR-0077 (parent)
**Patterns** : P22-1 (`ConnectorResult<T>`)

## Contexte

Phase 23 a besoin de **deux sources de signal externes** pour sortir les sous-clusters pivots du placebo Jaccard :
- **Tarsis-monitoring API** (Seshat-governed) → signal sectoriel temps-réel : competitor vocabulary overlap, claim-imitation, unpaid-press, embedding deltas.
- **CRM provider** (Anubis-governed) → cohort retention J+30/90/180, evangelist counts.

Sans ADR fondatrice, le risque concret est de :
1. **Doubler ADR-0021** Credentials Vault en créant un mécanisme parallèle de stockage de credentials (env vars, modèle Prisma dédié, etc.) ;
2. **Bypasser le pattern ship-without-keys** en faisant échouer la compilation / le runtime quand les credentials n'existent pas ;
3. **Inventer un 8ème Neter** "Tarsis" ou "CRM" — violation Cap APOGEE 7/7.

## Décision

### 1. Les deux connectors sont des entrées Credentials Vault — pas des Neteru

Tarsis-monitoring API et CRM provider sont déclarés comme **connector types** dans `services/anubis/credential-vault.ts` aux côtés des connectors ad networks existants (ADR-0021 pattern). Cap APOGEE **7/7 préservé**.

| Connector | Neter possesseur | Path du façade |
|---|---|---|
| `tarsis-monitoring` | Seshat | `services/seshat/tarsis/connector.ts` |
| `crm-provider` | Anubis | `services/anubis/providers/crm-provider.ts` |

Credentials stockés en `ExternalConnector` rows **per-`Operator`** via `tenantScopedDb` — jamais env vars (cf. ADR-0075 boundary distinct sur payment secrets).

### 2. Shape canonique : `ConnectorResult<T>` (P22-1)

Tous les façades retournent un `ConnectorResult<T>` discriminated union — défini une seule fois dans `src/domain/connector-result.ts` (Epic 1 Story 1.3) :

```ts
export type ConnectorResult<T> =
  | { state: "LIVE"; data: T; observedAt: string }
  | { state: "DEFERRED_AWAITING_CREDENTIALS"; connectorId: string }
  | { state: "DEGRADED"; reason: ConnectorDegradationReason; lastObservedAt?: string };

export type ConnectorDegradationReason =
  | "INSUFFICIENT_DATA"
  | "VENDOR_OUTAGE"
  | "RATE_LIMITED"
  | "AUTH_REVOKED";
```

Consommateurs (`campaign-tracker/`, `sector-intelligence/`, `<OvertonRadar>`, Glory tools) **handlent les trois states exhaustivement** — pas de `default else`, pas de `try`/`catch` qui swallow un transient en `LIVE`. HARD test `phase22-connector-result.test.ts` enforce.

### 3. Ship-without-keys (NFR8 / NFR9)

Quand les credentials sont absents, le façade retourne `{ state: "DEFERRED_AWAITING_CREDENTIALS", connectorId }` — **never throw, never fabricate**. Tous les sous-clusters / UI qui dépendent du connector dégradent honnêtement : `INSUFFICIENT_DATA` first-class branch (P22-2), `<empty-state>` en UI, jamais zero silencieux ni "—" placeholder (no-magic-fallback ADR-0046).

Conséquence pratique : Phase 23 ship sur `main` **avant** que le vendor contract Tarsis soit signé. CI green, founder voit empty-state honnête, opérateur retrouve le path J1 zero-code-change dès que les clés arrivent.

### 4. Test-call observability (NFR11)

Le résultat du test-call est exposé en UI (Console `/console/anubis/credentials` extension — Epic 2 Story 2.4) sous forme de `badge` triad colour + shape + label. L'opérateur diagnostique l'intégration sans ouvrir les logs.

### 5. PII handling sur CRM ingest (NFR6)

Le `crm-provider` façade applique une **field-level PII redaction** AVANT que toute cohort row ne quitte le façade : email / phone / name redacted en hash stable, redaction list configurable. Le mcp-content-pii-classifier Glory tool reste la gate équivalente pour le path MCP (cf. Epic 3 Story 3.5).

## Conséquences

**Positives** :
- Réutilisation pure d'ADR-0021 — aucun nouveau substrat de credentials.
- Cap APOGEE 7/7 préservé — `neteru-coherence.test.ts` reste green.
- Ship-without-keys decouples vendor contract timing du code release.
- Pattern réutilisable : tout futur signal externe (autres ad networks, autres CRM, etc.) suit le même path.

**Négatives / coûts** :
- L'opérateur doit configurer 2 nouveaux connectors avant que les sous-clusters dépendants sortent du `DEFERRED` state — UX-DR12 (status triad) et UX-DR10 (empty-state pattern) compensent.
- Le PII redaction sur CRM impose un schéma de configuration (champs à rediger) — vit dans la registration du connector, pas en code.

**Neutres** :
- Pas de nouvelle table — `ExternalConnector` model existant suffit.

## Migration

- Phase 23 Epic 2 Stories 2.1–2.5 livrent l'ensemble : Vault registration, deux façades, Console UI extension, HARD test activation.
- Aucune migration de credentials existants requise — les deux connector types sont net-new.

## Suivi

- HARD test `phase22-connector-result.test.ts` (Epic 2 Story 2.5) enforce le pattern P22-1 sur le repo entier.
- Anti-drift : tout futur façade externe ajouté hors Phase 23 doit également retourner `ConnectorResult<T>` — le HARD test scan inclut `services/seshat/` et `services/anubis/providers/`.
- Growth-phase : extension à d'autres ad networks (Meta/Google/X/TikTok) sous closure-roadmap target #9 (Phase 28) suit ce pattern.

## Notes

- Le boundary avec ADR-0075 (payment secrets in env vars) reste : payment secrets sont **system-wide** (env vars) ; connector credentials sont **per-operator** (`ExternalConnector` rows). Distinction préservée structurellement.
- Le HARD test `phase22-connector-result.test.ts` rejette les `try`/`catch` qui swallow un transient connector failure en `LIVE` — pattern P22-1 invariant non-négociable.
