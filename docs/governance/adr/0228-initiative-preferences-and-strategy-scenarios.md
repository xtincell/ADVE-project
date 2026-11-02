# ADR-0228 — Préférences du catalogue I et scénarios dérivés par S

**Status** : Proposed — préférences/scénarios en candidat 526 ; acceptation à la livraison, devis futur séparé
**Date** : 2026-11-02
**Phase** : 7 — continuité Core I → S → choix de scénario
**Depends on** : ADR-0023, ADR-0060, ADR-0087, ADR-0088, ADR-0089, ADR-0093, ADR-0214, ADR-0215
**Supersedes** : aucun ADR intégral ; amendement candidat de la présélection I d’ADR-0088/0089


## Périmètres et condition d’acceptation

- **Lot 526, §§1–4** : préférences I, composition des trois scénarios S, séparation
  des décisions et lecteurs. Code candidat sur `fix/strategy-scenarios526`, base
  `a2f38e1c9` après 525 ; reçus locaux bornés conservés, passe finale et livraison
  encore ouvertes. Le numéro ou les cartes de scénario ne prouvent pas 100 %.
- **Lot coûts futur, §§5–6** : devis importé, source prestataire et substitution
  réelle des coûts courants. Helper `resolveQuotedBudget` et test retirés du code
  526, archivés seulement dans P23 `quoted-budget-prototype526*.txt`, ni compilés
  ni livrés ; aucun raccord FINANCE/Thot/S de production reçu par ce prototype.
- **Acceptation à la livraison** : ne passer le périmètre préférences/scénarios à
  Accepted que pour le code réellement livré et reçu ; conserver un état explicite
  Proposed/non reçu pour le volet devis. Les preuves doivent citer leur version,
  et les réceptions 524/525 ne sont pas renommées 526. Aucun numéro de PR anticipé.

## Contexte

Instruction opérateur du 2 novembre : I porte un catalogue de préférences, S fait
le travail de déduction pour proposer les scénarios Conservateur, Cible et
Ambitieux ; l’opérateur retient une ambition. Exiger des actions préalablement
`SELECTED_FOR_ROADMAP` dans I inverse cette responsabilité et bloque S lorsque
le catalogue ne contient que des recommandations.

Le contrat de travail `strategy-preferences-scenarios-20261102.json` (P26) borne
le cadrage initial sur `fix/strategy-scenarios526`, parent `8620638d1`, puis la
reprise du candidat sur la base `a2f38e1c9`. La livraison 525 / PR #1082 garde ses
propres reçus ; ils ne sont pas renommés 526. Le présent document propose le contrat et les amendements, sans annoncer
leur implémentation, une complétude de 100 % ou une réception de production.

Les initiatives JSON de I, leur projection `BrandAction`, les règles de routes,
les writers gouvernés, les versions/provenances et la sélection d’ambition S
existent. Il s’agit d’une factorisation de ces capacités, sans entité Prisma,
service, moteur de règles ou gestionnaire d’appels supplémentaire. Les agents
restent facultatifs ; le parcours manuel conserve les mêmes décisions et règles.

## Décision proposée

### 1. I exprime une préférence, pas un plan

Une initiative identifiée porte une préférence facultative dans le JSON existant :

| Valeur | Sens | Effet sur l’éligibilité de S |
|---|---|---|
| `FAVORITE` | Préférence favorable attribuée ; pas une obligation | Favorisée dans l’arbitrage, reste soumise aux contraintes |
| `NEUTRAL` | Pas de préférence favorable ou défavorable | Éligible aux scénarios selon les règles |
| `REJECTED` | Rejet explicite attribué | Exclue jusqu’à réintégration explicite |

Aucune préférence ne renseigne un planning, ne modifie `BrandAction.selected`,
ne programme une campagne et n’autorise publication, achat ou appel d’agent.
Appartenir à un scénario et exprimer une préférence sont deux lectures distinctes.
Une recommandation IA n’est pas un favori humain. La recommandation peut être
expliquée sans modifier la préférence attribuée à l’opérateur.

