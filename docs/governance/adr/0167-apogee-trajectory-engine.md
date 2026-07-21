# ADR-0167 — Moteur de trajectoire APOGEE (transitions de palier gouvernées)

- **Status** : Accepted
- **Date** : 2026-07-21
- **Phase** : Post-audit « déclaré jamais câblé » (suite du mandat « gère le tout »)
- **Depends on** : ADR-0086 (score canonique + gate `PALIER_PROMOTION_PROOFS` planifié), ADR-0126 (plafond scale-aware CULTE/ICONE), ADR-0085 (décision opérateur, pas d'auto-write sur signal), ADR-0124 (spine d'émission hash-chaîné), ADR-0139 (diagnostic du piège STUB `PROMOTE_SEQUENCE_LIFECYCLE`)
- **Supersedes** : —

## Contexte

La Fusée pilote les marques sur 6 paliers de maturité canoniques (`src/domain/brand-tier.ts`) :
**LATENT → FRAGILE → ORDINAIRE → FORTE → CULTE → ICONE**. Les 10 Intent kinds censés faire
*transiter* ce palier (`PROMOTE_LATENT_TO_FRAGILE`…`PROMOTE_CULTE_TO_ICONE` + 5 `DEMOTE_*`) étaient
**déclarés au registre mais jamais câblés** — preuves :

1. Déclarés dans `intent-kinds.ts:231-235` / `:253-257` (governor MESTOR), SLOs présents
   (`slos.ts:167-179`), mapping compensateur présent (`compensating-intents.ts:27-31`).
