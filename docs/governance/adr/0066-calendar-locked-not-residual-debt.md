# ADR-0066 — Calendar-locked transitions ≠ technical debt : reclassification RESIDUAL-DEBT

**Date** : 2026-05-06 (renuméroté 2026-05-06 — voir note ci-dessous)
**Statut** : Accepted
**Phase** : Refonte structurelle continue
**Related** : [ADR-0040](0040-uniform-section-sequence-migration.md) (DRAFT→STABLE 1 mois), [ADR-0041](0041-sequence-robustness-loop.md) (soft→hard 1 semaine), [ADR-0042](0042-sequence-modes-and-lifecycle.md) (lifecycle versioning)

> **Note de renumérotation (2026-05-06)** : ADR enregistré initialement sous 0053 dans `sprint/7-real-migration-trivial` (commit `defba55`) alors que ADR-0053 (`coherence-llm-evaluator`) existait déjà sur main. Pattern Phase 18 v6.18.4 first-come keep — ADR-0053 canon préservé, cet ADR renuméroté 0053→0066. Compatibility alias : "ADR-0053 (calendar-locked-not-residual-debt)" === ADR-0066.

---

## Contexte

[RESIDUAL-DEBT.md](../RESIDUAL-DEBT.md) liste plusieurs items "calendar-locked" mélangés avec la dette technique réelle :

1. **Quality gate soft → hard switch** (1 semaine post-merge) — calibration data
2. **Promotion `lifecycle: STABLE`** des 21 nouvelles sequences (1 mois)
3. **24 wrappers WRAP-FW-* à promouvoir STABLE** (1 mois)
4. **Backward-compat `_oracleEnrichmentMode`** (1 semaine) — ✅ RESOLVED v6.18.14
5. **Alias `refined`** (1 mois) — ✅ RESOLVED v6.18.14

Audit Sprint 10 (2026-05-06) révèle que mélanger ces items avec la dette technique réelle (cache reconciliation, LLM chunking, router migration) crée une **fausse pression sur la priorité** :
- Ces transitions ont une fenêtre de stress-test calibrée par leurs ADRs (1 semaine / 1 mois).
- Forcer leur résolution avant le délai trahit le rationale safety.
- Mais les laisser dans `RESIDUAL-DEBT.md` les fait apparaître comme des bugs non-fixés.

## Décision

**Distinguer formellement deux catégories dans `RESIDUAL-DEBT.md`** :

### Catégorie 1 : Technical debt (dette à résoudre)

Items qui peuvent et doivent être résolus dès qu'il y a la bande passante :
- Cache reconciliation per-caller audit
- Mass-migration de routers (selon cible ADR-0004 strict, cf. [ADR-0065](0065-adr-0004-strict-migration-complete.md))
- LLM chunking sites avec output truncation observé
- Bypass governance détectés
- Code dupliqué / legacy non-nettoyé

**Contraint par** : effort d'ingénierie disponible.

### Catégorie 2 : Scheduled architectural transitions (transitions calendrier-bloquées)

Items dont la résolution est **calibrée par un timer** lié à un mécanisme safety :
- DRAFT→STABLE après 1 mois stress-test
- Soft→hard quality gate après 1 semaine calibration
- Backward-compat removal après 1 semaine déprécation

**Contraint par** : fenêtre temporelle (calendar lock).

**Ces items ne sont PAS de la dette** — ce sont des transitions planifiées dont l'avancement est mesuré au calendrier, pas à l'effort.

### Format RESIDUAL-DEBT.md mis à jour

Section dédiée `## Scheduled Transitions (calendar-locked)` distincte de `## Technical Debt` :

```markdown
## Scheduled Transitions (calendar-locked, not technical debt)

| Item | ADR | Schedule | Status |
|---|---|---|---|
| DRAFT→STABLE 21 sequences | ADR-0040 | merge + 1 mois | 🟡 D+5 (en cours) |
| DRAFT→STABLE 24 wrappers | ADR-0039 | merge + 1 mois | 🟡 D+5 (en cours) |
| Quality gate soft→hard | ADR-0041 | merge + 1 semaine | 🟡 D+5 (en cours) |
| Backward-compat _oracleEnrichmentMode | ADR-0042 | 1 semaine | ✅ RESOLVED v6.18.14 |
| Alias refined | ADR-0042 | 1 mois | ✅ RESOLVED v6.18.14 |

## Technical Debt (effort-bounded)

| Item | Effort | Priorité |
|---|---|---|
| Cache reconciliation 15 writePillar callers | 3h | medium |
| ... | | |
```

## Conséquences

### Positives

- **Clarté lecture** : un dev qui ouvre RESIDUAL-DEBT distingue immédiatement "à fixer" vs "attendre le timer".
- **Anti-stress-test-bypass** : le DEEP fix n'est plus "forcer la promotion" mais "respecter le calendrier ET résoudre la dette technique en parallèle".
- **Métrique honnête** : compter "0 technical debt" est possible même si "5 scheduled transitions in flight" — c'est sémantiquement différent.

### Négatives

- Ne fait pas disparaître les transitions — elles restent visibles, juste classées différemment.

### Promotion path pour les calendar-locked

Quand le calendrier autorise la promotion (e.g. D+30 pour DRAFT→STABLE) :
1. Run stress-test analysis (logs IntentEmission, error rate, completionPct distribution)
2. Si métriques OK → emit `PROMOTE_SEQUENCE_LIFECYCLE` Intent batch
3. Si métriques warning → investigate, potentiellement amender ADR-0042 pour PERMANENT_DRAFT category
4. Update RESIDUAL-DEBT

Ces étapes restent **scheduled** — pas de "résoudre maintenant" possible.

## Alternatives écartées

1. **Forcer la promotion DRAFT→STABLE early** : trahit le rationale safety ADR-0040+0042.
2. **Laisser le mélange dans RESIDUAL-DEBT** : génère pression artificielle sur des items non-actionnables.
3. **Supprimer les items calendar-locked de RESIDUAL-DEBT** : perd la visibilité de la trajectoire.

## Verification

```bash
# Après mise à jour RESIDUAL-DEBT.md selon ce nouveau format :
grep -c "## Technical Debt" docs/governance/RESIDUAL-DEBT.md  # = 1
grep -c "## Scheduled Transitions" docs/governance/RESIDUAL-DEBT.md  # = 1
```

## Lectures

- [ADR-0040](0040-uniform-section-sequence-migration.md) — DRAFT→STABLE rationale
- [ADR-0041](0041-sequence-robustness-loop.md) — quality gate soft mode rationale
- [ADR-0042](0042-sequence-modes-and-lifecycle.md) — lifecycle versioning
- [RESIDUAL-DEBT.md](../RESIDUAL-DEBT.md) — à mettre à jour selon ce nouveau format
