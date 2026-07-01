# R4 — Hunter → Wepwawet

> **Chantier A.** **Ancrage canon :** Blueprint §1.4 (Wepwawet = sub-agent harvester, 4 phases
> harvest/coerce/ingest/projection-decide). **Classe(s) :** S (docs uniquement). **Surface vérifiée :**
> **0 fichier `src/`**, 8 fichiers `docs/external-design/argos-hunter-v1/`.

## R4.0 — Décision

Renommer le sub-agent **Hunter → Wepwawet** (l'ouvreur des chemins, détecteur de marques émergentes).
**Pas un Neter.** Aujourd'hui **aucun code actif** : Hunter ne vit que dans le design vendorisé
`docs/external-design/argos-hunter-v1/` (port Phase 22 non shippé). *Alt. écartée : garder Hunter.*

## R4.1 — Surface (docs + pré-câblage Phase 22)

| Surface | Actuel → cible | Notes |
|---------|----------------|-------|
| Design vendorisé | `docs/external-design/argos-hunter-v1/` (README, VENDOR-NOTICE, JSX, server.mjs, …) | **rename de référence** : le futur sous-agent porté s'appellera `wepwawet` (dossier `seshat/per-ankh/wepwawet/` à la Phase 22) |
| ADR | `ADR-0083` (Argos placement Seshat / Hunter sub-agent / Sève seam) | amender Hunter → Wepwawet |
| Plan | `REFONTE-PLAN.md` Phase 22, `_bmad-output/project-context.md §27-bis` | amender |
| Doc | `CLAUDE.md`, `PANTHEON §7` (sub-agents) | maj |

## R4.2 — Surface Classe P

- **Néant.** Aucun governor, aucun Intent kind, aucune valeur persistée (0 fichier `src/`). Pur docs.

## R4.3 — Décision de timing

Renommer **maintenant** (en L1) pour que le port Phase 22 atterrisse directement sous le nom Wepwawet —
éviter de bâtir le harvester sous l'ancien nom. **R4 ne déclenche pas** le port (trigger = demande opérateur).

## R4.4 — Critères d'acceptation

```
[ ] grep -rn "hunter\|Hunter\|HUNTER" docs/ src/ → 0 (hors historique git)
[ ] ADR-0083 + REFONTE-PLAN Phase 22 nomment Wepwawet ; VENDOR-NOTICE cohérent
[ ] convention fixée : seshat/per-ankh/wepwawet/ pour le port futur
```

## R4.5 — Friction

- **F-R4.** Respecter les **3 interdits absolus** du `VENDOR-NOTICE.md` (code vendorisé tel quel) : le renommage est une **annotation de convention**, pas une modification du vendor.
