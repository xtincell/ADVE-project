# C1 — 🔴 Doctrine d'échec & EFR

> **Chantier C — chapitre 1.** **Trou comblé :** `CAHIER_DES_CHARGES.md` Ch.1 (échec EFR). **Dépend de :**
> E1 (ICP via `PilotingRegimeChange`), E2 (score 8-dim). **État actuel : ABSENT** (entité). Briques :
> `value-report-generator/` (PDF), `advertis-scorer/`, `Campaign.altitudeRegression` (flag Loi 1, l.907), hash-chain `IntentEmission`.

## C1.0 — Décisions (déjà tranchées au cahier Ch.1 — on spécifie le code)

Obligation **d'effet tracé** (strate ferme = résultat / strate visée = moyens prouvés) ; constat **mécanique**
par score /200 + hash-chain ; **ICP** /100 calculé sur la trace ; 4 recours déterminés par (état × ICP).

## C1.1 — Modèles Prisma

```prisma
enum EfrEtat { ATTEINT PARTIEL ECHEC }
enum EfrRecours { REMEDIATION RENEGOCIATION GESTE_COMMERCIAL SORTIE FAUTE_STRATE_FERME }

model Efr {                         // gelé + chaîné à la signature
  id String @id @default(cuid())
  strategyId String
  s0 Float                         // score départ /200
  palierVise Palier                // (enum E2)
  sStar Float                      // score cible /200
  horizonH DateTime
  seuilPartiel Float @default(0.5) // défaut canonique 50%
  frozenAt DateTime @default(now())
  prevHash String?; selfHash String?
  @@index([strategyId])
}
model ConstatAltitude {            // émis à H, chaîné
  id String @id @default(cuid())
  efrId String; strategyId String
  sH Float; tau Float; etat EfrEtat
  dimensionsSnapshot Json          // 8 dim (E2)
  icp Float                        // /100
  icpBreakdown Json                // 5 composantes
  recours EfrRecours
  emittedAt DateTime @default(now()); prevHash String?; selfHash String?
  @@index([strategyId, emittedAt])
}
```

## C1.2 — ICP (Indice de Co-Pilotage) — 5 composantes (cahier §1.3.1)

| Composante | Poids | Source trace |
|------------|-------|--------------|
| Suivi des recommandations | 40 % | événements *reco émise → suivie/ignorée* (Sia, Notoria, Seshat) |
| Tenue du Régime | 20 % | `PilotingRegimeChange` (E1) vs plancher conseillé |
| Amendements ADVE | 15 % | `OPERATOR_AMEND_PILLAR` acceptés vs **refusés sans motif tracé** |
| Cadence & présence | 15 % | sessions/validations/réponses sous délai (filet C3) |
| Carburant & maintien | 10 % | budget Thot vs conseillé |

> **Prérequis d'instrumentation (friction F-1).** Les événements *reco suivie/ignorée* et *refus
> d'amendement motivé/muet* doivent devenir des **événements de premier rang** (NSP + persistés). Sans
> eux l'ICP est replaidé. À câbler avec E1.

## C1.3 — Intent kinds (governor SIA) + gate

| Kind | Payload | Moment |
|------|---------|--------|
| `FREEZE_EFR` | `{ strategyId, s0, palierVise, sStar, horizonH, seuilPartiel }` | signature |
| `EMIT_CONSTAT_ALTITUDE` | `{ efrId }` | à H (cron) |
| `TRIGGER_EFR_RECOURS` | `{ constatId, recours, operatorId }` | post-constat |

**Gate `STRATE_FERME_INTEGRITY`** : si gate ADVE/RTIS non franchi mais déclaré, QC hors-norme, **hash-chain
rompue**, ou SLA violé (C4) → recours autonome de l'ICP (remédiation gratuite + geste plein), cahier §1.4.3.

## C1.4 — tRPC + UI manual-first

- `efr.freeze` / `efr.getConstat` / `efr.triggerRecours` → `sia.emitIntent()`. `value-report-generator/` produit le **Constat d'Altitude** (variante Value Report) en PDF.
- UI Cockpit : clause EFR (S0/P*/S*/H) + Constat lisible + recours déclenché. Console : suivi flotte.

## C1.5 — Critères d'acceptation

```
[ ] Efr + ConstatAltitude migrés + chaînés (Loi 1) ; gelés à la signature
[ ] ICP calculé depuis la trace (E1) — 5 composantes pondérées ; jamais forfaitaire
[ ] efr-recourse-mechanical.test.ts (HARD) : recours = f(état × ICP) de la matrice §1.4.2, pas négocié
[ ] STRATE_FERME_INTEGRITY engage l'Agence quel que soit l'ICP
[ ] Constat d'Altitude PDF généré à H, hash-chaîné, opposable
```

## C1.6 — Frictions

- **F-C1a.** Instrumentation *reco suivie/ignorée* + *refus motivé/muet* = prérequis ICP (avec E1).
- **F-C1b.** Dépend de E2 (score 8-dim) pour S0/S_H et des seuils palier. Séquence : E1 → E2 → C1.
- **F-C1c.** Le barème de geste/avoir (cahier §1.4.4) s'impute au même compte que les pénalités SLA (C4) — plafonds combinés à arrêter avec C4.
