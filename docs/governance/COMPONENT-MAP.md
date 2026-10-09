# COMPONENT-MAP — Inventaire des composants UI

> **Auto-régénéré** par `scripts/generate-component-map.ts` (2026-04-30).
> Ne pas éditer à la main.

## Migrated (36)

| Composant | Fichier | Variants | Mission | a11y |
|---|---|---|---|---|
| `accordion` | `src/components/primitives/accordion.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `alert` | `src/components/primitives/alert.manifest.ts` | 4 | GROUND_INFRASTRUCTURE | AA |
| `avatar` | `src/components/primitives/avatar.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `badge` | `src/components/primitives/badge.manifest.ts` | 3 | GROUND_INFRASTRUCTURE | AA |
| `banner` | `src/components/primitives/banner.manifest.ts` | 4 | GROUND_INFRASTRUCTURE | AA |
| `breadcrumb` | `src/components/primitives/breadcrumb.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `button` | `src/components/primitives/button.manifest.ts` | 6 | GROUND_INFRASTRUCTURE | AA |
| `card` | `src/components/primitives/card.manifest.ts` | 5 | GROUND_INFRASTRUCTURE | AA |
| `checkbox` | `src/components/primitives/checkbox.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `command` | `src/components/primitives/command.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `container` | `src/components/primitives/container.manifest.ts` | 3 | GROUND_INFRASTRUCTURE | AA |
| `dialog` | `src/components/primitives/dialog.manifest.ts` | 5 | GROUND_INFRASTRUCTURE | AA |
| `field` | `src/components/primitives/field.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `grid` | `src/components/primitives/grid.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `heading` | `src/components/primitives/heading.manifest.ts` | 8 | GROUND_INFRASTRUCTURE | AA |
| `icon` | `src/components/primitives/icon.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `input` | `src/components/primitives/input.manifest.ts` | 3 | GROUND_INFRASTRUCTURE | AA |
| `label` | `src/components/primitives/label.manifest.ts` | 3 | GROUND_INFRASTRUCTURE | AA |
| `pagination` | `src/components/primitives/pagination.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `popover` | `src/components/primitives/popover.manifest.ts` | 4 | GROUND_INFRASTRUCTURE | AA |
| `progress` | `src/components/primitives/progress.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `radio` | `src/components/primitives/radio.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `select` | `src/components/primitives/select.manifest.ts` | 3 | GROUND_INFRASTRUCTURE | AA |
| `separator` | `src/components/primitives/separator.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `sheet` | `src/components/primitives/sheet.manifest.ts` | 4 | GROUND_INFRASTRUCTURE | AA |
| `skeleton` | `src/components/primitives/skeleton.manifest.ts` | 3 | GROUND_INFRASTRUCTURE | AA |
| `spinner` | `src/components/primitives/spinner.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `stack` | `src/components/primitives/stack.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `stepper` | `src/components/primitives/stepper.manifest.ts` | 2 | DIRECT_BOTH | AA |
| `switch` | `src/components/primitives/switch.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `tabs` | `src/components/primitives/tabs.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `tag` | `src/components/primitives/tag.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `text` | `src/components/primitives/text.manifest.ts` | 5 | GROUND_INFRASTRUCTURE | AA |
| `textarea` | `src/components/primitives/textarea.manifest.ts` | 3 | GROUND_INFRASTRUCTURE | AA |
| `toast` | `src/components/primitives/toast.manifest.ts` | 5 | GROUND_INFRASTRUCTURE | AA |
| `tooltip` | `src/components/primitives/tooltip.manifest.ts` | 4 | GROUND_INFRASTRUCTURE | AA |

## Phase 23 reusable patterns (Epic 6 SHIPPED — Epic 7 extends)

Phase 23 introduit **zéro nouvelle primitive** (les 3 absolute DS prohibitions tiennent) mais documente 4 patterns réutilisables comme **Phase-22 reusable patterns** — référencés depuis ici quand activated :

- **Status triad pattern** (UX-DR12) — colour + shape/icon + text label sur tout status indicator (connector state, sub-cluster lifecycle, calibration outcome). Introduit Epic 2 Story 2.4 ; réutilisé Epic 6 via `SubClusterStatusCell`.
- **Provenance popover pattern** (UX-DR7) — composition fine sur `popover` primitive, signature `{ source, refUrl }`, one-hop "where from" reaching signal source OR calibration snapshot. **Shipped Epic 6 Story 6.6** (`ProvenancePopover`) ; réutilisé Epic 7.
- **Honest empty/degraded pattern** (UX-DR10) — composition fine sur `empty-state` primitive : icon + cause + unlock path, info tone (DEFERRED is info, not warning), même footprint que populated state. Introduit Epic 3 Story 3.2 ; réutilisé Epic 4 + Epic 7.
- **Operator-judgement confirmation pattern** (UX-DR14 + UX-DR15) — every consequential decision = explicit operator act → primary/ghost button pair → hash-chained attributed event → confirmation linking the resulting snapshot. **Shipped Epic 6 Story 6.4** (`CalibrationReviewPanel`).

**Epic 6 composition components (SHIPPED, non-primitives — no co-located `.manifest.ts`, hence absent from the auto-generated table above) :**

| Composant | Fichier | Pattern(s) | Story |
|---|---|---|---|
| `SubClusterStatusCell` | `src/components/cockpit/governance/sub-cluster-status-cell.tsx` | Status triad (UX-DR12) + DEFERRED cross-link | 6.6 |
| `ProvenancePopover` | `src/components/cockpit/governance/provenance-popover.tsx` | Provenance popover (UX-DR7) | 6.6 |
| `CalibrationReviewPanel` | `src/components/console/campaign-tracker/calibration-review-panel.tsx` | Operator-judgement (UX-DR4/14/15/22), dialog+inline dual host, metrics-as-data | 6.4 |
| `CampaignTrackerHub` | `src/components/console/campaign-tracker/campaign-tracker-hub.tsx` | View switcher B1/B2/B3 (UX-DR3), localStorage-persisted | 6.5 |

Hook `useCalibrationStream` (`src/hooks/use-calibration-stream.ts`) — SSE consumer mirroring `useOracleStream` for the 3 `calibration_*` NSP kinds (UX-DR17 / NFR3).

`<OvertonRadar>` (`src/components/neteru/overton-radar.tsx`) — **Phase 23 Epic 7 SHIPPED** : props driven by `ConnectorResult<OvertonRadarSignal>` (view-model in `@/domain`) + `instance` CVA variant (full/teaser) ; A2 split (`@container` queries) ; honest DEFERRED/DEGRADED/per-axis states (`HonestState` + `MetricCell`) ; a11y `<svg role="img">` + offscreen `table.sr-only`. Co-located `overton-radar.manifest.ts` (v2.0.0, `DIRECT_OVERTON`) + `.stories.tsx`. Consommé par la route `/cockpit/intelligence/overton` (Story 7.5) via le wrapper `<OvertonPanel>` (`src/components/cockpit/intelligence/`, Story 7.4) + le teaser dashboard `OvertonTeaser` (Story 7.6). **Reusable Phase-22 patterns** : `HonestState` (degraded/empty, info-tone), `MetricCell` (per-axis partial, no fabricated 0).

Cf. [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md), [DESIGN-LEXICON.md](DESIGN-LEXICON.md).

## Composition de revue d’identité — 432 livré et reçu, borné (2026-10-09)

`PublicIdentityReview` (`src/components/brand/public-identity-review.tsx`) compose
Button/Input/Select/Textarea et SourceReadDialog dans la carte publique existante
de Connexions. Référence consultable, choix explicites par version/usage pour
palette, typographies/fichiers, poses et citation ; les familles non choisies
gardent leur présentation locale. Validation de choix avant strategy.update,
aucune promotion d’actif ou nouvelle primitive/page/permission. Hors table
auto-générée des primitives ci-dessus ; aucun compte structurel modifié.
Scans UI/vocab et gestes natifs locaux reçus sur fixture ; gauntlet vert.
Livraison 432 et gestes natifs réels SPAWT publication/revue sans resélection/
retour reçus, sans validation de marque entière. Réception partielle C2/C3/C4.
[ADR-0212 Accepted, borné](adr/0212-versioned-public-identity-projection.md).

## Tracker existant — runtime 435, suivi vide reçu (2026-10-09)

**Composition de validation candidate 436, hors table auto-générée** : dans la
page forge existante, formatConfidence réutilise une lecture pure de la mesure :
null/non fini/hors intervalle = inconnu, vrai zéro = 0 %. Bannière et modal
existants séparent mesure, composition et décision ; aucune barre fabriquée,
confiance visible après approbation et erreur serveur en alerte. Bouton désactivé
si lecture/composition indisponible, confirmation liée à expectedVersion.
OperatorSurface inchangé, aucune primitive/page nouvelle. Cinq cas natifs
synthétiques reçus : absence/partiel, confirmations sans modifier la confiance
et conflit de version/message visible ; livraison à recevoir, sans production.
[ADR-0214 Proposed et reçu](RECEPTION-VALIDATION-SYNTHESE.md).

Native réelle 434 : lecture refusée 403 pour compte non affecté, écran non reçu.
435 livré : canResume dérivé de l’affectation actuelle, sans bouton si absente ;
lecture seule ADMIN du dossier explicitement choisi, aucune reprise ADMIN sans
affectation ou droit nouveau. Deux rouges/49 verts puis 51 PG ciblés verts. Native
locale par URL connue sur deux dossiers : chacun sa tâche, lecture seule, zéro
bouton Reprendre et secret absent ; Actualiser HTTP 200/zéro exception, fenêtre
complète. Copie FR finale relue, fixture nettoyée. Sélecteur local 0/0 historique ;
gauntlet 435 cinq exit 0/gouvernance 1620/166/24 warnings préexistants, PG complet
seul 274/14/Ptah 51 inclus reçus. CI 435 : 4 180/399 unitaires et 274/14 PG/image/runtime reçus.
Native SPAWT listForges HTTP 200/zéro ligne, 403 disparu ; fenêtre complète : 63 réponses/
aucune ≥500/zéro exception/log. Liste du sélecteur et passage par son lien vers le
portefeuille groupe FrieslandCampina non pilotable reçus en lecture seule,
portée/ambiguïtés rendues, sans métriques isolées de cette navigation.
Production/reprise réelle non reçue ; reload local tronqué et timings production
bornés, sans SLO déduit.

`PtahKilnTracker` (`src/components/neteru/ptah-kiln-tracker.tsx`) est monté dans
la page forge existante, enveloppée par son layout OperatorSurface ; ce layout
empêche le montage des hooks si canOperate=false. Composition des primitives
existantes : liste paginée, attente/état incertain/refus, prix persisté ou
estimation/inconnu, confirmation de reprise ; textes FR/EN/ZH. Aucun nouveau
composant primitif/page/droit. Premiers gestes natifs locaux : marque retrouvée
après fix session 433, même tâche DEFERRED HTTP 200/reçu altéré HTTP 412 et
dirigeant sans affectation sans Reprendre. Anciens sélecteurs de comptage invalides
écartés ; nouvelle pagination sur production-tracker/[data-task-id] reçue,
20 puis 22 uniques/sans page suivante. USER sans affectation : tracker/action
Reprendre non montés ; tracker EN/ZH rendu et FR restauré, aucune traduction
intégrale de forge déduite. Fixture native nettoyée. Gauntlet final vert après
découplage des dates startedAt réel/emittedAt logique ; scénario local
clôture/durée reçu, pas SLO global.
stress isolé reçu hors native protégée/Glory phase 3/fournisseur réel, avant les
dernières gardes de contrat et dates. Suite canonique 4 180/399 et PG 270/14
finaux post-découplage reçus ; code/CI/runtime 434 reçus, parcours restants non reçus :
[ADR-0213 Proposed](adr/0213-deferred-production-resumption-and-seals.md).
