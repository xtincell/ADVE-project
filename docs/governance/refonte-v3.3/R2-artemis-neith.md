# R2 — Artemis → Neith

> **Chantier A.** **Ancrage canon :** Blueprint §0.6 (Neith, Propulsion phase brief, démiurge-tisseuse).
> **Classe(s) :** S + **P** (governor). **Surface vérifiée :** 96 fichiers `src/`, 0 doc dédié.

## R2.0 — Décision

Renommer **Artemis → Neith** (conçoit les briefs intellectuels). Neith **possède les 139 Glory tools**
(`artemis/tools/`) et les 57 sequences. Rôle inchangé. *Alt. écartée : garder Artemis* (panthéon grec, viole la Loi du Panthéon).

## R2.1 — Surface Classe S (codemod)

| Surface | Actuel → cible | Notes |
|---------|----------------|-------|
| Service | `src/server/services/artemis/` → `neith/` | `tools/` (139 Glory tools), `sequences.ts` (57), `manifest.ts`, `governance.ts` |
| Exports | `ArtemisExecutor`, `ArtemisService` → `Neith*` | `SequenceStepType` union contient `"ARTEMIS"` → `"NEITH"` (cf. R2.2) |
| Routes | `src/app/(console)/console/artemis/*` (campaigns, drivers, interventions, media, missions, pr, scheduler, skill-tree, social, tools, vault) → `.../neith/*` | nav + liens |
| API | `src/app/api/mcp/artemis` → `.../neith` | endpoint MCP |
| Tests | 26 fichiers référencent `ARTEMIS`/`artemis` | maj même PR |

## R2.2 — Surface Classe P (alias, ANNEXE-A)

- **Unique changement persisté :** `IntentEmission.governor = "ARTEMIS"` sur **16** Intent kinds → alias `ARTEMIS → NEITH`.
- **Aucun** Intent kind préfixé `ARTEMIS_` (vérifié : 0). Les kinds sont métier (`EXECUTE_GLORY_SEQUENCE`, `RUN_ORACLE_SEQUENCE`, …) — **non renommés**.
- `SequenceStepType` : si la valeur `"ARTEMIS"` est **persistée** dans `SequenceExecution` (step type), l'aliaser ; sinon Classe S. **À confirmer en L1.**

## R2.3 — ⚠️ Garde forte : les `id` des 139 Glory tools / 57 sequences

Les **identifiants** des Glory tools (`GloryToolDef.id`) et sequences (`key`) sont potentiellement
**persistés** (`GloryToolForgeOutput`, manifests, `SequenceExecution.promptHash`). **Ne PAS les renommer**
même si le dossier devient `neith/`. Vérifier (`glory-tools-inventory.md`, `GloryToolForgeOutput`) :
- Si `id`/`key` ne contiennent pas le mot "artemis" → aucune action (ils survivent au rename de dossier).
- Si certains le contiennent → **alias** (Classe P), jamais rename direct. *(Friction F-B du cahier-maître.)*

## R2.4 — Critères d'acceptation

```
[ ] grep -rn "artemis\|Artemis\|ARTEMIS" src/ → 0 hors alias @deprecated-wire
[ ] GOVERNORS : "NEITH" présent ; émissions futures governor="NEITH"
[ ] 139 Glory tools + 57 sequences inventoriés identiques (ids inchangés) — diff = 0 sur les id
[ ] neteru-coherence (HARD) vert ; routes console/neith/* OK
[ ] typecheck + madge verts
```

## R2.5 — Friction

- **F-R2.** Surface fonctionnelle la plus large (briefs + Glory + Oracle). Le sweep est massif ; sur la branche refonte la CI peut rester rouge jusqu'à L4. Geler les chantiers Glory/Oracle pendant L1 (pas de feature concurrente sur `neith/`).
