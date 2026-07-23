# ADR-0176 — ROLLBACK_PILLAR : moteur de compensation RÉEL (Loi 1 a des dents)

- **Status** : Accepted
- **Date** : 2026-07-22
- **Phase** : Audit adversarial « TOUT » (bloc G)
- **Depends on** : ADR-0124 (spine d'émission), keystone C5 (écriture pilier via gateway), ADR-0167 (moteur de trajectoire — même patron « déclaré/câblé »)
- **Supersedes** : —

## Contexte

`ROLLBACK_PILLAR` était le compensateur déclaré de `WRITE_PILLAR`
(`COMPENSATING_MAP`, `INTENT_KINDS`, `slos.ts`) — mais **sans handler**. Le
bouton « Compenser » de la console (`governance.compensate`) n'enregistrait
qu'une ligne d'audit (`executed:false`) : rien n'était jamais restauré. La
**Loi 1 d'APOGEE (conservation d'altitude — pas de régression silencieuse)**
était sans dents pour les écritures pilier, alors même que le gateway
mentionne « Rollback available for 24h » dans son propre code.

Diagnostic à l'audit : la mécanique de restauration EXISTE en germe — chaque
écriture pilier passe par le gateway, qui snapshotte le contenu **PRÉ-écriture**
dans une `PillarVersion` (`pillar-versioning/createVersion`). Il manquait deux
choses : (1) un lien de la `PillarVersion` vers l'`IntentEmission` qui l'a
produite (pour restaurer l'état d'avant UN intent précis, pas « la dernière
version » devinée) ; (2) un handler qui réécrit ce contenu **via le gateway**
(C5), et un câblage `compensate → emitIntent → handler`.

## Décision

**Bâtir la restauration réelle**, précise et gouvernée :

1. **Lien de version** — `PillarVersion.intentId String?` (additif nullable,
   migration `20260722220000`, backfill-safe + index). Le gateway stampe
   l'`IntentEmission` courante (`author.intentId`, alimenté par `ctx.intentId`
   de `governedProcedure`) sur la version créée. La `PillarVersion(intentId=X)`
   porte le contenu **d'avant** l'écriture X = exactement l'état à restaurer.

2. **Handler réel** — `pillar-gateway/rollback.ts` (`rollbackPillar`). Résout
   le pilier, lit la `PillarVersion(intentId=compensatedFrom)`, et **réécrit son
   `content` via `writePillarAndScore`** (le gateway, C5) : donc écriture
   gouvernée + scorée + cascade de staleness, et **undo forward-moving**
   (l'historique est préservé — la restauration est elle-même une nouvelle
   version, ré-annulable). Déterministe, zéro LLM.

3. **Refus honnête** — si aucun instantané n'est lié (écriture antérieure au
   suivi `intentId`), on **refuse** avec un message clair plutôt que deviner
   « la dernière version » (undo du mauvais écrasement = corruption
   silencieuse). Jamais de restauration à l'aveugle (interdit NEFER n°3 —
   variante « ne pas corrompre »).

4. **Câblage** — union `Intent` (`ROLLBACK_PILLAR`), case commandant → handler,
   case `intentTouchesPillars` (retourne `[key]` — le switch sans `default`
   fait que `tsc` PROUVE le câblage), propagation du `key` d'origine dans
   `buildCompensatingIntent`, et `governance.compensate` élargit son ensemble
   de compensateurs dispatchables (`DISPATCHABLE_COMPENSATORS =
   PALIER_TRANSITION_KINDS ∪ {ROLLBACK_PILLAR}`) → `executed:true` au succès.

## Conséquences

- La Loi 1 a des dents pour les écritures pilier gouvernées : le bouton
  « Compenser » RESTAURE réellement (ou refuse honnêtement), plus de mensonge
  UI `executed:false`.
- **Cap APOGEE 7/7 préservé** (sous-domaine de Mestor, aucun nouveau Neter),
  0 LLM, C5 respecté (restauration via gateway), spine d'émission inchangé.
- Tests anti-drift : `rollback-pillar-wired.test.ts` (HARD — déclaré + SLO +
  compensateur + dispatché + handler restaure via gateway / refuse honnêtement
  / propage `key`).
- **Restants tracés** (RESIDUAL-DEBT §G) : les autres compensateurs sans
  handler restent audit-only avec un plan — `ROLLBACK_ADVE` (multi-piliers),
  `ROLLBACK_RTIS_CASCADE`, `DISCARD/REVERT_RECOMMENDATIONS` (état reco). Le
  `pillar.rollbackVersion` opérateur (restauration vers une version choisie)
  reste un bare-write C5-allowlisté sans émission → à router via le gateway +
  émission (rattaché au chantier B2 « gouverner les mutations directes »).
