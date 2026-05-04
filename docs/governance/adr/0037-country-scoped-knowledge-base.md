# ADR-0037 — Country-scoped Knowledge Base + MarketStudy ingestion + Variable-bible canonical audit (mégasprint Phase 17)

**Date** : 2026-05-04
**Statut** : Proposed (draft sprint plan, awaiting sign-off avant kick-off PR-A)
**Phase de refonte** : phase/17-country-kb (nouveau)
**Auteurs** : NEFER
**Lié** : [ADR-0014](0014-oracle-35-framework-canonical.md) (Oracle 35-section uses pillar T), [ADR-0027](0027-rag-brand-sources-and-classifier.md) (operator-uploaded brand sources — pattern d'ingestion calqué pour MarketStudy), [ADR-0030](0030-intake-closure-adve-100pct.md) (anti-hallucination Wakanda), [ADR-0032](0032-source-certainty-and-intake-artifact-persistence.md) (certainty taxonomy), [ADR-0035](0035-llm-infer-needs-human-fields.md) (LLM-infer ADVE).
**Sources canon ingérées** : `ADVE Full Manual Oct25 (1).docx` (8000 lignes — manuel complet 4 piliers + scoring + checklist), `Workflow ADVE GEN (0).docx` (1770 lignes — codes A1-A11, D1-D12, V1-V18, E1-Ex, Trend Tracker 49 variables), `variables_adve_apple.md` (case study), `ADVE_Variables_Apple.pdf`. Ces 4 sources définissent le canon de référence ; toute déviation code↔manuel est listée en §11.

---

## 0. Pourquoi ce sprint a été étendu (mai 2026, demande user)

L'ADR initial (v0, ce matin) couvrait uniquement le drift "Seshat KB pas pays-scopé". Audit user (post-rédaction v0) a identifié **3 dimensions complémentaires** que ce sprint doit absorber dans le même mouvement, faute de quoi le drift se reproduit sous d'autres formes :

1. **Le moteur ne sait pas absorber une étude de marché injectée par l'opérateur** — aucun parser PDF/DOCX/XLSX pour `MarketStudy`, aucun pipeline qui transforme un livrable cabinet (Nielsen, Kantar, Statista, BCG) en `KnowledgeEntry` country+sector scoped exploitable par Tarsis.
2. **Le canon manuel ADVE (codes A1-A11 / D1-D12 / V1-V18 / E1-Ex + 49 variables Trend Tracker) n'est pas mappé sur `variable-bible.ts`** — l'opérateur lit "Le Messie / Origin Myth / Compétences Divines" dans le manuel mais ne sait pas quel field code (`a.equipeDirigeante` ? `a.citationFondatrice` ? `a.herosJourney` ?) il vise. Drift de nomenclature qui pollue les briefs et le LLM-infer ADR-0035.
3. **`KnowledgeEntry.data` est un `Json` non-typé** — chaque caller (Tarsis weak-signals, MarketStudy seed Wakanda, futurs imports cabinet) invente sa propre forme. Pas de schéma. Pas d'extraction structurée possible. Le pilier T ne peut pas requêter "quel est le TAM ZA 2025 cosmétiques ?" parce que le TAM est noyé dans `data.signals[3].causalChain[2]` ou ailleurs selon qui a écrit l'entry.

Ces 3 dimensions partagent **la même racine architecturale** que le drift v0 : Seshat n'a pas de contrat strict sur ce qu'il consomme/produit. Les fixer ensemble évite 3 ADRs successifs sur le même module avec 3 migrations.

---

---

## 1. Contexte — pourquoi ce sprint existe

Le pilier **T (Track)** de la cascade ADVERTIS est aujourd'hui **dérivé sans data externe par pays**. Diagnostic vérifié sur le code (mai 2026) :

1. `KnowledgeEntry` (`prisma/schema.prisma:1305`) est scopé `entryType + sector + market + channel + pillarFocus + businessModel`. **Aucun champ `countryCode`**. Le field `market` est du texte libre qui mélange "marché géographique" et "vertical" selon le caller.
2. `Strategy.countryCode String @db.VarChar(2)` (indexé) sert **uniquement au pricing** (`PricingOverride`) et aux benchmarks financiers (`COUNTRY_MULT`, `COUNTRY_CPM`, `COUNTRY_CTR_MULTIPLIER`). **Tarsis ne le lit jamais**.
3. `buildSearchContext(strategyId)` ([weak-signal-analyzer.ts:221](../../src/server/services/seshat/tarsis/weak-signal-analyzer.ts:221)) lit `businessContext.market || businessContext.country` (texte libre), pas `Strategy.countryCode` ISO-2.
4. `checkSectorKnowledge(sector, market?)` ([tarsis/index.ts:28](../../src/server/services/seshat/tarsis/index.ts:28)) fait un lookup `contains` insensitive sur `sector + market`. Pas de filtre pays.
5. `collectMarketSignals(config)` génère 5-8 signaux purement par LLM scope sector + keywords + competitors. **Aucun feed externe (RSS, Google News, Statista, Tarsis web fetch)**. Pas de data réelle.
6. Aucun ADR ne planifie un KB par pays. Pas de roadmap. Drift architectural silencieux.

**Conséquence runtime** : pour toute brand sur un vrai pays sans seed dédié, `ENRICH_T_FROM_ADVE_R_SESHAT` retourne du **LLM-as-data-source pur**. Le pilier T est crédible côté forme (chaînes causales, urgence, impact) mais **ne s'appuie sur aucune réalité du marché ZA, NG, CM, CI**. La cascade Glory→Brief→Forge produit alors des assets dont le contexte Track est hallucinatoire.

**Pourquoi Wakanda passait pour fonctionnel** : `scripts/seed-wakanda/26-intelligence.ts` peuple explicitement `KnowledgeEntry × 10+`, `MarketStudy × 2`, `CompetitorSnapshot × 6`, `MarketSynthesis × 2`, `JehutyFeed × 20+`, indexés `market="Wakanda"`. `checkSectorKnowledge(sector, "Wakanda")` hit chaud → pilier T basé sur du concret simulé. La démo brille parce qu'elle triche, le réel cold-start parce que personne ne triche pour CM/NG/ZA/CI.

**Drift mission** ([MISSION.md §4](../MISSION.md)) : superfans réels ne se construisent pas sur Track halluciné. La fenêtre d'Overton sectorielle se mesure au pays, pas au sector global. Un Track pays-scopé n'est pas un nice-to-have, c'est une condition nécessaire à la mission.

## 2. Décision — Country-Scoped Knowledge Base (CSKB)

Trois invariants structurants :

1. **`countryCode` devient first-class sur `KnowledgeEntry`** — `String? @db.VarChar(2)`, FK conceptuelle vers `Country.code`. Les nouvelles entries sont écrites avec `countryCode` peuplé depuis `Strategy.countryCode`. Les entries legacy (Wakanda + tout backfill) restent valides via `market="Wakanda"` mais reçoivent `countryCode="WK"` au backfill.
2. **`buildSearchContext` lit `Strategy.countryCode` + joint `Country` (PPP, marketMeta, primaryLanguage, region) pour le prompt LLM** — Tarsis devient country-aware au niveau prompt. Le LLM reçoit explicitement "Marché : Afrique du Sud, langue principale en, PPP 300, sectors-clés [...]" en system context, plus la possibilité d'injecter `Country.marketMeta` (GDP, population, capital, key sectors) si présent.
3. **`checkSectorKnowledge` filtre par `sector × countryCode` strict** (sector × market reste fallback compat). Une entry CM ne polluera plus le Track d'une brand ZA ; une brand ZA en cold-start n'aura pas de hit chaud, le LLM-synthesis se déclenche **avec contexte pays explicite** dans le prompt — et l'entry produite est écrite avec `countryCode="ZA"` pour servir la prochaine brand ZA du même secteur.

Optionnel (PR-G, hors scope critique) : amorcer **Tarsis ingestion externe** (RSS / Google News / Statista API) pour les pays prioritaires (CM, NG, CI, ZA, MA), persistée en `KnowledgeEntry × countryCode × sector`. Permet de killer le LLM-only fallback à terme.

## 3. Schema — migration `20260505000000_knowledge_entry_country_code`

```sql
-- Country-scoped knowledge base (ADR-0037)
ALTER TABLE "KnowledgeEntry"
  ADD COLUMN "countryCode" VARCHAR(2);

CREATE INDEX "KnowledgeEntry_countryCode_idx" ON "KnowledgeEntry"("countryCode");

CREATE INDEX "KnowledgeEntry_sector_countryCode_idx"
  ON "KnowledgeEntry"("sector", "countryCode");

-- Backfill : entries Wakanda (market='Wakanda' ou 'WK') → countryCode='WK'
UPDATE "KnowledgeEntry"
   SET "countryCode" = 'WK'
 WHERE "countryCode" IS NULL
   AND ("market" ILIKE 'wakanda' OR "market" = 'WK');
```

Schema Prisma :

```prisma
model KnowledgeEntry {
  // ... existing fields ...
  countryCode String? @db.VarChar(2)
  // ...
  @@index([countryCode])
  @@index([sector, countryCode])
}
```

Migration safe (additive + backfill ciblé). Idempotent : ré-exécution ne casse rien (UPDATE WHERE NULL, ADD COLUMN IF NOT EXISTS pas nécessaire — Prisma gère).

## 4. Sub-PRs (ordre d'exécution)

### PR-A — Migration + schema + seed Wakanda backfill
**Branch** : `phase/17-country-kb-pra-migration`
**Fichiers** :
- `prisma/migrations/20260505000000_knowledge_entry_country_code/migration.sql` (nouveau)
- `prisma/schema.prisma` — ajouter `countryCode` + 2 indexes au model `KnowledgeEntry:1305`
- `scripts/seed-wakanda/26-intelligence.ts` — pousser `countryCode: "WK"` à chaque `db.knowledgeEntry.create({ data: { ... } })` (~10 callsites). Idem `MarketStudy.countryCode` si le model l'accepte (à vérifier en PR-A : si pas de field, exclu du scope sub-PR — additive ailleurs).
- Scripts de purge `scripts/seed-wakanda/purge.ts` à vérifier (probablement no-op).

**Verify** : `npx prisma migrate dev --name knowledge_entry_country_code` passe ; `npx tsx scripts/seed-wakanda/index.ts` puis `SELECT countryCode, count(*) FROM "KnowledgeEntry" GROUP BY 1` retourne 100% `WK`.

### PR-B — `buildSearchContext` country-aware
**Branch** : `phase/17-country-kb-prb-search-context`
**Fichiers** :
- `src/server/services/seshat/tarsis/weak-signal-analyzer.ts:221` — `buildSearchContext` charge `Strategy.countryCode` + `Country` row joint (`include: { country: true }` ou `db.country.findUnique`). Étend le type `SearchContext` :
  ```ts
  export interface SearchContext {
    sector: string;
    market: string;            // legacy, kept for fallback
    countryCode?: string;       // NEW — ISO-2 from Strategy
    countryName?: string;       // NEW — Country.name display
    primaryLanguage?: string;   // NEW — Country.primaryLanguage
    purchasingPowerIndex?: number; // NEW
    region?: string;            // NEW — AFRICA_WEST | EUROPE | etc.
    countryMeta?: Record<string, unknown>; // NEW — Country.marketMeta JSON
    keywords: string[];
    competitors: string[];
    riskFactors: string[];
  }
  ```
- `src/server/services/seshat/tarsis/types.ts` (si SearchContext y vit aussi) — sync.

**Verify** : test unit `buildSearchContext` avec strategy `countryCode="ZA"` retourne `countryCode/countryName/primaryLanguage/region/purchasingPowerIndex` peuplés.

### PR-C — `checkSectorKnowledge` filtre par countryCode
**Branch** : `phase/17-country-kb-prc-knowledge-lookup`
**Fichiers** :
- `src/server/services/seshat/tarsis/index.ts:28` — `checkSectorKnowledge` signature étendue :
  ```ts
  export async function checkSectorKnowledge(
    sector: string,
    countryCode?: string,
    legacyMarket?: string, // deprecated, fallback
    maxAgeDays = FRESH_DATA_MAX_DAYS,
  ): Promise<...>
  ```
  Si `countryCode` fourni → `where.countryCode = countryCode` strict. Si non + `legacyMarket` → fallback `market.contains(...)` insensitive (compat). Sinon → sector-only (cross-country fallback).
- `src/server/services/seshat/tarsis/index.ts:71` — `runMarketIntelligence` passe `searchContext.countryCode` au lieu de `searchContext.market`.
- Audit grep sur tous les autres callers de `checkSectorKnowledge` (probablement < 5) — adapter signature.

**Verify** : test unit confirme qu'une entry CM ne hit plus pour une query ZA.

### PR-D — LLM prompts country-aware (signal-collector + weak-signal-analyzer)
**Branch** : `phase/17-country-kb-prd-llm-prompts`
**Fichiers** :
- `src/server/services/seshat/tarsis/signal-collector.ts` — `collectMarketSignals(config)` injecte un bloc system prompt :
  ```
  CONTEXTE PAYS (CONTRAINTE DURE) :
  - Pays : {countryName} ({countryCode})
  - Langue principale : {primaryLanguage}
  - Région : {region}
  - PPP indexé : {purchasingPowerIndex} (Cameroun=100, France=800)
  - Secteurs-clés : {countryMeta.keySectors?.join(", ")}
  Tous les signaux générés DOIVENT être plausibles dans ce pays. N'invente pas
  de réalités sectorielles transposées d'un autre pays. Si tu ne connais pas
  une dynamique spécifique à {countryName}, dis-le explicitement dans la
  causalChain (`incertain — généralisation depuis {voisin}`) plutôt que de
  fabriquer.
  ```
- `src/server/services/seshat/tarsis/weak-signal-analyzer.ts` — `analyzeWeakSignals` pareil au moment de la causal-chain extraction (block `CONTEXTE PAYS` en system).
- `CollectionStrategy` type étendu avec les mêmes 5 champs pays optionnels que `SearchContext`.

**Verify** : eval qualitatif sur 3 brands (1 CM, 1 NG, 1 ZA) — comparer `WeakSignal[]` avant/après. Attendu : signaux post-PR-D citent réalités locales (ex pour ZA : "load-shedding ESKOM impact production retail", pour NG : "naira devaluation", pour CM : "FCFA-zone monetary policy") ; signaux pré-PR-D étaient sector-générique sans ancrage géographique.

### PR-E — Persistence : write `countryCode` à chaque `knowledgeEntry.create`
**Branch** : `phase/17-country-kb-pre-persist`
**Fichiers** :
- `src/server/services/seshat/tarsis/weak-signal-analyzer.ts` (ou `index.ts` selon où vit le `db.knowledgeEntry.create`) — ajouter `countryCode: brandContext.countryCode` au payload create.
- Audit grep `db.knowledgeEntry.create` repo-wide → tous les callsites doivent peupler `countryCode` quand `Strategy.countryCode` est dispo. Dans services trans-strategy (bench global), laisser null.
- Lint rule custom (optionnel, sub-PR-F) : ESLint plugin local qui flag `db.knowledgeEntry.create` sans `countryCode` field.

**Verify** : run `runMarketIntelligence(strategyId-ZA)`, vérifier que les nouvelles `KnowledgeEntry` rows ont `countryCode='ZA'` non null.

### PR-F — Tests anti-drift CI
**Branch** : `phase/17-country-kb-prf-tests`
**Fichiers** :
- `tests/unit/governance/country-scoped-kb.test.ts` (nouveau) :
  - assert `KnowledgeEntry` schema has `countryCode` field (Prisma introspection)
  - assert `checkSectorKnowledge` rejected query without `countryCode` returns sector-fallback warning
  - assert `buildSearchContext` populates pays fields when `Strategy.countryCode` set
  - assert no `db.knowledgeEntry.create` callsite in `src/server/services/seshat/**` writes without `countryCode` (regex audit)
- `scripts/audit-cskb-coverage.ts` (nouveau) — script audit qui scanne `KnowledgeEntry` rows en DB, retourne % avec `countryCode` non-null. Cible : 100% post-backfill.

**Verify** : `npx vitest run country-scoped-kb` passe. `npx tsx scripts/audit-cskb-coverage.ts` retourne ≥ 99%.

### PR-G (optionnel) — Tarsis external feeds (RSS / News API)
**Branch** : `phase/17-country-kb-prg-external-feeds`
**Scope** : amorcer ingestion RSS/Google News pour 5 pays prioritaires (CM, NG, CI, ZA, MA). Service dédié `src/server/services/seshat/tarsis/external-feeds/`. Cron quotidien via Anubis scheduler. Persiste dans `KnowledgeEntry` avec `entryType="EXTERNAL_FEED_DIGEST"` (nouveau enum value) + `countryCode + sector + sourceHash` pour dedup. Peut shipper en Phase 18 sans bloquer 17.

### PR-I — MarketStudy ingestion pipeline (PDF/DOCX/XLSX → KnowledgeEntry CSKB)
**Branch** : `phase/17-country-kb-pri-market-study-ingestion`
**Pattern** : calqué sur ADR-0027 (RAG brand sources + filtreur classifier). Diffèrence : output → `KnowledgeEntry` country+sector scoped, pas `BrandAsset`. Et la cible n'est pas le brandbook interne mais une **étude tierce** (Nielsen, Kantar, Statista, BCG, Euromonitor, McKinsey, rapport sectoriel banque centrale, étude commanditée).

**Fichiers** :
- `src/server/services/seshat/market-study-ingestion/` (nouveau service, governor SESHAT) :
  - `index.ts` — orchestrateur `ingestMarketStudy(uploadId, { strategyId?, declaredCountry?, declaredSector? })`. Fire-and-forget intent kind `INGEST_MARKET_STUDY`.
  - `extractors.ts` — réutilise `extractText` de `ingestion-pipeline/extractors.ts` (pdf/docx déjà en place pour ADR-0027). Étend pour `xlsx` (parse `Trend_Tracker_Full.xlsx` style avec `xlsx` lib npm — ajouter dep si absente).
  - `extractor-llm.ts` — system prompt structuré qui extrait des `MarketStudyExtraction` :
    ```ts
    interface MarketStudyExtraction {
      study: { title, publisher, publishedAt, methodology, sampleSize, geography, sectorCoverage };
      tam?: { value, currency, year, methodology, source };
      sam?: { value, currency, year, methodology, source };
      som?: { value, currency, year, methodology, source };
      growthRates?: Array<{ segment, cagr, period, source }>;
      competitorShares?: Array<{ competitor, marketSharePct, year, source }>;
      consumerSegments?: Array<{ segment, sizePct, demographics, behaviors, painPoints }>;
      pricePoints?: Array<{ tier, range, ASP, source }>;
      channelMix?: Array<{ channel, sharePct, growthTrend }>;
      regulatorySignals?: Array<{ regulation, impactSeverity (LOW|MEDIUM|HIGH), timeline }>;
      macroSignals?: Array<{ trend, evidence, timeHorizon }>;
      weakSignals?: Array<{ event, causalChain[], impactCategory, urgency }>;
      // ... (49 variables Trend Tracker — voir §13)
    }
    ```
  - `persister.ts` — décompose 1 study → N `KnowledgeEntry` rows :
    - 1 row `entryType="MARKET_STUDY_TAM"` avec `data: { tam, sam, som, methodology, source }` + `countryCode + sector`
    - N rows `entryType="MARKET_STUDY_COMPETITOR"` (1 per competitor) avec `data: { name, marketSharePct, year }`
    - N rows `entryType="MARKET_STUDY_SEGMENT"` (1 per consumer segment)
    - N rows `entryType="EXTERNAL_FEED_DIGEST"` agrégeant macroSignals + weakSignals
    - 1 row `entryType="MARKET_STUDY_RAW"` avec `data: { fullExtraction, sourceUrl, uploadedBy, sha256 }` (canonique, sert d'audit + de re-extraction si schéma évolue)
  - `dedup.ts` — `sourceHash` (sha256 du fichier source) anti-doublon. Re-upload du même PDF skip (return existing entries).
  - `manifest.ts` — manifest service standard (governor: SESHAT, acceptsIntents: ["INGEST_MARKET_STUDY", "RE_EXTRACT_MARKET_STUDY"]).
  - `governance.ts` — handlers Mestor.
- `src/server/governance/intent-kinds.ts` + `slos.ts` — 2 nouveaux Intent kinds `INGEST_MARKET_STUDY` (governor SESHAT, async, p95 60s) + `RE_EXTRACT_MARKET_STUDY` (governor SESHAT, async, p95 90s, après schema migration).
- Migration Prisma `KnowledgeType` enum étendu : `+MARKET_STUDY_TAM`, `+MARKET_STUDY_COMPETITOR`, `+MARKET_STUDY_SEGMENT`, `+MARKET_STUDY_RAW`, `+EXTERNAL_FEED_DIGEST` (5 nouvelles valeurs ; SECTOR_BENCHMARK existant conservé pour compat seed Wakanda).
- `src/server/services/seshat/market-study-ingestion/types.ts` — types Zod stricts pour `MarketStudyExtraction` (consommé par §13 schema).

**Verify** :
1. Upload `Trend_Tracker_Full.xlsx` (mentionné dans Workflow ADVE GEN doc) → vérifier que les 49 variables sont parsed et persistées en `KnowledgeEntry × MARKET_STUDY_*`.
2. Upload PDF Statista cosmetics South Africa 2025 → vérifier `tam/sam/som ZA cosmetics` extraits.
3. `runMarketIntelligence` sur strategy ZA cosmetics → vérifie hit chaud sur `MARKET_STUDY_TAM` ZA cosmetics récent (≤30j) + signal collecte enrichi par les segments consommateurs réels du Statista.

**Anti-doublon NEFER §3.1** : pas de nouveau model — réutilise `KnowledgeEntry`. Réutilise `BrandDataSource` pour stocker le fichier brut uploadé (compat ADR-0027). Réutilise `extractText` pdf/docx existant. Réutilise `mestor.emitIntent` pattern. Réutilise `MarketStudy` model uniquement comme **vue agrégée** non-canonique : si on conserve `MarketStudy`, c'est en lecture pour l'UI cockpit (tableau récap). La source de vérité runtime de Tarsis reste `KnowledgeEntry`.

### PR-J — UI cockpit/console "Injecter étude de marché"
**Branch** : `phase/17-country-kb-prj-ui-injection`
**Fichiers** :
- `src/app/(cockpit)/cockpit/intelligence/market-studies/page.tsx` (nouveau) — onglet "Études de marché" sous le menu Intelligence cockpit. Liste les `MarketStudy` ingérées (titre, publisher, country, sector, date, # KnowledgeEntry produites). Bouton "Injecter une étude" en header → modal upload (drag-drop PDF/DOCX/XLSX, jusqu'à 50 MB) → `briefIngest`-style preview : extraction Zod-validée affichée pour confirmation opérateur AVANT persist (pattern ADR-0034 `briefIngest.preview` puis `confirm`). Chaque champ extrait peut être édité par l'opérateur dans la preview (tam/sam/som/competitors/segments) avant `confirm`.
- `src/app/(console)/console/seshat/market-studies/page.tsx` (nouveau) — vue admin tous-strategies. Filtres par countryCode, sector, entryType. Bouton "Re-extraire" (déclenche `RE_EXTRACT_MARKET_STUDY` si le schema d'extraction a évolué).
- `src/server/trpc/routers/market-study-ingestion.ts` (nouveau) — procedures `preview` (returns extraction sans persist), `confirm` (déclenche `INGEST_MARKET_STUDY`), `list({strategyId})`, `delete({entryId})`, `reExtract({rawEntryId})`.
- Test E2E Playwright : upload PDF mock → preview affiche TAM extrait → opérateur édite TAM → confirm → KnowledgeEntry persistée avec édition opérateur + certainty="OFFICIAL" si édité (cf. ADR-0032).

**Verify** : drag-drop manuel d'une étude de marché Statista PDF dans `/cockpit/intelligence/market-studies`, voir preview, confirmer, vérifier que les piliers T des brands ZA même secteur reflètent les nouvelles données dans les 5 minutes.

### PR-K — Variable-bible canonical mapping (manuel ADVE ↔ code)
**Branch** : `phase/17-country-kb-prk-bible-canonical-map`
**Scope** : créer la **table de correspondance officielle** entre la nomenclature manuel (Le Messie, Vision Statement, Origin Myth, Compétences Divines, Identité Visuelle, Dialecte Propriétaire, Personas, Devotion Ladder, Temples, Rituels, Clergé, Pèlerinages…) et les keys code (`a.equipeDirigeante`, `a.prophecy`, `a.herosJourney`, `a.competencesDistinctives` à créer si manquant, `d.assetsLinguistiques`, `d.personas`, `e.touchpoints` = Temples, `e.rituels`, `e.sacraments` = Sacrements, etc.).

**Fichiers** :
- `src/lib/types/variable-bible.ts` — étendre `VariableSpec` avec :
  ```ts
  interface VariableSpec {
    // ... existing ...
    canonicalCode?: string;        // NEW — "A1" / "A6" / "D5" / etc. du manuel
    canonicalLabel?: string;       // NEW — "Le Messie" / "Origin Myth" / "Compétences Divines" / etc.
    manualSection?: string;        // NEW — "PILIER 1 : AUTHENTICITÉ §1.1"
  }
  ```
- Audit complet des 8 BIBLE_X — populate `canonicalCode + canonicalLabel + manualSection` pour chaque entry quand le manuel a un correspondant. **Identifier explicitement les entries SANS correspondant manuel** (champs custom code-only — souvent les `derivedFrom` dérivés calculés) et les marquer `canonicalCode: null` avec commentaire de justification.
- Identifier les entries du manuel SANS correspondant code (gap report) et :
  - Soit les ajouter dans `BIBLE_X` (ex: si `A6 Expertise` ou `A8 Preuves d'authenticité` ne sont pas explicitement modélisés, créer `a.expertiseAreas` et `a.proofPoints` avec format adapté — `a.proofPoints` existe déjà en BIBLE_D, déplacer/aliaser).
  - Soit justifier l'omission volontaire dans une nouvelle section §11 du présent ADR.
- `docs/governance/VARIABLE-BIBLE-CANON.md` (nouveau) — table à 3 colonnes (Code manuel / Label canon / Field code + path) auto-générée depuis `VARIABLE_BIBLE` via `npx tsx scripts/gen-variable-bible-canon.ts`. Hook pre-commit pour régen quand variable-bible.ts est modifiée.
- Test anti-drift `tests/unit/governance/variable-bible-canonical-coverage.test.ts` — assert que **100% des codes manuel** (A1-A11, D1-D12, V1-V18, E1-Ex listés en §11) ont un `canonicalCode` correspondant en `VARIABLE_BIBLE`. Toute regression échoue CI.
- `src/components/cockpit/pillar-page.tsx` (et autres pages éditeur ADVE) — afficher le `canonicalCode + canonicalLabel` à côté de chaque champ pour que l'opérateur reconnaisse le manuel. Tooltip "Manuel ADVE §1.1 — Le Messie".

**Verify** : `npx vitest run variable-bible-canonical-coverage` = 0 fail. Ouvrir `/cockpit/strategy/<id>/pillar/a` → tous les champs affichent leur code A1/A6/etc.

### PR-L — Schema typé `KnowledgeEntry.data` + 49 variables Trend Tracker
**Branch** : `phase/17-country-kb-prl-knowledge-data-schema`
**Scope** : remplacer le `Json` ouvert de `KnowledgeEntry.data` par un **discriminated union typé** au runtime (Zod) selon `entryType`. Permet à Tarsis et au pilier T de requêter des champs structurés ("quel TAM ZA cosmetics 2025" → SELECT avec filter/projection JSON).

**Fichiers** :
- `src/server/services/seshat/knowledge/schemas.ts` (nouveau) — Zod schemas par `entryType` :
  ```ts
  const TamSchema = z.object({ value: z.number(), currency: z.string(), year: z.number(), methodology: z.string(), source: z.string() });
  const KnowledgeEntryDataByType = {
    SECTOR_BENCHMARK: z.object({ kpis: z.record(z.number()), benchmarkDate: z.string() }),
    MARKET_STUDY_TAM: z.object({ tam: TamSchema, sam: TamSchema.optional(), som: TamSchema.optional() }),
    MARKET_STUDY_COMPETITOR: z.object({ name: z.string(), marketSharePct: z.number().optional(), year: z.number() }),
    MARKET_STUDY_SEGMENT: z.object({ segment: z.string(), sizePct: z.number(), demographics: z.record(z.unknown()), behaviors: z.array(z.string()), painPoints: z.array(z.string()) }),
    EXTERNAL_FEED_DIGEST: z.object({ macroSignals: z.array(...), weakSignals: z.array(...) }),
    MARKET_STUDY_RAW: z.object({ fullExtraction: z.unknown(), sourceUrl: z.string().optional(), uploadedBy: z.string(), sha256: z.string() }),
    // ... existing ...
  };
  ```
- `src/server/services/seshat/knowledge/access.ts` (nouveau) — helpers typés :
  - `getTamForCountrySector(countryCode, sector)` → renvoie le row `MARKET_STUDY_TAM` le plus frais.
  - `getCompetitorSharesForCountrySector(countryCode, sector)` → array de rows `MARKET_STUDY_COMPETITOR`.
  - `getMarketSegmentsForCountrySector(countryCode, sector)`
  - `getMacroAndWeakSignalsForCountrySector(countryCode, sector, ageDays?)`
- `src/server/services/seshat/tarsis/weak-signal-analyzer.ts` — `buildSearchContext` enrichi avec ces helpers ; le LLM reçoit `tam`, `competitorShares`, `segments` factuels au lieu d'inventer.
- `src/server/services/strategy-presentation/section-tam.ts` (existant Phase 13) — branché sur `getTamForCountrySector` ; le pilier T n'invente plus le TAM mais renvoie le chiffre étude.
- **49 variables Trend Tracker** : sont stockées par les services PR-I dans `MARKET_STUDY_RAW.fullExtraction.trendTracker` (sous-objet typé), accessibles via helper `getTrendTrackerForCountrySector(countryCode, sector)`. Liste exhaustive maintenue dans `src/server/services/seshat/knowledge/trend-tracker-49.ts` (1 fichier, 1 array de 49 entries `{ code: "A1", label: "Confiance conso", category: "MACRO", unit: "0-200", source: "INSEE/INS-CM" }`).
- Test `tests/unit/services/knowledge-schemas.test.ts` — assert chaque `entryType` a un Zod schema valide ; chaque seed Wakanda entry passe la validation.
- Backfill : `MARKET_STUDY_RAW` reste tolérant (fullExtraction = `z.unknown()`) pour permettre de re-extraire avec un schéma futur sans perdre la matière brute.

**Verify** : `getTamForCountrySector("ZA", "cosmetics")` post-PR-I retourne le TAM Statista ; pilier T ZA cosmetics affiche un `tamSamSom` factuel (avec `source: "verified"` ADR-0032 OFFICIAL) au lieu du `source: "ai_estimate"` actuel.

### PR-H — Documentation + governance updates
**Branch** : `phase/17-country-kb-prh-docs`
**Fichiers** :
- `docs/governance/adr/0037-country-scoped-knowledge-base.md` — flip statut `Proposed` → `Accepted` + ajout section "Validation runtime" avec résultats post-merge
- `CHANGELOG.md` — entry `v6.17.0` (titre punchy : "Phase 17 — Country-scoped Knowledge Base : Tarsis devient pays-aware")
- `docs/governance/REFONTE-PLAN.md` — nouvelle section "Phase 17 — Country-scoped Knowledge Base (CSKB)" calquée sur le format Phase 14 / 15 / 16 (5-10 lignes, scope, sub-PRs, statut)
- `docs/governance/LEXICON.md` — entrée `Country-scoped Knowledge Base` (CSKB), `KnowledgeEntry.countryCode`, mention que pillar T est désormais pays-aware
- `docs/governance/CODE-MAP.md` — auto-régen via `npx tsx scripts/gen-code-map.ts` (entité KnowledgeEntry mise à jour avec countryCode)
- `~/.claude/projects/<repo>/memory/architecture_seshat.md` (nouveau memory file) — synthèse "Seshat KB country-scoped depuis Phase 17, T pillar bénéficie de Country.marketMeta + PPP en system prompt"

**Verify** : `npx tsx scripts/audit-pantheon-completeness.ts` + `audit-neteru-narrative.ts` pass ; `vitest run governance` pass.

## 5. Conséquences

### Positives
- Pilier T cesse d'être halluciné sur les pays réels — chaque marché a son propre KB qui s'enrichit avec chaque brand activée.
- Cross-brand reuse pays-précis : 2 brands ZA même secteur partagent leur Track ; 1 brand ZA + 1 brand CM même secteur ne se polluent plus.
- Prépare le terrain pour PR-G (feeds externes) et pour Insights/Tarsis personnalisés par marché.
- Anti-drift documenté + CI : la régression `countryCode null sur new KnowledgeEntry` devient impossible silencieusement.

### Négatives
- Cold-start temporaire : tant qu'il n'y a pas N brands ZA dans le KB, chaque brand ZA paie 1 LLM call par activation (vs hit chaud actuel sur Wakanda). Mitigation : PR-D rend ce cold-start déjà beaucoup plus crédible que le statu quo (LLM contextualisé pays vs LLM sector-only).
- Backfill manuel nécessaire pour les `KnowledgeEntry` non-Wakanda existantes (probablement < 50 rows hors Wakanda — script ad-hoc en PR-A).
- Coût LLM augmenté de ~15% sur l'inférence T (prompt plus long avec country context). Budget Thot doit absorber, ou cap sur countryMeta tronqué.

## 6. Validation runtime

Après merge complet (PR-A → PR-F minimum) :

1. **Smoke** : créer 3 strategies dummy (CM, ZA, NG) même sector, lancer `ENRICH_T_FROM_ADVE_R_SESHAT` sur chacune. Vérifier que les 3 `KnowledgeEntry` produites ont `countryCode` distincts et que les `WeakSignal[]` diffèrent qualitativement (cite des éléments propres au pays).
2. **Reuse** : créer une 4ème strategy ZA même sector, lancer enrich. Vérifier `sectorReused: true` (hit chaud sur ZA précédent), pas LLM call.
3. **Cross-pollution rejected** : créer 1 strategy CM sector identique. Vérifier qu'il NE hit PAS l'entry ZA (countryCode mismatch) → fallback LLM-synthesis pour CM, écrit nouvelle entry CM.
4. **Wakanda intact** : seed wakanda → `runMarketIntelligence` sur 1 brand WK doit toujours hit chaud (countryCode='WK' backfilled).
5. **Audit script** : `npx tsx scripts/audit-cskb-coverage.ts` retourne ≥ 99%.

## 7. Anti-drift guards (sortie obligatoire du sprint)

| Guard | Test/Script | Trigger |
|---|---|---|
| `KnowledgeEntry.countryCode` field exists | `country-scoped-kb.test.ts` Prisma introspection | CI |
| Pas de `db.knowledgeEntry.create` sans `countryCode` (services seshat) | regex audit dans test | CI |
| Coverage ≥ 99% rows avec `countryCode` non-null | `scripts/audit-cskb-coverage.ts` | Cron + manuel |
| `buildSearchContext` charge bien `Country` joint | test unit | CI |
| Prompt system Tarsis contient bloc `CONTEXTE PAYS` | regex sur `signal-collector.ts` | CI |
| `checkSectorKnowledge` rejette cross-country | test unit avec mock 2 entries CM+ZA | CI |

## 8. Hors scope (intentionnel)

- **External feeds** (PR-G) — peut shipper Phase 18 sans bloquer.
- **`MarketStudy.countryCode` migration** — model séparé, pas dans le hot-path Tarsis. À traiter Phase 18 si besoin.
- **`Sector.countryCodes[]` tightening** — déjà partiellement présent ; rationalisation à un autre moment.
- **UI exposition de `countryCode` dans les Insights/Oracle** — la donnée est pays-aware côté backend mais l'UI cockpit/console actuelle reste agnostique. Sprint UI séparé Phase 18+.
- **Migration de l'historique pré-Wakanda non-categorizable** — les `KnowledgeEntry` sans `market` ou `market` ambigu (1-2% du dataset si applicable) restent `countryCode = NULL`. Le filtre `checkSectorKnowledge` les ignore par défaut côté ZA-only ; elles servent toujours en sector-only fallback.

## 9. Estimations

| PR | Effort | Risque | Bloque ? |
|---|---|---|---|
| PR-A migration + seed Wakanda backfill | 0.5j | Faible (additive) | Bloque B-F, I |
| PR-B buildSearchContext étendu | 1j | Faible | Bloque C-E, L |
| PR-C checkSectorKnowledge filter | 0.5j | Faible | Bloque E-F |
| PR-D LLM prompts country-aware | 1j | Moyen (qualité prompt à itérer) | Indépendant |
| PR-E persistence `countryCode` | 0.5j | Faible | Indépendant après B |
| PR-F tests anti-drift | 1j | Faible | Closing PR-A→E |
| PR-G external feeds (optionnel) | 3-5j | Moyen-élevé | Hors sprint critique |
| **PR-I MarketStudy ingestion pipeline** | **3-4j** | **Moyen (parsers PDF/DOCX/XLSX, prompts LLM extraction)** | **Bloque J, L** |
| **PR-J UI cockpit/console injection** | **2j** | **Faible** | **Indépendant après I** |
| **PR-K Variable-bible canonical mapping** | **2j** | **Faible (mais audit fastidieux : 100+ entries à mapper)** | **Indépendant** |
| **PR-L Schema typé KnowledgeEntry.data + Trend Tracker 49** | **2j** | **Moyen (Zod discriminated union, refactor callers)** | **Closing PR après B+I** |
| PR-H docs + REFONTE-PLAN | 0.5j | Nul | Closing PR |

**Total sprint critique étendu (A→F + I-L + H)** : ~14-15j homme, ~3 sprints engineering. Sub-PRs parallélisables : K indépendant peut tourner en // de A-F. I+J peuvent tourner en // de B-E. Compression possible à 2 sprints avec 2 ingés.

**Variante minimale (sprint focus pays-only sans extensions)** : A→F + H = ~5j (le scope original v0).
**Variante complète recommandée (avec ingestion + canon + schema typé)** : A→L + H = ~14-15j.
**Avec PR-G** : +3-5j additionnels.

## 10. Décisions ouvertes (à trancher avant kick-off PR-A)

1. **`KnowledgeEntry.countryCode` nullable ou non-null ?** — proposition : nullable pour compat backfill, mais audit CI exige ≥ 99% non-null sur les rows post-Phase 17. Alternative stricte : non-null + CHECK contrainte, mais bloque si seed legacy oublié. **Recommandation : nullable + audit**.
2. **`market` field deprecated ou conservé ?** — proposition : conservé pour compat (filtres legacy) mais marqué `@deprecated` dans le schema comment. Drop possible Phase 19+ après audit usage.
3. **Cap LLM prompt size avec `countryMeta` injecté ?** — proposition : tronquer `countryMeta` à 500 chars JSON dans le system prompt pour éviter prompt explosion sur countries avec marketMeta verbose.
4. **Fallback strict ou souple si `Strategy.countryCode` absent ?** — proposition : si absent (legacy strategies), fallback sector-only avec log warning Seshat ; flag `Strategy.countryCode` comme `@required` au prochain `OPERATOR_AMEND_PILLAR` pass.
5. **Format des étude de marché supportées (PR-I)** — PDF + DOCX + XLSX d'office. Question : XLS legacy (Excel 97-2003) ? CSV simple ? Recommandation : **PDF + DOCX + XLSX seul** (couvre Statista, Nielsen, Kantar, BCG, McKinsey, Euromonitor) ; CSV/XLS hors scope (peu de cabinets émettent encore en CSV).
6. **`MarketStudy` model existant : conserver ou supprimer ?** — Vu dans seed Wakanda 26-intelligence.ts. Le modèle existe mais n'est pas le hot-path Tarsis. Recommandation : **conserver comme vue agrégée** (`MarketStudy` pointe vers N `KnowledgeEntry` via `marketStudyId` champ optionnel sur KE). Permet l'UI cockpit "tableau récap des études" sans dupliquer les données runtime.
7. **Edition operateur avant confirm (PR-J)** — l'opérateur peut éditer l'extraction Zod-validée en preview AVANT persist. Question : éditer = certainty `OFFICIAL` (validation humaine) ou rester `INFERRED` (machine) ? Recommandation : **OFFICIAL si éditée**, sinon INFERRED. Cohérent ADR-0032.
8. **Trend Tracker 49 — source de vérité du catalogue** — propose `src/server/services/seshat/knowledge/trend-tracker-49.ts`. Question : enrichir avec `description + dataSource standard + benchmarkUrl` par variable ? Recommandation : **oui, modèle riche** pour que le LLM extracteur sache où regarder dans les PDFs.

---

## 11. Audit canonical : manuel ADVE ↔ variable-bible.ts (gap report)

Inventaire exhaustif du canon manuel (4 documents canoniques cités en frontmatter) confronté à `variable-bible.ts` v6.16.

### 11.1 Pilier A — Authenticité (Le Gospel)

| Code manuel | Label canon | `variable-bible.ts` field | Statut | Action PR-K |
|---|---|---|---|---|
| A1 | Marque (nom commercial) | `a.nomMarque` | ✅ couvert | mapper `canonicalCode: "A1"` |
| A1bis | **Le Messie** (figure charismatique) | `a.equipeDirigeante` (partiel) | ⚠️ partiel — "Le Messie" est UN membre dirigeant pivot, pas la liste. | Ajouter `a.messieFondateur: { name, role, charismaScore?, narrative }` ou flag `equipeDirigeante[].isMessie: true`. |
| A2 | Accroche identitaire | `a.accroche` | ✅ couvert | mapper |
| A3 | Description factuelle | `a.description` | ✅ couvert | mapper |
| A4 | Secteur | `a.secteur` | ✅ couvert | mapper |
| A5 | Pays/Marché | `a.pays` | ✅ couvert | mapper (et lien vers `Strategy.countryCode` ISO-2 strict) |
| A6 | **Expertise / Compétences Divines** | `a.competencesDistinctives` ou via `a.equipeDirigeante[].competencesCles[]` | ⚠️ partiel — manuel demande "1-3 compétences que SEUL nous pouvons accomplir" comme variable autonome au niveau marque. | Créer `a.competencesDivines: Array<{ competence (50+ chars), justification, exclusivityProof }>` avec rule "1-3 max". |
| A7 | NorthStar Metric | `s.northStarKPI` | ⚠️ drift placement — manuel place NSM en A (raison d'être quantifiée), code l'a en S (KPI stratégique). | Recommandation : conserver en S (cohérent cascade) mais ajouter `a.northStarRationale: string` pour la justification narrative. Documenter le placement dans le canonical map. |
| A8 | Preuves d'authenticité | (existe en `d.proofPoints`) | ⚠️ drift placement — manuel place les preuves en A (légitimité), code en D (preuves de différenciation). | Ajouter `a.preuvesAuthenticite: Array<{ type, claim, evidence, source }>` distinct. Sémantique : A = preuves d'origine/légitimité (certifications, années d'existence, fondateur reconnu), D = preuves de différenciation/positionnement. |
| A9 | Archétype primaire | `a.archetype` | ✅ couvert | mapper |
| A9bis | Archétype secondaire | `a.archetypeSecondary` | ✅ couvert | mapper |
| A10 | Index réputation | (manquant) | ❌ absent | Créer `a.indexReputation: { source (Google Reviews | Trustpilot | NPS | autre), score (0-10 ou 0-5), sampleSize, lastMeasured (ISO date), publicProofUrl? }`. Calculable depuis intégrations external (PR-G optionnel). |
| A11 | eNPS / Turnover interne | (manquant) | ❌ absent | Créer `a.eNps: { score (-100 à +100), sampleSize, frequency, lastMeasured }` + `a.turnoverRate: number? (%)`. People-centric proof. |
| — | Vision Statement (manuel §1.2) | `a.prophecy` (objet) | ✅ couvert | mapper en `canonicalLabel: "Vision Statement"` |
| — | Mission Statement (manuel §1.3) | `a.noyauIdentitaire` ou `a.ikigai.worldNeed` | ⚠️ pas de field dédié `missionStatement`. | Ajouter `a.missionStatement: string (≤25 mots)` distinct du noyauIdentitaire (qui est l'ADN). |
| — | Valeurs / Commandements (manuel §1.4) | `a.valeurs` (Schwartz) + `e.commandments` | ✅ couvert (les valeurs en A, les commandements en E) — mapper proprement. |
| — | Origin Myth (manuel §1.5, 3 versions) | `a.herosJourney` ou `a.timelineNarrative` | ⚠️ partiel — manuel demande 3 versions explicites (elevator 50 mots, storytelling, longue). | Ajouter `a.originMyth: { elevator (≤50 mots), storytelling (3-7 paragraphes), longue (essai 1500+ mots) }` distinct du Hero's Journey 5-actes. |

**Verdict A** : 5 fields à créer (`messieFondateur`, `competencesDivines`, `preuvesAuthenticite`, `indexReputation`, `eNps`/`turnoverRate`, `missionStatement`, `originMyth`). Le code est plus structuré que le manuel sur certains aspects (ikigai, hero's journey 5-actes, equipeComplementarite, valeurs Schwartz typées) mais loupe les variables canon people-centric (eNps, indexReputation, originMyth multi-versions).

### 11.2 Pilier D — Distinction (Le Mythe)

| Code manuel | Label canon | `variable-bible.ts` field | Statut | Action PR-K |
|---|---|---|---|---|
| D1 | Persona cible | `d.personas` | ✅ couvert | mapper |
| D2 | Concurrents | `d.paysageConcurrentiel` | ✅ couvert | mapper |
| D3 | Secteur (déjà en A) | (alias `a.secteur`) | ⚠️ doublon canon | Documenter alias dans canonical map. |
| D4 | USP / Promesse maître | `d.promesseMaitre` | ✅ couvert | mapper |
| D5 | DA / Territoire visuel | `d.directionArtistique` | ✅ couvert (très riche : 11 sous-composites) | mapper |
| D6 | Positionnement émotionnel | (existe partiellement dans `d.positionnement` ou `e.promesseExperience`) | ⚠️ pas de field dédié | Ajouter `d.positionnementEmotionnel: string (≤200 chars)` (ex Apple : "Je me sens armé et inspiré"). Distinct du positionnement business. |
| D7 | SWOT flash | `r.globalSwot` | ⚠️ drift placement — manuel place SWOT en D (analyse différentielle), code en R (analyse risque). | Conserver en R + ajouter `d.swotFlash: { strength, weakness, opportunity, threat } (1 phrase chacun, version courte vs r.globalSwot 3+ items)` pour usage marketing rapide. |
| D8 | Codes propriétaires / Dialecte | `d.assetsLinguistiques.lexiquePropre[]` | ✅ couvert | mapper |
| D9 | Portefeuille IP / Propriété intellectuelle | `v.proprieteIntellectuelle` | ⚠️ drift placement — manuel place IP en D (signal distinction), code en V (Berkus milestone). | Conserver en V + ajouter `d.portefeuillePI: { trademarks[], patents[], nameAvailability }` distinct. |
| D10 | ESOV (Excess Share of Voice) | (manquant) | ❌ absent | Créer `d.esov: { value (-1.0 à +1.0), measurementMethod, lastMeasured, source }`. Mesure marketing critique. |
| D11 | Barrières imitation | (manquant) | ❌ absent | Créer `d.barriersImitation: Array<{ barrier, defensibility (LOW|MEDIUM|HIGH), expectedDuration }>`. |
| D12 | Ratio Storytelling/Evidence | (manquant) | ❌ absent | Créer `d.storyEvidenceRatio: { storytellingPct, evidencePct, target }` (ex 60/40). |
| — | Identité visuelle (logo, palette) | `d.directionArtistique.{logoTypeRecommendation,chromaticStrategy,...}` | ✅ couvert (très détaillé) | mapper |
| — | Ton de Voix | `d.tonDeVoix` + `d.archetypalExpression` | ✅ couvert | mapper |
| — | Prix comme signal | `v.positioningArchetype` | ⚠️ drift placement | Conserver en V + alias dans canonical map (D-side : signal de différenciation, V-side : capture de valeur). |

**Verdict D** : 4 fields à créer (`positionnementEmotionnel`, `swotFlash`, `esov`, `barriersImitation`, `storyEvidenceRatio`).

### 11.3 Pilier V — Valeur (Le Miracle)

Le manuel lists V1-V18 avec extraits explicites V12 (Coût acquis.) et V7 (ROI Proof). Le code couvre déjà très largement (`unitEconomics`, `produitsCatalogue`, `productLadder`, `valeurClientTangible/Intangible`, `coutClientTangible/Intangible`, `mvp`, `proprieteIntellectuelle`, etc.).

| Code manuel | Label canon | Field code | Statut |
|---|---|---|---|
| V1 | Besoins client | `v.promesseDeValeur` + `d.personas[].jobsToBeDone` | ✅ |
| V4 | Offres & Prix | `v.produitsCatalogue` + `v.productLadder` | ✅ |
| V7 | ROI Proof | `v.unitEconomics.ltvCacRatio` + (manquant : ROI testimonial) | ⚠️ ajouter `v.roiProofs: Array<{ client?, beforeMetric, afterMetric, lift, timeframe, attestation }>` |
| V12 | Coût acquisition | `v.unitEconomics.cac` | ✅ |
| — | Promesse Divine (manuel §3.1) | `d.promesseMaitre` ou `v.promesseDeValeur` | ⚠️ aliaser proprement |
| — | Sacrements (produits comme rituels) | `e.sacraments` | ⚠️ drift placement — code en E. Conserver. |
| — | Architecture Multisensorielle | (manquant) | ❌ ajouter `v.experienceMultisensorielle: { vue, ouie, odorat, toucher, gout }` |
| — | Sacrifice Requis | (manquant) | ❌ ajouter `v.sacrificeRequis: { prix, temps, effort, justification }` |
| — | Packaging & Delivery | (existe partiellement dans `d.directionArtistique` + `v.produitsCatalogue`) | ⚠️ ajouter `v.packagingExperience: { unboxingRitual, packagingMaterial, deliveryMode, sensoryNotes }` |

**Verdict V** : 4 fields à créer (`roiProofs`, `experienceMultisensorielle`, `sacrificeRequis`, `packagingExperience`).

### 11.4 Pilier E — Engagement (L'Église)

Le code couvre TRÈS largement (touchpoints = Temples, rituels = Rituels, sacraments = Sacrements, hierarchieCommunautaire = Devotion Ladder en A, gamification, aarrr, sacredCalendar = Ritual Calendar, principesCommunautaires, taboos, ritesDePassage, commandments).

| Manuel | Code | Statut |
|---|---|---|
| Devotion Ladder (8 niveaux) | `a.hierarchieCommunautaire` (4-6 niveaux) + `e.touchpoints[].devotionLevel[]` | ⚠️ manuel canon = 8 niveaux (Païen→Curieux→Converti→Pratiquant→Fidèle→Disciple→Évangéliste→Apôtre), code = 4-6 dans `hierarchieCommunautaire` + enum Devotion (cf. `domain/devotion-ladder.ts`). Confirmer mapping enum 8 vs UI 4-6. |
| Temples (points contact) | `e.touchpoints` | ✅ |
| Rituels | `e.rituels` | ✅ |
| Ritual Calendar | `e.sacredCalendar` | ✅ |
| Clergé (CM/ambassadeurs) | (manquant) | ❌ ajouter `e.clergeStructure: { communityManager, ambassadeurs[], supportTeam, specialists[] }` |
| Pèlerinages (events majeurs) | `e.touchpoints` (partiel) | ⚠️ ajouter `e.pelerinages: Array<{ name, frequency, location, expectedAttendance, devotionLevelTarget }>` distinct des touchpoints quotidiens. |
| Programme Évangélisation | (manquant) | ❌ ajouter `e.programmeEvangelisation: { referralProgram { incentive, viralCoefficient }, brandAdvocacyProgram, communityRecruitment }` |
| Community Building | `e.principesCommunautaires` + `e.gamification` (partiel) | ⚠️ explicit field `e.communityBuilding: { platforms[], moderationRules, growthMechanics }` |
| Retention Strategy | `e.aarrr.retention` | ✅ |

**Verdict E** : 3 fields à créer (`clergeStructure`, `pelerinages`, `programmeEvangelisation`, `communityBuilding`). Confirmer enum Devotion 8 niveaux.

### 11.5 Piliers R/T/I/S

R/T/I/S sont **dérivés** (cf. ADR-0023 §6) et la couverture est plus mécanique. Le manuel n'a pas de codes Rx/Tx/Ix/Sx aussi explicites — la cascade `ENRICH_R_FROM_ADVE` etc. est l'autorité. Pas de gap canonique critique. Le canonical map PR-K les marquera tous `canonicalCode: null` avec le commentaire "RTIS dérivés, pas de code manuel direct — cf. cascade ADVERTIS".

**Mais** : la section "Trend Tracker" du Workflow ADVE GEN définit **49 variables macro/micro tendances** qui sont l'INPUT de Tarsis (pilier T). Cf. §13 ci-dessous pour le schéma.

### 11.6 Synthèse gap report

**Total fields à créer (PR-K)** : 16 nouveaux fields ADVE. Tous additifs, pas de breaking change.

| Pilier | Nouveaux fields | Effort relatif |
|---|---|---|
| A | 6 (messieFondateur, competencesDivines, preuvesAuthenticite, indexReputation, eNps/turnoverRate, missionStatement, originMyth) | Moyen |
| D | 5 (positionnementEmotionnel, swotFlash, esov, barriersImitation, storyEvidenceRatio) | Faible |
| V | 4 (roiProofs, experienceMultisensorielle, sacrificeRequis, packagingExperience) | Faible |
| E | 4 (clergeStructure, pelerinages, programmeEvangelisation, communityBuilding) | Faible |
| R/T/I/S | 0 (pas de gap canon) | — |

**Tous les fields existants reçoivent** `canonicalCode + canonicalLabel + manualSection` quand correspondance manuel. Auto-générés dans `docs/governance/VARIABLE-BIBLE-CANON.md` via `npx tsx scripts/gen-variable-bible-canon.ts`.

---

## 12. MarketStudy ingestion pipeline (détail PR-I + PR-J)

### 12.1 Workflow opérateur

```
Cockpit /cockpit/intelligence/market-studies
   │
   ├── [Bouton] "Injecter une étude"
   │       └─ Modal drag-drop (PDF/DOCX/XLSX, ≤50 MB)
   │              └─ POST /api/trpc/marketStudyIngestion.preview
   │                     ├─ Stocke fichier dans BrandDataSource (kind=MARKET_STUDY)
   │                     ├─ Parse texte via extractText (réutilise ADR-0027)
   │                     ├─ LLM extraction structurée → MarketStudyExtraction (Zod)
   │                     └─ Renvoie preview JSON éditable
   │
   ├── Preview UI (4 onglets)
   │       ├─ Métadonnées : title, publisher, publishedAt, geography, sectorCoverage
   │       ├─ Chiffrés : tam/sam/som éditables + competitorShares + segments
   │       ├─ Signaux : macroSignals + weakSignals
   │       └─ Trend Tracker : 49 variables (auto-rempli si XLSX template, sinon vide à compléter)
   │
   └── [Bouton] "Confirmer ingestion"
           └─ POST /api/trpc/marketStudyIngestion.confirm
                  ├─ Crée intent INGEST_MARKET_STUDY (governor SESHAT)
                  ├─ persister.ts décompose 1 study → N KnowledgeEntry
                  │      ├─ MARKET_STUDY_TAM × 1 (tam/sam/som)
                  │      ├─ MARKET_STUDY_COMPETITOR × N (1 per comp)
                  │      ├─ MARKET_STUDY_SEGMENT × N (1 per segment)
                  │      ├─ EXTERNAL_FEED_DIGEST × 1 (signaux agrégés)
                  │      └─ MARKET_STUDY_RAW × 1 (extraction complète audit)
                  └─ Tous avec countryCode + sector + sourceHash + certainty
                         (OFFICIAL si éditée par opérateur, INFERRED sinon)
```

### 12.2 Sources supportées (PDF/DOCX/XLSX)

| Source attendue | Format | Mode extraction | Difficulté |
|---|---|---|---|
| Statista report | PDF (texte + tableaux + charts) | Hybride : text extraction + LLM vision pour graphes (réutilise extractImage Claude vision ADR-0027) | Moyen |
| Nielsen / Kantar / Euromonitor | PDF mixte | LLM extraction structurée + table OCR | Moyen |
| BCG / McKinsey / Bain | PDF deck | Slide-by-slide extraction (1 LLM call par slide ≥1 chart) | Élevé |
| Banque centrale (BEAC, BCEAO, SARB) | PDF rapport sectoriel | Text-heavy, LLM extraction directe | Faible |
| Trend_Tracker_Full.xlsx (template UPgraders) | XLSX structuré | Direct cell mapping via colonnes attendues (code variable / valeur / source) | Faible (template propre) |
| Étude commanditée custom | DOCX/PDF | LLM extraction tolérante avec confidence score | Moyen-élevé |

### 12.3 Anti-doublon (sourceHash)

`sha256(file)` calculé au upload. `KnowledgeEntry.sourceHash` indexé. Re-upload du même fichier → skip extraction, return existing N entries. Permet à l'opérateur de re-importer sans crainte de duplication.

### 12.4 Re-extraction (RE_EXTRACT_MARKET_STUDY)

Quand le schema d'extraction évolue (Phase 18+ ajoute nouvelles métriques), l'opérateur clique "Re-extraire" sur une étude existante. Trigger `RE_EXTRACT_MARKET_STUDY` qui :
1. Lit `MARKET_STUDY_RAW.fullExtraction` (matière brute préservée)
2. Re-passe LLM avec nouveau system prompt
3. Supprime les KE dérivées (TAM/COMPETITOR/SEGMENT) liées à ce sourceHash
4. Recrée les KE avec nouveau schéma

L'audit lineage est préservé via `MARKET_STUDY_RAW`.

---

## 13. 49 variables Trend Tracker — schema + extraction

Le Workflow ADVE GEN docx définit 49 variables macro/micro-tendances qui doivent benchmarker la marque dans son contexte pays-secteur. Inventaire (extrait du doc, avec catégorisation) :

### 13.1 Catégories

| Catégorie | # vars | Exemples |
|---|---|---|
| **MACRO_ECO** | ~12 | Confiance conso (A1), inflation, taux change, croissance PIB, taux directeur, balance commerciale, FDI, demographic dividend |
| **MACRO_TECH** | ~8 | Penetration internet, smartphone, mobile money, e-commerce share, AI maturity, cloud adoption, broadband cost, social media usage |
| **SOCIO_CULT** | ~10 | Sentiment "branding+IA" (A4), valeurs générationnelles, attitudes CSR, influence diaspora, religiosity, éducation supérieure, urbanization rate, langue dominante shift |
| **REGUL_INST** | ~7 | Taxation, fiscalité start-up, licences sectorielles, OAPI dépôts, GDPR/local equiv, sanctions, élections, contrôle changes |
| **MICRO_SECTOR** | ~12 | Concurrence intensité, barrières entrée, marges typiques sector, growth rate sector, M&A activity, prix moyen catégorie, distribution mix, NPS sector |

### 13.2 Schema typé (`trend-tracker-49.ts`)

```ts
export interface TrendTrackerVariable {
  code: string;          // "A1", "A4", "B2", "C7", etc. — codes Workflow ADVE GEN
  category: "MACRO_ECO" | "MACRO_TECH" | "SOCIO_CULT" | "REGUL_INST" | "MICRO_SECTOR";
  label: string;         // "Confiance conso", "Penetration smartphone", etc.
  unit: string;          // "0-200", "%", "USD bn", "score 0-1", etc.
  source: string;        // "INSEE / INS-CM / SARB Stats" — où trouver
  benchmarkUrl?: string; // URL standard pour cette donnée par pays
  llmExtractionHints: string[]; // mots-clés à chercher dans le PDF étude
}

export const TREND_TRACKER_49: TrendTrackerVariable[] = [
  { code: "A1", category: "MACRO_ECO", label: "Confiance conso", unit: "0-200",
    source: "INS-CM / INSEE / SARB Stats", llmExtractionHints: ["consumer confidence", "indice confiance", "sentiment"] },
  // ... 48 autres
];
```

### 13.3 Persistence

Pour chaque étude ingérée qui couvre le Trend Tracker (XLSX template ou PDF où l'extraction LLM identifie ≥10 variables sur 49), persister 1 `KnowledgeEntry` `entryType="EXTERNAL_FEED_DIGEST"` avec `data.trendTracker: Record<TrendTrackerCode, { value, year, source }>`. Le pilier T peut alors requêter `getTrendTrackerForCountrySector("ZA", "cosmetics")` et obtenir un dump structuré des 49 variables (les non-couvertes restent `null`).

### 13.4 Extraction LLM (PR-I)

System prompt extracteur :
```
Tu reçois une étude de marché PDF/DOCX/XLSX. Cherche systématiquement les 49 variables Trend Tracker
listées ci-dessous (codes A1-A12, B1-B8, C1-C10, D1-D7, E1-E12). Pour chaque variable trouvée,
extrais : { code, value (valeur numérique ou catégorielle), year, source (page/section du document) }.

CONTRAINTE DURE : si une variable n'est pas explicitement mentionnée, retourne null. N'invente pas
de valeur. Si le document couvre un autre pays que celui demandé ({countryCode}), flag explicitement
"out-of-scope-country" et retourne null pour cette variable.

[liste des 49 variables avec llmExtractionHints]
```

Output Zod-validé. `null` autorisé (non-extrait). Variables critiques (A1, B1, C1) génèrent un warning en preview UI si toutes null (probablement document non pertinent).

---

## 14. Conséquences étendues (avec les 4 nouveaux PRs)

### Positives (additionnel à §5)
- **L'opérateur peut faire travailler le moteur sur SES propres études de marché** (Statista, cabinet local, étude commanditée). Plus de dépendance au LLM-as-data-source.
- **Le pilier T base ses chiffrés (TAM/SAM/SOM, market shares, segments) sur des sources OFFICIAL et non plus AI-estimate.** Cohérent ADR-0032 certainty.
- **Le canon manuel devient navigable depuis l'UI** (codes A1-E12 visibles à côté des champs). L'opérateur formé sur le manuel n'est plus perdu dans la nomenclature code.
- **Le Trend Tracker 49 devient un outil de benchmarking systémique** : tout brand dans tout pays/sector reçoit un état des lieux 49-variables dès qu'une étude est ingérée.
- **Anti-hallucination renforcé** : le LLM Tarsis reçoit en system prompt non seulement le pays (PR-D) mais aussi les segments, TAM, competitor shares EXTRACTS d'études réelles. Le LLM n'a plus besoin d'inventer.

### Négatives
- **Coût LLM augmenté** sur l'ingestion (1 PDF Statista 50 pages = ~$0.30-0.50 en Claude Sonnet 4 long-context). Mitigé par fire-and-forget + caching Anubis.
- **Maintenance des prompts d'extraction** : chaque nouveau type d'étude (BCG slides, Statista format évolue) nécessite tuning prompt. Mitigation : preview opérateur permet correction manuelle avant persist.
- **Schema discriminated union (PR-L) augmente la complexité des types Prisma↔Zod.** Mitigation : test-driven development + schemas isolés.
- **Trend Tracker 49 est un canon en évolution** — la liste UPgraders peut grandir/changer. Le `trend-tracker-49.ts` est versionné et tagué (ex `TREND_TRACKER_V1_2026_05`).

---

**Mantra du sprint** : *Track basé sur du réel pays-précis, ou pas de Track. La cascade ADVERTIS ne pardonne pas l'hallucination silencieuse — elle la propage en aval jusqu'à l'asset matérialisé. L'opérateur qui injecte une étude doit voir le moteur la digérer entièrement, pas la stocker comme un fichier mort.*
