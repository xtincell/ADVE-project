# La Barre dans la session de cette installation

ADR-0216, candidat 486 du 16 octobre. Réception production distincte.

- `/la-barre/index.html#/projets/<id>` garde les écrans et l’autorité de La Barre. Le portefeuille produit des liens relatifs à cette installation. Auth.js et l’affectation courante contrôlent chaque requête.
- `PORTFOLIO_BARRE_UPSTREAM` : origine privée seule du serveur natif, par exemple `http://la-barre-source:3000`, sans identifiants, chemin, query ou hash. Runtime uniquement.
- `PORTFOLIO_BARRE_OPERATOR_IDS` : équipes déjà autorisées à ce corpus. Vide pour une nouvelle entreprise non raccordée ; aucune permission n’est créée par un lien ou import. L’unité d’accès est le corpus d’équipe, pas une campagne isolée. ADMIN est administratif ; l’écriture exige ADMIN ou OPERATOR et l’origine publique Auth.js courante.
- Dans Coolify, l’alias doit appartenir à **custom_network_aliases** du modèle Application : le job déploie `custom_network_aliases_array` dans Compose. Une option Docker `--network-alias` persiste dans l’API mais n’a pas créé l’alias sur cette installation Nixpacks ; vérifier l’alias effectif, pas le champ seul. Conserver les volumes depots/review et le commit source.
- Ordre : adresse privée réellement résolue depuis le publisher, mêmes octets source ; variable runtime ; code/CI/image reçus ; déploiement publisher seulement ; natif autorisé + source refusée anonymement ; ancien domaine redirigé **après** ces réceptions. Ne jamais rendre le corpus public en repli si l’amont échoue.
- Retour arrière : conserver les données courantes. Restaurer uniquement la version/env delta du publisher et le fichier d’ingress détenu ; aucune restauration de snapshot ou ancien dépôt de campagne. Ne pas exposer à nouveau les données pour réparer une navigation.

Le partage client sans compte, la délégation par campagne, les autres IP et la rotation de signature Supabase sont des réceptions distinctes encore ouvertes. Ce montage n’est pas une preuve d’isolation de toute la flotte.
