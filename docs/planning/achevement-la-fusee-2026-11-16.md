# Faire fonctionner La Fusée de bout en bout

Suivi de cette exécution : [rapport du 16 novembre](rapport-execution-la-fusee-2026-11-16.md). Les points de départ ci-dessous conservent leur date d’observation ; le rapport porte les réceptions ultérieures.

Plan établi le **16 novembre 2026**, à la demande d’Alexandre. Source examinée : `ADVE-project`, `main` **39423e6a6dfdf2ee5caeed118ecf35ba8c548613**, version **6.27.587**. Synchronisation Git vérifiée le 16 novembre. **Plan à exécuter ; aucune capacité n’est déclarée reçue par sa rédaction.**

Ce document ordonne les travaux du [registre des dettes](../governance/RESIDUAL-DEBT.md), du [plan de refonte](../governance/REFONTE-PLAN.md) et du [plan de production](moteur-de-production-social.md). Il constitue leur point d’entrée pour cette reprise. Les preuves détaillées restent dans leurs registres respectifs ; les documents historiques ne sont pas réécrits en bloc.

## Résultat recherché

Un client peut entrer, obtenir une analyse fidèle de sa marque, accepter une offre, payer, accéder à ses livrables et les retrouver. L’équipe peut corriger le dossier, préparer une campagne, produire des fichiers conformes, les faire approuver, les remettre ou les publier et consulter les résultats effectivement observés. Les rôles, les versions, les coûts et les autorisations suivent cette chaîne. Une interruption, une révocation ou une restauration préserve les données et permet une reprise explicable.

Le périmètre comprend **toutes les capacités exposées ou commercialisées de La Fusée**, ses portails et leurs raccords nécessaires : La Barre, Radar, Argos, DataCollector, MCP et les fournisseurs retenus. La réécriture des autres produits de la flotte n’est pas un préalable implicite. Chaque capacité externe promise entre dans la recette ; une capacité volontairement différée reste nommée et interdit d’annoncer une complétude générale.

Le pilotage relève de Console/Admin et des responsables des sous-systèmes existants. La chaîne métier reste Guidance → Propulsion → Comms → Telemetry, soutenue par Operations, Sustainment et Crew Programs. Elle réutilise notamment `Strategy`, `Pillar`, `BrandDataSource`, `BrandAsset`, `GenerativeTask`, `AssetVersion`, `Mission`, `SocialPost` et les émissions gouvernées. La contribution à la mission est de rendre exécutable et mesurable le cycle de développement des marques ; aucun nouveau moteur ou concept de score n’est requis par ce plan.

## Ce qui est acquis, ce qui doit être vérifié

| Point de départ | Conséquence pour le travail |
|---|---|
| CI du commit `39423e6` reçue le 12 novembre : typage, lints, unitaires, PostgreSQL et build verts. | Réutiliser les contrôles ; les rejouer sur chaque modification pertinente. Un résultat de CI ne reçoit pas un parcours client. |
| Dernière réception de production citée en tête de la dette : **6.27.586 le 12 novembre**. | Lire la version servie avant toute livraison. La présence de 587 sur `main` ne prouve pas son déploiement. |
| Le contrôle hebdomadaire du 15 novembre échoue sous Node 20, alors que CI principale et Docker utilisent Node 22. | Corriger le contrôle : APIs absentes, exigence d’un `.env` non créé et notification sans permission. Ne pas classer ces erreurs comme panne de production. |
| L’inventaire des formes ADVE a **déjà tourné en production le 12 novembre** : 274 piliers lus, 263 refusés par le schéma strict ; 546 valeurs refusées étaient néanmoins comptées présentes par la maturité. | Priorité à la normalisation sémantique et aux compteurs de complétude. Ce relevé est historique, pas un nouvel audit de la base aujourd’hui. |
| Une cascade et les 35 sections Oracle ont été reçues sous 540 le 3 novembre. | Vérifier leur fraîcheur après les changements ultérieurs ; ne pas annoncer que rien n’a jamais fonctionné. |
| F2/F4/F8/F9/F13, IN1/IN7, DC3 et LB3/LB4 sont clos côté code dans l’inventaire Shinkiro mis à jour. | Recevoir les usages restants et les versions servies ; ne pas reconstruire les correctifs ni rouvrir mécaniquement d’anciennes PR. |
| Les offres et la grille 5.13 ont été approuvées le 12 novembre dans Shinkiro. Le paiement manuel existe à côté de CinetPay. | Reprendre ces décisions. Une clé CinetPay absente ne bloque pas à elle seule le parcours manuel. |
| Le checkout local est propre ; dépendances, environnement privé et base de recette ne sont pas installés. | Préparer un environnement isolé avant les essais. Aucune suite locale n’a été exécutée pour écrire ce plan. |

