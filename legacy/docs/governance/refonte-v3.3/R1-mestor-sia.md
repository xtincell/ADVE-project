# R1 — Mestor → Sia

> **Chantier A — La Grande Renomination.** **Ancrage canon :** Blueprint §0.6 (Sia, Guidance/dispatcher),
> Loi du Panthéon. **Classe(s) :** S + **P** (governor). **Surface vérifiée :** 141 fichiers `src/`, 1 doc.

## R1.0 — Décision

Renommer le Neter **Mestor → Sia** (perception/discernement, dispatcher unique d'Intents). Le rôle est
inchangé : point d'entrée unique de toute mutation (`mestor.emitIntent()` → `sia.emitIntent()`). *Alt.
écartée : garder Mestor.* Le corpus v3.3 fait foi (D-0).

## R1.1 — Surface Classe S (codemod)

| Surface | Chemin actuel → cible | Notes |
|---------|------------------------|-------|
| Service | `src/server/services/mestor/` → `sia/` | `manifest.ts`, `governance.ts`, `insights.ts`, `commandant.ts`, `intents.ts`, `gates/` |
| Exports | `MestorService`, `MestorPanel`, `MestorPlan`, `MestorInsight`, `MestorContext` → `Sia*` | + `emitIntent` ré-exporté |
| Type | `Brain`/`Governor` valeur `MESTOR` → `SIA` (cf. R1.2) | `src/domain/intent-progress.ts` |
| tRPC | `src/server/trpc/routers/mestor-router.ts` → `sia-router.ts` | router key `mestor` → `sia` |
| Routes | `src/app/(cockpit)/cockpit/mestor` → `.../sia` ; `src/app/(console)/console/mestor` → `.../sia` | nav + liens |
| Tests | 20 fichiers référencent `MESTOR`/`mestor` | maj même PR |
| Docs | `architecture_mestor_swarm.md` + 7 sources de vérité | cf. 00-CADRE §0.9 |

**Import alias commit convention :** la couche `domain` (`Governor`) descend partout ; respecter le layering (INV-2).

## R1.2 — Surface Classe P (alias, ANNEXE-A)

- **Unique changement persisté :** `IntentEmission.governor` — valeur `"MESTOR"` écrite sur **75** Intent kinds.
- **Aucun** Intent kind préfixé `MESTOR_` (vérifié : 0). Les kinds gouvernés par Mestor portent des noms métier (`FILL_ADVE`, `RUN_RTIS_CASCADE`, `BUILD_PLAN`, `OPERATOR_AMEND_PILLAR`, `LIFT_INTAKE_TO_STRATEGY`, …) — **non renommés**.
- **Migration :** `GOVERNOR_ALIAS.MESTOR = "SIA"` ; `@default("SIA")` ; émissions futures en `"SIA"` ; **les 75×N lignes historiques `"MESTOR"` restent** et s'agrègent sous `SIA` via `normalizeGovernor()`.
- **Zod :** ajouter `"SIA"` à `GOVERNORS`, conserver `"MESTOR"` comme valeur lisible (alias), retirer `"MESTOR"` de l'écriture seulement.

## R1.3 — Synchronisation des 7 sources (obligatoire, même commit)

`BRAINS` · `GOVERNORS`/`Governor` · `LEXICON` (entrée NETERU) · `APOGEE §4` · `PANTHEON` · `CLAUDE.md` ·
`neteru-coherence.test.ts`. Plus `STATE_FINAL_BLUEPRINT`, ADRs citant Mestor, `CODE-MAP` (régén).

## R1.4 — Critères d'acceptation

```
[ ] grep -rn "mestor\|Mestor\|MESTOR" src/ → 0 hors alias @deprecated-wire
[ ] GOVERNORS contient "SIA" ; @default governor = "SIA"
[ ] normalizeGovernor("MESTOR") === "SIA" ; ligne historique lisible, non mutée
[ ] neteru-coherence (HARD) vert : 7 sources nomment Sia
[ ] dispatcher : sia.emitIntent() opère ; aucune route 404 (cockpit/sia, console/sia)
[ ] madge --circular vert ; typecheck vert
```

## R1.5 — Friction

- **F-R1.** `mestor-router.ts` est consommé par le client tRPC (`api.mestor.*`) côté UI ; le renommage du router key casse tous les call-sites front en bloc — inclure le sweep front dans la même PR (gros mais mécanique). C'est précisément pourquoi le big-bang sur branche (D-1) est adapté : CI rouge tolérée jusqu'à L4.
