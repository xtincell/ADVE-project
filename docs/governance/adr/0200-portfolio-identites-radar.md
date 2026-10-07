# ADR-0200 — Raccordements qualifiés du suivi Radar

- **Status**: Accepted
- **Date**: 2026-10-07
- **Phase**: 18 — intégration des marques, réception Shinkiro
- **Depends on**: ADR-0193, ADR-0198
- **Supersedes**: aucune

## Contexte

Le suivi Noël existe dans Radar Matanga sous un identifiant numérique stable.
`BrandNode.sourceRefs` sait déjà relier marques, projets et stratégies, mais son
identité system/kind/id confondrait deux Radar partageant le même identifiant.
Le lecteur rejette aussi tout le tableau lorsqu'une seule entrée est invalide.
Enfin, une édition de liens ouverte avant une autre écriture peut la remplacer.

Les recherches CODE-MAP, schema, services, routers et pages identifient les
primitives existantes : portfolio-reference, portfolio-barre, brand-node,
PortfolioReferencesForm et onboard-portfolio. Elles sont étendues ; aucune table,
page, file de tâches, nouveau gouverneur ou canal de synchronisation n'est ajouté.

## Décision

1. Un suivi porte `system: RADAR`, `kind: brief`, l'instance explicitement nommée
   et l'identifiant numérique du brief. Son code affiché reste un label.
   La même clé system/instance/kind/id sert au schéma, au lecteur, au workspace,
   au formulaire et à l'importeur. Les références de plusieurs marques peuvent
   désigner le même suivi sans le dupliquer dans un projet.
2. Un contexte optionnel désigne le projet d'origine par son identité qualifiée
   La Barre. Le connecteur actuel est fixe : seule `barre-matanga` est acceptée.
   Les anciennes références La Barre sans instance désignent ce même raccord.
   Aucun namespace arbitraire n'est accepté puis résolu dans le dépôt global.
3. Les liens restent des identités, sans statut, accord ni autre état métier.
   Ils n'autorisent aucun accès et n'initient ni fetch Radar ni IA. Le projet et
   le reçu restent respectivement dans La Barre et Radar, avec leurs droits.
   La Fusée les présente dans le dossier de marque et le projet exact.
4. Lecture par entrée : préserver les références valides, signaler les entrées
   rejetées et les doublons. Les schémas d'écriture restent stricts. Le formulaire
   et l'importeur refusent de réenregistrer un historique invalide en l'amputant.
5. Toute réécriture de sourceRefs exige `expectedUpdatedAt`. La commande commune
   compare cette version dans l'UPDATE atomique et refuse l'écriture périmée.
   Formulaire et importeur transmettent leur version réellement lue ; le handler
   agentique applique le même contrôle. Aucun second écrivain.

Sous-système Guidance, gouverneur Mestor : extension de la primitive de
persistance OPERATOR_UPDATE_BRAND_NODE, déjà gouvernée, sans nouvelle production
orchestrée ni nouveau Glory tool. La conservation des références permet de
retrouver le brief, sa stratégie et l'exécution dans la chaîne ADVERTIS existante.
Aucun pilier n'est amendé ; le coût de cette liaison reste nul en appels LLM.

## Conséquences

- Compatibilité des liens existants ; deux Radar de même id restent distincts.
- Les champs inconnus sont refusés à l'écriture et signalés à la lecture.
- Le dépôt La Barre fixe n'établit pas la multitenance générale : configuration
  par équipe et tests de refus croisés restent nécessaires avant un second client.
- Une référence n'est jamais un reçu d'admission, une validation ou une livraison.
- Un import reste une suite de commandes reprenables, sans transaction globale.
  Un conflit versionné exige une nouvelle lecture, pas un retry aveugle.
- Réception : tests identité/instance, historique invalide, anciennes références,
  contexte exact, commandes HTTP authentifiées et concurrence PostgreSQL. Le
  navigateur doit recevoir le rendu avant toute déclaration de réception native.
