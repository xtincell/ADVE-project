# ADR-0142 — MCP Advertis (sortant) : exposer une marque à un agent

- **Status** : Accepted
- **Date** : 2026-07-13 (soir)
- **Phase** : mandat opérateur « le MCP de l'Advertis doit permettre d'exposer une marque à un agent — ses fondations existent mais il n'a jamais été achevé et livré clé en main. Ces métriques sont les 5 métriques AARRR (la forme varie, le type de comportement non). »
- **Depends on** : ADR-0026 (stack MCP agrégée + bidirectionnelle), ADR-0141 (superfan à conditions strictes — les gates qui MESURENT les comportements), ADR-0021 (Credentials Vault / clés MCP), ADR-0046 (no-magic-fallback)
- **Supersedes** : —

## Contexte

Les fondations MCP existent : 9 serveurs agrégés sur `/api/mcp` (ADR-0026), dont `advertis-inbound` qui **ingère** des signaux SaaS vers les piliers ADVE. Mais **aucun serveur n'expose une marque À un agent** de façon cohérente et clé en main : les données de marque étaient dispersées (pulse, intelligence…), en accès ADMIN, sans surface unique « voici la marque X ». Le symétrique lecture d'`advertis-inbound` n'avait jamais été livré.

L'opérateur précise le contenu : ce qu'un agent doit recevoir d'une marque, ce sont ses **5 comportements AARRR** (`AARRR_INTENTS` : Acquisition, Activation, Rétention, Revenue, Referral). La forme du signal varie par marque ; le type de comportement traqué, non. Et ces comportements sont désormais MESURABLES : ADR-0141 vient de poser les 5 gates superfan (VIEWED/INTERACTED/PAID/RECOMMENDED/SHARED) qui SONT les 5 comportements AARRR.

## Décision

### 1. Serveur MCP sortant `advertis` (`src/server/mcp/advertis/`)

Contrepartie lecture d'`advertis-inbound`. Lecture seule, scopée à `strategyId`, zéro mutation, zéro LLM. 3 tools :

- **`getBrandCard`** — identité ADVERTIS : nom, secteur, archétype, positionnement, promesse maître, palier de maturité (`classifyTier`) + score composite.
- **`getAarrrBehaviors`** (cœur) — les 5 comportements AARRR. Pour chacun : la **définition déclarée** (pilier E `aarrr`), la **valeur mesurée** (personnes trackées ayant franchi le comportement, dérivée des gates superfan ADR-0141) et son **état honnête** : `MEASURED` / `DECLARED_ONLY` / `NOT_INSTRUMENTED`. REVENUE = clients réels (registre manuel ADR-0141). RETENTION = comportement récurrent (récence + répétition), pas un gate one-shot. ACQUISITION per-personne non instrumentée (audience = agrégat) — dit honnêtement.
- **`getEngagementLadder`** — distribution de l'audience trackée sur les 6 rungs + nombre de superfans actifs.

### 2. Mapping canonique condition ↔ AARRR (`src/domain/superfan-conditions.ts`)

`CONDITION_TO_AARRR` : VIEWED→ACQUISITION, INTERACTED→ACTIVATION, PAID→REVENUE, RECOMMENDED/SHARED→REFERRAL. RETENTION n'a pas de gate (récurrent). Réconcilie ADR-0141 avec le framework AARRR déjà canonique dans le repo (`domain/touchpoints.ts`, pilier E, `CampaignAARRMetric`).

### 3. Enregistrement dans la stack existante

`advertis` ajouté à `MCP_SERVER_NAMES` (agrégateur `mcp-server.ts`) → découvrable via `/api/mcp` (manifest) et exécutable via `/api/mcp/advertis`. Auth + metering réutilisent `authenticateMcpRequest`/`meterAndRun` (billable, ADR-0021/Vague 5) — aucune nouvelle mécanique d'auth.

## Conséquences

- Un agent externe (ou l'agent de la marque) a enfin **une fenêtre unique, cohérente et honnête** sur une marque : son identité, ses 5 comportements AARRR mesurés, son échelle d'engagement.
- **Aucune donnée fabriquée** : chaque comportement porte son état ; un gate non instrumenté est dit tel, jamais compté 0 en douce.
- Cap APOGEE 7/7 préservé (MCP = surface Anubis, pas un Neter), 0 migration, 0 nouveau modèle, 0 LLM.

## Dette (turnkey restant)

- **Jeton agent scopé-marque** : aujourd'hui l'accès est ADMIN ou clé-serveur, et l'agent passe `strategyId` en paramètre. Le vrai « clé en main » = un jeton d'exposition qui scope un agent à UNE marque (une seule `strategyId` autorisée par jeton). C'est l'incrément suivant (extension de `McpApiKey` avec un scope `strategyId`).
- Instruments per-personne encore manquants (hérités d'ADR-0141) : ACQUISITION/RETENTION/REFERRAL per-personne dépendent d'une donnée de vue/partage/récurrence par personne non collectée aujourd'hui.
- Surface console pour émettre/révoquer un jeton d'exposition de marque.
