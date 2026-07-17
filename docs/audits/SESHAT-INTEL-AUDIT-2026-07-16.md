# Audit Seshat — persistance marché · Argos/Hunter · pilier T · capacités prédictives (2026-07-16)

**Mandat opérateur** : « je suis inquiet de l'état de Seshat et de sa capacité à persister les données marché — regarde-le de près, rationalise-le, vérifie qu'il produit les données attendues. Ça fait proprement le travail d'Intel ? Je peux produire des rapports que je peux vendre ? » + « ajoute une analyse du traqueur de signaux faibles et du scanner d'Overton ».

Audit ground-truth (3 passes parallèles, fichier:ligne vérifiés). Remédiation immédiate : 6 fixes shippés même session (v6.27.190, voir §5).

---

## 1. Réponses directes

| Question | Réponse honnête |
|---|---|
| **Seshat persiste les données marché ?** | **Partiellement.** La veille RSS (digests pays×secteur + gazette par marque) et le répertoire de marques /scorer sont réellement persistés (`KnowledgeEntry`, `BrandFootprintSnapshot`). Mais `MarketBenchmark` est une table quasi-morte (0 writer applicatif), `MarketCostSnapshot`/`ZoneIndex` ne vivent que par seed/saisie opérateur (par doctrine ADR-0099 — donnée saisie, jamais scrapée). |
| **La gazette marche ?** | **Oui** — chemin complet vérifié (RSS → cache journalier par marque → `getMarketFeed`), zéro LLM, EmptyState honnête. Dépend du cron `external-feeds` ET d'un `countryCode` sur la marque. |
| **Argos fonctionnel ? Hunter mature ?** | **Argos : fonctionnel** (schéma→service→router→3 surfaces live→verdict sûreté déterministe→auto-publish sur PASS). **Hunter : partiel, pas mature** — mono-appel LLM structuré (le pipeline 4 phases n'a jamais été porté, assumé par ADR-0100), credential-gated (LLM + Brave), zéro déclencheur autonome (bouton console only). Le corpus public `/argos` actuel = données seed, pas des chasses réelles. |
| **IA générative + IA prédictive ?** | **Générative : oui, partout** (synthèses ancrées sur données + gardes anti-hallucination réelles). **Prédictive au sens modèle entraîné : non pour le marché.** Le seul modèle entraîné du repo est la régression logistique d'attribution superfan (Phase 23) — rétrospective, 3 features, in-sample, hors marché. Le forecast marché est explicitement en « Vision » (RESIDUAL-DEBT). Ne pas survendre « IA prédictive » dans l'argumentaire — dire : *veille multi-sources + raisonnement causal assisté + mesure déterministe*. |
| **Ça fait le travail d'Intel ?** | **La veille : oui** (sourcée, traçable, multilingue, dégradation honnête). **La prévision calibrée : non.** |
| **Rapports vendables ?** | **L'Oracle (ORACLE_FULL) est LE produit vendable** — 35 sections, composers déterministes en secours (jamais vide), sections marché honnêtes (`verified` vs `inferred` étiquetés), PDF. Le /scorer est un lead magnet, le digest une brique interne, les dossiers Argos une brique d'inspiration. |

## 2. Analyse — le traqueur de signaux faibles (`weak-signal-analyzer.ts`)

**Ce qu'il est réellement** : un raisonneur de **chaînes causales assisté par LLM** — pas un byproduct d'IA prédictive ni un algorithme auto-apprenant.

- **Entrée** : signaux collectés (`CollectedSignal`, RSS/LLM Tarsis), contexte marque extrait des piliers ADVE (`buildSearchContext` — secteur, concurrents, produits, risques, brand-health eNPS/réputation/ESOV), contexte pays dur (anti-hallucination géographique, ADR-0037).
- **Cœur** : UN appel LLM (`weak-signal-analyzer.ts:168`) qui construit des thèses (« incendie blé Ukraine → pénurie farine → marge boulangeries ») avec chaîne causale, catégorie d'impact, urgence, action recommandée. La « confiance » (0.2 base + 0.05-0.30 par signal de soutien) est **déclarée par le LLM dans le prompt**, pas calculée par un modèle — c'est une convention de notation, pas une probabilité calibrée.
- **Ce qui est réel et fort** : entrées neutralisées anti-injection ; alerte cross-marques par similarité de contexte (`searchByQuery`, `:201`) — un signal détecté pour une marque notifie les AUTRES marques dont le contexte matche ; persistance `WEAK_SIGNAL_ALERT` (urgence HIGH/CRITICAL) lue par Jehuty + partage sectoriel `SECTOR_BENCHMARK` scopé pays.
- **Ce qui manque pour « auto-apprenant »** : aucune boucle de vérité terrain — les thèses ne sont jamais re-scorées contre ce qui s'est réellement passé. C'est LE chaînon à construire pour passer de « raisonnement causal » à « prédiction apprise » (stocker thèse + horizon + issue observée → calibrer la confiance).

## 3. Analyse — le scanner d'Overton (situer une marque dans un panorama)

Trois étages, tous **déterministes zéro-LLM** :

1. **L'axe sectoriel** (`sector-intelligence/index.ts:200` `computeAxisFromSignals`) : agrégation pondérée des tags des signaux → vecteur d'orientation normalisé, confiance saturée à 30 signaux, top-10 narratifs. `detectDrift` (`:371`) = diff entre 2 snapshots — **observation d'un déplacement, pas prévision**. Alimenté en continu depuis le cron (`sector-refresh.ts` → `refreshSectorOvertonFromConnector`), résolution par polity honnête (EXACT/SCALE_ONLY/GLOBAL_FALLBACK, ADR-0127).
2. **Le panorama** (`seshat/overton-graph/` — ADR-0148) : `OvertonPosition` (prises de position par marque × secteur × polity, 6 zones, preuve obligatoire — zone null si pas de preuve, jamais fabriquée), `OvertonActorLink`, `OvertonZoneTransition` (migrations attribuées last-touch ADR-0135), adoption de vocabulaire par comptage de tokens (duel de cadre, arène T du scoreur). Single-writer verrouillé HARD.
3. **La restitution** : radar founder (`OvertonRadar`, cockpit) + Oracle §34 (annoté « signal réel vs placebo » dans le code même).

**Limite structurelle actuelle** : le connecteur Tarsis ne peuple qu'**une dimension** (`unpaidPress`) — `vocabularyOverlap`, `claimImitations`, `embeddingDelta` restent vides faute de calcul. Le scan du panorama est donc réel mais **mono-source** aujourd'hui ; la promotion PRODUCTION (embeddings sectoriels) est tracée RESIDUAL-DEBT. Le « scanner de panorama » sait situer (positions + zones + transitions) — il ne sait pas encore **anticiper** le déplacement (predictive OvertonRadar = Vision).

## 4. Trous constatés non corrigés ici (tracés)

- `MarketBenchmark` : 0 writer applicatif (seed Wakanda uniquement) — décider : brancher un writer (études marché ingérées → benchmark) ou déprécier la table.
- `MarketCostSnapshot`/`ZoneIndex` : statiques par doctrine — rafraîchissement = saisie opérateur/seed (pas un bug, une décision ADR-0099 ; la « fraîcheur » dépend de l'opérateur).
- Trend Tracker : 13/49 variables réelles (36 = sources payantes non branchées, assumé).
- `TarsisCaptureSession` : squelette assumé (MVP, session persistée sans collecte au fil de l'eau).
- `runMarketIntelligence` : placeholders cosmétiques quand les signaux manquent (`tarsis/index.ts:272-288`) — à remplacer par un état absent honnête (petit chantier).
- Embeddings : inertes sans `OPENAI_API_KEY`/`EMBED_SERVICE_URL` → RAG lexical (dégradé honnête). Option : brancher les embeddings Ollama Cloud.
- Boucle de vérité terrain des weak signals (thèse → issue observée → calibration) : LE chantier qui rendrait le mot « prédictif » honnête.
- Hunter : déclencheur autonome (cron de chasse) + pipeline multi-passes si Argos doit produire en volume.
- **Action opérateur prod** : le cron `external-feeds` doit réellement tourner (GitHub Actions `scheduled-ops.yml` ou ping Coolify) — toute la fraîcheur marché en dépend ; uploader ≥1 étude marché par secteur cible pour activer le TAM `verified` de l'Oracle.

## 5. Remédiation shippée même session (v6.27.190)

1. **Collecteurs de signaux auto-enregistrés** (`daemon-backfill.ts`, appelé par le cron external-feeds, gated `isTextLLMAvailable`) — « chaque marque collecte ce dont elle a besoin » devient structurel ; avant, `registerCollectionDaemon` n'avait qu'un caller manuel.
2. **Pilier T lit aussi `MARKET_SIGNAL`** (`track.ts`) — les signaux ingérés MANUELLEMENT par l'opérateur étaient invisibles du pilier (kind migré vers `EXTERNAL_SAAS` sans réaligner l'ingest manuel — manual-first parity).
3. **Borne de fraîcheur 30 j sur `loadMarketDigestForT`** — un cron arrêté ne fait plus servir un digest périmé sous le label « Seshat » (la garde provenance rétrograde en `inferred`).
4. **Répertoire de marques sans troncature** (`listBrandDirectory` → `distinct` + `groupBy`) — au-delà de 2000 snapshots, des marques disparaissaient silencieusement de la console.
5. **Gazette : préchauffe 50 → 200 marques** — la 51ᵉ marque déclenchait un build RSS synchrone dans la requête cockpit.
6. **Hunter : pré-flight `isTextLLMAvailable`** (parité avec huntVictories) — échec immédiat lisible au lieu d'un appel Brave + LLM condamné.