Compatibilité en lecture, sans réécriture de l’historique : ancienne initiative
`SELECTED_FOR_ROADMAP` interprétée comme `FAVORITE`, ancien rejet comme `REJECTED`,
autres statuts comme `NEUTRAL`, sauf préférence explicite déjà reçue. Cette
compatibilité conserve l’origine legacy ; elle ne fabrique pas une provenance
humaine pour une donnée seedée ou générée. `RECOMMENDED` seul reste neutre.
Les anciens états de planning/exécution restent conservés et ne sont pas
transformés rétroactivement en préférences ou consentements nouveaux.

Les mutations utilisent `SET_BRAND_ACTION_STATUS` et ses writers existants,
avec droits courants, versions, identité de l’initiative et audit. Modifier une
préférence puis recalculer S ne permet ni d’éviter LOCKED/provenance, ni de
réintégrer silencieusement une initiative rejetée. Les trois représentations I
partageant le même ID restent cohérentes ; aucun rapprochement par libellé flou.

### 2. S compose des ensembles de candidats depuis le catalogue éligible

`routeInitiativeSet`, `computeRoadmapRoutes` et `computePillarS` restent les points
de calcul existants. Ils lisent catalogue, risques R, objectifs/personas, impact
ADVE, canaux et contraintes connues ; ils ne requièrent pas une liste manuelle
préalable de `SELECTED_FOR_ROADMAP`.

- **Conservateur** : sécurise les risques prioritaires et une première valeur utile.
- **Cible** : complète la couverture des objectifs, personas et leviers ADVE visés.
- **Ambitieux** : élargit utilement la couverture par canaux, niveaux de relation ou
  risques supplémentaires ; il n’ajoute pas mécaniquement toutes les recommandations.

Les règles et critères de départage sont explicites, déterministes, stables à la
permutation de l’entrée ; aucune fraction aléatoire ou quota arbitraire de listes.
La préférence favorable départage ou favorise, mais n’impose pas une action qui
viole une contrainte ou n’apporte pas la couverture recherchée. Le coût connu
peut départager ; un coût inconnu n’est ni gratuit, ni moins cher par défaut.

Les scénarios doivent être matériellement distincts et expliqués avec un catalogue
suffisant, même sans favori ou sélection préalable. Si les rejets ou le manque de
données empêchent une proposition utile ou distincte, S signale cette limite ;
il ne réintègre pas un rejet et n’invente pas une action pour fabriquer trois jeux.
Contraintes de ressources, capacité, dépendances ou plafonds absentes restent
absentes et visibles ; un budget proposé ne vaut pas capacité ou accord reçu.

### 3. L’opérateur retient un scénario ; l’exécution garde ses gates

Le geste existant `SELECT_ROADMAP_ROUTE` / `notoria.selectRoadmapRoute` retient
une ambition par calcul et écriture S gouvernés. Un scénario recommandé ou
présenté par défaut n’est pas une décision humaine reçue. La préférence I n’est
jamais le substitut de ce choix ; choix de scénario et approbation de synthèse
restent distincts (ADR-0214/0215).

Les agrégats, `selectedFromI`, sprint, budget, couverture et textes dérivés de S
partent du même ensemble d’IDs du scénario actif, avec les versions sources.
Oracle, exports et projections de plan lisent cet ensemble, sans refaire un autre
filtrage depuis `FAVORITE`, `RECOMMENDED` ou le seul statut legacy. Les propositions
ne passent pas les gates d’activation, calendrier, publication ou paiement.
Un lien de couverture d’un risque ne prouve pas que son traitement est exécuté.

### 4. Régénération, inconnues et lecture fidèle

La régénération conserve les préférences humaines des IDs exacts déjà reçus,
ainsi que leur provenance et les refus. Une nouvelle initiative ne récupère pas
une préférence par similitude de nom ; les anciens choix sans continuité d’ID
restent à rapprocher explicitement, sans UUID inventé à la lecture.

