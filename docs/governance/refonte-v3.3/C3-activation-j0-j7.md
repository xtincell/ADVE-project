# C3 — 🔴 Parcours d'activation (first-run J0→J7)

> **Chantier C — chapitre 3.** **Trou comblé :** `CAHIER_DES_CHARGES.md` Ch.3. **Dépend de :** E1 (régime
> ASSISTÉ). **État actuel : ABSENT.** Extension : `boot-sequence/` (`getState/start/advance/complete` — machine d'amorçage).

## C3.0 — Décisions (cahier Ch.3)

Séquence non-sautable **Launchpad → premier Oracle → ignition → premier vol** ; **aha moment** = noyau ADVE
formulé **dans la session d'ignition** (J0), `time-to-aha < 1 session` ; **régime défaut ASSISTÉ** (E1) ;
**J0→J7** à livrables garantis + **filet anti-abandon** tracé.

## C3.1 — Modèles Prisma

```prisma
enum ActivationJalon { IGNITION PREMIER_BRIEF PREMIER_ASSET PREMIERE_ACTION BILAN_SANTE PREMIER_VOL }
enum ActivationStatus { PENDING DONE SKIPPED }

model ActivationJourney {
  id String @id @default(cuid())
  strategyId String @unique
  startedAt DateTime @default(now())
  ahaAt DateTime?                 // horodatage time-to-aha
  steps ActivationStep[]
}
model ActivationStep {
  id String @id @default(cuid())
  journeyId String
  day Int                          // 0..7
  jalon ActivationJalon
  planOuvert PlanOntologique       // (enum E1)
  livrable String
  status ActivationStatus @default(PENDING)
  silenceRelanceAt DateTime?       // filet anti-abandon (J2/J4/J6)
  @@index([journeyId, day])
}
```

## C3.2 — Surface (étendre boot-sequence, ne pas doubler)

`boot-sequence/` orchestre déjà l'amorçage ADVE à l'ignition → y brancher la **restitution du noyau ADVE à
l'écran (aha moment)** + l'enregistrement `ahaAt`. La séquence J0-J7 (cahier §3.5) ouvre **un plan par jour**.

## C3.3 — Filet anti-abandon (cahier §3.4) — tracé, nourrit l'ICP (C1)

- **Silence J2** → relance Sia + notification (NSP/Anubis).
- **Silence J4** → 2ᵉ relance + (tier Pro+) contact opérateur Console.
- **Silence J6** → alerte churn Console (C7).
Chaque silence est un **événement de premier rang** (composante « cadence & présence » de l'ICP).

## C3.4 — Intent + UI manual-first

- Intents (SIA) : `START_ACTIVATION_JOURNEY`, `ADVANCE_ACTIVATION_STEP`, `RECORD_AHA`. Filet = cron qui émet les relances.
- Régime au décollage = **ASSISTÉ** via E1 (`SET_PILOTING_REGIME` au seed). Plancher ADVE dur.
- UI Cockpit : checklist « premier vol complet » (cahier §3.6) — 7 cases ; livrables visibles.

## C3.5 — Critères d'acceptation

```
[ ] ActivationJourney créé à l'ignition ; jalons non-sautables (hash-chaînés)
[ ] aha moment = noyau ADVE restitué J0 ; ahaAt < fin de session (métrique time-to-aha)
[ ] régime ASSISTÉ par défaut (E1) ; plancher ADVE jamais franchi
[ ] filet J2/J4/J6 émis + tracé → composante ICP « cadence & présence »
[ ] checklist 7 cases → ACTIVATION RÉUSSIE hash-chaînée
```

## C3.6 — Frictions

- **F-C3a.** Dépend de E1 (régime). Sans E1, « ASSISTÉ par défaut » n'a pas de support de données.
- **F-C3b.** Le contenu du premier Oracle (PDF léger) réutilise `value-report-generator/intake-pdf.ts` — ne pas doubler.
