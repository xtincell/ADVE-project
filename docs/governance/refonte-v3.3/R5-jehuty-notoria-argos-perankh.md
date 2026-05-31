# R5 — Jehuty ⊃ Notoria · Argos → Per-Ankh

> **Chantier A — dissolution, pas simple renommage.** **Ancrage canon :** Blueprint §0.3 (Per-Ankh /
> Argos façade), README v3.3 (« Jehuty supprimé → fonction repliée dans Notoria, deux étages »).
> **Classe(s) :** S + **P** (2 Intent kinds). **Surface vérifiée :** `jehuty/` 17 fichiers `src/`, 1 doc (ADR-0085).

## R5.0 — Décisions

1. **Jehuty replié dans Notoria.** `jehuty/` (governor SESHAT, deps `[seshat, notoria]`, curateur de feed)
   fusionne dans `notoria/` comme **étage amont** (actualité de la marque) ; l'étage aval existant de
   Notoria reste (amendements ADVE scorés). Suppression du service `jehuty/`.
2. **Argos sub-domain → Per-Ankh.** La **bibliothèque** interne (sous-domaine Seshat) prend le nom
   **Per-Ankh** ; la **façade publique** `apps/argos/` **garde Argos** (sous-marque éditoriale, seul nom
   grec, exception assumée Blueprint §0.6).

*Alt. écartée : garder `jehuty/` et `notoria/` en parallèle* — perpétue le doublon que v3.3 supprime.

## R5.1 — Surface Classe S (codemod + merge)

| Surface | Actuel → cible | Notes |
|---------|----------------|-------|
| Service | `src/server/services/jehuty/` → **fusion dans** `src/server/services/notoria/` (sous-module `amont/`) | conserver les fonctions de curation |
| tRPC | `src/server/trpc/routers/jehuty.ts` → fold dans `notoria.ts` (déjà existant) | router key `jehuty` → `notoria.amont.*` |
| Routes | `src/app/(cockpit)/cockpit/brand/jehuty` → `.../notoria` ; `src/app/(console)/console/seshat/jehuty` → `.../seshat/notoria` | |
| Tests | 4 fichiers `JEHUTY` | maj même PR |
| Doc | **ADR-0085** « refresh-cascade-stop-at-**jehuty** » → amender en « stop-at-**notoria** » | cascade `Wepwawet→Seshat→Shaï→Notoria STOP` |

## R5.2 — Surface Classe P (alias, ANNEXE-A)

- 2 Intent kinds persistés : `JEHUTY_CURATE → NOTORIA_CURATE`, `JEHUTY_FEED_REFRESH → NOTORIA_FEED_REFRESH`.
- Governor inchangé (`SESHAT`) — Jehuty n'a jamais été un governor. Aucun alias governor.

## R5.3 — Argos → Per-Ankh : pré-câblage (pas de code aujourd'hui)

`seshat/argos/` **n'existe pas encore** (sous-dirs Seshat actuels : `external-feeds`, `market-study-ingestion`,
`context-store`, `tarsis`, `knowledge`). La Phase 22 Argos est **planifiée, non shippée**. Donc R5 agit
**uniquement sur les docs** pour que le futur port atterrisse en `seshat/per-ankh/` :
- Amender **ADR-0083** (placement Argos/Per-Ankh), `REFONTE-PLAN.md` Phase 22, `_bmad-output/project-context.md §27-bis`, `docs/external-design/argos-hunter-v1/VENDOR-NOTICE.md`.
- **Trigger Phase 22 = demande explicite opérateur** (inchangé). R5 ne déclenche pas le port ; il fixe le nom.

## R5.4 — Critères d'acceptation

```
[ ] src/server/services/jehuty/ supprimé ; fonctions présentes sous notoria/amont/
[ ] grep -rn "jehuty\|Jehuty\|JEHUTY" src/ → 0 hors alias @deprecated-wire
[ ] JEHUTY_CURATE/JEHUTY_FEED_REFRESH lisibles via normalizeIntentKind → NOTORIA_*
[ ] ADR-0085 amendé (stop-at-notoria) ; cascade docs cohérente
[ ] routes notoria OK ; notoria.amont.* opère ; typecheck vert
[ ] docs Per-Ankh : convention fixée pour le port Phase 22 (aucun code touché)
```

## R5.5 — Friction

- **F-R5a.** Fusion de service = la seule opération non purement mécanique du Chantier A (logique à déplacer, pas juste renommer). À traiter avec soin (tests des 2 étages).
- **F-R5b.** Coordination Phase 22 : si le port Argos démarre avant L4, il doit déjà cibler `per-ankh/`.
