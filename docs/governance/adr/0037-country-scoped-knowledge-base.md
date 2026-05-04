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

### PR-G (optionnel, peut shipper séparément) — Tarsis external feeds
**Branch** : `phase/17-country-kb-prg-external-feeds`
**Scope** : amorcer ingestion RSS/Google News pour 5 pays prioritaires (CM, NG, CI, ZA, MA). Service dédié `src/server/services/seshat/tarsis/external-feeds/`. Cron quotidien via Anubis scheduler. Persiste dans `KnowledgeEntry` avec `entryType="EXTERNAL_FEED_DIGEST"` (nouveau enum value) + `countryCode + sector + sourceHash` pour dedup. Hors scope critique du sprint — peut shipper en Phase 18 sans bloquer 17.

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
| PR-A migration + seed Wakanda backfill | 0.5j | Faible (additive) | Bloque B-F |
| PR-B buildSearchContext étendu | 1j | Faible | Bloque C-E |
| PR-C checkSectorKnowledge filter | 0.5j | Faible | Bloque E-F |
| PR-D LLM prompts country-aware | 1j | Moyen (qualité prompt à itérer) | Indépendant |
| PR-E persistence `countryCode` | 0.5j | Faible | Indépendant après B |
| PR-F tests anti-drift | 1j | Faible | Closing PR |
| PR-G external feeds (optionnel) | 3-5j | Moyen-élevé | Hors sprint critique |
| PR-H docs + REFONTE-PLAN | 0.5j | Nul | Closing PR |

**Total sprint critique (A→F + H)** : ~5j homme, 1 sprint engineering.
**Avec PR-G** : ~9-10j, sprint étendu.

## 10. Décisions ouvertes (à trancher avant kick-off PR-A)

1. **`KnowledgeEntry.countryCode` nullable ou non-null ?** — proposition : nullable pour compat backfill, mais audit CI exige ≥ 99% non-null sur les rows post-Phase 17. Alternative stricte : non-null + CHECK contrainte, mais bloque si seed legacy oublié. Recommandation : **nullable + audit**.
2. **`market` field deprecated ou conservé ?** — proposition : conservé pour compat (filtres legacy) mais marqué `@deprecated` dans le schema comment. Drop possible Phase 19+ après audit usage.
3. **Cap LLM prompt size avec `countryMeta` injecté ?** — proposition : tronquer `countryMeta` à 500 chars JSON dans le system prompt pour éviter prompt explosion sur countries avec marketMeta verbose.
4. **Fallback strict ou souple si `Strategy.countryCode` absent ?** — proposition : si absent (legacy strategies), fallback sector-only avec log warning Seshat ; flag `Strategy.countryCode` comme `@required` au prochain `OPERATOR_AMEND_PILLAR` pass.

---

**Mantra du sprint** : *Track basé sur du réel pays-précis, ou pas de Track. La cascade ADVERTIS ne pardonne pas l'hallucination silencieuse — elle la propage en aval jusqu'à l'asset matérialisé.*
