# E1 — PilotingRegime (le verrou transverse)

> **Chantier B — entité-socle.** **Trou comblé :** Livre de Bord II.C + `CAHIER_DES_CHARGES.md` Ch.1 §1.3
> (friction F-1, prérequis bloquant à la vente sous EFR), Ch.3 §3.3 (régime au décollage), Ch.8 (régimes
> par marque). **Ancrage canon :** Pont de commande A.1-A.5 (régime 5 crans, plancher, axe destinataire),
> Livre de Bord mécanique 5, Blueprint §5.6 (Notoria propose, l'humain dispose). **État actuel : ABSENT** (vérifié).

## E1.0 — Décisions tranchées

1. **5 crans de délégation**, par **plan** (les 5 plans ontologiques Blueprint §0.10). Crans proposés :
   `MANUEL · ASSISTÉ · SUPERVISÉ · DÉLÉGUÉ · AUTONOME`. *(labels exacts à confirmer — friction F-E1.)*
2. **Régime par défaut = ASSISTÉ** sur tous les plans (cahier §3.3).
3. **Plancher de sécurité** par plan : cran minimal sous lequel le système ne descend pas seul.
4. **Axe destinataire** : à qui s'adresse la délégation (founder / opérateur / crew).
5. **Plancher dur ADVE** : le noyau ADVE ne se modifie **que** par `OPERATOR_AMEND_PILLAR`, **quel que soit
   le cran**, même AUTONOME (Blueprint §5.6). Gate `ADVE_FLOOR`.

*Alt. écartée : un seul régime global par marque* — perd la granularité par plan, cœur de l'innovation n°5.

## E1.1 — Modèle Prisma

```prisma
enum PlanOntologique { INTELLECTUEL MATERIEL OPERATIONNEL COMMERCIAL ANALYTIQUE }
enum RegimeCran      { MANUEL ASSISTE SUPERVISE DELEGUE AUTONOME }   // labels à confirmer F-E1
enum RegimeAxe       { FOUNDER OPERATEUR CREW }

model PilotingRegime {
  id              String          @id @default(cuid())
  strategyId      String
  plan            PlanOntologique
  cran            RegimeCran      @default(ASSISTE)
  plancherCran    RegimeCran      @default(MANUEL)   // plancher de sécurité
  axe             RegimeAxe       @default(FOUNDER)
  setByOperatorId String
  setAt           DateTime        @default(now())
  strategy        Strategy        @relation(fields: [strategyId], references: [id])
  changes         PilotingRegimeChange[]
  @@unique([strategyId, plan])           // un régime courant par (marque × plan)
  @@index([strategyId])
}

model PilotingRegimeChange {              // historique → nourrit l'ICP (C1)
  id          String     @id @default(cuid())
  regimeId    String
  fromCran    RegimeCran
  toCran      RegimeCran
  reason      String?
  byOperatorId String
  at          DateTime   @default(now())
  regime      PilotingRegime @relation(fields: [regimeId], references: [id])
  @@index([regimeId, at])
}
```

## E1.2 — Intent kinds (governor SIA) + payload

| Kind | Payload (Zod) | Sync | Gate pre-flight |
|------|---------------|------|-----------------|
| `SET_PILOTING_REGIME` | `{ strategyId, plan, cran, axe?, operatorId }` | sync | `ADVE_FLOOR` (refuse cran>plancher sur le plan INTELLECTUEL si viserait l'auto-amend ADVE) |
| `OVERRIDE_REGIME_FLOOR` | `{ strategyId, plan, newPlancherCran, operatorId, justification }` | sync | journalisé |

Émission via `sia.emitIntent()`. Handler : `src/server/services/piloting-regime/handler.ts` →
upsert `PilotingRegime` + append `PilotingRegimeChange`.

## E1.3 — Gate `ADVE_FLOOR` (Sia pre-flight)

Refuse **tout** Intent qui muterait un pilier ADVE hors `OPERATOR_AMEND_PILLAR`, indépendamment du cran.
Vit dans `src/server/services/sia/gates/adve-floor.ts` (ex-`mestor/gates/`, cf. R1).

## E1.4 — tRPC + UI manual-first (ADR-0060)

- `pilotingRegime.get(strategyId)` — `operatorProcedure` (lecture).
- `pilotingRegime.set(...)` — `governedProcedure` → `sia.emitIntent('SET_PILOTING_REGIME')`.
- **UI Cockpit** : un curseur 5 crans **par plan** (5 sliders) + indicateur de plancher + badge axe. Manuel par construction (le founder règle).
- **UI Console** : lecture du régime par marque (pour le ratio opérateurs/flotte, C7).

## E1.5 — Critères d'acceptation

```
[ ] model PilotingRegime + PilotingRegimeChange migrés (Prisma migrate, pas db push)
[ ] SET_PILOTING_REGIME via sia.emitIntent ; @@unique([strategyId, plan]) respecté
[ ] défaut ASSISTÉ à la création de Strategy (hook seed)
[ ] piloting-regime-floor.test.ts (HARD) : AUTONOME ne franchit jamais le plancher ADVE
[ ] PilotingRegimeChange append-only ; lisible par l'ICP (C1)
[ ] UI : 5 sliders par plan ; parity manuelle OK
```

## E1.6 — Frictions

- **F-E1.** Les **labels exacts des 5 crans** et l'axe destinataire viennent du *Pont de commande A.1-A.4* (hors repo). Proposition ci-dessus à **confirmer** avant migration — point de friction doctrine↔exécution, remonté, non patché.
- **F-1 (rappelé).** Sans `PilotingRegimeChange`, l'ICP (C1) n'est pas calculable → EFR invendable. **E1 est prérequis dur de C1.**
- **Dépendance R1 :** le gate vit sous `sia/gates/` — livrer après R1, ou sous `mestor/gates/` puis déplacer en L1.
