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

## Amendement du 2026-10-13 — contrat 455 candidat, réception locale bornée

### Contexte de l’amendement

Le contrat historique ci-dessus est conservé. La sonde 453 sur copie reçoit deux Signaux pour une observation identique, identité/version/temps observé éliminés et mois 2026-99 accepté ; aucune donnée joueur réelle. Le writer 454 laisse une mesure malgré l’échec du reçu, reproduit sur PostgreSQL isolé. Cet amendement précise la primitive existante ; il remplace pour le writer 455 l’hypothèse historique qu’une réémission crée toujours une nouvelle provenance ou qu’une clé logique seule reçoit l’idempotence atomique. Aucun modèle, migration, service, route, Intent kind, outil ou fournisseur ajouté.

### Décision amendée

- Le contrat partagé `domain/external-metric.ts`, ré-exporté par l’API, accepte le trio `observationId/sourceVersion/observedAt` complet ou aucun de ces champs pour une source legacy inconnue. Date ISO avec offset, mois 01–12, objets stricts et destinations non dupliquées. Date observée et réception sont distinctes ; legacy sans date reste inconnu.
- `Signal.data` conserve payload normalisé, SHA256 après tri des cellules par comparaison de chaînes sans locale, date de réception, destinations réellement écrites et outcome immutable. Identité scoped marque/sourceType/observationId : rejeu exact retourne le même Signal/outcome sans effet sur mesures ou KPI ; payload différent sous cette identité est VETOED/HTTP 409 au contrat. SourceVersion fait partie du payload, aucune modification silencieuse de l’observation retenue.
- Écritures AARRR/KPI et reçu sont dans la même transaction avec verrou advisory par marque. Une erreur du reçu annule les effets. L’objectif omis est conservé ; observation ancienne ou legacy sans date ne supplante pas une mesure datée. Ambiguïté historique ou conflit de mesure conservés/non écrits, sans purge ou arbitrage fabriqué.
- Authentification, scopes et `meterMcp` existants restent en place ; l’idempotence des données ne signifie pas gratuité du transport. Gazette rend mesures/origine/version/date, `getMissionCockpit` distingue réception/date observée inconnue ou ancienne et refuse mission d’une autre campagne. Ces projections sont candidates, réception écran encore attendue.

### Conséquences et bornes de réception

Contrat initial 14 rouges/un succès, puis ciblés 40 tests / 5 fichiers verts ; 13 vrais tests PG 17.9 isolés verts après contre-exemple du writer 454. Deux rouges de CODE-MAP sont corrigés par la régénération officielle. Checkpoints antérieurs : ciblés 39 / 5, DEFAULT 4 404 / 420 et cinq contrôles verts. Après dernier tri, ciblés 40 / 5, DEFAULT final 4 405 tests / 420 fichiers et cinq contrôles finaux reçus, sortie zéro. HTTP local réel 455 : admission/rejeu 200 même Signal, conflit 409 OBSERVATION_CONFLICT, mois invalide 400 et intermarque 403. Anonyme initial 200 par fallback cron de développement existant sans secret, 401 après configuration de recette encore non reçu ; timeouts conservés, aucune faille production ou SLO déduit. Premier full PG refusé par garde HARD locale de port, fixture déplacée sans changement de garde ; full PostgreSQL 17.9 avant ce dernier tri reçu 371 / 19 sans skip au port 55439 et cinq contrôles finaux à zéro (gouvernance 1 627 / 166, deux lints 24 avertissements existants/zéro erreur). Écran/source/CI/image et production 455 attendus. Aucun résultat joueur ou cycle complet inventé.

`native-data.json` reçoit un Signal/un point AARRR valeur 6/KPI 6 malgré rejeu/conflit, sourceVersion/date conservés. Trois appels MCP (2 OK/1 ERROR) et quatre émissions restent distincts des effets métier ; zéro Pillar de fixture et tarif de recette nul seulement. HTTP/data portent une cellule inchangée par le tri ; ordre multi-cellules/rejeu reçu au ciblé. Récepteurs Next arrêtés, données conservées et next-env restauré. Aucun refus anonyme 401 ou écran reçu.

Legacy sans identité/date ne peut pas recevoir le même contrat de rejeu qu’une observation identifiée. Les ambiguïtés historiques et l’écrivain manuel AARRR restent à auditer : le verrou du writer ANUBIS ne démontre pas que tous les écrivains sont coordonnés. **Plan, effort et déclencheur C3-02/C3-03** : un lot de vraie route, projections, concurrence/rejeu/refus sur copie puis image exacte avant branchement réel ; préserver les originaux, qualifier le manuel et les historiques, sans migration ou nouveau pipeline présumé. [Dette observations conservée](../RESIDUAL-DEBT.md), [réception candidate](../REFONTE-PLAN.md). Onze reçus bornés inchangés ; aucun chantier, gate, parcours, lignée ou cycle entier reçu.
