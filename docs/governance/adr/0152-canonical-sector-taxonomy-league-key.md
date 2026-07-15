# ADR-0152 — Taxonomie de secteurs canonique pour la clé de ligue

- **Statut** : Accepted
- **Date** : 2026-07-15
- **Gouverneur** : Seshat (scoreur, ADR-0149)
- **Cap APOGEE** : 7/7 préservé — 0 LLM, 0 nouveau modèle Prisma

## Contexte

Le scoreur (ADR-0149) classe les marques **par ligue** = `(sectorSlug, marketScale,
countryCode)`. La ligue portait le secteur en **slugifiant le texte libre**
`Client.sector` :

```ts
sectorSlug = rawSector.toLowerCase().replace(/\s+/g, "-");
// "Équipement audiovisuel & créateurs" → "équipement-audiovisuel-&-créateurs"
```

Deux défauts, découverts en faisant passer Motion19 puis Panzani jusqu'au
leaderboard :

1. **Fragmentation en singletons** — chaque marque, avec son libellé idiosyncrasique,
   tombait dans sa propre micro-ligue → un « championnat » de 1. Deux concurrents
   réels (même secteur, graphies différentes) ne se rencontraient jamais.
2. **Injection de non-canonique** — le champ acceptait n'importe quel texte
   (accents, `&`, casse), y compris depuis l'auto-population (intake).

## Décision

**Une taxonomie de secteurs canonique, universelle, à mots-clés pertinents**
(`src/domain/sector-taxonomy.ts`), alignée sur `INTAKE_SECTORS` (24 codes :
FOOD, AGRO, CULTURE, TELECOM, BANQUE, …). Déterministe, zéro LLM.

- `classifyCanonicalSector(raw)` : code exact → ce secteur ; sinon score par
  **mots-clés entiers** (accents strippés, `art ⊄ carte`), le plus haut gagne ;
  rien → `AUTRE`. `canonicalSectorSlug(raw)` renvoie le slug de ligue.
- **Lecture (clé de ligue)** : `resolveLeagueForStrategy` remplace le slug de texte
  libre par `canonicalSectorSlug(client.sector)`. Le texte libre ne fragmente donc
  **jamais** une ligue — Motion19 (« équipement audiovisuel & créateurs ») et un
  autre studio créatif partagent `culture` ; Panzani (« pâtes ») → `food`.
- **Écriture (populate)** : le champ ne stocke plus de secteur non canonique.
  Chokepoint `QuickIntake.create` (toute la voie intake → Client en hérite) :
  `sector = classifyCanonicalSector(input.sector).code` (null reste null). Les
  fixtures (seed Motion19, seed scoreur démo) passent en codes canon.

Le `normalizeSectorSlug` intermédiaire (slugify sans accents) est **supprimé** —
superseded par la taxonomie (deux normaliseurs = un de trop).

## Conséquences

- Le leaderboard devient un vrai championnat par ligue partagée, pas une liste de
  singletons. Vérifié : les 3 marques démo forment une ligue `culture · QUARTIER ·
  CM` (106.8 / 78 / 56.9), Motion19 seule en `culture · NATION · CM`, Panzani en
  `food · NATION · CM` (échelles distinctes = ligues distinctes, ADR-0126).
- Les verdicts déjà historisés avec un ancien slug restent (append-only) mais sont
  **superseded** au re-score (dernier verdict par sujet). Les marques démo ont été
  re-scorées → slug canonique `culture`.
- Robustesse : même si un writer de `Client.sector` non couvert injecte du texte
  libre, la **lecture** canonicalise → la ligue reste correcte. Les autres writers
  (`laguilde`, `brief-ingest`, `client` router…) restent à canonicaliser à
  l'écriture (suivi RESIDUAL-DEBT) — non bloquant grâce au filet de lecture.
- Test de sync : `SECTOR_TAXONOMY ⊇ INTAKE_SECTOR_VALUES` (pas de code orphelin).

## Parcours turnkey (frictions Motion19/Panzani)

Deux scripts outillent la « moulinette jusqu'au leaderboard » :

- `scripts/run-moulinette.ts <strategyId> [scale] [audience]` — déclare l'échelle
  (opérateur, ADR-0126) si absente, `scoreBrand(persist)`, imprime le placement.
- `scripts/onboard-external-brand.ts "<nom>" "<secteur>" <pays>` — Strategy shell
  minimale (ADR-0098) pour une marque externe non cliente, secteur canonicalisé.

Friction restante (déférée) : le scoreur ne score qu'une `Strategy`, pas un pur
`BrandRef` — une marque externe doit passer par une Strategy shell. Un
`scoreBrandRef()` (arènes A/D/V registre + items, sans E/T strategyId-keyés)
lèverait ce besoin.

## Note honnête — score des marques fraîchement onboardées

Motion19 et Panzani sortent à **19.6/200, LATENT, 20 % de couverture** : seule
l'arène E joue (0 superfan identifié vs plancher de ligue = défaite), A/D/V/T
vides. C'est la vérité — la force se révèle par les victoires accumulées, on ne
fabrique rien (P22-2). Pour grimper : enregistrer de vrais superfans, observer des
transitions Overton, consigner des épreuves A/D/V sourcées.
