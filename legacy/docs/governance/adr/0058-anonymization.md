# ADR-0052-F — Multi-tenant anonymization k-anonymity (`economics.activityMargins` MVP → PRODUCTION)

**Date** : 2026-05-06
**Statut** : Accepted (doctrine actée — k-anonymat k≥5, opt-in désactivé par défaut, irrévocable sur l'agrégé ; contractualisée DPA §2 + CGU §2 v6.25.19)
**Note de décision (2026-06-12)** : Décision actée 2026-06-12 : la DÉCISION d'architecture est prise et désormais opposable (pages DPA/CGU publiées). L'enforcement runtime du pool accompagne la promotion PRODUCTION du Cluster F (trigger RESIDUAL-DEBT §Phase 19) — aucun pattern ne quitte un tenant d'ici là (default-deny).
**Phase** : 19 — Campaign tracker Cluster F promotion
**Parent** : ADR-0052 v2 §16 ligne #6 + Cluster F — Économie agence

## Contexte

Vague 3 a shippé `economics.activityMargins` en mode `PARTIAL/MVP` avec k-anonymity k≥5 inline (agrégation directe sur table CampaignAction filtrée par bucket). La promotion `MVP → PRODUCTION` exige un **data lake séparé non-joinable** aux strategy IDs — désanonymisation impossible par construction (RGPD compliance).

## Décision

### §1 — Architecture cible

Créer un data lake dédié `agency-economics-aggregates` :
- **Schéma séparé** (Prisma : nouveau `model AgencyEconomicsAggregate`) — pas de FK vers Strategy/Campaign/CampaignAction
- **Job batch** (cron mensuel) qui lit les CampaignAction + agrège selon `(category, subType, market, period)` × tenant — output uniquement quand bucket size ≥ 5 tenants distincts
- **API READ-ONLY** depuis Console UPgraders : `recomputeAgencyActivityMargins` lit uniquement le data lake, jamais les tables source

### §2 — Modèle Prisma

```prisma
model AgencyEconomicsAggregate {
  id              String   @id @default(cuid())
  category        String   // ATL | BTL | TTL
  subType         String?
  market          String?  // ISO-2 country code
  periodStart     DateTime
  periodEnd       DateTime
  tenantBucketSize Int     // k-anonymity check : doit être ≥ 5 sinon rejection au job
  meanMargin      Float
  variance        Float
  samplesCount    Int
  computedAt      DateTime @default(now())

  @@index([category, market, periodStart])
  @@unique([category, subType, market, periodStart, periodEnd])
}
```

Aucune relation Prisma vers `Strategy`, `Campaign`, `CampaignAction` — désanonymisation par jointure interdite par construction.

### §3 — Job batch

`scripts/aggregate-agency-economics.ts` (cron mensuel via `THOT_AGGREGATE_ECONOMICS_BATCH` Intent kind nouveau) :
1. Pour chaque triplet `(category, subType, market, periodMonth)` des 12 derniers mois :
   - Compter tenants distincts ayant des CampaignAction dans ce bucket
   - Si `tenantCount ≥ 5` → calculer `meanMargin`, `variance`, `samplesCount`, persister `AgencyEconomicsAggregate`
   - Si `tenantCount < 5` → skip silencieux (pas d'entrée créée — bucket invisible)

### §4 — Read-only access

Le service `agency-economics.ts` ([recomputeAgencyActivityMargins](../../../src/server/services/campaign-tracker/agency-economics.ts)) est refactoré pour **lire uniquement `AgencyEconomicsAggregate`** au lieu de `CampaignAction` directement. Plus de risque de désanonymisation par construction.

### §5 — RGPD audit + logging

Tout accès à la fonction (router tRPC `recomputeAgencyActivityMargins`) :
- Hash-chained intent log via `auditedProcedure("campaign-tracker")` (déjà câblé)
- Restricted via `requireRole("UPGRADERS_LEAD")` (à câbler dans le router — actuellement absent)
- Log RGPD séparé `AgencyEconomicsAccessLog` (qui a vu quoi, quand)

### §6 — Quality gate de promotion

`MVP → PRODUCTION` admis quand :
1. Modèle `AgencyEconomicsAggregate` créé + migration Prisma déployée
2. Cron batch opérationnel + premiers buckets calculés (validation manuelle)
3. Service `agency-economics.ts` refactoré read-only depuis le data lake
4. RBAC `requireRole("UPGRADERS_LEAD")` câblé sur le router
5. Audit RGPD revue par direction + DPO

## Conséquences

### Positives
- **Désanonymisation impossible par construction** (pas de FK)
- Compatible RGPD (right to erasure : strategies suppression n'affecte pas le data lake — hash anonyme)
- Performance (data lake pré-agrégé : query <1s vs scan + groupBy)

### Négatives
- Latence ingestion (~1 mois) — buckets nouvellement saturés visibles avec lag
- Coût stockage data lake (négligeable : N buckets × 12 mois rolling)
- Migration ADR-tagged : si critères changent (k passé à 10), invalidation + recompute du data lake

## Open work
- Schema Prisma : `+model AgencyEconomicsAggregate +enum AgencyEconomicsCategory ?`
- `scripts/aggregate-agency-economics.ts` (cron batch)
- Intent kind nouveau : `THOT_AGGREGATE_ECONOMICS_BATCH` (governor THOT, async, cron-triggered)
- Refactor `recomputeAgencyActivityMargins` lecture data lake
- RBAC gate `requireRole` dans le router (actuellement manquant — résidu connu)
- Audit RGPD + DPO sign-off