Sources : [dette actuelle](../governance/RESIDUAL-DEBT.md), [CI du commit](https://github.com/xtincell/ADVE-project/actions/runs/43253278677), [contrôle hebdomadaire](https://github.com/xtincell/ADVE-project/actions/runs/43720391091), [inventaire Shinkiro, révision consultée](https://github.com/xtincell/shinkiro/blob/74b0b9ae21b598526f9bc4c4dc1c4a68121a7c80/docs/INVENTAIRE-POINTS-OUVERTS.md), [plan Shinkiro, même révision](https://github.com/xtincell/shinkiro/blob/74b0b9ae21b598526f9bc4c4dc1c4a68121a7c80/docs/PLAN-ACHEVEMENT.md). Les nombres de ces documents ne constituent pas un taux d’avancement actuel.

## Ordre des travaux

Les numéros L00–L14 ci-dessous sont des lots de ce plan, pas de nouvelles entités du produit.

| Étape | Lots | Sortie attendue avant de poursuivre |
|---|---|---|
| **1. Installer, contrôler et pouvoir restaurer** | L00, L01, L02, L03 ; début L14 | Version connue, recette isolée, contrôles fiables, droits éprouvés, restauration reçue avant correction de données réelles. |
| **2. Rendre les dossiers fiables** | L04, puis L05 | Sources exactes, données conformes et qualifiées, dérivés calculés depuis les bonnes versions. |
| **3. Recevoir la stratégie et les livrables** | L06 ; recettes de L13 à chaque lot | Oracle et Playbook utiles, fidèles, relus ; calendrier et versions cohérents. |
| **4. Produire, remettre, diffuser et observer** | L07 → L08 → L09 | Fichiers matériels conformes, publication autorisée identifiable, mesures sourcées et relues. |
| **5. Fermer les parcours commerciaux et collectifs** | L10, L11, L12 | Vente/paiement/remise, missions et raccords interapplications reçus sous les bons rôles. |
| **6. Recevoir le produit exploitable** | L13, L14 et recette finale | Parcours complets, reprise après panne, coût et charge mesurés, responsabilités de service établies. |

**Parallélisation.** L02 et L03 démarrent dès que l’installation isolée de L01 est prête, sans attendre une nouvelle livraison de production. L10 prépare offre/paiement après L02 et les prix approuvés ; sa recette acheteur attend L04a, sa remise L06. L12 se prépare après L02 et ferme ses consommateurs après L04a/L05. L04a normalise les dossiers pilotes et ouvre le cycle de marque ; L04b étend la correction aux autres dossiers actifs en parallèle et reste obligatoire avant clôture globale. La recette d’interface L13 accompagne chaque livraison. La mesure avant intervention est préparée dès L00 ; L09 reçoit ensuite le retour réel. Une dépendance documentaire peut être levée par une preuve existante relue, sans refaire le travail.

**Chemin critique du premier cycle de marque :** L00 → installation/contrôles L01 et droits/restauration L02/L03 → L04a → L05 → L06 → L07 → L08 → L09 → recette finale. La fermeture globale ajoute L04b, L10 et les fonctions de collaboration exposées L11/L12. Les travaux ne sont pas réputés terminés lorsqu’ils passent sur une seule marque.

## Lots exécutables

### L00 — Fixer le périmètre et les preuves de départ

- **Responsable :** agent de pilotage, avec le responsable produit pour les décisions de périmètre. **Dépendance :** aucune.
- **Travail :** confronter les routes, menus, manifests, outils, séquences, connecteurs et offres aux registres existants. Inscrire chaque capacité dans une matrice : rôle, entrée, résultat promis, dépendances, chemin manuel/assisté applicable, preuve disponible, manque, responsable et lot. Lire runtime, migrations et comptes de recette sans mutation. Retrouver les reçus privés utiles par les accès existants.
- **Terminé lorsque :** chaque capacité exposée a un statut explicite (« à vérifier », « à corriger », « à configurer », « reçue au périmètre indiqué ») et une recette. Les anciennes lignes « non livré » sont rapprochées des preuves récentes. Toute définition introuvable reste identifiée comme telle. Les listes historiques « 116 parcours/80 lignées/R01–R10 » absentes des dépôts ne sont pas recréées au jugé.
- **Preuves :** matrice versionnée, source Git, image/runtime, rôles et population de départ. Relevés privés hors dépôt. **Sources :** [CODE-MAP](../governance/CODE-MAP.md), [promesses publiques](../governance/RECEPTION-PROMESSES-PUBLIQUES.md), inventaire Shinkiro.

### L01 — Remettre l’installation et les contrôles en état

- **Responsable :** agent technique / Console-Admin. **Dépendance :** L00.
- **Travail :** aligner l’environnement sur Node 22 et le verrou de dépendances ; installer avec `npm ci`, générer Prisma, créer une base de recette PostgreSQL isolée et y appliquer les migrations. Corriger le preflight hebdomadaire : version Node, paramètres factices suffisants, diagnostic d’environnement adapté, permission minimale de signalement et échec final visible même si la notification échoue. Réutiliser le diff schéma/migrations déjà présent en CI. Lire d’abord la version réellement servie. Si 587 n’est pas livrée, préparer sa livraison après réception des droits, de la conservation et du retour arrière L02/L03 ; l’installation de recette n’attend pas cette livraison. Recevoir ensuite la correction Glory/U+0000 sur l’artefact servi.
- **Terminé lorsque :** installation neuve reproductible, contrôles applicables verts sur la même révision, build de production démarrable, migrations concordantes ; un défaut injecté dans le contrôle donne un échec visible et un rapport conservé. Source, CI, image et runtime sont reliés. Aucun besoin de relivrer 587 si sa livraison est déjà démontrée.
- **Preuves :** journaux d’installation/CI, contre-épreuve du preflight, version de l’image et lecture de `/api/version`. **Sources :** [preflight](../../.github/workflows/preflight.yml), [CI](../../.github/workflows/ci.yml), [Dockerfile](../../Dockerfile), dette « 585 ».

### L02 — Recevoir les droits et le cycle des comptes

- **Responsable :** agent technique / Guidance et Console-Admin. **Dépendance :** L01 pour l’exécution.
- **Travail :** connexion, récupération, session expirée, rôles ADMIN/opérateur/founder/agence/créateur et visiteur ; invitations, retrait d’équipe, rétrogradation, suppression, réaffectation et ancienne session ; clés MCP limitées ; identifiants liés étrangers à une marque/équipe. Recevoir les correctifs IN1/IN7/F13 existants et fermer les résidus UI. Vérifier le périmètre financier entre opérateurs. Observer les violations CSP avant de décider d’un passage ciblé de Report-Only à une politique appliquée.
- **Terminé lorsque :** chaque rôle réussit ses gestes autorisés et reçoit un refus approprié pour les autres ; aucun contenu voisin ni ancien accès après révocation. Le comportement reste identique par UI, API et MCP lorsque ces voies existent. Une règle de sortie d’équipe non décidée est présentée avec ses effets précis avant son implémentation.
- **Preuves :** matrice positive/négative avec deux équipes et deux marques, test de session ancienne, refus sans écriture. **Sources :** dette « 559 », « 558 », « 570 », [tRPC](../../src/server/trpc/init.ts), [proxy](../../src/proxy.ts), [CSP](../../next.config.ts).

### L03 — Prouver restauration et retour arrière

- **Responsable :** agent d’exploitation / Console-Admin. **Dépendances :** installation isolée de L01, accès aux sauvegardes et clés ; L02 pour la recette des droits. Cet exercice précède une éventuelle nouvelle livraison réelle de L01.
- **Travail :** restaurer ensemble, sur une cible isolée, PostgreSQL, originaux/médias privés, configuration de chiffrement et données La Barre nécessaires. Vérifier sauvegardes hors hôte, rétention, migration depuis une copie restaurée et retour à une image compatible. Tester téléchargement après expiration d’une URL fournisseur, intégrité des fichiers, références et attestations historiques ; préparer la continuité avant rotation des clés.
- **Terminé lorsque :** dossiers, versions, décisions, empreintes et droits sont retrouvés après restauration ; perte maximale de données et délai de remise en service sont mesurés puis comparés aux objectifs de service. Une sauvegarde dont seule la création est prouvée ne ferme pas le lot.
- **Preuves :** exercice de restauration daté, différences avant/après, fichiers relus et temps mesurés. **Sources :** [RUNBOOKS](../governance/RUNBOOKS.md), dette « C7 », « La Barre », « Continuité des originaux ».

### L04 — Rendre les sources et les données ADVE conformes

- **Responsable :** agent données / Guidance, responsable de marque pour les correspondances sémantiques. **Dépendances :** L02/L03 avant mutation réelle.
- **Travail :** rapprocher documents retenus, éditions, originaux et usages partagés ; éprouver dépôt/rejeu, recherche et citation. Réutiliser l’inventaire strict 583/584, l’actualiser par dossier puis traiter chaque famille de formes incompatibles. Conserver unités, identités, sources, qualifications, valeurs humaines, zéro/false et non-applicabilité. Toute ambiguïté de correspondance reçoit une décision réelle ; admission par gateway avec version attendue. Faire converger compteurs de complétude, schémas, verrouillage et refus d’export.
- **Jalons :** **L04a** reçoit d’abord les dossiers pilotes (marque en prélancement, marque établie, portefeuille multi-pays) et débloque L05–L09 dossier par dossier. **L04b** traite ensuite les autres dossiers actifs de L00, en parallèle du premier cycle ; il reste obligatoire pour la clôture globale.
- **Terminé lorsque :** aucune donnée hors forme n’est présentée comme complète dans le périmètre reçu ; les sources restent consultables et téléchargeables à l’identique ; chaque correction est traçable et un conflit concurrent refuse sans écrasement. Reprise ou compensation éprouvée, puis extension L04b reçue sur tous les dossiers actifs retenus.
- **Preuves :** inventaire avant/après, propositions de correspondance, décisions/version, contrôles des consommateurs. **Sources :** dette « Formats ADVE legacy » (inventaire de production du 12 novembre), « Corpus », « 564 » ; [inventaire existant](../../scripts/inventory-adve-strict-shapes.ts).

### L05 — Fiabiliser stratégie, conseil et recommandations

- **Responsable :** agents Guidance/Telemetry/Propulsion. **Dépendance :** L04a pour chaque dossier pilote ; répéter après L04b sur les autres dossiers concernés.
- **Travail :** recalculer R/T/I/S via les commandes existantes ; vérifier versions source, arrêt/reprise, actions retenues et plan commun. Recevoir budgets/périodes/devises/cohortes et projections depuis V/E. Pour le conseil, établir un jeu de questions attendues portant sur les pièces primaires et leurs éditions. Recevoir Gazette → extrait → implication → référence comparable → proposition → décision. Corriger les réponses structurées Notoria invalides dans le traitement existant ; une référence traçable doit aussi être pertinente.
- **Terminé lorsque :** stratégie et lecteurs partagent la même version ; une modification amont périme les bonnes sorties ; aucune unité ou valeur réelle n’est inventée. Les propositions conceptuelles inférées conservent leurs consignes et leur statut. Citations exactes, confirmation/correction humaine et reprise de conversation reçues. Timeout, sortie invalide, absence de fournisseur et quota épuisé produisent un état utile, sans double appel ni écriture ADVE automatique.
- **Preuves :** cascade et invariance des sources, questions/réponses relues, décisions, scénarios d’erreur/reprise et coûts. **Sources :** dette « 537 », « 552 », « Conseil 496→503 », « 585 » ; [contrat canonique](../governance/STATE_FINAL_BLUEPRINT.md).

### L06 — Recevoir Oracle, Playbook et éditions de livrables

- **Responsable :** agent Propulsion et responsable éditorial de marque. **Dépendance :** L05.
- **Travail :** vérifier les 35 sections Oracle sur le dossier courant, leur contenu et provenance ; distinguer rédigé, alimenté, frais et approuvé. Ouvrir et inspecter tous les exports effectivement proposés par l’offre, dont PDF et Word lorsqu’exposés. Refaire la recette métier des neuf sections du Playbook corrigé en 578 : phase de marque, liens et CTA, thèmes et occurrences réellement programmées. Faire accepter l’édition avant Devotion Ladder ; recevoir les six paliers, leurs sources et leur usage dans le calendrier.
- **Terminé lorsque :** livrable utile et fidèle, aucune coupure ou perte de contenu dans les exports, droits corrects et acceptation attribuée à une vraie personne. Reprise partielle ou régénération en échec conserve l’ancienne édition complète. Aucun domaine, date de publication ou fait client déduit sans source admissible.
- **Preuves :** grille de relecture section par section, rendu bureau/mobile, exports complets, version et décision d’acceptation. **Sources :** dette « 578 », « 540 », [REFONTE-PLAN](../governance/REFONTE-PLAN.md), [plan social](moteur-de-production-social.md).

### L07 — Produire et remettre des fichiers conformes

- **Responsable :** agents Artemis/Ptah, responsable de marque pour la relecture. **Dépendances :** L04/L06 ; L02/L03 pour les fichiers privés.
- **Travail, dans cet ordre :** (a) contrats des outils amont et saisie du format, après les contrats cibles déjà livrés ; (b) choix persistants DA/texte/variantes et versions réellement transmises au moteur ; (c) image complète puis déclinaisons et remise ; (d) montage, vidéo, audio, sous-titres et exports ; (e) autonomie facultative, bornée par étape, appels/coût/durée/autorité et retour manuel. Réutiliser les lots Éditer/Exécuter/Réviser/Remettre du plan social.
- **Terminé lorsque :** demande, sources choisies, tâche, version, fichier et coût sont reliés. Dimensions/durée/codec sont mesurés sur les octets reçus, fichiers ouverts et audio écouté. Une image, un clip monté et un spot audio conformes aux cas retenus sont reçus. Double clic/rejeu ne duplique ni rendu ni coût ; une légende ou un sous-titre corrigé ne relance pas les étapes indépendantes. Anciennes versions conservées ; absence de capacité ou plafond atteint visible avant un nouvel appel. Fichiers durables après expiration du lien fournisseur.
- **Preuves :** sources épinglées, manifeste de lancement existant ou étendu, reçus matériels, relecture et remise. Les moteurs autorisés sont ceux de La Fusée ; la présence d’un plugin dans Codex n’est pas une intégration produit. **Sources :** [plan social](moteur-de-production-social.md), dette « 542 », « Ptah », contrats de reprise/admission existants.

### L08 — Recevoir publication et communications

- **Responsable :** agent Anubis et responsable éditorial habilité. **Dépendance :** L07 ; comptes/canaux autorisés.
- **Travail :** sélectionner la bonne version du calendrier, relire le paquet, choisir le compte et exercer publication immédiate puis planifiée. Vérifier expiration/révocation OAuth, scopes, échec partiel multicanal et notifications. Recevoir email, messages et inbox quand proposés par l’offre. Préparer les contenus et destinataires exacts avant toute demande d’autorisation d’envoi réel.
- **Terminé lorsque :** aperçu et contenu envoyé correspondent, identifiant distant et heure de publication sont conservés, le réseau permet de relire le résultat ; une modification de source requiert une nouvelle relecture. Après timeout suivant un POST, réconcilier le résultat avant toute nouvelle soumission. Un rejeu ne publie pas deux fois. Les contenus non autorisés ne partent pas.
- **Preuves :** décision nominative/versionnée, reçu distant et rapprochement, reprise après coupure. Inbox Instagram direct est déjà orientée par fournisseur dans le code ; recevoir ce comportement au lieu de le reconstruire. **Sources :** dette « 549 », [publication](../../src/server/services/anubis/social-publish.ts), [inbox](../../src/server/services/anubis/social-inbox.ts).

### L09 — Mesurer les résultats sans fausse attribution

- **Responsable :** agent Seshat, responsable métier pour la qualification. **Dépendances :** préparation avant L08 ; réception après publication et observation.
- **Travail :** relier publication réelle, actif, compte, source et période ; recevoir insights pour chaque fournisseur réellement utilisé, dont Instagram direct. Vérifier le calcul d’impact actuellement ancré sur la création d’une version plutôt que sa publication. Corriger les agrégats qui remplacent une absence par 0 ou 0,5. Recevoir collecte DataCollector, couverture, corpus favorable/contraire, communauté et preuves Overton. Qualifier les scores et la calibration avant usage commercial.
- **Terminé lorsque :** aucun média non publié n’est présenté comme ayant produit un résultat de diffusion ; absence, erreur, zéro observé et estimation sont distincts. Une variation du score global n’est pas présentée comme l’effet causal d’un média. Mesures avant/après, échantillon, période et limites sont consultables. Un reçu répété n’ajoute pas une deuxième observation ; une révision de stratégie reste décidée explicitement.
- **Preuves :** données natives reçues, liens de publication, calcul reproductible, cas sans mesure et retrait de preuve. **Sources :** dette « 565 », « 540 », [social-insights](../../src/server/services/anubis/social-insights.ts), [asset-impact-tracker](../../src/server/services/seshat/asset-impact-tracker.ts).

### L10 — Fermer vente, paiement, abonnement et remise

- **Responsable :** agent Operations/Thot et responsable commercial/financier. **Dépendances :** préparation offre/paiement après L02 et prix approuvés ; recette du dossier acheteur après L04a ; livraison du rapport après L06.
- **Travail :** reprendre offres/prix approuvés ; recevoir score public → audit guidé → conversation/offre → devis versionné → accord → règlement → droit → document client → confirmation de remise. Exercer le rail manuel Orange Money/main propre existant ; recevoir aussi chaque PSP annoncé dans l’offre. Vérifier paiement tardif, doublon/rejeu, refus, reprise après paiement et documents comptables applicables. Recevoir renouvellement/expiration/résiliation et ouverture des droits par marque.
- **Terminé lorsque :** une preuve de règlement s’affecte une seule fois au bon devis ; le bénéficiaire, le prix/devise et les droits correspondent à l’accord. La marque vendeuse reste distincte du dossier acheteur. Le client reçoit la bonne édition, la retrouve puis confirme réellement la remise. Les flux de remboursement/litige exposés sont exercés, les autres explicitement hors offre. Le reçu technique ne vaut pas facture ni acceptation du client.
- **Preuves :** parcours de recette sans argent réel, puis pilote explicitement autorisé avec paiement et remise réels ; journal financier rapproché. **Sources :** [ADR-0238](../governance/adr/0238-public-brand-sales-entry.md), [ADR-0240](../governance/adr/0240-sales-collection-and-published-identity-reuse.md), [MONEY-FLOW](../governance/MONEY-FLOW.md).

### L11 — Recevoir les parcours agence, créateur et communauté

- **Responsable :** agent Imhotep, opérateur, agence et talent de recette. **Dépendances :** L02, L07, L10 pour les droits et règlements concernés.
- **Travail :** mission → modération → candidature → attribution → livraison → QC → correction → acceptation → commission/versement ou litige. Vérifier le rôle de chacun, le cloisonnement des équipes et la réaffectation. Recevoir inscription/progression/certification des formations exposées et les parcours communautaires réellement disponibles.
- **Terminé lorsque :** chaque acteur accomplit son parcours sans rôle ADMIN substitué ; refus/correction conservent la version et les décisions ; aucun règlement, score, tier ou certificat indu. Les capacités présentes uniquement dans une vieille roadmap sont d’abord rapprochées du code et des promesses, avant décision de développement.
- **Preuves :** reçus par rôle, transitions et argent rapprochés, certificat vérifiable si proposé. **Sources :** [CODE-MAP](../governance/CODE-MAP.md), [Imhotep](../../src/server/services/imhotep/index.ts), registre et manifests courants.

### L12 — Fermer les raccords et le portefeuille multi-marques

- **Responsable :** agents des composants concernés, pilotage Guidance. **Dépendances :** L02/L04 ; chaque consommateur reçoit ses dépendances propres.
- **Travail :** recevoir héritage explicite, dossiers pays, identité produit et retrait/réintroduction. Pour La Barre, recevoir acteur authentifié, bilan/empreinte/rejeu, partage/révocation, puis lecture du bilan dans le brief suivant. Préserver le raccord Radar déjà reçu. Recevoir Argos, DataCollector et clients MCP réellement utilisés : admission, référence source, version, droits, absence de service et reprise. Vérifier port interne La Barre et continuité des attestations avant rotation des clés.
- **Terminé lorsque :** chaque dépôt producteur et consommateur lit le même contrat et la même version ; aucun doublon après rejeu ni donnée d’une marque voisine ; un bilan reçu n’est pas adopté automatiquement. Pour chaque raccord, la recette traverse les deux applications servies. Les études/ateliers exposés dans L00 ont leur reçu jusqu’au dossier consommateur.
- **Preuves :** contrats et versions des deux côtés, résultat retrouvé après reprise et révocation ; recette pays/équipe distincts. **Sources :** dettes « 568 », « 569 », « 566 », « 565 », [ADR-0243](../governance/adr/0243-country-brand-dossiers-and-client-organizations.md), interfaces Shinkiro.

### L13 — Recevoir l’expérience réelle sur chaque rôle

- **Responsable :** agent de recette produit et utilisateurs des rôles concernés. **Dépendance :** accompagne L02–L12.
- **Travail :** ordinateur et téléphone réel, clavier, formulaires, lecteurs longs, exports, chargement lent, perte de connexion, reconnexion et thème exposé. Vérifier attentes longues, erreurs, annulation, récupération des brouillons et absence de geste impossible. Parcourir les modes manuels et assistés applicables. Reprendre la recette des promesses publiques, y compris les engagements métier restants.
- **Terminé lorsque :** chaque rôle termine son parcours, comprend une attente ou un refus et retrouve son travail ; aucun écran critique coupé ou contenu inaccessible, aucune erreur bloquante dissimulée. Les promesses visibles correspondent au périmètre reçu. Les corrections sont rattachées au lot métier concerné, sans refonte esthétique globale présumée.
- **Preuves :** grille de parcours, captures inspectées, fenêtres d’erreurs complètes et relecture des exports. **Sources :** [promesses publiques](../governance/RECEPTION-PROMESSES-PUBLIQUES.md), dettes F14/C4 et réceptions natives des lots.

### L14 — Recevoir l’exploitation et fermer le cycle

- **Responsable :** agent d’exploitation, responsable produit/financier et client pilote. **Dépendances :** démarre avec L01 ; fermeture après tous les lots applicables.
- **Travail :** relire les SLO depuis le serveur ; distinguer absent, mesuré et dépassé ; arbitrer les budgets de latence sur les mesures sans masquer les sorties invalides. Recevoir un ordonnanceur effectif par tâche, incidents, reprise, charge/concurrence, quotas et limitations LLM/MCP. Rapprocher dépenses estimées, reçues et facturées quand la facture existe. Préparer procédure d’incident, release/retour arrière, restauration et responsabilité de lecture des journaux.
- **Terminé lorsque :** charge convenue supportée, coût du parcours identifiable, tâches et erreurs observables, quotas/reprises sans double effet, restauration L03 reproductible. Un client pilote effectue le cycle final ci-dessous ; les mêmes invariants passent sur une deuxième équipe et un autre type de marque. Les résultats métier observés sont rapportés avec leur période, sans promesse de croissance garantie.
- **Preuves :** reçus source/CI/image/runtime, rapport de charge, mesures SLO, coûts, restauration et acceptation réelle. **Sources :** dette « 585 », « MVP-FUSEE-05/C7 », runbooks et contrats de release existants.

## Recette finale et règle de clôture

Le cycle de référence est : **entrée publique → dossier et sources → correction ADVE → cascade → Oracle/Playbook → offre/règlement et droits → production → relecture → remise/publication → mesure → décision suivante**. Les différents ordres commerciaux proposés par le produit doivent conserver les mêmes contrôles ; cette séquence n’impose pas un nouveau tunnel à l’utilisateur.

Pour chaque parcours, conserver : révision du code, image/runtime, rôle et équipe, versions des entrées, résultat attendu, résultat constaté, date et référence des preuves. Les contenus de marque, comptes, clés, documents de paiement et captures sensibles restent hors Git.

Une ligne n’est close qu’après **code/configuration vérifiés + version effectivement servie + recette du rôle concerné + relecture métier lorsque nécessaire**. Les tests ciblés incluent succès, manque de donnée, refus de permission, panne, reprise, double soumission et source périmée quand ces cas s’appliquent. La suite intégrée protège ensuite les autres parcours. Aucun pourcentage global calculé à partir de tests, routes ou commits.

Pour annoncer que le périmètre fonctionne :

1. Chaque capacité de L00 exposée ou vendue possède sa preuve courante. Aucune capacité non reçue n’est implicitement classée réussie par un état `DEFERRED`.
2. Aucun défaut bloquant connu ne permet perte de données, accès croisé, double paiement/envoi ou impossibilité de terminer un parcours essentiel.
3. Les corrections de données ont leur décision, leur provenance et leur reprise ; les dérivés suivent les versions réellement admises.
4. Le client, l’opérateur, l’agence et le créateur ont reçu leurs parcours applicables ; un test ADMIN ne vaut pas recette de tous les rôles.
5. Paiement, réception du livrable, publication et effet observé ont chacun leur preuve distincte.
6. Sauvegarde/restauration, supervision, capacité et coût sont reçus au périmètre de service annoncé.

Si un accès ou un tiers manque, la ligne reste **en attente de réception**, avec responsable et prochain geste précis. Une réduction du périmètre nécessite une décision explicite et l’alignement des promesses publiques ; elle ne se fait pas en effaçant la ligne.

## Accès et décisions à obtenir au moment utile

| Besoin | Quand | Préparation à faire par l’agent avant de solliciter |
|---|---|---|
| Accès Coolify/VPS, recette, sauvegardes et clés de restauration | L00–L03 | Identifier la ressource active et le moyen d’accès déjà disponible ; ne demander que ce qui manque, sans secret dans le chat ni Git. |
| Correspondances ambiguës des données de marque | L04 | Montrer valeur/source/version actuelles, transformation proposée, conséquences et reprise. |
| Compte/fournisseur et plafond d’essai média ou LLM | L05–L09 | Lire configuration et décisions existantes ; présenter cas, coût estimé et limite. |
| Validation éditoriale et envoi réel | L06/L08 | Fournir édition complète relue, contenu, destinataire/compte, date et portée exacts. Une recette technique ne crée pas cette autorisation. |
| Rail de règlement et bénéficiaire, email de remise | L10 | Reprendre tarifs approuvés et configurations existantes ; préparer devis, parcours et reçu attendus. |
| Règle d’équipe, budgets de latence, objectifs de restauration et charge | L02/L14 | Proposer une décision sur des cas et mesures concrets ; conserver les arbitrages déjà tracés. |
| Acceptation client et observation terrain | Clôture | Préparer un résultat réellement consultable et les mesures de départ ; l’agent n’invente ni paiement, ni accord, ni résultat commercial. |

## Premier lot à lancer et suivi

**Prochaine exécution : L00 + L01**, avec préparation de L02/L03 en parallèle :

1. Rapprocher capacités/priorités et versions source/production ; confirmer les accès existants.
2. Préparer l’environnement local et la base isolée ; reproduire les défauts du preflight.
3. Corriger uniquement ses causes établies ; vérifier cas vert et cas rouge, puis les contrôles applicables du dépôt.
4. Préparer la recette de droits et l’exercice de restauration ; actualiser les preuves nécessaires à la livraison.
5. Passer à L04 sur les dossiers de recette dès les prérequis satisfaits.

Chaque lot se découpe en modifications relisibles. À sa fermeture, mettre à jour la dette existante et les preuves, sans recréer de backlog parallèle ni annoncer un parcours entier à partir d’un correctif. Le suivi présente quatre colonnes : **fait et reçu / prêt à recevoir / à corriger / dépendance précise**. Les identifiants historiques du programme sont conservés lorsqu’ils sont définis.

**Planification :** l’ordre et les critères sont établis. Une date de fin fiable dépend de l’installation initiale, des accès, de la qualité des données et des réceptions réelles. Après L00/L01, découper le reste en lots bornés et estimer leur charge à partir des écarts reproduits ; réviser cette estimation après L04 et le premier fichier matériel de L07. Les fenêtres d’observation et l’acceptation des tiers ont leur propre calendrier.
