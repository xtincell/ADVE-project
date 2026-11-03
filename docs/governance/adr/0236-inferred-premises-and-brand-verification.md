# ADR-0236 — Prémisses inférées utilisables et vérification de marque

**Status** : Proposed — doctrine opérateur explicite, candidat538 testé localement ; réception métier complète et production non reçues
**Date** : 2026-11-03
**Phase** : 7 — complétion ADVE et irrigation qualifiée
**Depends on** : ADR-0023, ADR-0225, ADR-0229, ADR-0231, ADR-0235
**Supersedes** : règle d’ADR-0231 protégeant un vide conceptuel comme choix définitif ; conserve ses garanties sur les valeurs remplies, identités, provenance et versions

## Contexte

Instruction explicite du responsable du produit, le3 novembre2026 : même un
choix antérieur de laisser un champ conceptuel vide doit être remplacé par une
proposition INFERRED et une consigne de vérification au responsable de marque.
Le postulat doit alimenter immédiatement calculs et livrables ; la confirmation
réelle, versionnée, intervient ensuite. L’agent ne déclare jamais cette vérification
accomplie à la place du responsable.

Ce mandat étend la complétion ciblée existante : il ne donne pas une autorisation
générale de remplacer des valeurs HUMAN/SOURCE remplies, ni d’inventer preuves,
contrats, mesures ou consentements. L’absence d’achat n’est pas nécessairement
une lacune : un partenaire peut participer à un échange non marchand documenté.

Audit anti-doublon : contrats de maturité, pillar-gateway/provenance, UI de revue,
serializePillar et confirmInferredField existent. Le candidat les étend ; aucun
service, Intent, route, migration ou gestionnaire d’appels ajouté. Aucun changement
de vocabulaire ou de nombre des Neteru.

## Décision

### Qualifier la lacune avant d’inférer

canInferMissingConceptualField s’appuie sur les contrats existants des seuls
piliers A/D/V/E et sur le schéma exact du chemin. Un champ absent, null, texte
blanc ou collection conceptuelle vide admissible doit recevoir une proposition
non vide conforme. Un marquage HUMAN ou SOURCE du vide ne bloque plus cette
complétion inférée. Le champ doit être dérivable ; le classement des données
non fabricables et les collections de preuves restent exclus.

Les valeurs remplies, zéro, false, identités et non-applicabilités documentées
restent conservés. Un souhait de stakeholder garde son auteur, son périmètre et
son statut. Les données observées ou décisions réelles manquantes ne deviennent
pas des faits par cette règle. Un postulat explicite peut servir à la planification,
mais ne remplace jamais une mesure, un accord ou une attestation.

### Admettre sur le chemin versionné existant

Le complément passe par SET_FIELDS avec expectedVersion et validation du schéma
canonique. La gateway et le garde de provenance ne permettent cette exception
que sur les chemins conceptuels vides admissibles ; la valeur est enregistrée
INFERRED, sans hériter de l’autorité HUMAN/SOURCE de son parent. Les champs voisins,
les identités et l’historique sont conservés. Un conflit de version ou une valeur
refusée ne produit ni faux succès ni confirmation automatique. Les règles Bible
et les contrôles de preuve restent applicables.

### Utiliser maintenant, vérifier explicitement

inferredFieldVerification fournit une consigne selon la nature de la prémisse :
rituel/transition, montant/période, indicateur/cohorte, rôle d’acteur, équipe ou
hypothèse conceptuelle générale. Le responsable est un rôle — « Responsable de
marque » — sans affectation fictive à une personne. La consigne demande de
confronter la proposition à la documentation, au scan et aux parties prenantes,
puis de confirmer ou corriger.

Le postulat alimente les calculs et livrables pendant cette vérification. La
qualification INFERRED et la vérification restent présentes, y compris pour une
cellule sous un parent validé. L’UI de revue existante développe la consigne
complète avec la valeur et les actions de correction/confirmation. Il n’y a ni
attente de confirmation pour irriguer, ni validation silencieuse pour avancer.

### Factoriser les consignes dans chaque contexte

Nouvelle instruction opérateur : faire évoluer le système de consigne pour que
sa répétition ne consomme pas inutilement le contexte des lecteurs. Le candidat
implémente cette factorisation dans les fichiers existants et la suite locale
exacte est verte. Une règle commune porte responsabilité
et usage des postulats ; six profils de vérification couvrent rituel/transition,
montant/période, indicateur/cohorte, rôle d’acteur, équipe et concept général.
Chaque champ INFERRED transporte une verificationRef. Un registre unique par
contexte contient uniquement les profils effectivement référencés, une seule fois.

