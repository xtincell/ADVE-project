# Tier 2.1 — Plan de promotion LEGACY_MUTATION → governedProcedure

Auto-généré par `npx tsx scripts/audit-legacy-mutation-candidates.ts`. Ce plan ne migre rien — il **classe par effort** les 60 routers en strangler.

Total routers strangler : **67**
Total mutations à promouvoir : **314**

## Vague 1 — Quick wins (≤2 effort points)

Petits routers avec peu de mutations + 0-1 service. Idéaux pour valider le pattern de promotion.

| router | mutations | services | effort | raison |
|---|---|---|---|---|
| `attribution-router` | 1 | 0 | 2 | 1 mutations, 0 services, Zod schemas |
| `cult-index` | 1 | 1 | 2 | 1 mutations, 1 services, Zod schemas |
| `knowledge-graph` | 1 | 0 | 2 | 1 mutations, 0 services, Zod schemas |
| `market-study` | 1 | 0 | 2 | 1 mutations, 0 services, Zod schemas |
| `matching` | 1 | 1 | 2 | 1 mutations, 1 services, Zod schemas |
| `publication` | 1 | 0 | 2 | 1 mutations, 0 services, Zod schemas |
| `system-config` | 1 | 0 | 2 | 1 mutations, 0 services, Zod schemas |
| `translation` | 1 | 0 | 2 | 1 mutations, 0 services, Zod schemas |
| `upsell` | 1 | 1 | 2 | 1 mutations, 1 services, Zod schemas |

## Vague 2 — Effort moyen (2-5 effort points)

| router | mutations | services | effort | raison |
|---|---|---|---|---|
| `club` | 2 | 0 | 3 | 2 mutations, 0 services, Zod schemas |
| `guidelines` | 2 | 1 | 3 | 2 mutations, 1 services, Zod schemas |
| `guild-tier` | 2 | 1 | 3 | 2 mutations, 1 services, Zod schemas |
| `campaign` | 3 | 1 | 4 | 3 mutations, 1 services, Zod schemas |
| `connectors` | 3 | 1 | 4 | 3 mutations, 1 services, Zod schemas |
| `deliverable-tracking` | 3 | 0 | 4 | 3 mutations, 0 services, Zod schemas |
| `editorial` | 3 | 0 | 4 | 3 mutations, 0 services, Zod schemas |
| `implementation-generator` | 3 | 1 | 4 | 3 mutations, 1 services, Zod schemas |
| `intervention` | 3 | 0 | 4 | 3 mutations, 0 services, Zod schemas |
| `membership` | 3 | 0 | 4 | 3 mutations, 0 services, Zod schemas |
| `mobile-money` | 3 | 1 | 4 | 3 mutations, 1 services, Zod schemas |
| `onboarding` | 3 | 1 | 4 | 3 mutations, 1 services, Zod schemas |
| `quality-review` | 3 | 0 | 4 | 3 mutations, 0 services, Zod schemas |
| `sequence-vault` | 3 | 1 | 4 | 3 mutations, 1 services, Zod schemas |
| `staleness` | 3 | 1 | 4 | 3 mutations, 1 services, Zod schemas |
| `brief-ingest` | 3 | 3 | 4.5 | 3 mutations, 3 services, Zod schemas |
| `strategy-presentation` | 3 | 2 | 4.5 | 3 mutations, 2 services, Zod schemas |
| `advertis-scorer` | 4 | 1 | 5 | 4 mutations, 1 services, Zod schemas |
| `analytics` | 4 | 0 | 5 | 4 mutations, 0 services, Zod schemas |
| `boutique` | 4 | 0 | 5 | 4 mutations, 0 services, Zod schemas |
| `brand-vault` | 4 | 1 | 5 | 4 mutations, 1 services, Zod schemas |
| `commission` | 4 | 1 | 5 | 4 mutations, 1 services, Zod schemas |
| `devotion-ladder` | 4 | 0 | 5 | 4 mutations, 0 services, Zod schemas |
| `event` | 4 | 0 | 5 | 4 mutations, 0 services, Zod schemas |
| `framework` | 4 | 1 | 5 | 4 mutations, 1 services, Zod schemas |
| `guild-org` | 4 | 0 | 5 | 4 mutations, 0 services, Zod schemas |
| `media-buying` | 4 | 0 | 5 | 4 mutations, 0 services, Zod schemas |
| `messaging` | 4 | 0 | 5 | 4 mutations, 0 services, Zod schemas |
| `mestor-router` | 4 | 1 | 5 | 4 mutations, 1 services, Zod schemas |
| `notification` | 4 | 0 | 5 | 4 mutations, 0 services, Zod schemas |
| `social` | 4 | 0 | 5 | 4 mutations, 0 services, Zod schemas |

## Vague 3 — Gros chantiers (>5 effort points)

Routers cross-cutting avec beaucoup de mutations. Réserver à la fin de la phase, après que le pattern est rodé.

| router | mutations | services | effort | raison |
|---|---|---|---|---|
| `client` | 4 | 2 | 5.5 | 4 mutations, 2 services, Zod schemas |
| `strategy` | 4 | 4 | 5.5 | 4 mutations, 4 services, Zod schemas |
| `boot-sequence` | 5 | 1 | 6 | 5 mutations, 1 services, Zod schemas |
| `glory` | 5 | 1 | 6 | 5 mutations, 1 services, Zod schemas |
| `learning` | 5 | 0 | 6 | 5 mutations, 0 services, Zod schemas |
| `market-intelligence` | 5 | 1 | 6 | 5 mutations, 1 services, Zod schemas |
| `pr` | 5 | 0 | 6 | 5 mutations, 0 services, Zod schemas |
| `signal` | 5 | 1 | 6 | 5 mutations, 1 services, Zod schemas |
| `monetization` | 5 | 3 | 6.5 | 5 mutations, 3 services, Zod schemas |
| `contract` | 6 | 0 | 7 | 6 mutations, 0 services, Zod schemas |
| `operator` | 6 | 0 | 7 | 6 mutations, 0 services, Zod schemas |
| `guilde` | 8 | 0 | 9 | 8 mutations, 0 services, Zod schemas |
| `ingestion` | 8 | 1 | 9 | 8 mutations, 1 services, Zod schemas |
| `crm` | 9 | 1 | 10 | 9 mutations, 1 services, Zod schemas |
| `process` | 9 | 1 | 10 | 9 mutations, 1 services, Zod schemas |
| `mission` | 9 | 6 | 10.5 | 9 mutations, 6 services, Zod schemas |
| `quick-intake` | 10 | 2 | 11.5 | 10 mutations, 2 services, Zod schemas |
| `driver` | 11 | 1 | 12 | 11 mutations, 1 services, Zod schemas |
| `notoria` | 11 | 1 | 12 | 11 mutations, 1 services, Zod schemas |
| `pillar` | 21 | 7 | 22.5 | 21 mutations, 7 services, Zod schemas |
| `campaign-manager` | 50 | 2 | 51.5 | 50 mutations, 2 services, Zod schemas |

---

**Pattern de promotion par mutation** :

1. Ajouter une Intent kind dans `src/server/governance/intent-kinds.ts`.
2. Ajouter le SLO correspondant dans `slos.ts`.
3. Réécrire la mutation en `governedProcedure("<KIND>", inputSchema)` avec un handler Artemis.
4. Ajouter un test gouvernance `tests/governance/<router>.governance.test.ts` qui assert la création d'IntentEmission row.
5. Régénérer `INTENT-CATALOG.md` (`npm run codemap:gen` + `gen-intent-catalog`).