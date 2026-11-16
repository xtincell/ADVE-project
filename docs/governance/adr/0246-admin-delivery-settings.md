# ADR 0246 — Configuration administrateur des emails et de CinetPay

- **Status**: Accepted — décision d’interface d’Alexandre du 16 novembre 2026 ; réception du code et du runtime distincte.
- **Date**: 2026-11-16
- **Phase**: Reprise du plan d’achèvement, configuration de service existante.
- **Depends on**: ADR-0021, ADR-0075, ADR-0079 ; primitives existantes d’authentification, de chiffrement et d’émission.
- **Supersedes**: restriction « secrets de paiement uniquement en environnement » d’ADR-0075 pour les remplacements CinetPay explicitement définis ci-dessous. Aucune extension aux autres clés système.

## Contexte

Alexandre demande une page de configuration pour gérer ultérieurement les emails automatiques et CinetPay. La lecture du serveur confirme l’absence de fournisseur et d’expéditeur d’email système. Les deux identifiants requis par l’adaptateur CinetPay Aurore v1, clé et mot de passe API, sont déjà présents dans l’environnement : un identifiant de site n’est pas une entrée de cet adaptateur. La page doit conserver les réglages existants et fonctionner sans accès à l’administration de l’hébergeur.

## Décision

Étendre la page Console **Configuration → Intégrations**, section `#email-paiement`, et le routeur `system-config` existants. L’accès à la lecture projetée et à l’écriture est réservé à l’administrateur courant. Les formulaires email et CinetPay sont indépendants ; une sauvegarde de l’un ne remplace pas les paramètres de l’autre.

La ligne réservée `system-delivery-settings-v1` de `McpServerConfig`, déjà utilisé pour les réglages globaux, conserve les remplacements. Les secrets sont chiffrés avec la primitive AES-GCM du coffre et la clé `INTEGRATION_TOKEN_KEY`, qui reste dans l’environnement et fait partie des sauvegardes de reprise. Aucun modèle, migration, fournisseur, moteur ou Intent supplémentaire. Les lecteurs et écrivains génériques de configuration refusent cette ligne réservée.

Les champs secrets vides conservent la valeur ; remplacement, effacement et retour à l’environnement sont des opérations distinctes. Sans remplacement enregistré, les valeurs de l’environnement restent effectives. Les consommateurs email et CinetPay lisent la configuration effective à l’exécution ; aucun changement global de `process.env`. Les écritures concurrentes des deux formulaires sont sérialisées.

L’émission existante `LEGACY_SYSTEM_CONFIG_UPSERT` n’enregistre que l’acteur, les sections et les types d’opérations. Le secret en clair ne traverse ni sa sérialisation automatique, ni les journaux, ni les réponses de lecture. Les erreurs renvoyées sont génériques. La réponse contient les réglages non secrets, la présence et la source des secrets, leur lisibilité et l’état incomplet ou renseigné.

Un brouillon incomplet peut être enregistré. **Renseigné ne signifie pas vérifié** : l’enregistrement n’envoie aucun email et ne déclenche aucun paiement. Les contraintes sandbox/live, l’approbation marchande et son empreinte restent applicables aux identifiants effectifs, y compris après rotation. Les comptes déjà connectés ne sont pas déclarés reçus sur la seule présence d’un secret.

## Conséquences

- Le propriétaire peut compléter les paramètres plus tard dans l’interface demandée.
- Les intégrations de paiement autres que CinetPay conservent leur politique d’environnement d’ADR-0075.
- La reprise exige la base de réglages **et** `INTEGRATION_TOKEN_KEY`. Une clé absente ou incorrecte produit un état indisponible, sans valeur secrète ni faux succès.
- La réception couvre droits, sauvegarde indépendante/concurrente, chiffrement, projection, changement de fournisseur, retour à l’environnement et consommation effective. Un envoi ou un paiement réel demande sa recette distincte.
