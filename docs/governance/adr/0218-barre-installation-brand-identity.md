# ADR-0218 — Une instance La Barre et des identités de marque par installation

Status: Proposed — réception intégrée ouverte
Date: 2026-10-19
Phase: Shinkiro C7 — Ground / Console-Admin / INFRASTRUCTURE
Extends: ADR-0193, ADR-0200, ADR-0216, ADR-0217

## Besoin et factorisation

La distribution neutre de La Barre existe. Le raccord reste cependant fixé au
dépôt Matanga et une plateforme créée dans une entreprise neuve n'est pas encore
un BrandNode. Une image vide ne constitue donc pas un onboarding reçu.

CODE-MAP référence BrandNode, OPERATOR_CREATE_BRAND_NODE et
OPERATOR_ATTACH_STRATEGY_TO_NODE. Le formulaire manuel, sourceRefs,
getPortfolioWorkspace, getBarreBrandContext, VAULT et le proxy authentifié
existent : ils sont étendus, sans nouvelle entité, page, service permanent,
autorité, Intent ou gestionnaire. La classification de la marque reste un geste
explicite dans le formulaire existant ; Strategy ne devient pas implicitement un
produit. Aucun pilier, statut de validation ou droit n'est créé par le raccord.

## Contrat

L'adresse amont, l'instance source et le dépôt sont configurés par installation.
Une référence historique sans instance conserve son sens barre-matanga. La
validation d'identité accepte les espaces de noms ; le lecteur ne résout que
celui de sa connexion. Même ID dans une autre instance n'est pas le même dossier.
Le cache de lecture est qualifié par cette connexion. La reprise conserve
l'identité source, même si le nom du déploiement Docker change.

Le contexte propose seulement les BrandNode courants de l'équipe du lecteur,
avec stratégie attachée et autorisée. Ce choix contient une identité et un lien,
pas une copie du socle. Le choix explicite d'une marque dans le formulaire natif
du projet admet un pointeur LA_FUSEE:brand dans DEPOT.marques. Les champs de ce
pointeur restent sous l'autorité de l'éditeur de marque, y compris absents ou
temporairement indisponibles. Les anciennes marques locales gardent leur
comportement ADR-0217. Les réponses complètes ne sont lues que pour les marques
locales demandées. Le portefeuille retrouve les véritables projets du dépôt via
leurs pointeurs exacts ; aucune référence La Barre fictive n'est pré-écrite.

Chaîne de valeur : socle de marque autorisé → projet natif La Barre → briefs et
production dans les outils existants → résultats attribuables à la même marque.
Ground infrastructure nécessaire à Propulsion ; aucun appel modèle, droit de
publication, approbation ou résultat n'est inféré de la connexion.

## Réception attendue

Identités homonymes/IDs identiques entre installations distinctes ; ancien Noël
inchangé ; création manuelle de la marque, rattachement d'une stratégie, projet
avec marque choisie et retour dans son portefeuille ; sauvegarde/restauration
des deux stockages puis même parcours. Source seule et HTTP 200 ne valent pas
réception de cette chaîne. Les autres IP et les sept chantiers restent ouverts.
