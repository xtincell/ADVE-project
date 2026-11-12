# ADR-0230 — Continuité des affaires et poste commercial

Statut proposé, 2 novembre 2026.

Le commercial humain ou autonome agit au nom de la marque qui vend. Son dossier doit conserver l’acheteur, les conditions approuvées et le dernier engagement sur chaque point de contact. La conversion historique d’un Deal en Strategy répond au cas UPgraders qui accueille une marque. Une vente Gold conserve le compte restaurant dans l’affaire SPAWT.

## Décision

Étendre Deal avec operatorId, sellerStrategyId, contactPhone, commercial, paymentReference et revision. contactEmail accepte désormais null. Les affaires historiques gardent leurs valeurs. Les affaires antérieures sans propriétaire ni stratégie restent visibles à l’administrateur pour qualification. Les affaires liées à une stratégie conservent leur périmètre historique.

Réutiliser les mutations CRM gouvernées de création et d’édition. Le mandat approuvé conserve offre et version du catalogue V, montant, devise, conditions, bénéficiaire, titulaire, responsable de remise, expiration et canaux. Le vendeur peut être un utilisateur nominatif ou une clé MCP active limitée à cette marque. L’arbre optionnel porte ses questions, branches et version. Une réponse observée peut sélectionner une branche. Les effets commerciaux passent toujours par les mêmes conditions serveur.

Chaque décision enregistre l’état et une activité dans une seule transaction. requestId identifie le rejeu, expectedRevision refuse une écriture sur un dossier dépassé. Une collision de référence avec un contenu ou un acteur différent échoue. Le contrôle de révision protège aussi les décisions simultanées. Le prix approuvé appartient au mandat et reste distinct du prix du catalogue qui peut évoluer.

La vente distingue qualification, proposition, objection, accord, règlement rapproché et remise. Un agent doit lier son constat d’accord à un message entrant reçu de cet acheteur pour cette marque. Le portefeuille lui rend ces références et leur contenu. Le partenaire et le public conservent une valeur commerciale projetée nulle. Les partenaires et le public sont orientés selon leur rôle. Le mandant atteste le rapprochement financier avec montant, devise et référence de preuve. Pour une offre La Fusée avec règlement natif, le mandant peut lier une référence IntakePayment correspondant au prix et à la devise. Son unicité empêche de financer deux affaires avec le même règlement. L’agent peut ensuite relire ce paiement. Seul son état PAID daté autorise le passage au règlement confirmé. Les autres encaissements conservent leur attestation indépendante. Le responsable de livraison atteste la remise et fixe le suivi. Le refus de contact conserve les engagements contractés. Leur exécution reste possible après l’expiration de la latitude de vente.

Le pipeline existant héberge le poste humain. Operations MCP expose sales_portfolio, sales_decide, sales_sync_payment et sales_send_email. Le dernier utilise le transport email existant vers le seul destinataire de l’affaire quand le mandat approuve explicitement cet envoi. Une activité réservée avant le transport conserve l’état en attente ou incertain et empêche le rejeu automatique. Le transport reste sur un seul fournisseur pour cette tentative. Les clés commerciales sont limitées à la marque, révocables et relues avant chaque appel. L’agent retrouve son dossier et le journal sur ce même canal existant. La route MCP fournit l’identité authentifiée. Les décisions de mandat, de finance et de passation passent par le mandant.

Les prévisions sont filtrées par devise. Le portefeuille et les opérations par identifiant appliquent l’attribution avant conversion. Le routage historique de changement de phase est refusé sur une affaire soumise au mandat commercial.

## Réception et suite

Les tests PostgreSQL empruntent les procédures CRM et la route HTTP MCP avec une clé synthétique de marque. Le conducteur automatisé décide à partir de l’état relu. L’acheteur et la confirmation financière sont des acteurs de recette distincts. La preuve attendue du pilote réel reste l’accord d’un acheteur réel, le rapprochement du règlement, la remise acceptée et le coût de servir.

La migration est additive et doit précéder le runtime. L’identité des affaires historiques reste à qualifier. Les voies d’encaissement d’une marque doivent être reçues avec leurs bénéficiaires. Le transport externe des messages, la sélection réelle de prospects, la réception native du poste et le renouvellement à échéance ont leurs preuves propres. La recette synthétique conserve cette portée.
