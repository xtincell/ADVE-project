# ADR-0216 — La Barre native dans la session existante

Status: Accepted — code candidat, réception du déploiement distincte
Date: 2026-10-16
Phase: Shinkiro C3/C4/C7
Depends on: ADR-0166, mécanismes auth et operator-isolation existants

## Contexte

Le 16 octobre, le routeur HTTPS de La Barre ne porte que gzip et le serveur natif ne fournit pas d’authentification. GET et PUT conditionnel du corpus réel ont répondu 200 sans en-tête applicatif de compte depuis le VPS. L’exposition depuis un réseau Internet arbitraire n’a pas été mesurée. Le lecteur Fusée applique déjà une liste d’équipes autorisées, mais les liens natifs ouvrent une autre origine.

## Décision

Étendre brand-node et les routes de l’application existante : `/la-barre/[[...path]]` reçoit la session Auth.js, relit l’affectation actuelle par `getOperatorContext`, puis applique la même liste PORTFOLIO_BARRE_OPERATOR_IDS. ADMIN conserve son autorité administrative ; aucune nouvelle entreprise ou permission n’est créée. L’écriture exige ADMIN ou OPERATOR ; un droit de lecture d’équipe n’est pas un droit d’édition. Le corpus de cette installation reste une unité d’accès d’équipe, sans délégation par campagne prétendue.

Les formulaires, données, conflits, révisions et journaux restent dans La Barre. Ce transport relaie les octets et les conditions HTTP ; il ne crée ni objet métier, ni gestionnaire, ni Intent d’écriture dans une autre autorité. Seuls les chemins natifs autorisés sont relayés ; cookies et Authorization ne partent jamais au backend. Les écritures exigent l’origine courante. Aucun cache privé persistant, retry ou contournement de révision.

L’adresse amont est une configuration d’installation `PORTFOLIO_BARRE_UPSTREAM`, privée sur le réseau Docker existant ; elle ne provient jamais d’un lien ou paramètre utilisateur. Sans configuration, refus explicite. Le portefeuille lit la même source privée et les liens/fichiers pointent vers le montage authentifié. L’ancien domaine ne redirige qu’après réception de ce montage ; son routage et l’alias réseau sont conservés par la configuration Coolify/Traefik, sans nouveau service.

Sous-système : Ground / Console-Admin, INFRASTRUCTURE. Justification : les campagnes qui alimentent la production de marque doivent être accessibles à leurs exécutants et protégées des lecteurs étrangers ; le Mission Tier ne peut exploiter un corpus ouvert. Aucun appel de modèle, nouvelle identité, migration ou changement des sept Neteru.

## Conséquences

Tests comportementaux : refus anonyme et autre entreprise, révocation relue, conservation des octets/ETag/conflit, origine étrangère, absence de propagation de secrets, chemins locaux refusés, plage vidéo et noms Unicode. Réception HTTP et native réelle exigée avant livraison ; tests seuls ne prouvent pas le déploiement, la continuité ou l’isolation de toute la flotte. Le périmètre fin par campagne et les droits des autres IP restent ouverts.

## Amendement du 2026-11-26 — un refus lisible par une personne

L’audit d’adoption de La Barre (constats historique-processus-9, friction-parcours-3, fond-metier-1) relève qu’un lien direct sans session aboutissait à un 401 en texte brut, sans lien ni contact. La décision ci-dessus ne change pas : mêmes contrôles, même ordre, aucune permission, aucun compte ni modèle créé. Seule la forme du refus suit le lecteur.

- Navigation sans session : Fetch Metadata `navigate`, ou, sans Fetch Metadata (navigateurs intégrés), un GET qui nomme le HTML avec une qualité non nulle. Redirection vers la connexion existante ; l’adresse nue du montage revient à `/la-barre/index.html`.
- Lecteur qui accepte le HTML sans être redirigé (script qui déclare un autre mode, autre méthode) : page 401 autonome, sans script ni formulaire, « Se connecter avec La Fusée » et à qui demander l’accès.
- Session dont l’équipe n’est pas raccordée : page 403 qui nomme le compte connecté et la personne à contacter, sans relayer la source.
- Données (`Accept: */*`, JSON, sans Accept) : refus en texte inchangé, que le poste natif lit et que les reçus de livraison attendent (401).
- La personne à contacter est une configuration d’installation, `PORTFOLIO_BARRE_CONTACT`, jamais un compte lu en base, puisque la page est lisible sans session. À défaut, le contact public de La Fusée déjà donné par la page de mot de passe ; un réglage non vide mais invalide est signalé une fois dans le journal du serveur, sans sa valeur.
