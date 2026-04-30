# ADR-0014 — Oracle creation pipeline canonique (quintet 8-phase)

**Date** : 2026-04-30
**Statut** : accepted
**Phase de refonte** : phase/9 (continuité Ptah Phase 9 + ADR-0012 Brand Vault)

## Contexte

L'Oracle est le **livrable client flagship** de l'OS La Fusée — document consulting modulaire 21 sections ([CLAUDE.md §Product identity](../../CLAUDE.md), [LEXICON.md §173](../LEXICON.md)). Avant cet ADR, son enrichissement (`enrichAllSectionsNeteru` dans `src/server/services/strategy-presentation/enrich-oracle.ts`) souffrait de quatre dérives :

1. **Drift narratif** — les commentaires ("The full trio intervenes", "NETERU quartet") et la description Intent (`"Mestor→Artemis→Seshat pipeline"`) contredisaient le panthéon canonique à 5 actifs (cf. [PANTHEON.md](../PANTHEON.md), [audit-neteru-narrative.ts](../../scripts/audit-neteru-narrative.ts)).
2. **Ptah absent** — la cascade Glory→Brief→Forge ([ADR-0009](0009-neter-ptah-forge.md)) n'était jamais déclenchée par l'Oracle. Aucun visuel matérialisé ; le PDF d'export rendait du texte brut sans cover ni KV.
3. **Thot absent** — aucun pre-flight `assessCapacity`, aucun `recordCost`. Le SLO `costP95Usd: 0.8` ([slos.ts:30](../../src/server/governance/slos.ts)) n'était jamais surveillé Oracle-globalement.
4. **Brand vault contourné** — les sorties Oracle (manifesto, big idea, claim) vivaient en JSON dans `Pillar.content`, invisibles du brand-vault unifié ([ADR-0012](0012-brand-vault-superassets.md)). Le vault marque restait vide.
5. **Phase D mal étiquetée** — `"MESTOR valide (quality scoring)"` ; or selon [PANTHEON.md §2.3](../PANTHEON.md), **Seshat mesure**, Mestor décide.
6. **Export Oracle vide** — `loadOracle()` retournait `[]` en mode live malgré `assemblePresentation()` qui faisait tout le travail.
7. **7 séquences Glory pillar-aligned ignorées** — seul `BRAND` était invoqué (territoire-creatif, en fallback). MANIFESTE-A / OFFRE-V / PLAYBOOK-E / AUDIT-R / ETUDE-T / BRAINSTORM-I / ROADMAP-S existaient en `tools/sequences.ts` mais n'étaient appelés par aucune section Oracle.

## Décision

Formaliser le **pipeline Oracle canonique en 8 phases**, qui invoque les **5 Neteru actifs** dans l'ordre cascade défini par [PANTHEON.md §4](../PANTHEON.md) :

```
Phase 0  THOT pre-flight    → assessCapacity → veto si Oracle > 30% budget reconcilié
Phase A  SESHAT observe      → benchmarks sectoriels + Tarsis weak signals + références
Phase B  MESTOR décide       → priorisation LLM + stratégie par section (framework / sequence / skip)
Phase C  ARTEMIS exécute     → frameworks (28) + 8 séquences Glory pillar-aligned
Phase C' PTAH forge (auto)   → PTAH_MATERIALIZE_BRIEF émis automatiquement par chainGloryToPtah
                                pour les Glory tools avec forgeOutput (cf. sequence-executor.ts:380)
Phase D  SESHAT mesure       → quality scoring post-enrichissement (rôle canonique Seshat)
Phase E  THOT post-flight    → reconcileActual + RECORD_COST agrégé
Phase F  BRAND VAULT         → promotion outputs stables → BrandAsset CANDIDATE → ACTIVE
                                (manifesto, big idea, claim, KV brief — cf. ADR-0012)
```

### Pourquoi cet ordre