Conseillers, R/T/I, Notoria et auto-fill reçoivent cette même représentation,
sans recopier la consigne complète dans chaque cellule. L’UI résout la référence
vers le texte complet ; la confirmation conserve la consigne pertinente, l’acteur
et la version dans sa trace. Factoriser la représentation ne retire ni la
qualification, ni le responsable, ni une donnée métier, ni l’obligation de revue.
Une référence orpheline, un profil requis omis ou un consommateur dépourvu de la
règle commune constituent un défaut de raccordement à corriger. Aucun nouveau
service ou second registre persistant n’est créé.

confirmInferredField conserve le contrôle de version et l’acteur authentifié ;
la trace journalise le chemin, la version relue et la consigne. Confirmer choisit
la prémisse pour le plan, sans la convertir en résultat observé et sans confirmer
les cellules voisines. Une valeur modifiée depuis la lecture impose une nouvelle
revue ; aucun clic, acteur ou consentement humain n’est simulé.

### Reconnaître un échange complet sans achat

Dans V.personaSegmentMap, productNames peut rester explicitement vide lorsque
l’échange est documenté : persona identifié, valeur pour la marque, valeur pour
l’acteur, coûts de participation et conditions de dépendance renseignés.
hasDocumentedNonProductExchange distingue ce cas d’un lien offre/persona oublié.
Aucun produit acheté n’est fabriqué pour faire passer un partenaire en client
payeur ; le rôle et les contreparties doivent continuer à irriguer les lecteurs.

## Conséquences et réception

Le critère devient : toute lacune conceptuelle dérivable est soit complétée par
une prémisse qualifiée utilisable, soit reconnue comme non-applicabilité
documentée selon le contrat. La vérification humaine reste en attente tant
qu’elle n’a pas réellement eu lieu. Présence, exactitude, approbation et résultat
observé sont distincts ; aucune complétude huit piliers/35 sections ne découle
seulement de cette règle.

Dernier reçu local538 : 5 132 tests unitaires/499 fichiers et21 PostgreSQL verts ;
typage et lints sans erreur (25 avertissements restants), ciblé enums70/4 vert,
build exit0 et stress compilé sans finding. Le checkpoint précédent5 127/5 128
et son défaut T restent historiques ; ce défaut ne reproduit plus dans la suite
exacte. Le reçu18/18 du refus Bible reste attribué à son état antérieur. Preuves
privées P23 : source538-factorized-unit.log, source538-exact-postgres.log,
source538-enum-targeted-green.log, source538-exact-build.log et
source538-stress-exact-final-received.json. Six requêtes USER reçoivent HTTP200
(source538-user-http-received.json), sans toucher la production.

Natif desktop local reçu : détail E avec cinq rites et leurs consignes lisibles,
dépliage Gazette et lecture Oracle. Les fenêtres observées n’ont ni exception ni
réponse500. Oracle de fixture affiche0 section rédigée et33/35 alimentées ; ce
reçu n’est pas celui de l’Oracle réel. La tentative mobile390px est restée
à1 578px : recette mobile non reçue, réglage réinitialisé. Ces temps locaux ne
constituent pas un SLO et les contrôles de code ne valent pas confirmation humaine.

Le bouton « Valider tel quel » est ensuite reçu nativement sur la seule fixture
locale : E v3→v4, cinq rites inchangés, origine INFERRED→HUMAN et liste de
vérification3→2. L’historique relu porte la version3 et la consigne RITUALS
complète (source538-native-confirm-received.json et historique privé). Cet
exercice reçoit le parcours et sa trace ; il n’est pas une adoption des
prémisses du dossier réel ni une confirmation en production.

Pour la réception métier, vérifier sur le dossier réel les références résolues,
le registre limité aux profils utilisés, la parité des consommateurs et la trace
de confirmation ; conserver les refus rempli/0/false/preuves/non-applicabilité,
conflit et schéma. Recevoir l’usage immédiat des propositions HUMAN/SOURCE vides
admises INFERRED, la confirmation réelle avec acteur/version/consigne et l’échange
partenaire documenté sans achat, sans accepter un échange incomplet. Puis recevoir
cascade, conservation, huit piliers/35 sections et lecteurs après livraison.
CI/image/runtime538, mobile, Oracle entier et MVP restent ouverts ; 538 n’est pas
déployée. Données de marque, propositions et preuves restent privées hors checkout.
