# ADR-0142 — MCP Advertis (sortant) : exposer une marque à un agent

- **Status** : Accepted
- **Date** : 2026-07-13 (soir)
- **Phase** : mandat opérateur « le MCP de l'Advertis doit permettre d'exposer une marque à un agent — ses fondations existent mais il n'a jamais été achevé et livré clé en main » — puis **précision de domaine** (2026-07-13, même fil) : « le MCP que je voulais était pour l'ADVERTIS ; les AARRR, c'est le suivi des superfans (zéro LLM), un autre domaine ; Overton et les superfans sont encore d'autres domaines ».
- **Depends on** : ADR-0026 (stack MCP agrégée + bidirectionnelle), ADR-0141 (superfan à conditions strictes — les gates qui MESURENT les comportements), ADR-0021 (Credentials Vault / clés MCP), ADR-0046 (no-magic-fallback)
- **Supersedes** : —

## Contexte

Les fondations MCP existent : 9 serveurs agrégés sur `/api/mcp` (ADR-0026), dont `advertis-inbound` qui **ingère** des signaux SaaS vers les piliers ADVE. Mais **aucun serveur n'expose une marque À un agent** de façon cohérente et clé en main : les données de marque étaient dispersées (pulse, intelligence…), en accès ADMIN, sans surface unique « voici la marque X ». Le symétrique lecture d'`advertis-inbound` n'avait jamais été livré.

## Frontière de domaine (canon)

Trois domaines DISTINCTS — le MCP `advertis` n'expose QUE le premier :

1. **ADVERTIS** = la stratégie **ADVE-RTIS** (les 8 piliers A/D/V/E/R/T/I/S). ← périmètre du MCP `advertis`.
2. **Superfans** = mécanique pivot, traquée par le framework **AARRR** (déterministe, **zéro LLM**, ADR-0141). Domaine Seshat/superfan — surfacé par le MCP `pulse` (`getSuperfans`/`getDevotionLadder`) + le cockpit. **Pas dans `advertis`.**
3. **Fenêtre d'Overton** = mécanique pivot, domaine culture/Seshat (OvertonRadar, sector-intelligence). **Pas dans `advertis`.**

Note : le funnel AARRR *déclaré* (pilier E `aarrr`) fait partie de la stratégie ADVE-RTIS, donc il transite naturellement par `getAdveRtis` — mais la *mesure* AARRR (comptes de comportements superfans) reste dans le domaine superfan.

## Décision

### 1. Serveur MCP sortant `advertis` (`src/server/mcp/advertis/`) — expose l'ADVE-RTIS

Contrepartie lecture d'`advertis-inbound`. Lecture seule, scopée à `strategyId`, zéro mutation, zéro LLM. 2 tools :

- **`getBrandCard`** — identité ADVERTIS : nom, secteur, archétype, accroche, positionnement, promesse maître, palier de maturité (`classifyTier`) + score composite.
- **`getAdveRtis`** (cœur) — la stratégie ADVE-RTIS : les 8 piliers, chacun avec son nom, un résumé lisible (extraction déterministe des champs texte de tête — aucun nom de champ codé en dur, robuste à la forme de n'importe quelle marque) et son score. Paramètre optionnel `keys` pour un sous-ensemble.

### 2. Enregistrement dans la stack existante

`advertis` ajouté à `MCP_SERVER_NAMES` (agrégateur `mcp-server.ts`) → découvrable via `/api/mcp` (manifest) et exécutable via `/api/mcp/advertis`. Auth + metering réutilisent `authenticateMcpRequest`/`meterAndRun` (billable, ADR-0021/Vague 5) — aucune nouvelle mécanique d'auth.

### 3. Mapping canonique condition ↔ AARRR — dans le domaine SUPERFAN

`CONDITION_TO_AARRR` (`src/domain/superfan-conditions.ts`) : VIEWED→ACQUISITION, INTERACTED→ACTIVATION, PAID→REVENUE, RECOMMENDED/SHARED→REFERRAL (RETENTION = récurrent, pas de gate). Ce mapping appartient au **domaine superfan** (ADR-0141), pas au MCP `advertis` — il documente que les 5 conditions strictes SONT les 5 comportements AARRR, réconciliant ADR-0141 avec le framework déjà canonique (`domain/touchpoints.ts`, pilier E, `CampaignAARRMetric`).

## Conséquences

- Un agent externe (ou l'agent de la marque) a enfin **une fenêtre unique, cohérente et honnête sur l'ADVERTIS d'une marque** : son identité + sa stratégie ADVE-RTIS complète.
- **Frontière de domaine respectée** : le suivi superfan (AARRR) et Overton restent dans leurs domaines (surfaces `pulse`/cockpit + culture) — pas mélangés à la stratégie.
- **Aucune donnée fabriquée** : un pilier absent est marqué `present: false`, jamais rempli.
- Cap APOGEE 7/7 préservé (MCP = surface Anubis, pas un Neter), 0 migration, 0 nouveau modèle, 0 LLM.

## Dette (turnkey restant)

- **Jeton agent scopé-marque** : aujourd'hui l'accès est ADMIN ou clé-serveur, et l'agent passe `strategyId` en paramètre. Le vrai « clé en main » = un jeton d'exposition qui scope un agent à UNE marque (une seule `strategyId` autorisée par jeton). C'est l'incrément suivant (extension de `McpApiKey` avec un scope `strategyId`).
- Surface console pour émettre/révoquer un jeton d'exposition de marque.

(Le suivi superfan/AARRR et Overton ont leur propre dette dans leurs domaines respectifs — ADR-0141 et suivants — pas ici.)
