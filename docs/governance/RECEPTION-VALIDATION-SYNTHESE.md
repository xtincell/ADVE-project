# Réception — approbation de la synthèse, runtime 6.27.436

État au 2026-10-09 : **source/CI/image/runtime reçus, métier partiel**. Source
80e2122ffebfce42f8edd37e3430c746a200076d ; runtime courant 436.
Lecture réelle de SPAWT reçue ; aucune approbation ni production réelle de marque.
[ADR-0214 Proposed](adr/0214-synthesis-approval-preserves-confidence.md).

## Contrat et rayon de correction

La décision d’état est factorisée dans pillar-gateway/validation-status.ts,
réutilisée par strategy.validateSynthesis et pillar.transitionStatus sous
LEGACY_PILLAR_TRANSITION_STATUS existant. Aucun modèle/service/router/kind/
outil/Neter/page/permission supplémentaire. S composé signifie contrat canonique
ENRICHED/COMPLETE et PillarSSchema strict ; l’approbation ne reçoit pas les
exigences supplémentaires de maturité COMPLETE.

Version relue, sources/fraîcheur, acteur et portée actuels sont contrôlés sous
verrou de Strategy/Pillar. S.validationStatus et Strategy.status sont atomiques ;
retry de la même version sans seconde écriture, retrait DRAFT de Strategy VALIDATED.
La confirmation conserve confidence/content/provenance/version. null/invalide
restent inconnus, zéro reste zéro ; forceConfidence compatible ne produit pas 1.0.
Les références S déclarées vers une cible absente sont refusées, sprint inclus.
L’approbation S ne déclenche aucun fournisseur.

La page forge existante rend composition et refus, conserve la mesure après
approbation et lie la confirmation à la version relue. generateProjectsFromActions
exige l’opérateur et S approuvé/composé/frais au début de la commande. Les autres
chemins indépendants de campagne/actif sont inchangés.

## Preuves disponibles et réceptions encore requises

- Checkpoints PostgreSQL locaux synthétiques : neuf rouges sur l’ancien code,
  puis neuf et treize verts après correction ; checkpoint green-4.log :
  quatorze ciblés verts, refus de generateProjectsFromActions sans S approuvé
  avant tout effet inclus. Un échec de cleanup par clé étrangère reste
  historique, sans effacement du rouge.
- Les cas portent sur absence/partiel, confiance faible/zéro/inconnue, refus
  stale/version/référence, scope/rôle révoqué, atomicité, retry/concurrence.
  Les suites complètes restent distinctes de ce fichier ciblé.
- Suites locales complètes : unit-final.log reçoit 4 190 tests/400 fichiers verts ;
  postgres-final.log reçoit 288 tests/15 fichiers verts, les 14 cas S inclus.
- CI exacte 37979818869 success sur source 80e2122f : 4 190/400 unitaires et
  288/15 PostgreSQL reçus ; Chromatic 37979818760/Mission 37979818867 success.
  Image 37980217686 success exacte source 80e2122f : index
  sha256:19e64c96481cd2255e3af21348f7660d427655375fbbae5f7bc43a93ee99c8ec,
  configuration candidate/publiée identique et registre concordant.
- Déploiement unique kjlvdrd0yvvafnhk8khnlonj terminé à 19:39:09 UTC ; runtime.json
  reçoit 436/nextjs/conteneur suffixe 193805599055/volume privé RW/digest exact et
  /api/version HTTP 200. Source/image/runtime sont distincts du prochain commit
  documentaire ; aucun nouveau déploiement requis par ces seules docs.
- Contrôle CI du schéma non reçu : « Schema diff vs migrations » exige
  datasource.shadowDatabaseUrl absent. Le warning schema-ahead ne prouve pas
  un drift, et 436 ne modifie aucun schéma/migration. ci-schema-diff-unreceived.json
  trace la comparaison sur shadow jetable avant C7 ; aucune migration déduite.
