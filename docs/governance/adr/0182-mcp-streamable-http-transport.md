# ADR-0182 — Transport MCP Streamable HTTP réel + tools contenu complet

- **Status** : Accepted
- **Date** : 2026-07-26
- **Phase** : Chantier « Conseil de marque + chat Assistant + MCP réel » — WP4
- **Depends on** : ADR-0026 (MCP bidirectionnel), ADR-0142 (advertis outbound), ADR-0145 (tokens scopés), ADR-0180 (conseil de marque)
- **Supersedes** : —

## Contexte

Demande opérateur : « je n'ai toujours pas trouvé le moyen de RAG le cockpit
et/ou d'y accéder via MCP facilement pour que mon client Claude puisse réfléchir
dedans — pourtant tout existe ».

Ground-truth : `/api/mcp/*` parle un dialecte REST maison `{server,tool,params}`
— **PAS le protocole MCP JSON-RPC**. `@modelcontextprotocol/sdk@^1.29` était
déclaré dans package.json mais **importé nulle part**. Le snippet de config de
`MCP-AGENT-ACCESS.md` (`{"mcpServers":{"lafusee":{"url":".../api/mcp"}}}`) ne
pouvait donc PAS fonctionner avec Claude Code/Desktop. Défauts adjacents : contenu
piliers tronqué à 280 chars (`pillarHeadline`), Oracle **zéro** exposition MCP,
RAG exposé nulle part, `knowledge_graph_query` buggé (appariait le strategyId sur
`sector` + ignorait `input.query`), manifest racine `GET /api/mcp` inaccessible
par clé API (garde `session?.user`).

## Décision

### 1. Transport MCP réel — `src/app/api/mcp/rpc/route.ts`

`WebStandardStreamableHTTPServerTransport` du SDK 1.29 (Request/Response
Web-standard — natif pour un route handler Next, aucun adaptateur Node
nécessaire). Mode **STATELESS** (`sessionIdGenerator: undefined`,
`enableJsonResponse: true`) : serveur MCP créé PAR REQUÊTE — seul mode sûr sur
pm2/Coolify multi-process (une session en mémoire ne survivrait pas au routage
entre workers). `GET`/`DELETE` → 405 (pas de flux server-initiated v1).

- Auth : `authenticateMcpRequest(request, "*")` (clé `lfk_` SYSTEM/BRAND ou
  session ADMIN — gate existante réutilisée).
- Scoping + metering **préservés** : chaque tool passe par `scopeParamsForTool`
  (fail-closed BRAND) → `dispatchTool` (`enforceBrandScope`) enveloppé dans
  `meterMcp` (extrait de `meterAndRun` — retourne la valeur brute au lieu d'une
  NextResponse, pour le transport JSON-RPC).

### 2. Curation `tools/list` — `mcp-curated.ts` + `mcp-transport.ts`

~100 tools bruts noieraient un client. Registre curé `CURATED_MCP_TOOLS`
(~17 tools haute-valeur : advertis ×4, oracle ×3, council ×2, intelligence
rag_search + knowledge_graph_query, pulse ×3, seshat ×2) exposés sous un nom plat
`${server}_${tool}` (regex MCP, pas de points) + 2 génériques `lafusee_catalog`
(manifest complet) et `lafusee_invoke {server,tool,params}` (passthrough longue
traîne, même scoping/metering). `mcp-curated.ts` est un module FEUILLE (zéro
import lourd) — consommable par les tests sans tirer la chaîne HTTP.

### 3. Tools contenu complet + fixes en passant

- **Nouveau** `advertis.getPillarContent` — contenu Pillar.content INTÉGRAL
  (fin de la troncature 280c ; `getAdveRtis` inchangé pour compat).
- **Nouveaux serveurs** `oracle` (list_sections / get_section / snapshot, réutilise
  le service `oracle-section` + `SECTION_REGISTRY`) + `council` (ask / deliberate,
  ADR-0180). `MCP_SERVER_NAMES` : 10 → 12.
- **Nouveau** `intelligence.rag_search` — `topKWithinStrategy`, dégrade honnêtement
  (`usedVectorSearch` false + filtre mots-clés) quand aucun provider d'embeddings.
- **Fix** `knowledge_graph_query` — utilise enfin `input.query` (ranking mots-clés
  déterministe) + apparie le strategyId sur `data`, pas sur `sector`.
- **Fix** `GET /api/mcp` — accepte désormais session OU x-api-key.
- Le comportement BRAND fail-closed sur les tools sans `strategyId` est CONSERVÉ
  (résidu documenté ADR-0145).

## Conséquences

- Un client Claude Code (web/CLI) se connecte via
  `{"type":"http","url":".../api/mcp/rpc","headers":{"x-api-key":"lfk_…"}}`.
- Docs `MCP-AGENT-ACCESS.md` réécrites (snippet fonctionnel + note egress
  allowlist `powerupgraders.com`). Voie REST envelope conservée pour agents
  non-MCP (galahad, WP5).
- Tests : `mcp-rpc-transport.test.ts` (registre curé valide + existant, scoping/
  metering préservés, oracle+council enregistrés, contenu complet, fix
  knowledge_graph_query) + `api-route-auth-guards` étendu (rpc route).
- Cap APOGEE 7/7 préservé (transport = mécanique Anubis, pas un Neter).
- **Déféré (RESIDUAL-DEBT)** : les 28 `resources[]` MCP déclarées jamais câblées
  (scoping BRAND des URIs non trivial) ; OAuth 2.1 pour claude.ai web/mobile
  (v1 = header x-api-key, cible Claude Code).
