# ADR-0137 — Refresh nocturne des sections Oracle STALE (+ refus honnête du câblage plafond Tarsis)

- **Status** : Accepted
- **Date** : 2026-07-13 (soir)
- **Phase** : suite de l'audit [BRIEF-ORACLE-SCORING-PIVOT-AUDIT-2026-07-13](../../audits/BRIEF-ORACLE-SCORING-PIVOT-AUDIT-2026-07-13.md) — bloc C
- **Depends on** : ADR-0134 (cascade de staleness qui marque COMPLETE→STALE), ADR-0071 (ASSEMBLE_ORACLE manual-first), ADR-0091 (composers déterministes), ADR-0126 (plafond d'évidence)
- **Supersedes** : —

## Contexte

Deux résidus de l'audit :

- **T6 — refresh auto des sections STALE** : ADR-0134 a réparé la cascade qui marque les `OracleSection` COMPLETE→STALE quand un pilier mute, mais **personne ne les régénérait automatiquement** (refresh 100 % manuel via l'assembleur). Atténué (les §01-21 sont lues live, les §22-35 recomposées read-time) mais l'entité `OracleSection.status` restait STALE jusqu'à un geste opérateur.
- **T9 — bras Tarsis du plafond d'évidence CULTE/ICONE** : `advertis-scorer` compte `Signal where type contains "TARSIS"`, mais **aucun writer de production n'émet ce type** (seed-only).

## Décision

### 1. Refresh nocturne STALE (livré)

Étape ajoutée au cron `ops-sweep` (balayage opérationnel quotidien, GitHub Actions) : `oracleSection.groupBy` sur `status=STALE` → pour chaque stratégie **ayant des sections périmées** (ciblé, pas de balayage à vide), émet `ASSEMBLE_ORACLE scope=STALE` via le spine (`emitIntent`). L'assembleur émet `GENERATE_ORACLE_SECTION × N` (manual-first ADR-0071) qui retombe sur les **composers déterministes** (ADR-0091) sans clés LLM. **Skip honnête** si la stratégie n'a pas d'`operatorId` (pas de contexte d'assemblage). Best-effort par stratégie ; résultat remonté au rapport du cron.

### 2. Bras Tarsis du plafond : câblage REFUSÉ (honnêteté), tracé

Le seul writer de `Signal` weak-signal existant émet `type="WEAK_SIGNAL_ALERT"` (`weak-signal-analyzer`, LLM, une Signal par finding pour la **marque source** — le « spread » cross-marque n'est que des notifications, pas des rows). **Câbler ce type au plafond serait de l'inflation malhonnête** : un `WEAK_SIGNAL_ALERT` décrit une tendance de **marché/environnement** (« la demande LED monte »), PAS le **pull culturel de la marque**. Le plafond CULTE/ICONE mesure la force culturelle de la marque — le nourrir avec du bruit sectoriel gonflerait le palier selon la bruyance du **secteur**, pas la relevance de la **marque**.

**Décision : ne PAS câbler.** Le bras Tarsis attend un writer de signaux **brand-specific** (presse non payée citant la marque, imitations de claims par des concurrents, UGC de marque) — qui n'existe pas encore. Tracé RESIDUAL-DEBT comme requérant une source honnête, jamais une dérivation depuis les weak-signals de marché.

## Conséquences

- Les sections Oracle STALE se rafraîchissent automatiquement chaque nuit (déterministe, sans clés). T6 fermé.
- Le plafond Tarsis reste honnêtement vide en production tant qu'aucune source brand-specific n'existe — **pas d'inflation** (cohérent avec ADR-0126 : jamais d'évidence gratuite). T9 requalifié : non « seed-only à câbler » mais « attend une source honnête ».
- 0 modèle, 0 kind (réutilise `ASSEMBLE_ORACLE`), cap 7/7. Test `oracle-stale-refresh.test.ts`.
