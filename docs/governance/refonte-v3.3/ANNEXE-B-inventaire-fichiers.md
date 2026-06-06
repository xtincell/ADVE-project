# ANNEXE B — Inventaire des fichiers (surface du renommage)

> Données vérifiées contre le code au 2026-05-31 (sonde d'inventaire). Sert à dimensionner le lot L1.

## B.1 — Surface par terme (Chantier A)

| Terme | Cible v3.3 | Fichiers `src/` | Docs | Classe P | Surface notable |
|-------|-----------|-----------------|------|----------|-----------------|
| Mestor | **Sia** | 141 | 1 | **OUI** governor (75 kinds) | `services/mestor/`, `mestor-router.ts`, routes cockpit+console, 20 tests |
| Artemis | **Neith** | 96 | 0 | **OUI** governor (16 kinds) | `services/artemis/` (139 Glory + 57 seq), routes console/artemis/*, `api/mcp/artemis`, 26 tests |
| Tarsis | **Shaï** | 54 | 0 | non (à confirmer NSP source) | `seshat/tarsis/`, routes console/signal+seshat/tarsis |
| Hunter | **Wepwawet** | 0 | 8 | non | `docs/external-design/argos-hunter-v1/` (vendor) |
| Jehuty | **Notoria** (+ Per-Ankh) | 17 | 1 | **OUI** 2 kinds | `services/jehuty/` (gov SESHAT), `jehuty.ts`+`notoria.ts`, routes cockpit/brand+console/seshat |
| Yggdrasil | **Arbre/Sève** | 0 | 2 | non | ADR-0082/0083, LEXICON, PANTHEON |
| ZOMBIE | **LATENT** | 41 | 0 | **OUI** payload NSP + 2 kinds | `brand-level-evaluator.ts`, NSP event-types, 7 tests |
| financial-brain | **thot/** | 21 | 0 | non (gov déjà THOT) | `services/financial-brain/` (16 calc) ; NE PAS toucher financial-engine/reconciliation |

**Total surface code ≈ 370 fichiers `src/`** (avec recouvrements). Docs : ~15 + 87 ADR + 7 sources de vérité.

## B.2 — Surface persistée (Classe P) consolidée → ANNEXE-A

| Identifiant persisté | Valeurs legacy | Alias |
|----------------------|----------------|-------|
| `IntentEmission.governor` | MESTOR (75), ARTEMIS (16) | → SIA, NEITH |
| `IntentEmission.intentKind` | JEHUTY_CURATE, JEHUTY_FEED_REFRESH | → NOTORIA_* |
| `IntentEmission.intentKind` | PROMOTE_ZOMBIE_TO_FRAGILE, DEMOTE_FRAGILE_TO_ZOMBIE | → *_LATENT_* |
| `NspEvent.brandLevel` / snapshots | "ZOMBIE" | → "LATENT" |

**Inchangés :** SESHAT, THOT, PTAH (0 occurrence governor — friction F-PTAH), IMHOTEP, ANUBIS, INFRASTRUCTURE.

## B.3 — Scopes commitlint à mettre à jour

`commitlint.config.cjs` `scope-enum` contient `mestor`, `artemis`, `tarsis`, `jehuty`, `seshat-search` →
ajouter `sia`, `neith`, `shai`, `notoria` (garder les anciens en alias pendant la fenêtre, ou bascule en L4).
