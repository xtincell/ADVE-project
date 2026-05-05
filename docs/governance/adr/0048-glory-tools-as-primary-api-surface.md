# ADR-0048 — Glory tools as primary API surface, Ptah as orchestrator

**Date** : 2026-05-03 (renuméroté 2026-05-05 — voir note ci-dessous)
**Statut** : Accepted
**Phase** : 16 (Higgsfield integration trigger)
**Auteur direction** : opérateur (user)

> **Note de renumérotation (2026-05-05)** : ADR enregistré initialement sous 0028 (PR #54, commit 7669ec3 2026-05-04 09:09) alors que ce numéro était déjà attribué depuis la PR #47 (commit b0ccb40 2026-05-03 10:29) à [ADR-0028 Strategy archive 2-phase](0028-strategy-archive-2-phase.md). Conflit d'agents parallèles. Renuméroté 0028→0048 en suivant la règle chronologique (first-come keep). Toutes les références CLAUDE.md, LEXICON.md, CHANGELOG.md, tests et ADR-0036 ont été mises à jour dans le commit de renumérotation. Compatibility alias historique : "ADR-0028 (Glory tools)" === ADR-0048.

## Contexte

Le repo expose aujourd'hui les capacités de génération d'assets via deux surfaces architecturales très différentes :

1. **Ptah** (ADR-0009) — fonderie matérialisation, orchestre 4 providers internes (Magnific / Adobe Firefly / Figma / Canva) via interface `ForgeProvider` lourde (~300 LoC par provider : `forge / reconcile / verifyWebhook / estimateCost / isAvailable` + circuit breaker `ForgeProviderHealth`). Chaque appel passe par `PTAH_MATERIALIZE_BRIEF` avec cost gate Thot pre-flight (`CHECK_CAPACITY`) + `pillarSource` obligatoire + `manipulationMode` + boucle Seshat post-déploiement (`expectedSuperfans`, `cultIndexDeltaObserved`).
2. **Glory tools** (Artemis, `registry.ts`) — outils atomiques invocables par sequence-executor, output texte typé. ~95% sont COMPOSE/CALC/LLM ; quelques-uns ont `forgeOutput?: ForgeSpec` qui handoff à Ptah après exécution.

**Le déclencheur** : intégration Higgsfield (https://mcp.higgsfield.ai/mcp) — provider AI motion vidéo (DoP, Soul, Steal). Première itération de design proposait un 5ème provider Ptah `higgsfield` avec interface `ForgeProvider` complète + extension `ProviderName` + circuit breaker dédié + provider-selector mis à jour. Volume estimé : ~400 LoC.

**Drift identifié** : NEFER §3 interdit 1 — *réinventer la roue*. Higgsfield ne mérite pas un provider Ptah complet. Trois raisons :

1. **Doublon vidéo** — Magnific couvre déjà Kling, Veo, Runway, Hailuo, LTX, PixVerse, WAN, Seedance (8 modèles vidéo). Higgsfield apporte 3 capacités UNIQUES (motion control fin, portrait lifestyle hyperréaliste, style transfer vidéo) — pas une plateforme générale.
2. **Granularité inadaptée** — un provider Ptah présuppose orchestration complexe + cost gate strict + ancrage `pillarSource`. Pour un appel "explore une idée avec Higgsfield DoP" en mode brouillon, c'est sur-engineering.
3. **Pattern MCP atomique** — Higgsfield est exposé en MCP server natif. Anubis a déjà la couche (mcp-client, Credentials Vault, McpRegistry). Faire un provider Ptah qui sous le capot délègue à Anubis = double-emploi.

NEFER §0.3 mapping canonique dit : `"outil" → GloryTool`. Un appel API atomique = un Glory tool.

## Décision

**Inverser la hiérarchie** : les API/MCP atomiques sont **des Glory tools**, pas des providers Ptah. Ptah reste mais évolue vers un rôle d'**orchestrateur** de Glory tools quand il faut produire un `BrandAsset` matériel signé (cost gate + `pillarSource` + Seshat tracking).

### Schéma cible

```
Niveau 1 — Glory tools atomiques (1 capability = 1 tool)
  ├─ executionType ∈ {LLM, COMPOSE, CALC, MCP}
  ├─ requiresPaidTier?: boolean   ← Phase 16-A
  ├─ paidTierAllowList?: string[] ← Phase 16-A
  ├─ mcpDescriptor?: {serverName, toolName, paramMap}  ← Phase 16-B
  └─ forgeOutput?: ForgeSpec  ← optionnel handoff Ptah si on veut matérialiser en BrandAsset
       │
       ├─ higgsfield-dop-camera-motion (MCP, paid)
       ├─ higgsfield-soul-portrait (MCP, paid)
       ├─ higgsfield-steal-style-transfer (MCP, paid)
       ├─ (futur) magnific-mystic-image (MCP, paid)
       ├─ (futur) magnific-kling-video (MCP, paid)
       ├─ (futur) sora-mcp-video (MCP, paid)
       ├─ ... ~50+ Glory tools existants (LLM/COMPOSE/CALC)

Niveau 2 — Ptah orchestrateur
  └─ PTAH_MATERIALIZE_BRIEF orchestre une cascade Glory tools quand un brief
     produit un BrandAsset matériel signé (cost gate Thot + pillarSource + Seshat)
```

### Phase 16 — implémentation actuelle

Trois sous-phases livrées dans cette ADR :

#### Phase 16-A — Tier gate Glory tools

- **Helper** `src/server/services/glory-tools/tier-gate.ts` — `checkPaidTier(operatorId, allowedTiers?)`. Default `PAID_TIER_KEYS_DEFAULT = [COCKPIT_MONTHLY, RETAINER_BASIC, RETAINER_PRO, RETAINER_ENTERPRISE]`. Status acceptés : `active` + `trialing`.
- **Manifest** `GloryToolDef` étendu :
  - `requiresPaidTier?: boolean` (default false)
  - `paidTierAllowList?: readonly string[]` (override default)
- **Exécution** `engine.executeTool` check au tout début, avant création `IntentEmission`. Refus structuré `{status: "TIER_GATE_DENIED", reason, configureUrl, requiredTiers}` sans throw.

#### Phase 16-B — Higgsfield Glory tools + MCP execution branch

- **Type** `GloryExecutionType` étendu avec `"MCP"`.
- **Field** `mcpDescriptor: {serverName, toolName, paramMap?}` sur `GloryToolDef`.
- **3 Glory tools** dans `src/server/services/artemis/tools/higgsfield-tools.ts` : DoP (BRAND, motion vidéo cinématique), Soul (BRAND, portrait lifestyle), Steal (BRAND, style transfer vidéo). Tous `requiresPaidTier: true`. Ajoutés à `EXTENDED_GLORY_TOOLS` (pas `CORE` — préserve cardinalité 39 du test legacy).
- **Branche** `engine.ts` → fonction `executeMcpTool` : mappe `inputFields` → MCP params, délègue à `anubis.invokeExternalTool({serverName, toolName, inputs, intentId, operatorId})`, persiste `GloryOutput` + clôture lineage `IntentEmission`.

#### Phase 16-C — OAuth 2.1 device flow

Higgsfield exige OAuth 2.1 device flow (RFC 8628) avec discovery RFC 9728. Implémentation réutilisable pour tout futur MCP server OAuth.

- **Service** `src/server/services/anubis/oauth-device-flow.ts` :
  - `discoverOAuthMetadata(mcpEndpoint)` — chaîne `/.well-known/oauth-protected-resource` → `authorization_servers[]` → `/.well-known/oauth-authorization-server` → `{device_authorization_endpoint, token_endpoint}`.
  - `startDeviceFlow({operatorId, serverName, clientId, scopes})` — POST device authorization endpoint, persiste flow state dans `McpRegistry.toolsCache.oauthFlow`, retourne `verification_uri_complete`.
  - `pollTokenEndpoint({operatorId, serverName})` — POST token endpoint (`grant_type=urn:ietf:params:oauth:grant-type:device_code`). Sur OK : persiste triplet `{access_token, refresh_token, expires_at, token_endpoint, client_id}` dans Credentials Vault, status ACTIVE. Erreurs RFC 8628 §3.5 traitées (`authorization_pending`, `slow_down`, `access_denied`, `expired_token`).
  - `refreshIfNeeded({operatorId, serverName, config})` — refresh transparent si `expires_at < now+60s`. Sur fail : `markError` + caller obtient `DEFERRED_AWAITING_CREDENTIALS`.
- **mcp-client.ts** étendu — détecte `authMode === "oauth-device-flow"`, invoque `refreshIfNeeded` avant chaque call externe.
- **3 Intent kinds Anubis** : `ANUBIS_OAUTH_DEVICE_FLOW_START` / `_POLL` / `ANUBIS_OAUTH_REFRESH_TOKEN` (gouverneur `ANUBIS`, sync, SLOs définis).
- **2 procédures tRPC** sur `anubis` router : `mcpOAuthDeviceFlowStart` + `mcpOAuthDeviceFlowPoll`. Convention env var `<SERVER_NAME>_OAUTH_CLIENT_ID` (helper `resolveOAuthClientId`).
- **Setup operator** : pour activer Higgsfield, l'opérateur :
  1. Set env `HIGGSFIELD_OAUTH_CLIENT_ID` (registré côté higgsfield.ai)
  2. Appelle `mcpRegisterServer({direction: "INBOUND", serverName: "higgsfield", endpoint: "https://mcp.higgsfield.ai/mcp"})`
  3. Appelle `mcpOAuthDeviceFlowStart({serverName: "higgsfield"})` → ouvre `verification_uri_complete` dans nouveau tab → autorise sur higgsfield.ai
  4. Boucle `mcpOAuthDeviceFlowPoll({serverName: "higgsfield"})` jusqu'à `status: "OK"`
  5. Dès lors les 3 Glory tools sont invocables pour les operators avec abonnement payant actif

### Cap APOGEE

Aucun changement. **7 Neteru actifs maintenu**. Higgsfield n'est ni un Neter ni un sous-service ni un provider Ptah — c'est un connector externe atomique exposé via Anubis MCP + 3 Glory tools légers.

## Conséquences

### Positives

- **Anti-doublon** — pas de 5ème provider Ptah. ~300 LoC économisées.
- **Granularité juste** — Artemis peut explorer Higgsfield à la pièce sans engager toute la machinerie Ptah.
- **Pattern réutilisable** — toute future intégration MCP server externe (Sora MCP, Runway MCP) suit le même schéma : 1 import `mcpDescriptor` → N Glory tools.
- **OAuth device flow réutilisable** — premier connector du repo en device flow, code générique pour la suite.
- **Tier gate générique** — applicable à n'importe quel Glory tool (pas seulement MCP). Permet de gater des outils LLM coûteux sur PRO/Enterprise.
- **Cap APOGEE préservé** — 7/7 Neteru, pas d'inflation.

### Négatives

- **Refonte progressive Magnific/Adobe/Figma/Canva** — à terme ces "providers Ptah" mériteraient d'être éclatés en Glory tools atomiques aussi. Pas urgent (ça fonctionne), mais c'est la direction. Dette tracée dans `RESIDUAL-DEBT.md`.
- **Ptah devient ambigu** dans l'intervalle — orchestrateur de futurs Glory tools, mais conserve ses providers internes legacy. Cohabitation explicite documentée.
- **Convention env var** `<SERVER_NAME>_OAUTH_CLIENT_ID` — opérateur doit set côté infra avant chaque nouveau MCP OAuth. Acceptable (pattern Vault existant).

## Tests bloquants

- `tests/unit/services/glory-tools/tier-gate.test.ts` — `checkPaidTier` retourne `allowed: false` si pas de Subscription, `allowed: true` si tier actif dans la liste, refuse les `INTAKE_PDF` / `ORACLE_FULL`, accepte `trialing` status.
- `tests/unit/services/artemis/tools/higgsfield-tools.test.ts` — les 3 tools sont présents dans `EXTENDED_GLORY_TOOLS`, ont `requiresPaidTier: true`, ont un `mcpDescriptor.serverName === "higgsfield"`, ont `executionType === "MCP"`.

## Alternatives rejetées

- **5ème provider Ptah** — sur-engineered, doublon avec Magnific, viole NEFER §3 interdit 1.
- **Higgsfield direct dans `mcp-client` sans Glory tool** — pas découvrable par Artemis sequenceur, pas de tier gate, pas dans le registry.
- **Nouveau Neter MCP-Bridge** — viole NEFER §3 (cap 7/7), Anubis fait déjà le job.

## Liens

- [ADR-0009](0009-neter-ptah-forge.md) — Ptah forge (legacy providers internes, conservés)
- [ADR-0021](0021-external-credentials-vault.md) — Credentials Vault pattern
- [ADR-0026](0026-mcp-bidirectional-anubis.md) — MCP bidirectionnel Anubis
- `src/server/services/glory-tools/tier-gate.ts` — helper tier gate
- `src/server/services/artemis/tools/higgsfield-tools.ts` — 3 Glory tools Higgsfield
- `src/server/services/artemis/tools/engine.ts` — branch MCP execution
- `src/server/services/anubis/oauth-device-flow.ts` — RFC 8628 + RFC 9728 implementation
- RFC 8628 — OAuth 2.0 Device Authorization Grant
- RFC 9728 — OAuth 2.0 Protected Resource Metadata
