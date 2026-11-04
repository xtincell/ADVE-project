# ADR0238 — Entrée commerciale publique de marque

Date : 4 novembre 2026.

Statut : Proposed — parcours complet essayé avec Luna et un client fictif ; mise en ligne en cours.

## Problème

La flotte et le STI savent poursuivre une affaire, mais le lien privé `/sales/[token]` exigeait un dossier préparé. Un visiteur inconnu ne pouvait pas engager spontanément cette conversation depuis le site de sa marque. Cette entrée doit rejoindre le même vendeur, les mêmes conditions et les mêmes preuves de vente que les portefeuilles autorisés, sans créer un second chatbot ni un second CRM.

## Décision

Une marque peut publier une entrée permanente `/talk/[publicId]`. Son propriétaire ou un administrateur choisit explicitement le nom public, l’accueil, le marché, un vendeur actif de la marque, la capacité d’accueil et jusqu’à dix offres du catalogue. La publication traverse `crm.saveSalesPublicEntry`, commande gouvernée avec version attendue. Aucune marque n’est publiée par sa seule présence dans le portefeuille ADVE.

Le responsable choisit « Répondre aux questions » ou « Proposer des offres ». Le premier mode utilise les sujets du catalogue, sans afficher de prix ni promettre une prestation disponible. La limite est conservée dans le dossier ; ni le visiteur ni le vendeur ne peuvent la lever. Proposition, accord, paiement et livraison sont refusés dans ce mode. Les valeurs internes explicitement non applicables ne constituent ni une offre gratuite ni un montant prévisionnel ; la valeur de l’affaire reste nulle.

Chaque offre autorisée conserve sa version de catalogue, son prix, sa devise, ses conditions, sa validité, son responsable de remise et son arbre STI. Le rail financier est facultatif à l’ouverture : une conversation et une proposition peuvent fonctionner avant configuration du règlement. Une demande de paiement exige toujours la destination attestée, le bénéficiaire et le responsable financier prévus par le contrat de règlement existant. L’absence de rail financier n’est pas comblée par un compte fictif.

Le visiteur peut écrire immédiatement. Le prénom et le choix de sujet restent facultatifs ; il peut sélectionner « Je ne sais pas encore ». Sans choix, la première offre autorisée initialise le cadre de qualification. Elle ne vaut pas proposition présentée au client. Avant la proposition, `SELECT_OFFER` permet au vendeur de retenir une autre offre parmi les instantanés approuvés de ce dossier. Il ne peut modifier librement prix, conditions ou catalogue, ni remplacer une offre après engagement.

L’admission crée atomiquement un `Deal`, son mandat WEB, son accès privé, le premier message reçu et le travail du vendeur affecté. Le client est à l’origine de cette conversation ; l’autorité de la marque vient de la publication conservée. Le système réutilise l’enregistrement entrant, `SalesRun`, les limites du titulaire, le STI et les outils commerciaux existants. Un titulaire humain reçoit le même dossier ; l’IA reste facultative.

`SalesPublicEntry` conserve la porte et son autorisation versionnée. `SalesPublicSession` conserve l’admission, l’identité technique de reprise, les offres approuvées et les compteurs persistants. Ces deux modèles ne remplacent ni l’affaire ni son journal. Aucun principal public, compte opérateur, connecteur LLM ou ordonnanceur supplémentaire n’est créé.

## Identité, confidentialité et reprise

La projection anonyme expose uniquement le nom public choisi, l’accueil, le type de titulaire, la disponibilité et les offres explicitement publiées. Elle ne retourne pas de pilier ADVE, de clé, d’identité du personnel, de destination financière ni d’arbre interne. Le nom public est figé à l’admission ; la conversation privée conserve cette identité même si le nom interne ou une publication ultérieure change. Les anciennes conversations commerciales restent compatibles.

Le navigateur crée un UUID de demande et un secret aléatoire de 32 octets avant le premier POST. Le serveur conserve le condensat du secret et l’empreinte du premier message. Un UUID connu ou une adresse email ne suffit pas à récupérer une conversation. Une reprise identique restitue le même lien privé ; une charge différente ou un autre secret est refusé. Les visiteurs ne sont pas fusionnés par email ou par nom.