Budgets déclarés, estimés et inconnus restent séparés ; zéro explicite reste zéro,
coût absent reste inconnu. Période absente n’est pas un sprint implicite. Les
projections de croissance ou Cult Index sans modèle étayé restent absentes ou
qualifiées comme hypothèses ; les constantes historiques ne deviennent pas des
résultats attendus de la sélection. S partielle n’est pas affichée mature au seul
motif que trois cartes de scénarios existent.

### 5. Lot coûts futur — le devis remplace le coût couvert, le reste demeure estimé

Complément opérateur du 2 novembre (`budgetRequirement`, contrat P26) : **le budget
estimatif existe déjà**. Un devis importé, attribué au prestataire réel et relié à
sa source, remplace effectivement la valeur retenue sur la responsabilité exacte
qu’il couvre, intégralement ou partiellement. Il ne crée pas seulement une colonne
de comparaison à côté du budget initial. L’estimation initiale reste dans
l’historique ; elle n’est plus comptée sur le périmètre ainsi remplacé.

Le coût courant d’une action associe donc les montants devisés des périmètres
qualifiés et les estimations des périmètres non couverts. Le rattachement exige
initiative, composant/responsabilité, prestataire et document/version identifiables,
avec devise, base HT/TTC, quantité, unité et période de prestation comparables.
Un document reçu mais non rapproché ne remplace pas silencieusement un poste ;
son périmètre reste à qualifier. Une estimation inconnue ne devient jamais zéro.

Exemple opérateur, dans une même devise et base comparable :

| Élément | Estimation initiale | Coût courant retenu |
|---|---:|---:|
| Production | 300 000 | Couvert par le bundle ci-dessous |
| Talent | 100 000 | Couvert par le même bundle |
| Devis prestataire, production + talent | — | 350 000, compté une seule fois |
| Média, non couvert | 200 000 | 200 000 estimés |
| **Total** | **600 000** | **550 000** |

Il est interdit de conserver 300 000 + 100 000 puis d’ajouter le devis de 350 000.
Sans détail fourni, le bundle de 350 000 reste indivis avec sa couverture exacte ;
on ne le ventile pas arbitrairement entre production et talent. Une couverture
partielle n’enlève que les estimations des responsabilités effectivement couvertes,
les autres restent estimées. Deux devis qui se recouvrent ne couvrent pas deux
fois le même atome : allocation ou choix attribué requis si leur priorité est
ambiguë. Si un scénario ne retient qu’une partie d’un bundle sans prix détaillé,
son coût partiel n’est pas inventé par prorata ; l’indissociabilité ou le montant
à obtenir est rendu explicite.

**I** expose le coût potentiel courant par action, en distinguant devis, estimation
et inconnue. **S** additionne les coûts courants des actions de chaque scénario,
sans double comptage, et restitue les cinq postes existants — Production, Média,
Talent, Logistique, Technologie — lorsque le détail le permet. Un bundle peut
rester transversal ; l’absence de ventilation ne doit ni le perdre du total,
ni le compter dans plusieurs postes. Frais, taxes et provisions éventuels gardent
leur qualification existante ; pas d’ajout automatique déjà inclus au devis.
Une nouvelle version de devis actualise les références de coût et le calcul
courant via les voies gouvernées ; les anciens snapshots restent reproductibles.

### 6. Lot coûts futur — raccorder Thot et les originaux sans mission fictive

Le raccord de calcul est `financial-brain/action-costing` (Thot, ADR-0087/0093) :
le taux prestataire est résolu avant le benchmark marché à l’échelle de l’atome.
`ProviderCostRate` porte prestataire, driver/rôle, zone, taux/unité/devise, validité
et `sourceRef`. `ActionCostEstimate` conserve les snapshots et line items du calcul.
Les sources documentaires FINANCE, leurs versions et le tag Devis conservent
l’original, sa provenance et son usage. Ces capacités sont à raccorder, pas à
recréer en moteur de coûts, entité de devis ou gestionnaire d’appels.

