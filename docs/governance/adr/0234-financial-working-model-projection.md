# ADR-0234 — Prémisses financières V et projection commune

**Status** : Proposed — preuves 534 préintégration, head 535 et CI/merge ouverts
**Date** : 2026-11-02
**Phase** : 7 — qualification financière ADVE et irrigation
**Depends on** : ADR-0032, ADR-0172, ADR-0226, ADR-0229, ADR-0231
**Supersedes** : aucun ; factorise FinancialBrain, conserve les données legacy

## Contexte

Reprise sous 535 après intégration commerciale #1120/e09a808fa, conservée avec
son ADR0233. Notre ADR devient 0234 ; PR réelle #1121. Les métriques `source534-*`
ci-dessous sont préintégration ; validation du head 535 encore ouverte.

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
Aucun chiffre métier publié ou numéro PR anticipé, statut Proposed jusqu’à CI/merge du head intégré 535.
