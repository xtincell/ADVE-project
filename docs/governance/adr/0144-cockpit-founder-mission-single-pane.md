# ADR-0144 — Cockpit de pilotage de mission founder (single-pane, saisie + tâches datées)

- **Status** : Accepted
- **Date** : 2026-07-14
- **Phase** : Post-clôture (chantier cockpit SPAWT)
- **Depends on** : ADR-0129 (accès délégué), ADR-0131 (zones collaborateur), ADR-0049 (brief gate), ADR-0119 (campagne canon)
- **Supersedes** : —

## Contexte

Le fondateur voit ses missions de campagne mais ne peut pas les **piloter depuis le
cockpit** :

1. dans la fiche campagne, les missions sont des `<div>` statiques (non cliquables) ;
2. les briefs ne sont **consultables** qu'en aperçu tronqué (`line-clamp-3`) — impossible
   de LIRE le brief avant de le valider ;
3. il n'existe **aucun bouton « Démarrer la mission »** côté founder (`transition`
   campagne est `operatorProcedure`, donc INTERDIT au founder) ;
4. les tâches datées de la mission (« quelles tâches et quand ») ne sont pas rendues avec
   un moyen de les **cocher** ;
5. la **performance réelle** (les vrais chiffres) n'a pas de surface de saisie côté
   cockpit — la doctrine « tout au même endroit » n'est pas honorée pour une mission.

Un audit forensique (2026-07-14) a confirmé que les mécaniques de mesure existent et
dégradent honnêtement, mais qu'aucune surface founder ne compose l'exécution + la perf +
l'état des sources. Deux writers founder-safe (`recordAARRMetric`, `updateAction`)
n'étaient de plus **pas ownership-scopés** (trou pré-existant).

## Décision

Composer une **fiche mission founder single-pane**, réutilisation-first (zéro nouveau
modèle Prisma, zéro migration), gouvernée et ownership-scopée.

**Backend — 2 nouveaux Intent kinds (governor INFRASTRUCTURE, founder-safe) + 1 read :**

- `START_CAMPAIGN_MISSION` (`mission.start`) — le fondateur lance sa mission
  `DRAFT → IN_PROGRESS`. Idempotent (no-op si déjà lancée — Loi 1). Ownership via
  `enforceStrategyAccess`.
- `SET_BRAND_ACTION_STATUS` (`campaignManager.setBrandActionStatus`) — coche/valide une
  **tâche datée** du rétroplanning (`BrandAction.status`). Ownership via la marque de
  l'action.
- `campaignManager.getMissionCockpit` (read, `enforceCampaignAccess`) — compose les
  **tâches datées** de la mission (BrandAction rattachées via `metadata.missionKey`, dates
  réelles `timingStart/End`), les **métriques AARRR** de la campagne, et l'**état honnête
  des sources** (connecté / à connecter — jamais un zéro fabriqué).
- **Durcissement** : `recordAARRMetric` reçoit `enforceCampaignAccess` (le writer
  founder-safe n'était pas scopé — trou fermé).

**Lien mission ↔ tâche** : `BrandAction.metadata.missionKey = <missionId>` (zéro
migration ; le tunnel data-ops et le seed le posent). La FK durable `BrandAction.missionId`
est déférée (tracée RESIDUAL-DEBT).

**Frontend (cockpit, DS + vocabulaire client)** :

- `mission-detail-modal.tsx` — ouverte au clic depuis la vue d'ensemble : brief COMPLET
  consultable, « Démarrer la mission », rétroplanning daté avec cocher, saisie founder des
  vrais KPI (AARRR), bandeau honnête des sources.
- `overview-tab` : missions **cliquables** (micro-interaction hover).
- `briefs-tab` : action **« Consulter »** ouvrant le brief complet AVANT validation.
- liste campagnes : **micro-interaction** de carte (feedback visuel au survol/clic/focus).

**Data-ops** : le tunnel `?op=patch` (`/api/admin/seed-brands`) gagne une op générique
`missions[]` (reparentage/édition de Mission) — le tunnel ne couvrait que
campagnes/actions/stratégies.

**Zones délégables** (ADR-0131) : `START_CAMPAIGN_MISSION → campaigns`,
`SET_BRAND_ACTION_STATUS → calendar` (une Direction du digital peut piloter).

## Conséquences

- Le founder pilote sa mission **dans le cockpit** : lit le brief, démarre, coche ses
  tâches datées, saisit ses vrais chiffres — tout au même endroit.
- **Agnostique** : aucune donnée SPAWT en dur ; SPAWT n'est que du seed data
  (`seed-spawt-gtm.ts` réconcilie ses 2 campagnes sur GTM_90 + lie le Sprint Abidjan à la
  Mission 2). N'importe quelle marque en bénéficie.
- Cap APOGEE 7/7 préservé (kinds INFRASTRUCTURE, pas de Neter).
- **La perf non branchée reste honnête** : les sources « à connecter » (quiz/app/CRM) sont
  dites, pas remplies de zéros. L'ingestion automatique générique (`INGEST_EXTERNAL_METRIC`
  + `/api/ingest/metrics` + Brevo pull) est le chantier suivant (ADR-0145, PR-B).
- Tests anti-drift créés : couverts par `intent-kinds.test.ts` (pairing SLO),
  `cockpit-vocabulary.test.ts` (registre client), les 3 tests DS.

### Résidus (RESIDUAL-DEBT)

- FK durable `BrandAction.missionId` (le pont `metadata.missionKey` est le stopgap).
- Re-datation du Sprint Abidjan sur la fenêtre opérateur (7–21 août) via tunnel post-deploy.
- Ingestion externe générique + Brevo pull → PR-B (ADR-0145).
