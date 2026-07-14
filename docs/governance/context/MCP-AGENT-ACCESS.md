# Accès agent distant par MCP — paramètres de connexion (ADR-0145)

Comment un agent distant (NEFER, un assistant tiers…) **lit et édite n'importe quelle
marque** de La Fusée, avec un token scopé, sans être « coincé dehors ».

## 1. Obtenir un token (console)

`/console/anubis/api-billing` (ADMIN) → **Nouvelle clé** :

- **Nom** : à quoi/qui elle sert.
- **Serveur** : `*` (tous) — ou un serveur précis (`advertis` pour lire/éditer l'ADVE).
- **Accès** :
  - **Système entier** → touche **toutes** les marques (le token « maître »).
  - **Une seule marque** → cloisonné à un `strategyId` (délégation sûre).
- **∞ valable pour toujours** (coché) → aucune expiration.
- **Créer** → le secret `lfk_…` s'affiche **une seule fois** (copie-le).
- **Roter** (sur une clé) → nouveau secret, l'ancien meurt, config conservée.

## 2. Paramètres de connexion

- **Endpoint agrégé** : `POST https://powerupgraders.com/api/mcp`
  body : `{ "server": "<serveur>", "tool": "<outil>", "params": { … } }`
- **Endpoint par serveur** : `POST https://powerupgraders.com/api/mcp/advertis`
  body : `{ "tool": "<outil>", "params": { … } }`
- **Auth** : header **`x-api-key: lfk_…`**
- **Découverte** : `GET https://powerupgraders.com/api/mcp` → manifeste (serveurs + outils).

Config type Claude Desktop / client MCP :

```json
{ "mcpServers": { "lafusee": { "url": "https://powerupgraders.com/api/mcp" } } }
```

(Un agent headless ajoute le header `x-api-key`.)

## 3. Toucher un ADVE

Serveur `advertis` :

- **Lire** — `getAdveRtis` `{ strategyId }` → les 8 piliers (A/D/V/E/R/T/I/S) + scores ;
  `getBrandCard` `{ strategyId }` → carte d'identité.
- **Éditer** — `amendPillar` `{ strategyId, pillarKey: "a|d|v|e", field, proposedValue,
  mode: "PATCH_DIRECT"|"STRATEGIC_REWRITE", reason }`. Passe par la voie gouvernée
  `OPERATOR_AMEND_PILLAR` (gate de cohérence + versioning + audit). **R/T/I/S ne s'éditent
  pas** (ils dérivent de l'ADVE). Un token **BRAND** ne peut éditer **que** sa marque.

Exemple :

```bash
curl -sS -X POST https://powerupgraders.com/api/mcp/advertis \
  -H "x-api-key: lfk_xxx" -H "Content-Type: application/json" \
  -d '{"tool":"amendPillar","params":{"strategyId":"spawt-strategy-001",
       "pillarKey":"a","field":"nomMarque","proposedValue":"SPAWT",
       "mode":"PATCH_DIRECT","reason":"maj via agent"}}'
```

## 4. Éditer campagnes / actions / missions (tunnel data-ops)

Pour les **données** (hors ADVE) — campagnes, tâches, missions, businessContext — le tunnel
admin `POST /api/admin/seed-brands?op=patch` (header `Authorization: Bearer <CRON_SECRET>`)
édite par lots (voir `src/app/api/admin/seed-brands/route.ts`). Exposition en outil MCP
scopé = résidu tracé (ADR-0145).

## 5. Pousser des métriques d'activité (ingestion agnostique, ADR-0146)

Une source externe (quiz, app, CRM, newsletter, terrain, webhook) pousse des chiffres
RÉELS dans le tracker de campagne + les KPI de mission. Le **même token scopé** sert
(serveur `ingest` ou `*` ; un token BRAND ne pousse QUE sa marque).

`POST https://powerupgraders.com/api/ingest/metrics` — header `x-api-key: lfk_…` :

```bash
curl -sS -X POST https://powerupgraders.com/api/ingest/metrics \
  -H "x-api-key: lfk_xxx" -H "Content-Type: application/json" \
  -d '{"strategyId":"spawt-strategy-001","sourceType":"QUIZ",
       "sourceLabel":"quizz.spawt.online","campaignId":"spawt-campaign-lancement",
       "period":"2026-07",
       "metrics":[
         {"stage":"ACQUISITION","metric":"quiz_starts","value":420},
         {"stage":"ACTIVATION","metric":"quiz_completions","value":180,"target":250},
         {"kpiActivityId":"mission-activity-id","metric":"leads","value":180}
       ]}'
```

- `stage` (AARRR) **+** `campaignId` → écrit une `CampaignAARRMetric` (idempotent : ré-émettre
  la même métrique/période **écrase** la valeur, ne duplique pas).
- `kpiActivityId` → met à jour `MissionActivity.kpiActual` (gardé : l'activité doit être de
  cette marque).
- Chaque appel écrit **toujours** une provenance ; la fiche mission affiche alors
  « Dernière remontée le … » (fini le « bientôt »).
- Sources internes (cron/pull) : header `Authorization: Bearer <CRON_SECRET>` au lieu de
  `x-api-key` (portée SYSTEM, non facturé).

## 6. Sécurité

- Seul le **hash SHA-256** du token est stocké ; le secret n'est jamais re-dérivable.
- Un token **révoqué**/expiré/roté est refusé à l'auth.
- La portée BRAND est **fail-closed** : l'outil d'édition refuse si le contexte de portée
  n'a pas été injecté par la route gardée.