- Native locale synthétique : absence et S partielle affichées non approuvables ;
  S composée à .22 ouvre une confirmation, l’approbation conserve 22 % visible
  et affiche « Synthèse approuvée ». Confiance null : confirmation puis approbation
  conservent « non mesurée ». Modification 1→2 entre avertissement et confirmation :
  conflit 409/message visible, puis nouvelle lecture et approbation réussies.
  Cinq cas reçus dans native-receipt.json ; hash du contenu inconnu identique
  avant/après, zéro AICostLog, aucun projet ou fournisseur lancé.
- Fenêtres d’approbation et de conflit complètes, truncated=false/hasMore=false.
  Anciennes fenêtres de navigation tronquées ; timeouts de compilation dev
  récupérés sur la même instance. Capture native-inconnue-apres.png inspectée
  dans le contexte « Recette 436 ». Aucune assertion globale zéro erreur,
  latence de production ou SLO ne découle de ces gestes locaux.
- La revue native a révélé une boîte Risque attribuant à une confiance faible/null
  des hypothèses non validées sur les futurs briefs/KPI. Cette déduction non
  établie est retirée ; lien « Relire la synthèse et ses sources », route inchangée.
  Copie finale native reçue après redémarrage sur le même compte local : modal
  « Confiance non mesurée », lien attendu et ancien Risque absent ; confirmer
  rend « Synthèse approuvée » et confiance —. Deux réponses validateSynthesis
  HTTP 200, bodies relus ; fenêtre complète truncated=false/hasMore=false,
  zéro ≥500/exception sur ces gestes seulement. native-copy-receipt.json : null
  conservé, hash contenu identique, AICostLog=0, aucun projet/fournisseur.
  Capture native-copy-finale.png inspectée ; ce retrait ne certifie aucune
  hypothèse ni production.
  Après redémarrage mémoire, même authentification locale conservée ; page forge
  HTML HTTP 200 reçue en compilation froide à 66 s. Probe antérieur : DOM
  7 086,7 ms/response 6 578,1 ms/load 20 547,9 ms ; titre observé seulement à
  une borne tardive 227 594 ms, pas sa première apparition chronométrée.
  Aucun exact first paint, latence de production ou SLO déduit.
- Verrou rééprouvé : une ligne confidence=1.0 réintroduite donne trois cas
  ciblés rouges (onze non sélectionnés), puis restauration octets/hash exacte
  donne les trois verts. fault-bite.json atteste redExit=1/greenExit=0 et
  sourceRestored=true ; aucun défaut laissé en place. Next arrêté.
- Premier gauntlet : tsc/lint/lint:governance/audit:cycles exit 0. Gouvernance :
  deux échecs sur le pointer de ligne préexistant du seed dans strategy.ts,
  décalé 93→95 par imports ; pointer corrigé, quatre cas ciblés verts dans
  governance-fixed.log, aucun bypass ajouté. Gauntlet final reçu dans gauntlet.json :
  tsc/lint/lint:governance/audit:cycles/gouvernance cinq exit 0 ; gouvernance
  1 620/166, DS trois/vocab cockpit cinq verts, 24 warnings préexistants.
- Cleanup reçu dans fixture-cleanup.json : zéro stratégie synthétique exacte,
  serveur local arrêté. next-env.d.ts restauré après sa seule dérive générée ;
  aucun actif de marque réelle modifié par la recette.
- Stress-full : premier essai sans finding mais HTTP skipped après démarrage
  froid/bornage 5 s, historique non reçu. Second essai sur serveur chaud terminé
  exit 1 : 32 HTTP reçus/230 non reçus/19 pages FETCH_FAILED et trois queries
  FETCH_FAILED, 22 findings. Le log Next « Server is approaching the used memory
  threshold, restarting » explique l’interruption du dernier segment ; heap dev
  8 192 MiB déjà réglé, aucun flag production modifié. Ce stress n’est pas vert,
  crawl anonyme seulement : aucune réception protégée, de cycle ou fournisseur.
  Reprise datée dans la dette existante du harnais : recette globale C4/C5 sur
  artifact build et instance isolés, diagnostic mémoire si récidive.
