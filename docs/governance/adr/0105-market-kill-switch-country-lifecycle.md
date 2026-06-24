# ADR-0105 — Market kill-switch : cycle de vie marché sur `Country` (neutralisation / réintégration / purge gouvernées)

**Status** : Accepted
**Date** : 2026-06-23
**Phase** : galileo / souveraineté opérationnelle
**Depends on** : ADR-0028 (Strategy archive — patron soft-archive + purge BFS), ADR-0087 (Thot formula + Seshat zone-indices — économie par marché), ADR-0099 (MarketCostSnapshot par période), `tenant-scoped-db.ts` (governance Layer 2, default-deny multi-tenant)
**Supersedes** : —
**Enforced by** : `tests/unit/governance/market-kill-switch.test.ts`

## Contexte

Besoin opérateur : pouvoir **neutraliser un marché entier** (un pays, ou un groupe
de pays) — le rendre invisible et inopérant — puis le **réintégrer** sans perte,
ou le **purger** définitivement. Cas d'usage : retrait réglementaire d'un pays,
gel d'un marché en litige, bannissement furtif (« shadowban ») d'une zone le temps
d'un arbitrage, ou nettoyage d'un environnement fictif (Wakanda).

Mapping de la surface existante (ground-truth 2026-06-23) :

- **`Country`** (`schema.prisma:3885`) est l'**entité marché canonique** : PK = `code`
  ISO-3166-1 alpha-2 (`CM`, `CI`, `SN`, `FR`, `WK` pour Wakanda…), `isFictional`,
  `region`, `purchasingPowerIndex`, `currencyCode`. **Pas de champ de statut.**
- La dimension marché est **éparpillée mais cohérente** : ~165 occurrences,
  référencée partout en **String libre** (« conceptual FK to `Country.code` »,
  ex. `Strategy.countryCode`, `Client.country`, `BrandNode.countryCode`,
  `MarketBenchmark.country`, `MarketCostSnapshot.countryCode`, `ZoneIndex`,
  `EconomicNeighborMap.zoneCode`) — **jamais en vraie relation Prisma**.
- Deux patrons réutilisables existent déjà :
  - **`strategy-archive`** (ADR-0028) : 2 phases (soft `archivedAt` réversible +
    purge dure par découverte de cascade FK via `information_schema`), 3 Intents
    Mestor gouvernés, anti-foot-gun (**purge exige archive préalable**), refuse
    les dummies.
  - **`tenant-scoped-db.ts`** : Proxy default-deny qui injecte `operatorId` sur
    toutes les lectures/écritures des modèles non-globaux, et **bypasse tout en
    mode `ADMIN`**. `country` / `marketBenchmark` sont déjà dans `GLOBAL_TABLES`.

## Décision

**Le cycle de vie marché vit sur `Country`** ; l'enforcement réutilise les deux
patrons ci-dessus. **Aucun nouveau model `Market`** (il doublerait `Country` —
interdit anti-doublon NEFER) et **aucune dénormalisation `marketCode` sur les
modèles tenant** : l'étanchéité totale (décision opérateur 2026-06-23) est obtenue
par calcul d'ensembles d'IDs descendants (§2-3), pas par migration de masse.

### 1. `Country.status` — `MarketStatus` (nouveau enum)

Champ additif nullable + défaut, migration additive (0 breaking) :

```
enum MarketStatus { ACTIVE  FROZEN  SHADOWBANNED  PURGED }
```

| Statut         | Visible (non-ADMIN) | Mutations | Sémantique |
|----------------|---------------------|-----------|------------|
| `ACTIVE`       | oui                 | oui       | normal |
| `FROZEN`       | oui                 | **non**   | gel — visible, lecture seule |
| `SHADOWBANNED` | **non**             | **non**   | bannissement furtif — invisibilisé + lecture seule |
| `PURGED`       | n/a (données effacées) | non    | terminal — tombstone, données purgées |

`Country` gagne aussi `statusReason String?`, `statusChangedAt DateTime?`,
`statusChangedBy String?` (audit léger, en sus de la trace `IntentEmission`).

### 2. Résolution du marché par ensembles d'identifiants (pas de dénormalisation)

Plutôt que dénormaliser un `marketCode` sur ~85 tables (migration massive + risque
de fuite sur les lignes à `marketCode` null), l'étanchéité se calcule **par
ensembles d'IDs descendants**. À partir des codes invisibles (marchés
`SHADOWBANNED` + `PURGED`), un résolveur calcule en cascade les identifiants à
exclure : `strategyIds` (Strategy dont le `countryCode` ISO-2 ∈ codes invisibles)
→ `clientIds` (clients dont **toutes** les stratégies sont invisibles — sécurité
multi-marché) → `campaignIds` → `missionIds` → `brandNodeIds`. Résultat caché par
requête. **Même garantie d'étanchéité totale choisie par l'opérateur (2026-06-23),
sans migration des 85 modèles ni colonne nullable fuyante.** Seuls les `countryCode`
ISO-2 des racines sont consultés ; les champs `country` libres (noms d'affichage,
ex. `Client.country = "Wakanda"`) ne le sont jamais.