La priorité de taux n’est pas à elle seule un raccord de devis complet : il faut
conserver document/version/périmètre dans le coût utilisé. Le résolveur observé
retourne un `resolvedFrom` prestataire/driver, sans transmettre `sourceRef` dans
son résultat ; cette lignée documentaire doit rester traçable dans les résolutions
et snapshots existants. Le tarif ne doit pas être appliqué à plusieurs atomes
pour répliquer un bundle unique. Le montant global d’un devis ne devient pas un
taux journalier, une quantité ou un ajustement de zone/qualité implicite.

`MissionQuote` existe, mais exige `missionId` et `talentProfileId`. Un devis collecté
au stade S ne justifie ni mission ni prestataire fictifs pour satisfaire ces
contraintes. Conserver le document qualifié et son rattachement réel au coût ;
les gates de contractualisation/exécution restent distinctes. Importer un devis
n’accepte pas le contrat, ne programme rien, ne paie et ne publie rien.

**Cause de capture à fermer dans le lot existant** : la complétion LLM peut remplir
`potentielBudget` en recopiant une enveloppe média de 8 M, tandis que
`mestor/i-pillar-sequenced.ts` distribue `V.unitEconomics.budgetCom` selon
45 % / 30 % / 15 % / 10 %. Ces voies parallèles ne constituent ni coûts par action,
ni couverture de responsabilités, ni total devisé. Le budget courant doit provenir
du montant de devis sur son périmètre et des estimations restantes, pas d’une
partition forfaitaire de V ou d’un total reconstruit par LLM. Les anciennes valeurs
et sources restent historiques ; elles ne sont ni effacées ni promues en devis
ou coûts actuels par un changement silencieux de source.

## Conséquences et réception requise

I devient un catalogue sur lequel l’opérateur exprime des préférences sans devoir
construire le plan à la main. S produit les arbitrages comparables et l’opérateur
choisit l’ambition ; les gates d’exécution restent en place. Aucun nouveau rôle,
Neter, permission ou protocole d’appels n’est déduit de cette séparation.

Le coût de reprise est la convergence des consommateurs existants, pas l’ajout
d’une surcouche. Le candidat 526 possède des premiers ciblés ; ceux-ci ne reçoivent
ni le code final, ni les lecteurs natifs, ni CI/image/runtime ou dossier réel.
Le prototype de devis et son test sont retirés du code 526 et archivés hors code ;
ils ne sont ni compilés ni livrés dans cette version, sans import ou remplacement
des coûts S en production. MVP scoreur/fiche ADVE complète/Oracle et sept chantiers restent ouverts ;
ni 525 ni la cascade historique 524 ne prouvent ce contrat 526.

**Checkpoint local 526 reçu, pas production** : sous rôle USER réel, copie
privée des huit piliers SPAWT, rafraîchissement 800 ms, préférence 419 ms,
assemblage du rapport 198 ms (`scenarios526-http-received.json`). Après un favori
de recette uniquement, Conservateur/Cible/Ambitieux contiennent 4/5/11 actions,
avec 5 000 000 / 5 500 000 / 19 000 000 de coûts estimés dans la devise du dossier.
Même jeu de références S/calendrier, préférence et identité historique conservées,
A/D/V/E/R/T inchangés ; aucune exécution armée. Ni budget adopté, ni geste de
production, ni lecture native reçus par ces appels HTTP.

PostgreSQL : 52 tests / 2 fichiers verts (`scenarios526-postgres-live.log`).
Première passe unitaire reçue : 5 001 tests / 477 fichiers ; la passe finale reste
à consolider, pas de compte final inventé. Le stress lancé en mode ALL a exit 0
et zéro finding sur les forges/transitions, mais son préflight HTTP est injoignable :
phases pages/tRPC sautées. `documents526-stress-full-received.json` et son log ne
reçoivent donc ni toutes les surfaces ni l’UI. Les mesures HTTP USER ci-dessus
sont un reçu séparé, pas un SLO.

