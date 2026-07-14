# ADR-0143 — Veille d'actualité par marque : multi-sujets, multi-langue, pertinence déterministe, zéro LLM

- **Status** : Accepted
- **Date** : 2026-07-14
- **Phase** : Mégasprint « Fusée non-dépendante du LLM » (suite audit 2026-07-13)
- **Depends on** : [ADR-0099](0099-market-cost-snapshot-by-period.md) (feeds RSS réels), [ADR-0128](0128-brand-social-connections-founder-oauth.md) (panel veille cockpit), [ADR-0134](0134-mesure-communautaire-reelle-et-ponts-overton.md) (mesure réelle)
- **Supersedes** : —

## Contexte

La veille d'actualité par marque (« traqueur d'actualité ») était vide pour SPAWT
(FoodTech). Audit ground-truth (inspection du cron `/api/cron/external-feeds` +
`getMarketFeed`) → trois défauts structurels :

1. **Requête RSS = positionnement marketing.** Le digest sectoriel construisait la
   requête Google News depuis `businessContext.sector` brut — pour SPAWT
   « foodtech / découverte culinaire communautaire ». Aucun article n'existe sur
   une telle phrase → **0 résultat**.
2. **Fallback LLM sur un chemin d'actualité.** Quand le RSS était vide, le service
   appelait `callLLM` pour « synthétiser un digest qualitatif ». C'est un drift vs
   la doctrine « dépendre au minimum des LLMs » — et fonctionnellement inutile : le
   LLM ne produit **aucun article** (seulement des signaux macro pour le pilier
   Track). L'erreur observée en prod (`model: claude-sonnet-4-…`) venait de ce
   fallback, pas de la recherche d'actu.
3. **Langue = filtre codé en dur (`hl=fr`).** On peut parler d'une marque dans
   n'importe quelle langue ; forcer le français fait rater les mentions étrangères,
   et interroge en français des marchés anglophones (NG, ZA) déjà prioritaires.

Le besoin réel : le flux d'une marque est un **ensemble de sujets** (la marque
elle-même, son secteur, des thèmes), cherché **sans filtre de langue**, puis trié
par **pertinence** — le tout **sans LLM**.

## Décision

**Veille multi-sujets, multi-langue, à pertinence déterministe, 100 % sans LLM.**

1. **Terme-tête searchable** (`sectorHeadTerm`) — on coupe la queue positionnement
   d'un secteur ADVE : « foodtech / découverte culinaire communautaire » →
   « foodtech ». Un terme que Google News indexe réellement.
2. **La langue n'est pas un filtre** (`SEARCH_LOCALES = ["fr","en","ar","pt"]`) —
   chaque sujet est interrogé dans plusieurs langues ; `gl` biaise vers l'édition
   pays sans exclure les autres langues. La pertinence est tranchée EN AVAL.
3. **Filtre de pertinence déterministe** (`relevance.ts`, `rankItemsByRelevance`) —
   chevauchement de mots-clés article↔sujets, phrase exacte pondérée (titre > résumé),
   bonus fraîcheur, **premier sujet (la marque) pondéré 2×** (« on parle de MOI »).
   Un article sans recouvrement de sujet est écarté. Purement fonctionnel, testable
   sans réseau, **zéro LLM**.
4. **Veille par marque** (`brand-feed.ts`, `getOrBuildBrandFeed`) — sujets = la
   marque + son secteur (+ extras) ; collecte multi-langue ; tri par pertinence ;
   cache journalier read-through persisté via `KnowledgeEntry` (`market="brand:<id>"`,
   **pas de nouveau modèle, pas de migration**). Préchauffé par le cron.
5. **Fallback LLM retiré** du chemin feed. RSS injoignable/vide → digest HONNÊTE
   (macro World Bank déterministe conservé, `items: []`), jamais une invention. La
   recherche d'actualité est désormais 100 % déterministe.

`getMarketFeed` lit la veille par marque (au lieu du seul digest sectoriel).

## Conséquences

- SPAWT (et toute marque) reçoit une veille pertinente : mentions de la marque +
  actualité sectorielle, dans plusieurs langues, sans clé API, sans LLM.
- Le pilier Track garde ses macro déterministes (World Bank) même quand le RSS est
  vide ; il perd la « synthèse qualitative LLM » (assumé — l'absence est un état).
- **Tests anti-drift** : `external-feeds-relevance.test.ts` (25 assertions dont un
  **verrou HARD** : aucun fichier du chemin feed n'importe/appelle le LLM Gateway).
- **Hors périmètre (suivi séparé)** : le routeur LLM central passe « cloud (Ollama)
  par défaut, puis Sonnet 5, plus Sonnet 4 ». L'ordre cloud-first est déjà le défaut
  runtime ; le modèle vit dans la table `ModelPolicy` (prod) → changement de config
  gouverné distinct, tracé RESIDUAL-DEBT.
- Coût : sur cache-miss, `getOrBuildBrandFeed` fait ~8-16 fetch RSS (borné
  `MAX_SOURCES`, parallèle, une fois/jour/marque). Le cron préchauffe → le dashboard
  sert du cache.
