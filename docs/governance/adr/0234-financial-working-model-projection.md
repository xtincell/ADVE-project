# ADR-0234 — Prémisses financières V et projection commune

**Status** : Accepted — périmètre financier et cohérence536 reçu ; extension de planification537 Proposed
**Date** : 2026-11-02
**Phase** : 7 — qualification financière ADVE et irrigation
**Depends on** : ADR-0032, ADR-0172, ADR-0226, ADR-0229, ADR-0231
**Supersedes** : aucun ; factorise FinancialBrain, conserve les données legacy

## Contexte

536 est reçue au périmètre financier et cohérence : PR #1121 fusionnée en
`28db5c2482673024ad3a554e26b5495683fa3dc5`, seize contrôles CI verts, image/runtime
6.27.536 reçus. Montages et données métier comparées conservés ; les diagnostics
dérivés expliquent la différence de réponse, pas une égalité brute revendiquée.
Modèle financier V appliqué avec anciennes valeurs humaines conservées, sans
adoption humaine fabriquée ; cascade R/T/I/S reçue, socle ADVE préservé. Lecture
native de la roadmap reçue pour score, jalons et absence de rejet qualifiée
Calculé ; Oracle reçu sur les cartes financières ciblées, pas sur tout le rapport.
Les reçus et données de marque restent privés hors checkout. Les budgets et
objectifs d’engagement manquants dans S motivent537 ; aucun wholeADVE, wholeOracle,
MVP ou sept chantiers clos n’est déduit de536.

Defaults sectoriels et conventions hétérogènes de cohorte/horizon/marge peuvent
faire diverger les lecteurs. Une projection proposée ne prouve ni performance
observée, ni trésorerie disponible. Source → calcul → postulat ADVE qualifié reste
le contrat ; pas de montant inventé pour compléter un champ.

## Décision

### Entrée versionnée, provenance existante

V.financialModel porte l’édition financière de base, BreakEvenDocumentModel
existant, même cohorte D PAYER, prix/CF/CV, volumes sur douze mois, rétention,
horizon/plafond CAC et références des postes communication inclus aux charges.
Montants documentés/historiques/hypothèses restent qualifiés, avec notes, sources,
devise/base fiscale/unité/période. La trésorerie conditionnelle part du solde
initial et des délais renseignés, avec ses exclusions ; ce n’est pas un solde bancaire.
**pillar.sources et checkpoints existants restent la provenance. model.source
identifie seulement l’édition de base : aucun registre ou source de vérité parallèle.**
Les reçus des montants restent ceux du mécanisme documentaire existant.

### Factoriser le calcul et ses états

L’unique calculateBreakeven/types rejoint domain/financial-document puis est
réexporté par financial-brain. projectFinancialWorkingModel dans domain/unit-economics
est une projection pure : aucun nouveau moteur, service, provider ou manager d’appels.
Revenu annuel = somme des volumes, communication comprise aux charges sans double
compte, marge selon leur périmètre. CAC = plafond récupérable proposé ; ratio/ROI
évalués à ce plafond, pas coût ou performance mesurés. Le premier mois rentable
couvre les charges mensuelles, sans prétendre mesurer un amortissement cumulé.
Un ROI peut dépasser 100 %. Prémisses invalides → état incomplet ; déficit connu
→ résultat calculé explicite, absence de seuil fini ou non-applicabilité justifiée,
sans faux zéro, données manquantes ou scénario rentable fabriqué.

### Un calcul pour les consommateurs, sans seconde base

resolveUnitEconomics/projectFinancialPillar raccordent V/Oracle/export, bindings
Glory, contexte RTIS, maturité, cross-validator, I et budget-allocator existants.
Anciennes métriques conservées et utilisées sans modèle ; modèle présent = calcul
courant, même incomplet, sans repli sur cache legacy contradictoire. Moyennes
sectorielles retirées de deriveByCalculation. Dérivés qualifiés INFERRED, sans
modifier la provenance stockée ; un modèle proposé n’ajoute aucun bonus de
performance prouvée ni budget disponible Thot. Readiness structurelle ≠ succès réel.
Le document financier lit V avec ses gardes de version source/pilier ; chemin
legacy documentaire transitoire sans modèle explicitement distinct d’une irrigation ADVE.

### Éditer sur les rails gouvernés

Éditeur structuré dans le parcours existant de sélection/lecture de sources et
amendement. Brouillon sans montant par défaut ; modèle complet, version V attendue,
reçus documentaires cohérents et accessibles, cohorte D PAYER/version D à contrôler.
Édition des prémisses plutôt que des métriques dérivées ; écritures et fences
source/V/modèle/PAYER reçus au ciblé PG 20/2, valeurs humaines anciennes conservées,
reçu périmé/profil trafic/résultat édité refusés. Test réel de concurrence D reçu :
modification juste avant gateway, refus PILLAR_SOURCE_VERSION_CONFLICT sans version V
ni recommendation APPLIED. Aucun nouveau writer ou registre.

### Consommateur S : calcul et couverture du contrôle commun

La livraison536 raccorde `computePillarS` au validateur existant via
`validatePillarCrossReferences` et `summarizeCrossReferences`. L'évaluation porte
sur le plan nouvellement produit, pas l'ancienne version persistée. Score et
couverture restent distincts : conformes / évalués ×100, contrôles non évalués
exposés, compteur des observations R séparé. Racine S, tableau calculé et Oracle
reprennent ce résultat ; un zéro legacy reste prioritaire sans nouveau reçu.
Ce raccord ne constitue ni mesure de performance de marque ni validation de toute
l'irrigation. Le format I et les références de mitigation sont corrigés dans le
même lot ; la cascade réelle et les surfaces ciblées sont reçues en536.
La planification restante fait l’objet d’[ADR-0235 Proposed](0235-strategy-planning-premises-and-projections.md).

## Conséquences et réception

Préintégration `source534-*` : suite complète 5 121 tests/491 fichiers, PG ciblé 20/2 source/V/D et valeurs
humaines conservées, deux contre-épreuves zéro/non-applicabilité rouges puis
8 tests consommateurs verts. Typage/lints sans erreur (24 avertissements
préexistants), cycles 0 et build webpack heap 8 GiB exit 0. MCP réel en copie
isolée une écriture ; fiche Glory depuis V/Word 37 contrôles/cinq pages inspectées
et Oracle cohérents. Relecture compilée finale sans mutation : Oracle USER,
Word sans inconnu, cross-validator, éditeur PAYER et résultats non éditables,
contenu/métadonnées exacts. Pages HTTP sans natif, stress sans finding.
Dettes locales fences/raccord/cohérence fermées ; CI/image/runtime, modèle réel et
cascade RTIS reçus en536, natif limité aux sections explicitement reçues. FinancialModel optionnel
pour legacy ne prouve pas toutes les sorties : admission/complétude des autres
dossiers avant wholeMVP, dette globale dans RESIDUAL-DEBT. Modèle/données réels
et artefacts privés hors checkout, exemples du dépôt synthétiques sans marque.
Aucun chiffre métier publié ; PR1121 réelle, statut Accepted au périmètre536 reçu.
Les réceptions de planification537 et wholeMVP restent ouvertes.
