# ADR-0145 — Tokens API MCP scopés (marque / système) + rotation + édition ADVE gouvernée

- **Status** : Accepted
- **Date** : 2026-07-14
- **Phase** : Post-clôture (chantier accès agent distant)
- **Depends on** : ADR-0026 (MCP bidirectionnel), ADR-0142 (advertis outbound), ADR-0023 (OPERATOR_AMEND_PILLAR)
- **Supersedes** : —

## Contexte

L'opérateur veut piloter **n'importe quelle marque via un agent distant** sans être
« coincé dehors » : un **générateur de token API dans la console**, avec un niveau
d'accès **limité à une marque OU au système entier**, un **token système valable pour
toujours**, **rotable** en un clic. Idéalement un **portail MCP** avec gestion d'accès
taillée.

État constaté (audit) : **tout le socle existe déjà** — modèle `McpApiKey`
(`schema.prisma`), auth `authenticateMcpRequest` (`anubis/mcp-billing.ts`), endpoint
`/api/mcp` (+ 11 serveurs), console `/console/anubis/api-billing` (créer/révoquer/relevés),
serveur MCP `advertis` **lecture seule** de l'ADVE (ADR-0142). Manquaient : **la portée
par marque**, la **rotation**, et un **outil d'édition** de l'ADVE.

## Décision

Étendre l'existant (zéro doublon).

**Modèle** `McpApiKey` (migration additive, backfill-safe) : `scopeKind` (`SYSTEM` défaut |
`BRAND`) + `scopeStrategyId` (la seule marque si BRAND) + `rotatedToId`/`rotatedAt`
(lineage). `expiresAt` existait déjà → **null = pour toujours** (réutilisé tel quel).

**Auth** `authenticateMcpRequest` : renvoie désormais `scopeKind`/`scopeStrategyId` dans
`McpAuthResult` (ADMIN session = SYSTEM). Les deux routes (`/api/mcp` agrégé + per-server)
**injectent** ce contexte dans les params de l'outil (écrit APRÈS le spread → aucun
usurpation client) pour que les outils d'écriture l'exigent.

**Service/tRPC** : `createApiKey` accepte la portée ; **`rotateApiKey`** (transaction :
mint un nouveau secret copiant la config, désactive l'ancien + lineage) ; router
`mcpBilling.rotateKey` (adminProcedure). `listKeys` expose la portée.

**Console** `/console/anubis/api-billing` : radio **Système entier / Une seule marque** +
champ marque + case **∞ pour toujours** + bouton **Roter** ; secret affiché **une seule
fois** (inchangé).

**Outil d'édition ADVE** : serveur `advertis` gagne **`amendPillar`** — édite un pilier
ADVE (a/d/v/e) via la voie gouvernée **`OPERATOR_AMEND_PILLAR`** (`emitIntent`), qui apporte
gratuitement le gate de cohérence, le versioning, la staleness RTIS et l'audit. **Fail-closed**
sur la portée : sans contexte d'auth injecté → refus ; token BRAND → refus si
`strategyId ≠ scopeStrategyId` ; token SYSTEM (ou ADMIN) → toute marque. R/T/I/S ne sont
**pas** éditables (ils dérivent — contrainte de type préservée).

## Conséquences

- Un agent distant avec un **token SYSTEM pour-toujours** lit (`getAdveRtis`) **et** édite
  (`amendPillar`) **n'importe quel** ADVE — la circulation d'info par MCP est la voie
  canonique (directive opérateur), plus de « coincé dehors ».
- Un **token BRAND** est cloisonné à une marque (délégation sûre à un partenaire/agent tiers).
- **Rotation** en un clic (secret compromis → nouveau, ancien mort, config conservée).
- Metering/facturation existants (`meterAndRun`) inchangés — un call d'édition est tracé
  et facturé comme les autres.
- **Params de connexion** : `POST https://<host>/api/mcp` (agrégé, body `{server,tool,params}`)
  ou `/api/mcp/advertis` ; header **`x-api-key: lfk_…`** ; `GET /api/mcp` = manifeste.
  Documenté dans [context/MCP-AGENT-ACCESS.md](../context/MCP-AGENT-ACCESS.md).
- Cap APOGEE 7/7 préservé (aucun Neter ; l'édition passe par un Intent Mestor existant).

### Résidus (RESIDUAL-DEBT)

- Sélecteur de marque riche dans la console (aujourd'hui : champ id) — pattern picker futur.
- Outils MCP d'édition campagne/asset (aujourd'hui : `?op=patch` admin via CRON_SECRET) —
  à exposer en outils MCP scopés (le commentaire `seed-brands/route.ts` le demande déjà).
