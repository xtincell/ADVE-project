# ADR-0234 — Prémisses financières V et projection commune

**Status** : Proposed — preuves534/535 attribuées, head536 et CI/merge ouverts
**Date** : 2026-11-02
**Phase** : 7 — qualification financière ADVE et irrigation
**Depends on** : ADR-0032, ADR-0172, ADR-0226, ADR-0229, ADR-0231
**Supersedes** : aucun ; factorise FinancialBrain, conserve les données legacy

## Contexte

Candidat 536 après les livraisons commerciales #1120/e09a808fa et #1122/f77fe2dc8,
conservées avec leur ADR0233. ADR financier0234 ; PR réelle #1121. Le runtime
535 reçu en production est commercial ; le modèle financier de marque reste à appliquer.
Les métriques `source534-*` ci-dessous sont préintégration. Le candidat535 a reçu
5 144 unitaires/496 fichiers, typage/lints et build ; PostgreSQL principal576/577
avec un timeout grand document, ciblé financier20/20, flotte12/12 et paiements9/9.
Ces reçus ne valident pas le head536, sa livraison ou son écran. Ciblé536 :
quatre nouveaux tests service/rendu verts ; PostgreSQL72/4 et grand document16/1
en 60,9 s. Cette dernière reprise suit le redémarrage de la base locale éteinte ;
elle ne constate aucun incident de production ni capacité sous charge.
État536 compilé avant le dernier correctif de badge : 5 148 unitaires/498 fichiers,
build production exit0, typage/lints verts (24 avertissements préexistants).
`pillar.actualize` sur fixture possédée : S seul modifié, score71, 31 contrôles
(20 conformes, 8 écarts, 3 non évalués), synthèse reçue dans Oracle, appels273/88 ms.
Relecture financière compilée sans mutation : Oracle58 ms, Word845 ms/37 contrôles
sans inconnu, validation13 ms, éditeur14 ms ; HTTP200 en17/33/20 ms, contenu et
métadonnées des piliers inchangés. Stress compilé : 277 reçues, 5 non reçues,
0 finding. Ces preuves ne reçoivent ni écran natif, ni SLO, ni production.
Dernier delta UI : liste de rejets calculée vide distincte du champ absent,
badge CALCULATED ; gouvernance/composant1 682 tests/170 fichiers verts après ce delta.
Reconstruction finale536 après badge exit0 (`source536-build-final.log`). Relecture
exacte `source536-postbadge-http-received.json` sans mutation : Oracle106 ms,
Word630 ms/37 contrôles sans inconnu, validation35 ms, éditeur31 ms et trois
routes HTTP200 en198/65/77 ms ; contenu/métadonnées des piliers inchangés.
Le rendu natif et la production restent non reçus, aucune latence ne vaut SLO.
CI PostgreSQL : 597/598, ancien test exigeant l’absence de score corrigé pour
contrôler score structurel/couverture non évaluée et confiance0 ; gardes KPI/objectifs
conservées. Ciblé corrigé39/39 vert en2,53 s ; ce delta porte seulement
l’assertion et la documentation, pas le métier compilé. CI complète verte non reçue.
Cascade réelle I, jalons Overton et compléments ADVE/roadmap restent ouverts.

Defaults sectoriels et conventions hétérogènes de cohorte/horizon/marge peuvent
faire diverger les lecteurs. Une projection proposée ne prouve ni performance
observée, ni trésorerie disponible. Source → calcul → postulat ADVE qualifié reste
le contrat ; pas de montant inventé pour compléter un champ.

## Décision proposée

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

Le candidat536 raccorde `computePillarS` au validateur existant via
`validatePillarCrossReferences` et `summarizeCrossReferences`. L'évaluation porte
sur le plan nouvellement produit, pas l'ancienne version persistée. Score et
couverture restent distincts : conformes / évalués ×100, contrôles non évalués
exposés, compteur des observations R séparé. Racine S, tableau calculé et Oracle
reprennent ce résultat ; un zéro legacy reste prioritaire sans nouveau reçu.
Ce raccord ne constitue ni mesure de performance de marque ni validation de toute
l'irrigation. Le format I et les références de mitigation sont corrigés dans le
même candidat ; la cascade réelle et les surfaces doivent encore être reçues.

## Conséquences et réception

Préintégration `source534-*` : suite complète 5 121 tests/491 fichiers, PG ciblé 20/2 source/V/D et valeurs
humaines conservées, deux contre-épreuves zéro/non-applicabilité rouges puis
8 tests consommateurs verts. Typage/lints sans erreur (24 avertissements
préexistants), cycles 0 et build webpack heap 8 GiB exit 0. MCP réel en copie
isolée une écriture ; fiche Glory depuis V/Word 37 contrôles/cinq pages inspectées
et Oracle cohérents. Relecture compilée finale sans mutation : Oracle USER,
Word sans inconnu, cross-validator, éditeur PAYER et résultats non éditables,
contenu/métadonnées exacts. Pages HTTP sans natif, stress sans finding.
Dettes locales fences/raccord/cohérence fermées ; natif, CI/image/runtime, modèle
réel en production et cascade RTIS restent à recevoir. FinancialModel optionnel
pour legacy ne prouve pas toutes les sorties : admission/complétude des autres
dossiers avant wholeMVP, dette globale dans RESIDUAL-DEBT. Modèle/données réels
et artefacts privés hors checkout, exemples du dépôt synthétiques sans marque.
Aucun chiffre métier publié ou numéro PR anticipé, statut Proposed jusqu’à CI/merge du head intégré536.
