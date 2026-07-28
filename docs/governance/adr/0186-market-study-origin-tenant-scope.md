# ADR-0186 — Une étude déposée par un client reste son document

- **Statut** : Accepted
- **Date** : 2026-07-28
- **Portée** : Seshat — ingestion d'études de marché · surface cockpit « Études de marché »
- **Gouverneur** : SESHAT. Cap APOGEE 7/7 préservé. **0 LLM.**

## Contexte

Constaté en prod, capture à l'appui : le cockpit de **SPAWT** affichait, sous
« **Vos** études ingérées », des études intitulées « Ciment », « Agence-opérateur
de marque / Industry OS » et « La passion pour propulseur » — toutes déposées
pour **d'autres marques**. Aucune de SPAWT.

Deux défauts cumulés :

1. **L'origine était reçue puis jetée.** `previewMarketStudy` et le handler
   `INGEST_MARKET_STUDY` acceptent un `strategyId`, le **valident** comme
   appartenant à l'appelant (ADR-0166)… et le persister ne l'écrivait nulle
   part. `KnowledgeEntry` n'avait aucun champ d'origine. La marque était donc
   structurellement inconnue après coup.
2. **Aucune lecture n'était scopée.** `list`, `getDetail` et `exportResearchPdf`
   étaient de simples `protectedProcedure` : la première rendait les titres de
   **toutes** les études de la base, les deux autres l'**extraction complète**
   (et son PDF) de n'importe laquelle, à tout compte authentifié connaissant un
   identifiant.

`getDetail` et `exportResearchPdf` figuraient même dans l'allowlist
**`SAFE_BY_DESIGN`** du scan IDOR, avec pour motif « intelligence sectorielle
globale (secteur+pays, pas par-marque) ». C'est cette justification qui était
fausse : elle vaut pour la connaissance **dérivée**, pas pour le document
déposé.

## Décision

**Distinguer le document de la connaissance qu'on en tire.**

- Le **document déposé par un client reste son document**. `KnowledgeEntry` porte
  désormais `originStrategyId` (additif, nullable, indexé) et le persister
  l'écrit.
- La **connaissance sectorielle dérivée** (`MarketBenchmark`, agrégats
  secteur × pays) reste mutualisée : c'est elle, le « pool marché global ».
  Elle n'est pas touchée par cette ADR.
- Les trois lectures (`list`, `getDetail`, `exportResearchPdf`) sont scopées sur
  `accessibleStrategyIds` — le helper canonique d'ADR-0166. Un refus hors
  périmètre rend « Market study not found », **indiscernable d'une absence** :
  on ne confirme pas l'existence d'un document qu'on n'a pas le droit de lire.

**Les entrées non attribuables (`originStrategyId` nul — seeds sectoriels,
legacy) ne sont montrées à aucun fondateur comme étant les siennes.** Faute de
pouvoir dire à qui elles appartiennent, on ne les attribue pas. L'ADMIN continue
de tout voir.

## Conséquences

- Le cockpit d'un fondateur n'affiche plus que ses propres études. Les entrées
  historiques (toutes sans origine) disparaissent de cette surface — c'est le
  comportement correct : elles n'étaient attribuables à personne.
- Backfill possible plus tard depuis `data.uploadedBy` → marque, si l'opérateur
  souhaite ré-attribuer l'historique. Non fait ici : deviner une propriété est
  précisément ce qu'on cherche à ne plus faire.
- Les deux entrées `SAFE_BY_DESIGN` sont purgées, avec la raison du retrait
  inscrite à leur place.

## Vérification

`tests/unit/governance/market-study-tenant-scope.test.ts` (7) : l'origine est
persistée · les trois lectures résolvent un périmètre · le refus est
indiscernable d'une absence · les deux entrées d'allowlist ont bien disparu.
