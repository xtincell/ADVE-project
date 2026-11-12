# ADR-0235 — Prémisses ADVE de planification et projections S

**Status** : Proposed — candidat537 reçu en contrôles, HTTP et natif locaux ; production non livrée
**Date** : 2026-11-03
**Phase** : 7 — irrigation des budgets et objectifs d’engagement
**Depends on** : ADR-0023, ADR-0088, ADR-0089, ADR-0228, ADR-0229, ADR-0231, ADR-0234
**Supersedes** : aucun ; étend les domaines et lecteurs existants

## Contexte

La livraison536 reçoit le modèle financier commun et la cohérence calculée,
mais des sorties S de budget et de progression restent absentes. Des coûts par
période non comparable ne peuvent produire une enveloppe, ni un nombre d’actions
produire une population engagée. Le contrat opérateur impose de compléter les
prémisses ADVE puis de calculer, sans inventer un résultat dans S.

Audit anti-doublon : FinancialAmount/SourceReceipt, financial-document,
devotion-ladder, roadmap-routes, generateStrategy/computePillarS, mapBudget et
les champs S existent. Ils sont étendus ; aucune nouvelle table, migration,
route, service, Intent ou gestionnaire d’appels. S reste non éditable.

## Décision

### Prémisses monétaires V et temporelles explicites

V.strategyBudgetModel porte `adve-strategy-budget-v1`, reçu de source,
qualification PROPOSED/DECLARED, devise, horizonMonths, daysPerMonth et
phaseWindows. Chaque profil par canal porte fallbackRange, adHocOccurrences,
categoryShares et note ; fallbackPeriod est un postulat optionnel explicite parmi
ONE_OFF/MONTHLY/QUARTERLY/YEARLY. Les cinq postes production/media/talent/logistics/
technology couvrent exactement100 % ; canaux uniques et phases bornées à
l’horizon. `envelopePolicy: UPPER_BOUND` nomme la convention prudente.

Le budget financier de fonctionnement d’ADR0234 et le budget des actions sont
des périmètres distincts : la planification n’ajoute pas automatiquement ses
montants aux charges ni à un budget autorisé. Les notes et références qualifient
les postulats, sans devis reçu ou adoption humaine fabriqués.

### Actions retenues vers une enveloppe comparable

`projectStrategyBudget` dans roadmap-routes lit les actions du scénario et le
modèle V. Fenêtre + période + cadence donnent les occurrences : ONE_OFF une fois,
MONTHLY par mois, QUARTERLY/YEARLY par périodes entamées ; PER_OCCURRENCE emploie
cadence, daysPerMonth ou nombre AD_HOC explicite ; ONE_SHOT compte pour une
occurrence. Aucune annualisation implicite. La période de coût d’I reste
prioritaire : fallbackPeriod n’est consommé que si cette période est absente ou
UNSPECIFIED. Sans période connue ni postulat explicite V, le calcul refuse de
chiffrer. Une source décrivant une animation mensuelle peut justifier MONTHLY
comme postulat qualifié ; la cadence seule ne transforme pas un coût en mensualité.
La fourchette d’action prime, puis montant qualifié ; sinon la fourchette de
secours du profil V. Une prémisse absente retourne un calcul incomplet et doit
être complétée à sa source, sans coût zéro inventé. Recevoir ces règles sur les
trois scénarios, pas seulement sur celui actuellement retenu : absence refusée,
repli explicite accepté, unité I conservée et ONE_SHOT compté une fois.

Les bornes min/max et lignes sont conservées dans budgetSummary.plan avec
source, qualification, devise et horizon. globalBudget est la somme des bornes
hautes, explicitée comme enveloppe prudente et non comme devis ou dépense.
Ventilation des centimes par catégories avec conservation des bornes ;
budgetBreakdown expose leurs bornes hautes. budgetByDevotion regroupe le même
chiffrage selon le niveau d’engagement ciblé par les actions : seconde lecture
du coût, jamais un supplément. Les trois scénarios restent construits depuis
les préférences I et les règles de couverture existantes.

### Cohorte prospective E vers cibles S