Les zéros IA INFERRED sont inconnus ou ancrés qualitativement ; les zéros
HUMAN/SOURCE sont conservés. Variable Bible rapprochée du nouveau contrat ; les
reçus restent locaux, ADR Proposed tant que la livraison n’est pas reçue.

### Vérifications préférences/scénarios à recevoir sur le code final

1. Catalogue neutre sans sélection manuelle : trois jeux utiles et distincts quand
   les données le permettent ; comportement explicite si catalogue insuffisant.
2. Favori non obligatoire, neutre éligible, rejet toujours exclu ; réintégration
   explicite et auditée, recommandation IA ne devient pas favorite humaine.
3. Préférence seule sans changement de `selected`, timing, terminalité ou activation.
4. Stabilité à la permutation et déduplication d’un même ID ; coût/période inconnus
   non remplacés par zéro ; aucune projection commerciale non étayée.
5. Régénération avec même ID conserve la préférence humaine ; nouvel ID, ID legacy
   non modifiable ou origine étrangère rendent une limite/refus, sans transfert flou.
6. Isolation, versions concurrentes, LOCKED, provenance et atomicité I/S/projection
   conservées ; erreur de recalcul ne rend pas de succès ou plan partiel masqué.
7. Choix d’ambition et modification I → S → Oracle/exports sur les mêmes IDs et
   versions, sans effet d’exécution ; lecteur de risques distingue couverture et
   atténuation réelle. Recette sous rôle réel, puis CI/image/runtime et conservation.

### Vérifications du lot coûts futur — non réceptionnées par 526

8. Exemple de substitution à recevoir sur le raccord réel : estimation 600 000, devis bundle production +
   talent de 350 000 et média restant de 200 000 → coût retenu 550 000 ; estimation
   initiale inchangée dans l’historique, aucun double comptage ni ventilation fictive.
9. Couverture partielle : seuls les atomes/responsabilités couverts sont remplacés ;
   devis chevauchants, bundle partiellement retenu et prix manquant rendent une
   ambiguïté/limite explicite, sans prorata ou sélection implicite de fournisseur.
10. Devise, HT/TTC, quantité, unité, période ou validité incompatibles ne passent pas
    silencieusement ; document/version/prestataire/périmètre restent traçables dans
    le calcul et le snapshot Thot réellement utilisés.
11. I potentiel par action → coûts courants S → total et postes du scénario/Oracle
    concordants ; le bundle transversal figure une seule fois, même sans ventilation.
    La mise à jour d’un devis ne réécrit pas les snapshots antérieurs.
12. Aucun total LLM ou partage 45/30/15/10 de V ne remplace ce raccord. Import d’un
    devis seul sans mission fictive, acceptation, planning, paiement ou publication.

## Amendements doctrinaux proposés — texte exact à propager avant réception

Le contrat préférences/scénarios est propagé comme candidat daté dans la bible et
PROPAGATION-MAP ; Variable Bible a été rapprochée par le parent. La réception
finale porte sur le code courant, pas sur la seule présence de ces formulations. Les définitions de coût courant/devis
sont un cadrage futur, pas un canon de budget livré en 526. Les ADR-0088/0089 et
checkpoints historiques restent intacts ; l’amendement courant est daté et relié.

### Bible, annexe L — préférence et scénario

À ajouter dans `STATE_FINAL_BLUEPRINT.md`, annexe canon L :

> **Préférence d’initiative** : avis attribué sur une initiative I, `FAVORITE`,
> `NEUTRAL` ou `REJECTED`. Favori favorise sans imposer, neutre reste éligible,
> rejet exclut jusqu’à réintégration explicite. Une préférence ne sélectionne pas
> un plan, ne programme rien et n’autorise aucune exécution. Une proposition IA
> n’est pas une préférence humaine.
>
> **Scénario stratégique S** : ensemble de candidats dérivé du catalogue éligible
> par les règles existantes, selon risques, objectifs, contraintes et préférences.
> Conservateur, Cible et Ambitieux exposent leurs arbitrages ; l’opérateur retient
> une ambition. Recommandation, scénario proposé, choix de scénario, approbation de
> synthèse et activation d’exécution restent des décisions distinctes.

