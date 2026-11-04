# ADR0239 — Administration effective de la publication commerciale

Date : 4 novembre 2026.

Statut : Proposed — correctif de la publication reçue dans ADR0238.

## Problème

Le compte fondateur est administrateur effectif selon `isGodModeEmail`, appliqué par l’authentification existante. Son rôle en base peut néanmoins rester FOUNDER. L’accueil commercial vérifiait exclusivement le rôle ADMIN relu en base : l’interface permettait de préparer la publication, puis son enregistrement était refusé. La tentative observée n’a créé aucune entrée publique.

## Décision

Les deux lectures de l’auteur dans la publication commerciale appliquent la politique centrale sur son identité en base, fraîchement relue. Le propriétaire reste autorisé ; un autre utilisateur doit être administrateur en base ou reconnu par `isGodModeEmail`. Une déclaration d’administration dans les arguments ou une ancienne session ne remplace pas cette vérification.

La même règle s’applique au contact WhatsApp de secours lorsque le vendeur est indisponible. Une fermeture de l’entrée retire ce contact de l’accueil public. Les exigences sur la marque, le vendeur, son accès, le catalogue, la validité et l’autorisation enregistrée restent inchangées.

Aucun rôle utilisateur, clé, compte, donnée ADVE, Oracle ou paramètre du service commercial n’est modifié. La livraison applicative conserve le service commercial016 déjà reçu ; elle ne réinstalle pas son code.

## Réception

Les contrôles distinguent propriétaire, administrateur effectif, utilisateur non autorisé, révocation de l’identité, vendeur en pause et fermeture de l’entrée. La publication réelle et la conservation en production sont reçues séparément de ces contrôles.