E.devotionProjection porte cohorte audience/persona, reçu de source,
qualification, fenêtre, spectateurs et cinq taux FinancialAmount qualifiés
(interest, participation, engagement, advocacy, prescription), phases/scales et
notes. Les taux doivent être explicites entre0 et1. La base de phase est
spectateurs × scale ; chaque niveau multiplie le précédent par son taux.
Les résultats sont arrondis en cibles de personnes, pas en observations ; les
étapes successives ne s’additionnent pas. `projectDevotionFunnel` produit
S.devotionFunnel avec cohorte, fenêtre, qualification et source ; aucune
écriture de DevotionSnapshot, aucun client payeur ou partenaire confondu avec
le trafic. Le modèle E reste distinct du modèle de cohorte payeuse V.

### Admission gouvernée et compatibilité des canons

operatorAmendPillar admet chaque nouveau modèle entier avec une version de pilier
attendue obligatoire ; ses sourceReceipts sont réunis aux reçus documentaires
existants. E.cohortPersonaId doit résoudre vers un persona D portant le rôle
COMMUNICATION_AUDIENCE. La version D lue participe au contrôle de concurrence
au write : une évolution concurrente de ce persona ne valide pas silencieusement
une ancienne cohorte. Aucun nouveau writer ni contournement de provenance.

Ces modèles prospectifs supplémentaires restent optionnels dans la maturité
ADVE, comme financialModel, afin de conserver les canons existants qui alimentent
les résultats par leurs autres informations qualifiées. Cela n’allège pas le
contrat aval : globalBudget, budgetBreakdown, budgetByDevotion et devotionFunnel
restent des sorties S obligatoires. Modèle optionnel n’implique jamais résultat
manquant acceptable. Le rejet vide explicitement calculé est une valeur valide,
comptée sans inventer un rejet.

### Raccords et surfaces existants

Les prémisses entrent dans ADVE sur les rails d’amendement/version/provenance
existants ; les résultats restent dérivés via S. `mapBudget` conserve résumé,
ventilation et cibles ; cockpit et Oracle réutilisent BudgetPanel et
DevotionTargets. Le sprint sépare l’action, son critère et son budget sur une
carte pleine largeur. Une liste de rejets calculée vide satisfait le champ
sans fabriquer de rejet. Aucune de ces lectures n’arme une campagne ou une dépense.

### Cardinalité du plan dérivé

La lecture native locale reçoit S complet en présence de champs, mais Notoria
le refuse : ENRICHED_S exige cinq actions de sprint, quand COMPLETE en accepte
une. Les cardinalités des axes, sprintActions, roadmap et selectedFromI sont
alignées sur un minimum d’une entrée. Une stratégie conservatrice courte reste
recevable sans ajouter d’actions pour satisfaire un quota. Ce choix ne supprime
aucune cellule requise, qualification ou validation de contenu : vide et entrée
malformée restent refusés. Les contrôles finaux reçoivent le petit plan valide et
les contre-exemples refusés ; le parcours HTTP reçoit les trois scénarios et la
lecture native reçoit S complet dans Notoria après ce delta.

## Conséquences et réception

Réception locale finale537, deltas de cardinalité et de période inclus :
5 121 tests unitaires/498 fichiers verts, 17 tests PostgreSQL ciblés, typage/lints
sans erreur (25 avertissements), zéro cycle, build webpack et stress compilé
exit 0. Le parcours HTTP reçoit les trois scénarios COMPLETE, à 100 % et frais,
avec bornes budgétaires conservées et parité exacte des quatre racines S/Oracle.
La lecture native finale reçoit la roadmap à 100 % socle/champs, statut Complet,
et les quatre piliers ADVE ainsi que S complets dans Notoria. R/T/I restent
périmés dans la seule fixture, où leur cascade n’a pas été demandée ; aucun
état de production n’en est déduit. Les probes HTTP et la recette native sont
des preuves distinctes, toutes deux locales. Les reçus antérieurs restent des
checkpoints, pas les preuves finales du dernier delta.

537 n’est pas livrée : CI/image/runtime et conservation après livraison restent
ouverts. Les propositions réelles de complément ADVE sont préparées hors
checkout, pas appliquées. La réception globale demande encore S à 100 % et huit
piliers complets dans Notoria sur le dossier réel, sans conversion de postulats
en résultats observés. Les reçus536 restent distincts.

Le raccord d’un devis/prestataire remplaçant l’estimation sur une responsabilité
partielle relève toujours du volet non reçu d’ADR0228 §§5–6 ; cette ventilation
ne prétend pas le livrer. Aucune somme ou population de marque privée publiée.
Readiness legacy, autres marques/régions, Oracle/ADVE/MVP entiers et sept chantiers
restent ouverts. Reprise/réception : RESIDUAL-DEBT et REFONTE-PLAN.