`LEXICON.md` reste le wrapper vers la bible ; ne pas créer une seconde définition
normative dans ce fichier. BRAINS/Governor et gouverneurs APOGEE/PANTHEON ne
changent pas ; aucun compte canonique n’est augmenté par ce contrat.

### Proposition future pour la bible — coût courant et devis à périmètre qualifié

> **Coût courant retenu** : montant utilisé pour une action, constitué des devis
> qualifiés sur leurs responsabilités couvertes et des estimations non couvertes.
> Le devis remplace l’estimation correspondante ; il ne s’y ajoute pas et n’est
> pas une simple comparaison. L’estimation initiale et les snapshots restent
> historiques, le document/version et le prestataire réels restent traçables.
>
> **Bundle de devis** : montant indivis couvrant plusieurs responsabilités sans
> ventilation fournie. Compté une fois avec sa couverture exacte, jamais réparti
> arbitrairement entre postes ou actions ; un chevauchement exige un arbitrage
> explicite. Un devis n’est ni une facture payée ni une autorisation d’exécuter.

### Bible et PROPAGATION-MAP — contrat courant I → S

À ajouter comme état courant daté, sans réécrire les réceptions 441 et ADR-0088/0089 :

> **Contrat I → S révisé, ADR-0228** : I conserve les préférences attribuées ; S
> construit les trois propositions de scénario depuis le catalogue éligible,
> sans présélection manuelle obligatoire. Les mêmes IDs alimentent choix, budgets,
> couverture, texte et lecteurs. Ancien `SELECTED_FOR_ROADMAP` se lit comme favori
> legacy sans réécriture ou nouvelle autorité humaine ; une recommandation IA
> reste neutre. Le choix d’ambition de l’opérateur n’active pas l’exécution.

### Variable Bible / schémas — règles à remplacer lors de l’implémentation

Dans `src/lib/types/variable-bible.ts`, entrée `BIBLE_S.computed.rules`, remplacer
les deux règles « default TARGET = SELECTED_FOR_ROADMAP » et « sélection court-terme /
sélection complète / sélection + RECOMMENDED » par :

> « Agrégations sur les IDs du scénario actif calculé depuis le catalogue éligible,
> les préférences attribuées et les contraintes connues. »
>
> « CONSERVATIVE sécurise les priorités ; TARGET complète les objectifs ; AMBITIOUS
> élargit la couverture utile. Rejet exclu, favori favorisé sans obligation, neutre
> éligible ; jeux et limites expliqués, sans présélection manuelle requise. »

Pour `selectedFromI`, remplacer la description par :

> « Actions du scénario S actif, avec référence aux initiatives sources ; présence
> dans le scénario distincte de la préférence I et de l’autorisation d’exécuter. »

Pour `globalBudget.derivedFrom`, remplacer l’ancienne somme sur le statut I par :

> « Somme qualifiée des coûts courants des initiatives du scénario S actif :
> devis sur leurs responsabilités couvertes + estimations restantes, sans double
> comptage ; bundles indivis, inconnues et périodes manquantes conservés. »

Pour `BIBLE_I.potentielBudget`, proposer la description :

> « Coûts potentiels courants des actions du catalogue : devis qualifiés en
> remplacement des estimations de responsabilités couvertes, estimations restantes
> et inconnues. Synthèse par cinq postes quand le détail le permet ; bundles
> transversaux conservés sans ventilation inventée. Aucune allocation de budget
> par LLM ou partition forfaitaire de l’enveloppe V. »

Pour `S.budgetBreakdown`, proposer la règle :

> « Ventilation des coûts courants des actions du scénario, seulement sur les
> postes réellement documentés ; bundle non ventilé compté une fois au total et
> rendu comme tel, jamais distribué arbitrairement entre cinq postes. »

