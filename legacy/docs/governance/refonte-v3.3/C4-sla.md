# C4 — 🔴 SLA & temps de cycle par livrable

> **Chantier C — chapitre 4.** **Trou comblé :** `CAHIER_DES_CHARGES.md` Ch.4. **Dépend de :** C1 (pénalités
> ↔ avoir EFR). **État actuel : PARTIEL.** `sla-tracker/` ✅ (`checkSla(missionId)`, `getOverdueMissions()`,
> `calculateSlaMetrics(operatorId)`, `SlaAlert`, `SlaMetrics`) — **mission-scopé**, pas de table de politique.

## C4.0 — Décisions (cahier Ch.4)

Table SLA par **livrable × tier × zone** ; distinction **auto** (Glory/Sève, délai machine) vs **crew**
(Hub-Escrow, délai humain) ; **pénalités** barème + plafond, **cumulables** avec l'avoir EFR (C1) ;
**SLA dégradé** sous charge (file, priorité par tier).

## C4.1 — Modèles Prisma

```prisma
enum SlaSurface { AUTO CREW }
model SlaPolicy {                          // config, pas en dur
  id String @id @default(cuid())
  deliverableKind String                   // BrandAsset.kind ou type livrable
  tier String
  zoneCode String?                         // null = défaut zone
  surface SlaSurface
  cycleTimeHours Int                       // temps de cycle cible
  penaltyRatePerDay Float                  // barème retard
  penaltyCapRatio Float                    // plafond
  @@unique([deliverableKind, tier, zoneCode])
}
model SlaBreach {                          // événement, s'impute au compte d'avoir (C1)
  id String @id @default(cuid())
  missionId String; policyId String
  dueAt DateTime; breachedAt DateTime
  penaltyAmount Float
  @@index([missionId])
}
```

## C4.2 — Surface (étendre sla-tracker)

`sla-tracker/checkSla` consomme désormais `SlaPolicy` (au lieu d'un délai implicite) selon (kind × tier × zone)
et la **surface** (auto vs crew). `getOverdueMissions` alimente `SlaBreach`. Dégradation : file + priorité par tier.

## C4.3 — Articulation avec C1 (cahier §1.4.4 / §4.3)

Pénalités SLA = mécanisme **distinct et cumulable** avec l'avoir EFR ; **même compte d'avoir** ; plafonds
combinés à arrêter ici. La **rupture SLA** déclenche aussi `STRATE_FERME_INTEGRITY` (C1.3).

## C4.4 — Intent + UI

- Intents : `UPSERT_SLA_POLICY` (governor INFRASTRUCTURE/SIA, config opérateur), `RECORD_SLA_BREACH` (auto, cron).
- UI Console : table SLA éditable (livrable × tier × zone) + dashboard breaches. Cockpit : délai annoncé par livrable.

## C4.5 — Critères d'acceptation

```
[ ] SlaPolicy par (deliverableKind × tier × zone × surface) ; aucun délai en dur
[ ] auto vs crew distingués ; crew via Hub-Escrow
[ ] SlaBreach imputé au compte d'avoir C1 ; plafonds combinés définis
[ ] rupture SLA → STRATE_FERME_INTEGRITY (C1)
[ ] SLA dégradé : file + priorité par tier sous charge
```

## C4.6 — Frictions

- **F-C4a.** Le SLO interne (p95 latence des handlers, déjà présent) ≠ SLA contractuel par livrable. Ne pas confondre.
- **F-C4b.** Délais auto dépendent de la jauge Thot (Loi 3) ; délais crew du Hub-Escrow (matching Imhotep).
