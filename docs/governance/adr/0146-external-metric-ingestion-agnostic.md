# ADR-0146 — Ingestion de métriques externes agnostique (quiz / app / CRM / email / terrain)

- **Status** : Accepted
- **Date** : 2026-07-14
- **Phase** : Post-clôture (chantier rapport de mission cohérent)
- **Depends on** : ADR-0144 (fiche mission founder single-pane), ADR-0145 (tokens API MCP scopés), ADR-0124 (spine d'émission)
- **Supersedes** : —

## Contexte

La fiche mission founder (ADR-0144) affiche l'exécution (tâches datées) et une saisie
manuelle de perf AARRR, mais l'état des **sources de données** était figé : QUIZ / APP /
CRM disaient « Remontée automatique — **bientôt** ». L'opérateur veut de quoi **préparer
automatiquement un rapport de mission cohérent** à partir des activités réellement
effectuées, et pose une contrainte structurante :

> « les outils doivent être **agnostiques**. une autre marque peut vouloir piloter un
> **quizz** » (opérateur, 2026-07-13)

Autrement dit : pas de canal codé en dur pour une marque. Un quiz d'acquisition
(`quizz.spawt.online`), une app mobile, un CRM, une newsletter, une remontée terrain
doivent tous pouvoir **pousser des chiffres réels** dans le tracker AARRR de la campagne
et/ou les KPI d'activité de mission, avec une **provenance honnête**.

État constaté (audit anti-doublon) :

- `CampaignAARRMetric` (funnel AARRR par campagne) et `MissionActivity.kpiActual` (KPI
  d'activité) **existent** — cibles d'écriture, pas à recréer.
- `Signal` (strategyId × type × data) est le **modèle de provenance** déjà utilisé par
  `ANUBIS_SYNC_COMMERCE` (type=COMMERCE_METRICS) et l'audit T8/T9 — on réutilise le motif
  avec un nouveau `type=EXTERNAL_METRIC`.
- L'auth `authenticateMcpRequest` + les **tokens scopés** `McpApiKey` (ADR-0145) donnent
  déjà une clé « une marque » vs « système entier », rotable, « pour toujours » — la même
  clé qui lit/édite un ADVE sert à **pousser des métriques**.

Manquait : **une voie d'entrée générique** pour ces chiffres externes.

## Décision

Nouvel Intent gouverné **`INGEST_EXTERNAL_METRIC`** (governor ANUBIS — Comms/connecteurs
entrants, cohérent avec les kinds `ANUBIS_SYNC_*`), **déterministe (zéro LLM)**, émis par
un **endpoint HTTP brut** `POST /api/ingest/metrics`.

**Contrat agnostique** (aucune forme de marque codée en dur) :

```
{ strategyId, sourceType: QUIZ|APP|CRM|EMAIL|FIELD|WEBHOOK|MANUAL, sourceLabel?,
  campaignId?, missionId?, period?, metrics: [{ stage?, metric, value, target?, kpiActivityId? }] }
```

**Routage par cellule** (chacune indépendante, jamais fabriquée — `metric-ingest.ts`) :

1. `stage` AARRR **+** `campaignId` → **upsert `CampaignAARRMetric` idempotent** (clé
   logique campagne × stage × metric × période ; ré-émettre **écrase** la valeur au lieu
   de dupliquer — « valeur courante de ce point de funnel cette période »). Garde
   anti-cross-brand : la campagne doit appartenir à la marque.
2. `kpiActivityId` → **`MissionActivity.kpiActual = value`**, gardé par portée (l'activité
   doit appartenir à une mission de **cette** marque, et à `missionId` si fourni).
3. **TOUJOURS** un `Signal type=EXTERNAL_METRIC` de provenance (sourceType + label +
   horodatage + cellules). C'est LUI qui **allume honnêtement** une source dans la fiche
   mission (récence réelle sur 30 j), remplaçant le « bientôt » figé.

**Auth de l'endpoint** (précédence) : token MCP scopé `x-api-key` (serveur `ingest` ou
`*`) ou session ADMIN via `authenticateMcpRequest` — un token **BRAND ne pousse QUE sa
marque** (fail-closed `SCOPE_DENIED`), call **facturé** (metering existant) ; sinon
`Authorization: Bearer <CRON_SECRET>` pour une source **interne** SYSTEM (pull/cron), non
facturé. La route n'écrit rien elle-même : elle authentifie, garde la portée, et **émet
l'Intent** (spine ADR-0124 + cost-gate + audit).

## Conséquences

- **0 migration Prisma** : `CampaignAARRMetric` / `MissionActivity` / `Signal` inchangés ;
  la provenance vit dans `Signal.data`. On **étend, on ne double pas**.
- **Rapport de mission cohérent** : le tracker AARRR + les KPI d'activité se remplissent de
  chiffres RÉELS poussés par les sources ; la fiche mission dit désormais « Dernière
  remontée le … » (réel) au lieu de « bientôt » (promesse).
- **Agnosticisme** respecté : aucune marque, aucun canal n'est spécial ; SPAWT pousse son
  quiz exactement comme une autre marque pousserait son app ou son CRM.
- **Cap APOGEE 7/7 préservé** — aucun Neter ; ANUBIS gouverne, dispatch via commandant.
- **Tests anti-drift** : `external-metric-ingest.test.ts` (schéma agnostique, routage par
  cellule, idempotence de clé logique, garde de portée BRAND, provenance toujours écrite) ;
  `intent-kinds.test.ts` couvre le pairing SLO.
- **Résidus (tracés RESIDUAL-DEBT)** : le **pull** (aller chercher chez le fournisseur —
  Brevo, un CRM) reste à câbler par connecteur (le motif push est prêt ; un cron
  `verifyCronSecret` peut pousser en interne) ; l'**exposition de l'ingestion comme outil
  MCP scopé** (au lieu de l'endpoint brut) suit le même chemin qu'ADR-0145 §4.