### 3. Filtre-lecture (invisibilisation shadowban) — extension de `tenant-scoped-db`

Le Proxy injecte, par modèle : **racines** (Strategy/Client/BrandNode/Campaign/
Mission) exclues par leur propre `id` ∈ ensemble résolu ; **enfants** par leur clé
étrangère (`strategyId` / `campaignId` / `missionId` / `brandNodeId` / `clientId`)
∈ ensemble résolu — périmètre dérivé du DMMF runtime, **aucun champ `country`
consulté côté Proxy** (immunité aux noms d'affichage). Filtrage **enfant-par-enfant**
⇒ **étanchéité totale** : même une requête directe par `operatorId` sur une marque
shadowbannée ne renvoie rien. Cas normal (aucun marché neutralisé) → ensembles
vides → **aucun filtre injecté** (zéro surcoût). **`ADMIN` bypasse** déjà → la
console voit les marchés neutralisés sans code supplémentaire.

### 4. Gate Mestor `MARKET_STATUS` (pre-flight)

Refuse tout Intent métier dont la cible se résout en marché `FROZEN` ou
`SHADOWBANNED` (les deux sont lecture seule). Même patron que les autres gates
pre-flight `emitIntent`. Les Intents du kill-switch lui-même en sont exemptés.

### 5. Intents gouvernés (gouverneur **MESTOR**, miroir de `strategy-archive`)

- `NEUTRALIZE_MARKET` — `{ countryCode, mode: "FREEZE" | "SHADOWBAN", reason }` → `FROZEN` | `SHADOWBANNED`.
- `REINSTATE_MARKET` — `{ countryCode }` → `ACTIVE` (réintégration sans perte ; refusé si `PURGED`).
- `PURGE_MARKET` — `{ countryCode, confirm }` → `PURGED`. **Anti-foot-gun : exige `SHADOWBANNED` préalable** (comme purge-exige-archive). Réutilise la cascade BFS `information_schema` de `strategy-archive`, **bouclée sur chaque Strategy/Client du marché**. Garde-fou supplémentaire sur marché **non fictif** (`isFictional=false`).

### 6. Surface opérateur `/console/governance/markets`

Seule surface (ADMIN) qui voit les marchés neutralisés : liste + statut + actions
Neutraliser (gel / shadowban) · Réintégrer · Purger, avec confirmation (UX-DR14).

## Conséquences

- `prisma` : enum `MarketStatus` + 4 champs additifs sur `Country` ; **0 nouveau model, 0 colonne sur les ~85 modèles tenant** (le filtre calcule les ensembles d'IDs). Migration additive backfill-safe (`ACTIVE` par défaut).
- `market-visibility/` : résolveur qui calcule les codes invisibles + ensembles d'IDs descendants (caché par requête).
- `tenant-scoped-db.ts` : injection du filtre marché sur racines + descendants (le Proxy reste l'unique point de filtrage lecture — anti-doublon).
- `intent-kinds.ts` : 3 kinds + service `market-lifecycle/` (miroir `strategy-archive/`, réutilise sa cascade de purge).
- `mestorGates` : `MARKET_STATUS` pre-flight.
- 1 route Console `/console/governance/markets`.
- Test HARD `market-kill-switch.test.ts` : 3 transitions + anti-foot-gun purge + bypass ADMIN + refus d'op sur marché gelé/shadowbanné.
- Cible de test naturelle : **Wakanda** (`WK`, `isFictional=true`) — shadowban → invisibilité → réintégration → purge.
- Cap APOGEE 7/7 préservé (sous-domaine Mestor governance ; le marché n'est pas un Neter).
- Étanchéité enfant-par-enfant **dans le périmètre** (décision opérateur 2026-06-23) : filtre par ensembles d'IDs (racines par `id`, enfants par FK), aucune fuite en requête directe.
- Résidu honnête : modèles à champ `country` **libre** sans rattachement tenant (`QuickIntake`, `MediaContact`) non filtrés par marché. La démonstration exige que les stratégies portent un `countryCode` ISO-2 réel — le seed Wakanda historique posait le pays en JSON, pas dans la colonne `Strategy.countryCode` (corrigé par le seed multi-pays du kill-switch).

## Lectures associées

- [ADR-0028](0028-strategy-archive-2-phase.md) — patron soft-archive + purge BFS
- [ADR-0087](0087-thot-formula-engine-seshat-zone-indices.md) — économie par marché
- `src/server/governance/tenant-scoped-db.ts` — point d'insertion du filtre-lecture
- `src/server/services/strategy-archive/` — cascade de purge réutilisée