- **Phase 0 d'abord** parce que sans capacité Thot, le LLM-burn est inutile (Loi 3 conservation carburant, [APOGEE.md §3](../APOGEE.md)).
- **Phase A avant B** parce que Mestor a besoin du contexte Seshat (benchmarks, weak signals) pour une priorisation pertinente.
- **Phase C contient C' implicitement** — pas d'invocation Ptah explicite ici, car `executeSequence` invoque déjà `chainGloryToPtah` (Phase 9 acquis). Double-forge serait une régression.
- **Phase D Seshat (pas Mestor)** — corriger l'attribution de qualité au bon Neter ; les audits cron (`audit-seshat-coverage.ts`) doivent capter la qualité ici.
- **Phase E avant F** parce que le récompte coût se fait sur l'enrichissement, pas sur la promotion Vault (qui est du DB write léger).
- **Phase F dernière** parce que la qualité doit être ≥ 0.5 pour promouvoir (sinon on pollue le vault avec des partials).

### Imhotep et Anubis

Pas invoqués. Pré-réservés ([ADR-0010](0010-neter-imhotep-crew.md), [ADR-0011](0011-neter-anubis-comms.md)). Quand activés (demand-driven, pas par numéro de phase de refonte), des Phase G (Imhotep — matching humains review) et Phase H (Anubis — diffusion Oracle) seront ajoutées.

### Intents émis par cycle Oracle complet

| Intent kind | Émetteur | Phase |
|---|---|---|
| (read-only) `assessCapacity` | Mestor → Thot direct call | 0 |
| (read-only) `queryReferences`, `runMarketIntelligence` | Mestor → Seshat | A |
| `RUN_ORACLE_FRAMEWORK` × N | Mestor → Artemis commandant | C |
| `INVOKE_GLORY_TOOL` × M | Mestor → glory-tools | C |
| `EXECUTE_GLORY_SEQUENCE` × 8 | Mestor → Artemis sequenceur | C |
| `PTAH_MATERIALIZE_BRIEF` × K | Mestor → Ptah (via chainGloryToPtah) | C' |
| (read-only) `checkCompleteness` | Mestor → strategy-presentation | D |
| `reconcileActual` | Mestor → Thot direct call | E |
| `WRITE_PILLAR` × N | Mestor → pillar-gateway | C/F |
| `LEGACY_BRAND_VAULT_CREATE` × {0..4} | Mestor → brand-vault | F |

### Veto / downgrade

Phase 0 peut **veto** : si capacité reconciled < 30% × estimatedOracleCostUsd. Returns immédiat avec `decision: "VETOED"` et SECTIONS marquées failed sans LLM call.

Phase 0 ne **downgrade** pas pour l'instant — un Oracle dégradé (subset de sections) est complexe à modéliser et risque de produire un livrable ambigu côté client. Si la capacité est insuffisante, on bloque et on demande à l'opérateur de top-up budget.

### Idempotence

- Phase A : best-effort, skip si benchmarks déjà injectés.
- Phase C : cache 1h sur `frameworkResult` ([enrich-oracle.ts:450](../../src/server/services/strategy-presentation/enrich-oracle.ts)).
- Phase F : skip-if-active (BrandAsset ACTIVE déjà existant du même kind → pas de doublon).

### Budget Vault Phase F (kinds promus)

| Kind BrandAsset | Source pillar | Familly |
|---|---|---|
| MANIFESTO | A (founding myth, brand DNA) | INTELLECTUAL |
| BIG_IDEA | D (concept generator) | INTELLECTUAL |
| CLAIM | V (promesse + pricing strategy) | INTELLECTUAL |
| KV_ART_DIRECTION_BRIEF | D (kv-prompts + directionArtistique) | INTELLECTUAL |

Note : les visuels (KV image, moodboard rendu, packshot) restent en `AssetVersion` côté Ptah ; ne sont pas promus en BrandAsset MATERIAL ici (Ptah le fait dans `markCompleted`).

## Conséquences

### Positives

