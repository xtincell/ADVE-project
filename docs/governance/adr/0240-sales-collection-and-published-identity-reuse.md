# ADR0240 — Du devis accepté au règlement et au rapport du client

Date : 4 novembre 2026.

Statut : Proposed — suite des ADR0233 et ADR0238.

## Problème

Le vendeur pouvait préparer un devis, obtenir l’accord et demander un règlement manuel. Le client ne pouvait pas régler ce devis par le circuit CinetPay déjà utilisé par La Fusée. Le paiement du devis n’accordait pas non plus le droit au rapport du diagnostic client : la marque vendeuse et la marque analysée sont deux entités distinctes.

Le contact SPAWT devait rejoindre sa vitrine. Les fichiers d’identité de l’édition publiée sont conservés, mais leurs références ont été invalidées par d’anciens amendements ADVE. Republier seulement un lien exigeait alors de refaire une sélection d’identité.

## Décisions

### Conserver une identité déjà publiée pour modifier les liens

Le responsable choisit explicitement de conserver l’identité et les textes publiés. Le serveur vérifie la révision, l’édition et son empreinte, puis relit les copies physiques des images et polices. Seuls les liens peuvent différer. L’identité, les URL de ses fichiers, les références historiques et les invalidations restent conservées ; ce choix ne constitue pas une revalidation des actifs actuels. Une nouvelle édition garde sa filiation et trace séparément la relecture des liens.

### Réutiliser le circuit de paiement existant

Les conditions approuvées distinguent règlement manuel et CinetPay. Le compte marchand est déclaré dans la configuration non secrète existante du fournisseur : bénéficiaire, compte, pays, devise, marques autorisées et preuve d’activation. Les identifiants restent dans l’environnement. Le serveur conserve une empreinte de cette autorisation dans les conditions de vente et la vérifie avant de créer le paiement. La politique d’administration du fondateur est relue sur l’identité actuelle en base.

Le règlement manuel permet un paiement Orange Money convenu avec la marque ou une remise en main propre. Le responsable financier vérifie dans le portail le montant, la devise et la référence du paiement réellement reçu. Le reçu conserve l’auteur humain et une affectation unique de la preuve ; il est distinct d’une confirmation CinetPay. Cette voie d’encaissement réel ne dépend pas de l’activation d’un compte CinetPay. Un numéro de contact WhatsApp n’est jamais assimilé automatiquement à un compte Orange Money.

Le prix vient exclusivement du devis présenté et accepté. Le navigateur transmet sa demande, la proposition concernée et l’adresse du reçu ; il ne choisit ni montant, ni devise, ni destinataire, ni adresse de retour. Le règlement conserve une seule ligne `IntakePayment` de type `SALES_COLLECTION`, liée à cette affaire. Une intention enregistrée avant l’appel externe empêche deux initialisations concurrentes. Un résultat incertain conserve sa référence et demande une vérification ; il ne provoque pas une seconde demande aveugle.

Le retour du fournisseur contient un identifiant distinct du lien privé. La redirection vers la conversation exige aussi le reçu du navigateur. Son origine vient de la configuration de déploiement, jamais d’un en-tête Host fourni par l’appelant. Un retour navigateur ne confirme aucun paiement.

La notification du fournisseur déclenche sa vérification authentifiée. La référence, la transaction et la preuve d’initialisation doivent correspondre au devis conservé ; les montants et devises renvoyés sont contrôlés. Un paiement déjà confirmé ne régresse pas. Le rapprochement commercial est idempotent et réveille le vendeur par le mécanisme existant. Le vendeur IA ne peut pas attester lui-même un règlement.

### Livrer le rapport de la marque cliente

Pour l’offre de rapport PDF, le client associe explicitement son diagnostic terminé depuis sa conversation privée. Le lien possédé, l’adresse cohérente et le consentement établissent cette association. Le reçu distingue le client facturé de la marque analysée ; aucune recherche globale par nom ou email n’est effectuée. Le diagnostic de la marque vendeuse est exclu.

Le règlement réellement rapproché, par le responsable financier humain ou par la vérification CinetPay, accorde le droit au même diagnostic et au même PDF par le lecteur de droits existant. Il ne crée pas un second paiement. Le traitement payé existant actualise le diagnostic client, avec son résultat réel conservé. Une préparation incomplète ou échouée n’est pas annoncée comme une livraison. Le document canonique ne devient disponible dans le dossier qu’après sa préparation ; la confirmation du client reste nécessaire à la clôture.

## Limites de preuve et exploitation

Les contrôles sur comptes, clients et paiements fictifs restent distincts d’une transaction réelle. L’activation du compte marchand et l’identité du bénéficiaire doivent être vérifiées avant l’autorisation d’encaisser. Le compte actuellement configuré ne constitue pas cette preuve par la seule présence d’identifiants. Un compte indisponible retire le paiement en ligne, sans fermer les conversations, les devis ou le relais humain.

Un devis et un reçu de règlement ne sont pas une facture fiscale. Cette évolution conserve les modules financiers et leurs responsabilités existantes ; elle ne fabrique ni entité émettrice, ni taxe, ni numérotation légale.

Aucun nouveau modèle Prisma, fournisseur, moteur de tarification, gestionnaire d’appels, moteur ADVE ou ordonnanceur n’est ajouté. Les interfaces existantes de marque, CRM, diagnostic, paiement et livraison portent ces raccords. Les tests, l’image, la conservation des données, les pages publiques et la transaction réelle sont reçus séparément.
