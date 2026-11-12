# ADR 0232 — Supervision des vendeurs et conversation client

> Renumérotation 2026-11-02 : le numéro0231 est déjà reçu dans main pour la provenance des cellules ADVE ; le dossier commercial utilise0232 après intégration parallèle.

Statut : Proposed, réception complète en cours.

Le dossier commercial 530 conservait mandat, décisions et preuves, mais aucun poste ne permettait de nommer/activer les vendeurs ni de leur faire traiter une réponse reçue. La flotte étend le CRM existant ; elle ne remplace ni ADVE, ni la finance, ni le gestionnaire de modèles.

SalesRepresentative porte une identité humaine ou une clé chiffrée limitée à une marque et à une liste exacte d’outils. SalesRun est la tâche commerciale et son reçu durable : claim idempotent, une seule exécution à la fois, réservation de consommation, résultat reçu ou AMBIGUOUS à réconcilier. Conversation/Message portent le dialogue dirigeant-vendeur. Deal et CRMActivity restent les autorités des engagements ; CrmMessage.salesDealId préserve le destinataire même sans email, sans réaffecter un contact global à une autre marque.

Le superviseur Galahad exécute sériellement les tâches avec la boucle, le modèle, les autorisations et la mémoire existants. Une pause bloque les prochains effets ; un reçu déjà produit peut être conservé. Les requêtes d’outils d’une tâche client portent sa lease hors prompt ; le serveur vérifie profil actif, affaire et rôle avant l’effet. Aucun shell ni fournisseur implicite supplémentaire n’est accordé.

Le client utilise une conversation privée normale ; le STI reste vendeur. Le lien est stable et chiffré au repos, non indexable et sans referrer. Réponses entrantes et règlements indépendamment confirmés réveillent le titulaire mandaté. L’email utilise le transport existant. Les ponts externes authentifient l’événement et vérifient son émetteur ; les canaux non raccordés restent manuels. Un mandat ne transforme pas un connecteur absent en canal disponible, ni un résultat modèle en accord, paiement ou prestation prouvés.

Lecture du dialogue dirigeant-vendeur : la tranche bornée contient les 200 messages les plus récents, puis est rendue chronologiquement. Le tri utilise createdAt et id pour rester déterministe lorsque plusieurs messages partagent une milliseconde. Une actualisation doit faire entrer une nouvelle réponse dans cette tranche ; la limite ne doit pas figer le fil sur ses premières lignes. Les réponses et résultats sont rendus par MarkdownContent partagé, avec sa sanitisation existante, sans réécriture du texte enregistré.

Recette : provisioning et cloisonnement, pause/passation, rejeu/concurrence, interruption, conversation client, vrai modèle sur base isolée, image exacte et réception de production. Une vente fictive ne prouve aucun encaissement réel. Aucune donnée ADVE de production n’est réécrite par ce chantier.