- **5 Neteru actifs visibles dans l'Oracle** — la promesse marketing du panneau `console/oracle/proposition/page.tsx:27` ("Mestor décide, Artemis produit les briefs Glory, Ptah forge les assets, Seshat observe, Thot gouverne") est désormais honorée par le code.
- **Cost p95 SLO mesurable** — Phase E enregistre le coût réel ; les futures runs peuvent veto sur seuil sectoriel.
- **Brand vault rempli automatiquement** — chaque Oracle alimente le vault via Phase F. Les exports / partages futurs peuvent citer les BrandAsset par ID.
- **Ptah forge auto par séquence Glory** — les 8 séquences pillar-aligned déclenchent les forges sans wiring manuel section-par-section.
- **Anti-drift narratif définitif** — phrasings "trio"/"quartet" éliminés, descriptions Intent réécrites.
- **Export PDF/MD live opérationnel** — `loadOracle()` branché sur `assemblePresentation()`.

### Négatives

- **Latence Oracle augmentée** : 8 séquences Glory + pre-flight Thot + post-flight Brand Vault → +30-60s par cycle. Le SLO `latencyBudgetMs: 60000` ([manifest.ts:27](../../src/server/services/strategy-presentation/manifest.ts)) sera serré sur des marques avec beaucoup de sections incomplètes. Mitigation : cache `frameworkResult` 1h + Mestor priorize par impact (Phase B).
- **Mode async Ptah** : les visuels arrivent via webhook (latence externe provider 5-30s). Si l'utilisateur exporte juste après l'enrichissement, la cover Oracle peut ne pas être incluse. Suivi : `OracleSnapshot` pris APRÈS résolution Ptah complète (Phase 9.X follow-up).
- **Cost ≠ FCFA homogénéité** : le Phase 0 convertit `XAF → USD` à un taux fixe (1 USD = 600 FCFA). À terme, devise dynamique via `Strategy.currency` ou Seshat exchange-rate benchmark.
- **Phase F idempotente mais non-versionnée** : si l'opérateur édite manuellement le BrandAsset ACTIVE entre deux cycles Oracle, le second cycle ne détecte pas le drift (skip-if-active). Suivi : `SUPERSEDE_BRAND_ASSET` quand qualité ≥ 0.7 et `lastUpdatedBy=oracle-bridge`.

## Alternatives considérées

1. **Pipeline 5 phases simple (1 par Neter)** — rejeté car la pré/post-flight Thot et la mesure Seshat post-Artemis ne tiennent pas dans une phase Neter "linéaire". Le cycle est 8-phase pour respecter l'architecture cascade.
2. **Forge Ptah explicite après chaque framework** — rejeté. `chainGloryToPtah` existe déjà (Phase 9) et invoque Ptah au bon endroit (après tool exécution Glory). Faire double-forge violerait Loi 1 (conservation altitude — pas de régression silencieuse) en doublant le coût Ptah.
3. **Phase F déclenchée par opérateur (manuel)** — rejeté. Le brand-vault doit se remplir automatiquement (la mission est l'industrialisation). Manuel = drift opérateur.
4. **Mestor valide (Phase D originale)** — rejeté. Mesurer un livrable est canoniquement Seshat ([PANTHEON.md §2.3](../PANTHEON.md)) ; mauvais étiquetage empêche les cron Seshat de capter la qualité.
5. **Veto Thot soft (downgrade subset)** — rejeté Phase 9. À reconsidérer Phase 13+ avec un mode "Oracle Lite" formalisé (sections critiques only).

## Lectures

- [PANTHEON.md](../PANTHEON.md) — fonction de chaque Neter dans la cascade
- [ADR-0009](0009-neter-ptah-forge.md) — Ptah Forge introduction
- [ADR-0012](0012-brand-vault-superassets.md) — BrandVault unifié
- [APOGEE.md §4](../APOGEE.md) — sous-systèmes
- [MISSION.md §4](../MISSION.md) — drift test (l'Oracle DOIT contribuer à superfan accumulation et déplacement Overton)
- `src/server/services/strategy-presentation/enrich-oracle.ts` — implémentation
- `src/server/services/strategy-presentation/brand-vault-bridge.ts` — Phase F
- `src/server/services/strategy-presentation/export-oracle.ts` — assemblage live (fix Phase 7)
