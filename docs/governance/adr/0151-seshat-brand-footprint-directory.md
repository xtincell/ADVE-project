# ADR-0151 — Base de marques de Seshat (répertoire d'empreintes publiques)

- **Statut** : Accepted
- **Date** : 2026-07-15
- **Gouverneur** : Seshat (télémétrie / observabilité)
- **Cap APOGEE** : 7/7 préservé (aucun nouveau Neter — sous-domaine Seshat)

## Contexte

Le funnel `/scorer` (ADR-0149 suite, PR #527) calcule une empreinte /100 pour
n'importe quelle marque à partir de données publiques (site, réseaux via Apify,
avis, presse). Ce chemin était **éphémère** (`strategyId: null`, zéro écriture).

Mandat opérateur (2026-07-15) : « Seshat doit construire sa base de données de
marque, je ne veux pas que ces données de recherche soient perdues » + « si un
propriétaire vient re-scraper une marque déjà scrapée, le résultat doit être
instantané (avec la date du dernier snapshot et la possibilité de l'actualiser) ».

Deux besoins : **(1)** ne rien perdre — accumuler un actif de connaissance
marché ; **(2)** servir un cache instantané aux recherches répétées.

## Décision

Nouveau modèle **`BrandFootprintSnapshot`** — répertoire append-only des
empreintes publiques observées. Chaque recherche `/scorer` y écrit une row.
« Dernière row par `brandKey` » = le cache instantané.

### Anti-doublon (protocole NEFER, grep CODE-MAP négatif justifié)

Aucun modèle existant ne convient — extension refusée :

- **`Signal`** exige `strategyId` non-null (relation `Strategy`) → ne peut pas
  porter une marque hors-plateforme (prospect sans compte).
- **`BrandRef`** (ADR-0149) est couplé au scoreur (kind RIVAL/ANCHOR/ITEM +
  `fixedTheta`, lié à `Epreuve`). Le surcharger casserait la séparation D9 et il
  n'a pas la forme d'une empreinte /100 + ventilation par dimension.
- **`FollowerSnapshot`** est par-client (compteurs de followers, mauvaise
  granularité — pas de /100, pas de dimensions, pas de clé de dédup). Une
  garde `if (!strategyId) return` y a d'ailleurs été posée pour interdire les
  orphelins (le funnel anonyme ne doit jamais polluer les données par-client).

### Forme

- Clé de dédup canonique `brandKey` : host du domaine (sans `www`, minuscule)
  si un site est fourni ; sinon slug(nom) + pays. Déterministe.
- Champs : `name`, `websiteUrl?`, `countryCode?`, `sectorSlug?`, `total?` (/100,
  null si rien de mesurable — honnête), `measuredWeight?`, `dimensions` (Json),
  `followerCounts?` (Json), `source`, `capturedAt`.
- **Append-only** (comme `Epreuve` / `FollowerSnapshot` / `ScoreVerdict`) :
  l'historique est conservé ; « Actualiser » écrit une nouvelle row.

### Single-writer + lane d'observabilité

- LE seul writer de `BrandFootprintSnapshot` est le service
  `src/server/services/seshat/brand-registry/`. Verrou HARD
  `brand-registry-single-writer.test.ts`.
- **Écriture de service directe, best-effort, non gouvernée par un Intent** :
  une marque publique observée n'est pas une mutation d'entité gouvernée
  (Strategy/Pillar). Même lane d'observabilité que `persistSnapshot`
  (FollowerSnapshot), les feeds RSS, les weak-signals — précédent direct :
  l'enrichment persiste déjà `FollowerSnapshot` sans `emitIntent`. Best-effort :
  une base indisponible ne casse pas le score renvoyé au prospect.
- **Sans PII** : une marque n'est pas une personne ; on ne stocke pas
  l'identité du chercheur. Le répertoire est **interne** (console opérateur
  `/console/signal/brand-directory`, lecture seule) — jamais public.

### Séparation des trois scores (invariant)

| Store | Rôle | Public ? |
|---|---|---|
| `BrandFootprintSnapshot` | empreinte /100 (présence) — base marché Seshat | non (console) |
| `ScoreVerdict` (ADR-0149) | force révélée /200 (championnat) — D9 | oui (`/leaderboard`) |
| `FollowerSnapshot` | followers par-client | non |

Une recherche `/scorer` **n'entre PAS** dans le leaderboard /200 (décision
opérateur 2026-07-15 : garder séparé). Le /100 est le teaser du funnel ; la
force révélée se gagne dans le funnel avec les données d'un vrai client.

## Conséquences

- `footprint.scoreInstant` : cache-first (lookup par `brandKey`, retour instantané
  avec `capturedAt` + `stale`) ; `refresh: true` force un nouveau scan. Chaque
  scan réel écrit une observation. Le rate-limit IP ne s'applique qu'aux scans
  réels (le cache est gratuit).
- Fraîcheur : `FOOTPRINT_STALE_AFTER_MS = 7 j` → au-delà, l'UI propose
  « Actualiser » (les followers bougent lentement, on évite de re-dépenser Apify).
- Coût par scrape marque inchangé (ADR : Apify ~0,002–0,005 $/profil × ≤3 ; Brave
  seulement si aucun réseau) — le cache **réduit** le coût (recherches répétées
  gratuites).
- 1 nouveau modèle, 1 migration additive (`20260715103150`), 0 LLM.
- Entrée PROPAGATION-MAP A14 (recherche → répertoire Seshat).

## Déféré

- Lien forward « marque du répertoire → seed footprint de la Strategy » quand un
  prospect observé devient client (le `brandKey` faciliterait la jonction).
- Purge/rétention (RGPD marques) si la base grossit — aujourd'hui append-only.