- Vitrines SPAWT relues nativement : spawt.online et bientot.spawt.online rendent
  six questions et aucun décompte expiré, captures texte privées conservées.
  Identité vitrine déjà projetée v6 ; quiz/app et autres retours non reçus par
  cette seule relecture. Portefeuille SPAWT reçu avant swap en runtime 435 :
  cinq produits/services, site et quiz Actifs, autres branches à achever ;
  ces statuts ne reçoivent pas leur cycle opérationnel complet.
- Native production réelle SPAWT, lecture seule en 436 : S **existe**, confiance
  .912 affichée 91 %, AI_PROPOSED/currentVersion=3, composed=false/canValidate=false
  et bouton désactivé. getSynthesisConfidence HTTP 200/body relu ; aucune
  approbation ou production. Capture native-production-spawt.png inspectée.
  Fenêtre complète : 62 réponses/zéro ≥500/exception ; 17 Fetch ERR_ABORTED
  canceled=true conservés, aucune assertion zéro transport global. DOM 811,2 ms/
  response 656,7 ms/load 1 573,9 ms, titre observé à une borne haute 14 285 ms
  seulement ; aucune latence exacte de première apparition ni SLO reçu.
- Contrat de composition réel en désaccord : readiness canonique COMPLETE/100,
  stale=true, alors que le schéma S strict refuse 80 chemins de types/liens/
  structure. Ce ne sont **pas 80 faits business absents**. La fraîcheur est un
  constat distinct. native-s-composition-contract-conflict.json impose une
  réconciliation des contrats/formes historiques/S calculé, sans gate affaiblie,
  approbation forcée ou contenu inventé.
- Lecture du portefeuille FrieslandCampina et du projet EVAP Noël en runtime
  435 avant swap : huit marques/26 campagnes/46 projets/101 références/
  177 assets/188 éléments d’identité. EVAP — End Of Year 2026 est rendu une fois
  avec Bonnet Rouge/Peak/Belle Hollandaise, brief/dates/livrables, budget non
  renseigné, liens Radar FRC-076 et La Barre PRJ-EOTY26. Dates/périmètres inférés
  restent indiqués comme tels. Ouvrir ce projet ne livre pas la campagne ; ces
  gestes n’ont pas de fenêtre de métriques isolée et ne reçoivent aucun cycle Noël.
- Stress reçu, postmerge documentaire et audit global : **à recevoir**. Aucun SLO
  ou couverture globale n’est déduit des tests locaux intermédiaires.
- Aucune approbation SPAWT/FrieslandCampina, aucune production/facture fournisseur,
  ni cycle Noël 2026 ne sont reçus. Les preuves privées restent hors dépôt.

## Limites et prochaine reprise

Les autres écrivains globaux, auto-approval/content writers et consommateurs S
ne sont pas couverts par la réparation des deux routes. Revue statique bornée
dans global-s-followup-static.json : writePillar OPERATOR préserve validationStatus
par défaut en incrémentant currentVersion ; canon-sync rafraîchit S.computed/content
directement ; le préalable sequence-vault considère confiance ≥0.6 OU VALIDATED.
Ces constats exigent une recette, pas une conclusion sur leurs comportements
globaux ou E2E. Le conflit réel de composition de SPAWT demande d’abord la
factorisation des contrats de forme et du calcul de S depuis ses sources,
puis leur réception par les consommateurs, avant C3/C4/C6. La transaction de
précondition des projets se termine avant leurs écritures ; contrôler une
source au début n’est pas une preuve d’atomicité face à une modification
ultérieure. Auditer ces chemins et recevoir les refus/correction de source au
prochain lot transverse S, avant acceptation C3/C4/C6.

Fermer le postmerge documentaire distinct du code 436 déployé ; recevoir
ensuite une revue humaine de noyaux réels et le cycle demandé avec ses fournisseurs,
actifs, mesure et retour de valeur. Sept chantiers/dix gates restent non acceptés.
[Dette et déclencheur](RESIDUAL-DEBT.md) · [plan](REFONTE-PLAN.md).