Commentaires `PotentialActionSchema` et `roadmap-routes.ts`, `VARIABLE-BIBLE-CANON`
et guides opérateur devront suivre ce même contrat ; aucune saisie texte libre
RTIS ni nouvelle SSOT introduite. Les anciens chiffres de croissance/Cult Index
ne sont pas réintroduits comme règle normative.

## Consommateurs repérés à contrôler dans le lot existant

| Consommateur | Couplage actuel observé | Raccord à recevoir |
|---|---|---|
| `artemis/action-db/materializer.ts` et `set-status.ts` | Le statut legacy détermine `selected` / ACCEPTED, puis parfois SCHEDULED | Préférence séparée ; planning/exécution existants conservés |
| `actions` router et UI I | L’appartenance au plan est inférée du statut I | Préférence et appartenance aux IDs S visibles séparément |
| `mestor/rtis-cascade.ts::recalculateSynthesisInTransaction` | Exige des BrandAction `selected` et statuts I retenus | Calcul de candidats sans cette présélection, mêmes verrous et versions |
| `notoria/apply-payload.ts` | `SELECT_INITIATIVE` écrit statut et timeframe | Ne pas confondre préférence, sélection de scénario et programmation |
| `notoria/generate-typed-recos.ts` | Propose sélection et MITIGATED depuis les statuts retenus | Recommandation ≠ favori humain ; couverture planifiée ≠ traitement exécuté |
| `creative-proposal/index.ts` | Reconstruit les routes depuis `BrandAction.selected` | Même ensemble et versions S ; activation créative garde son accord explicite |
| `strategy-presentation/deterministic-composers.ts::compose3Horizons` | Filtre `SELECTED_FOR_ROADMAP` | Même ensemble du scénario actif, aucune préférence requalifiée en plan |
| `pillar-s-fields`, `pillar-page`, exports et calendriers | Compteurs/texte ou arming peuvent lire des sélections anciennes | Même définition de scénario, aucune programmation par préférence |
| `pillar-maturity-contracts.ts` | Minimum d’actions choisies dans `selectedFromI` | Valider des références S cohérentes, sans imposer des sélections I humaines préalables |
| `scripts/diag-i-s-actions.ts` et `run-i-s-rebuild.ts` | Zéro statut retenu déclaré comme échec de S | Diagnostic adapté au catalogue neutre et aux scénarios, pas à une présélection obligatoire |
| `mestor/i-pillar-sequenced.ts` et complétion I | Partage forfaitaire 45/30/15/10 de V et total LLM possible | Coûts par action depuis devis couvrants + estimations restantes, sources historiques conservées |
| `financial-brain/action-costing/provider-rate.ts` | Priorité prestataire existante, `sourceRef` non renvoyé par le résolveur | Provenance document/version/périmètre jusqu’au coût courant et snapshot, sans dupliquer le moteur |
| `ProviderCostRate` / `ActionCostEstimate` et leurs writers | Taux par atome et snapshots disponibles | Substitution sur la couverture exacte, bundles indivis, absence de double comptage et historique inchangé |
| Sources FINANCE / Devis et `MissionQuote` | Document versionné disponible ; MissionQuote exige mission/talent | Rattachement réel au coût avant mission, aucun objet fictif ou acceptation implicite |
| `potentielBudget`, `S.budgetBreakdown` et exports | Totaux/postes peuvent rester issus d’une enveloppe ou d’une autre source | Même coût courant par scénario ; cinq postes si détail disponible, bundle transversal conservé |
| Canon/seeds/fixtures et tests legacy | Statuts retenus préremplis et projections fixes | Compatibilité historique distincte des nouvelles préférences et preuves humaines |

Cette liste conserve le repérage initial des consommateurs, pas une assertion
qu’ils sont tous corrigés ou reçus. Le gate de sortie 526 porte sur le contrat
préférences/scénarios et ses lecteurs ; les lignes financières restent au lot
coûts futur. La réception doit rester attribuée à son périmètre exact.
