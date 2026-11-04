# ADR0241 — Production des options visuelles du calendrier

4 novembre 2026. Suite des ADR0050 et ADR0136.

## Décision

Une ligne de calendrier issue de Glory conserve son texte et sa provenance. Chaque option est un brief versionné du coffre. Une correction prend pour parent l’option concernée. Le nombre de pistes se règle de une à quatre, avec deux propositions par défaut.

Les deux entrées de la Forge utilisent le même atelier. L’aperçu fixe les versions des entrées. Au lancement, Mestor réutilise les briefs disponibles et demande à Glory les pièces manquantes. Un reçu technique des mêmes entrées peut être repris après une panne. Les candidats demeurent identifiés jusque dans la transmission au producteur suivant.

Ptah reçoit le prompt de production et les références autorisées. Un master peut conserver sa photographie ou recevoir une nouvelle couche. Il impose son format, son texte, ses fontes et ses marques graphiques. Une version livrée contient un fichier consultable dans la marque. La publication sociale et son accord restent des actes ultérieurs.

## Vérification

Les tests du service couvrent les versions, les reprises, l’isolation de marque et les transferts de références. La recette locale d’octobre emploie deux formats et conserve les échecs intermédiaires. Le renderer de l’image distribuée est testé dans le dernier étage Docker.