Une réponse réseau incertaine conserve la même demande dans cet onglet. Après succès, seul le chemin privé est gardé côté navigateur. Les refus de validation explicites permettent de corriger le message. Une reprise prouvée peut retrouver le dossier après fermeture de l’entrée, expiration ou STOP ; elle ne crée pas de nouvelle mission et ne réautorise aucun envoi.

## Disponibilité et limites

L’ouverture revalide la marque, l’auteur habilité, le vendeur, sa clé éventuelle, les responsables, le catalogue et la validité des offres. La fermeture d’une entrée reste possible quand ses anciennes offres ou son vendeur ne sont plus prêts. Elle suspend les nouvelles admissions ; la pause du titulaire et les règles du dossier continuent de gouverner ses effets.

Les admissions partagent un verrou et des limites persistantes : plafond horaire et quotidien de marque, avec une borne supplémentaire de trois admissions par origine réseau pseudonymisée et par heure. L’adresse brute n’est pas conservée dans la session. Le corps HTTP est borné à 12 000 octets et le message à 4 000 caractères. Les contrôles d’origine utilisent la résolution canonique existante, y compris derrière le proxy. Cette délégation concerne les échanges WEB initiés par le visiteur ; elle n’accorde ni prospection sortante, ni email, ni WhatsApp, ni téléphone.

Le règlement réutilise `SALES_COLLECTION` : montant et bénéficiaire proviennent du mandat, preuve financière humaine indépendante, puis confirmation client après remise. Le texte du client, un `WON` CRM ou une réponse du modèle ne sont jamais une preuve d’encaissement. Un exercice de recette ne constitue pas une vente réelle.

## Expérience

L’accueil et le dossier privé partagent une conversation centrale : identité de marque, accueil lisible, messages et zone de réponse. La proposition apparaît après sa présentation effective ; le règlement et la demande d’arrêt gardent leurs états. Les nouveaux messages suivent la lecture lorsque le client reste en bas, sans déplacer une lecture d’historique.

Les repères observés sur [Resend](https://mobbin.com/screens/27ace4ea-bb61-4141-b7aa-ae5551b66dfd) et [PayPal](https://mobbin.com/screens/a87be386-4a8f-49cc-a721-35c74256819a) servent à cette structure conversationnelle. Les tokens, polices et composants de La Fusée sont conservés ; aucune palette, navigation, promesse de conversion ou contrainte de compte de ces références n’est reprise.

Le lien est copiable dans le poste commercial. Le site UPgraders et les pages publiques `/b/[slug]` n’affichent « Parler au commercial » que si cette entrée est prête. L’édition publique de marque existante reste distincte de l’autorisation commerciale.

## Réception

Les contrôles ciblent admission anonyme, isolation entre marques, absence de fuite privée, secret de reprise, collisions et concurrence, limites persistantes, pause et expiration, instantanés d’identité et d’offres, sélection avant proposition, règlement facultatif et protections du rail financier existant. Le navigateur isolé reçoit le premier message sans compte ni choix d’offre, la reprise du même onglet et une largeur de 390 pixels sans débordement.

Le parcours avec Luna a atteint DELIVERED : visiteur sans compte, choix d’une offre à 15 000 FCFA, accord reçu, demande de paiement individuelle, confirmation indépendante fictive, document ouvert dans le navigateur et confirmation du client. Les premières étapes ont subi deux interruptions pour limite de consommation ; elles restent documentées. Les trois dernières interventions ont terminé dans leur limite. Aucun argent réel ni vente réelle. Les contrôles de la source finale, la mise en ligne et la conservation des données restent à vérifier ; aucun des sept chantiers Shinkiro n’est clos par cet essai.

Précédents : [ADR0232 — Flotte et conversation client](0232-sales-fleet-and-customer-conversation.md), [ADR0233 — Portefeuilles et règlement](0233-authorized-sales-portfolios-and-collection.md).

Points d’entrée : [contrat](../../../src/server/services/crm-engine/public-entry-contract.ts), [service](../../../src/server/services/crm-engine/public-entry.ts), [poste](../../../src/components/console/crm-sales-public-entry.tsx), [accueil](../../../src/components/console/public-sales-entry.tsx).