2. **Absents** de l'union `Intent` (`mestor/intents.ts`), du dispatcher `commandant.execute`
   (`artemis/commandant.ts`), et du helper `intentTouchesPillars` — donc **impossibles à émettre**
   (recensés à l'audit registre↔dispatch, RESIDUAL-DEBT §"Intents déclarés jamais câblés").

Conséquence : la **Loi 1 d'APOGEE — « conservation de l'altitude »** (« aucun Intent ne réduit
*silencieusement* l'altitude accumulée… explicitement détrônée via un Intent compensateur ; pas de
régression invisible », STATE_FINAL_BLUEPRINT §Loi 1) n'avait **aucune dent**. Le palier était
**dérivé du score à la lecture** (`classifyTier(composite)`) partout — donc une baisse de score
rétrogradait le palier affiché *en silence*, et aucune reconnaissance de palier n'était durable ni
auditée. Le gate `PALIER_PROMOTION_PROOFS` planifié par ADR-0086 §PALIER_PROMOTION_PROOFS n'existait pas.

Le risque à éviter : reproduire le piège du STUB `PROMOTE_SEQUENCE_LIFECYCLE` (ADR-0139) — un handler
qui *logge* une transition dans `IntentEmission` sans rien changer à l'état. Une cérémonie sans effet.

## Décision

### 1. Palier officiel persisté (ratchet) — `Strategy.apogeeTier`

4 colonnes additives nullable sur `Strategy` (`prisma/schema.prisma`, migration
`20260721140000_adr0167_apogee_tier_additive`, backfill-safe) : `apogeeTier String?` (validé
`BrandTierSchema` au write — pas d'enum Prisma, cohérent avec `ScoreSnapshot.classification`), +
`apogeeTierSetAt` / `apogeeTierReason` / `apogeeTierBy`.

`apogeeTier` = **altitude de record**, ratchet mû *uniquement* par une transition gouvernée. Nouveau
helper pur `effectiveTier({apogeeTier, composite})` (`src/domain/brand-tier.ts`) = officiel s'il est
posé, sinon `classifyTier(composite)` dérivé. **`null` (toutes les marques existantes) ⇒ comportement
dérivé inchangé.** C'est ce qui donne des dents à la Loi 1 : une baisse de score ne rétrograde plus le
palier officiel — seul un `DEMOTE` explicite le fait.

### 2. Gate `PALIER_PROMOTION_PROOFS` (réalise ADR-0086)

`src/server/services/mestor/gates/palier-promotion-proofs.ts` — cœur pur `evaluatePalierTransition`
(variance 0, testable sans DB) + wrapper async `palierPromotionProofsGate` (lecture SEULE, ne ré-score
jamais). Branché en pré-flight de `emitIntent` (`preflightPalierPromotionProofs`, miroir de
`preflightCalibrationSnapshot`). Règles :

- **fromTier** = palier effectif courant (`expectedFromTier` optionnel = concurrence optimiste) ;
- **one-step** adjacent uniquement ;
- **PROMOTE** : `composite > borne basse du palier cible`. Le composite étant **déjà plafonné par
  l'évidence** (`advertis-scorer/index.ts` : `composite = min(composite, evidenceTierCeiling(evidence))`,
  cap FORTE sans preuve, CULTE≥0.20, ICONE≥0.50), ce seul test **enforce implicitement** les preuves
  apex ; la raison chiffrée honnête ajoute le détail (superfans n/target, échelle non déclarée).
- **DEMOTE** : structural seul — Loi 1, une rétrogradation explicite est toujours légitime.

Refactor anti-doublon : la mesure d'évidence extraite du scorer vers
`src/server/services/advertis-scorer/evidence.ts` (source unique partagée, déplacement
behavior-preserving) + `computeEvidenceBreakdown` (chiffres bruts pour la raison honnête).

### 3. Câblage des 10 kinds + handler à dents

Union `Intent` (10 membres) + 10 `case` dans `commandant.execute` + groupe `return []` dans
`intentTouchesPillars` (les deux switches sans `default` ⇒ **l'ajout au union sans les cases casse
`tsc`** : c'est le forcing function d'exhaustivité). Handler
`src/server/services/brand-tier-transition/handler.ts` — **PERSISTE** `Strategy.apogeeTier` (dents,
contrairement au STUB ADR-0139), re-check structural defense-in-depth. `DEMOTE` = compensateur explicite.

### 4. Surface — décision opérateur (ADR-0085)

`strategy.transitionTier` (`operatorProcedure` + `emitIntent`, voie bus car kind dynamique parmi 10 —
pas `governedProcedure` qui lie un kind fixe) : résout le kind depuis `effectiveTier` + direction, émet,
remonte un refus de gate au front avec sa raison chiffrée. `tierTransitionPreview` (dry-run
enable/disable), `tierTrajectory` (historique lu depuis `IntentEmission` — **pas de nouveau modèle**,
la hash-chain EST le registre). `governance.compensate` mis à dents pour les compensateurs de palier
(dispatch réel au lieu du log audit-only). Panneau console `<ApogeeTrajectoryPanel>` (palier officiel
vs impliqué, boutons gate-aware, historique) ; cockpit `page.tsx` passe la ligne palier par
`effectiveTier`.

## Conséquences

- Le palier de marque devient une **altitude de record auditée** : promotions proof-gated, démotions
  explicites, historique hash-chaîné — la Loi 1 a enfin des dents.
- **Vérifié E2E (Motion19, PG)** : promotion méritée ORDINAIRE→FORTE (OK, `apogeeTier` écrit) ;
  promotion apex non méritée FORTE→CULTE (VETOED, raison chiffrée « score 160 ≤ seuil 160 — superfans
  0/1000 ; échelle non déclarée ») ; ratchet (score chute à 90, `effectiveTier` reste FORTE) ; démotion
  explicite ; 3 émissions hash-chaînées.
- **Tests** : `tests/unit/domain/brand-tier.test.ts` (`effectiveTier`), `tests/unit/services/mestor/palier-promotion-proofs.test.ts` (cœur pur du gate), `tests/unit/services/brand-tier-transition/handler.test.ts` (persistance), **HARD** `tests/unit/governance/brand-tier-transition-wired.test.ts` (les 10 kinds câblés : catalogue + SLO + `intentTouchesPillars` runtime + compensateur). `scoring-scale-aware.test.ts` repointé sur `evidence.ts`.
- **0 nouveau modèle Prisma** (colonnes additives), **0 LLM**, cap APOGEE 7/7 préservé.

## Hors périmètre (déféré, tracé RESIDUAL-DEBT)

- Modèle `BrandMaturityScore` 8-dimensions (ADR-0086) — on réutilise le composite existant.
- Auto-évaluation de palier (dry-run → revue opérateur, précédent `AUTO_PROMOTION_EVALUATE`).
- Page dédiée `/console/governance/palier-transitions` (ADR-0086) — le panneau détail-marque suffit au MVP.
- Alignement des ~13 autres callsites d'affichage sur `effectiveTier` (ils montrent légitimement le
  palier-impliqué-par-le-score, pas l'officiel).

## Lectures associées

- STATE_FINAL_BLUEPRINT §Loi 1 (conservation d'altitude) + §12 (score multi-dimensions & palier transitions)
- ADR-0086 (score canonique), ADR-0126 (scale-aware), ADR-0085 (décision opérateur), ADR-0139 (piège STUB)
