# STRANGLER ROUTERS AUDIT — Phase 0 migration roadmap

Total : **70 routers strangler-active** détectés.

Auto-généré par `scripts/audit-strangler-routers.ts`. Cf. RESIDUAL-DEBT §Phase 0.

## Répartition par effort

| Effort | Count | Mutations totales |
|---|---|---|
| trivial | 32 | 56 |
| moderate | 32 | 173 |
| significant | 6 | 124 |

## Significant effort (≥10 mutations)

### `campaign-manager.ts` — 50 mutations
- Services importés : `campaign-manager`
- Intent kinds candidats : _aucun — Intent kinds à créer_

### `pillar.ts` — 25 mutations
- Services importés : `cross-validator`, `pillar-versioning`, `staleness-propagator`, `advertis-scorer`, `artemis`
- Intent kinds candidats : _aucun — Intent kinds à créer_

### `anubis.ts` — 15 mutations
- Services importés : `anubis`
- Intent kinds candidats : 21 kinds disponibles (ANUBIS_DRAFT_COMMS_PLAN, ANUBIS_BROADCAST_MESSAGE, ANUBIS_BUY_AD_INVENTORY…)

### `quick-intake.ts` — 12 mutations
- Services importés : `quick-intake`
- Intent kinds candidats : _aucun — Intent kinds à créer_

### `driver.ts` — 11 mutations
- Services importés : `driver-engine`
- Intent kinds candidats : _aucun — Intent kinds à créer_

### `notoria.ts` — 11 mutations
- Services importés : `notoria`
- Intent kinds candidats : _aucun — Intent kinds à créer_


## Moderate effort (4-9 mutations)

- `crm.ts` (9 mutations) — 1 services importés, 0 Intent kinds candidats
- `mission.ts` (9 mutations) — 6 services importés, 0 Intent kinds candidats
- `process.ts` (9 mutations) — 1 services importés, 0 Intent kinds candidats
- `brand-vault.ts` (8 mutations) — 2 services importés, 0 Intent kinds candidats
- `guilde.ts` (8 mutations) — 0 services importés, 0 Intent kinds candidats
- `ingestion.ts` (8 mutations) — 1 services importés, 0 Intent kinds candidats
- `notification.ts` (7 mutations) — 1 services importés, 21 Intent kinds candidats
- `strategy.ts` (7 mutations) — 3 services importés, 0 Intent kinds candidats
- `contract.ts` (6 mutations) — 0 services importés, 0 Intent kinds candidats
- `operator.ts` (6 mutations) — 0 services importés, 0 Intent kinds candidats
- `boot-sequence.ts` (5 mutations) — 1 services importés, 0 Intent kinds candidats
- `glory.ts` (5 mutations) — 1 services importés, 0 Intent kinds candidats
- `imhotep.ts` (5 mutations) — 1 services importés, 8 Intent kinds candidats
- `learning.ts` (5 mutations) — 0 services importés, 0 Intent kinds candidats
- `market-intelligence.ts` (5 mutations) — 1 services importés, 0 Intent kinds candidats
- `monetization.ts` (5 mutations) — 3 services importés, 0 Intent kinds candidats
- `pr.ts` (5 mutations) — 0 services importés, 0 Intent kinds candidats
- `signal.ts` (5 mutations) — 1 services importés, 0 Intent kinds candidats
- `advertis-scorer.ts` (4 mutations) — 1 services importés, 0 Intent kinds candidats
- `analytics.ts` (4 mutations) — 0 services importés, 0 Intent kinds candidats
- `boutique.ts` (4 mutations) — 0 services importés, 0 Intent kinds candidats
- `client.ts` (4 mutations) — 0 services importés, 0 Intent kinds candidats
- `commission.ts` (4 mutations) — 1 services importés, 0 Intent kinds candidats
- `devotion-ladder.ts` (4 mutations) — 0 services importés, 0 Intent kinds candidats
- `event.ts` (4 mutations) — 0 services importés, 0 Intent kinds candidats
- `framework.ts` (4 mutations) — 1 services importés, 0 Intent kinds candidats
- `guild-org.ts` (4 mutations) — 0 services importés, 0 Intent kinds candidats
- `media-buying.ts` (4 mutations) — 0 services importés, 0 Intent kinds candidats
- `messaging.ts` (4 mutations) — 0 services importés, 0 Intent kinds candidats
- `mestor-router.ts` (4 mutations) — 0 services importés, 0 Intent kinds candidats
- `social.ts` (4 mutations) — 0 services importés, 0 Intent kinds candidats
- `strategy-presentation.ts` (4 mutations) — 2 services importés, 0 Intent kinds candidats

## Trivial effort (≤3 mutations)

- `brief-ingest.ts` (3 mutations) — 1 services, 0 kinds
- `campaign.ts` (3 mutations) — 0 services, 0 kinds
- `connectors.ts` (3 mutations) — 1 services, 0 kinds
- `deliverable-tracking.ts` (3 mutations) — 0 services, 0 kinds
- `editorial.ts` (3 mutations) — 0 services, 0 kinds
- `implementation-generator.ts` (3 mutations) — 1 services, 0 kinds
- `intervention.ts` (3 mutations) — 0 services, 0 kinds
- `membership.ts` (3 mutations) — 0 services, 0 kinds
- `mobile-money.ts` (3 mutations) — 1 services, 0 kinds
- `onboarding.ts` (3 mutations) — 1 services, 0 kinds
- `quality-review.ts` (3 mutations) — 0 services, 0 kinds
- `sequence-vault.ts` (3 mutations) — 1 services, 0 kinds
- `staleness.ts` (3 mutations) — 1 services, 0 kinds
- `club.ts` (2 mutations) — 0 services, 0 kinds
- `guidelines.ts` (2 mutations) — 1 services, 0 kinds
- `guild-tier.ts` (2 mutations) — 1 services, 0 kinds
- `ptah.ts` (2 mutations) — 1 services, 3 kinds
- `attribution-router.ts` (1 mutations) — 0 services, 0 kinds
- `cult-index.ts` (1 mutations) — 1 services, 0 kinds
- `knowledge-graph.ts` (1 mutations) — 0 services, 0 kinds
- `market-study.ts` (1 mutations) — 0 services, 0 kinds
- `matching.ts` (1 mutations) — 1 services, 0 kinds
- `publication.ts` (1 mutations) — 0 services, 0 kinds
- `system-config.ts` (1 mutations) — 0 services, 0 kinds
- `translation.ts` (1 mutations) — 0 services, 0 kinds
- `upsell.ts` (1 mutations) — 1 services, 0 kinds
- `ambassador.ts` (0 mutations) — 0 services, 0 kinds
- `cockpit-router.ts` (0 mutations) — 0 services, 0 kinds
- `cohort.ts` (0 mutations) — 0 services, 0 kinds
- `market-pricing.ts` (0 mutations) — 1 services, 0 kinds
- `source-insights.ts` (0 mutations) — 0 services, 0 kinds
- `superfan.ts` (0 mutations) — 0 services, 0 kinds

---

**Total routers strangler-active** : 70
**Total mutations à migrer** : 353
**Intent kinds couvrant les routers** : 32
