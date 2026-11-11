# ADR0245 — L’acteur authentifié des décisions de La Barre

11 novembre 2026. Proposed. Candidat local, point LB3 du programme Shinkiro.
Dépend d’ADR0217 (raccord La Barre), ADR0244 (bilan de campagne reçu) et ADR0124 (spine
d’émission, pour la réception du bilan).

## Problème

L’acteur d’une décision La Barre était déclaré par le navigateur : la personne choisie dans
l’onglet (`app/acteur.js`, sessionStorage). Trois pièces manquaient pour qu’un geste porte une
identité qu’on puisse opposer. `servir.mjs` ne connaît aucune identité. Derrière La Fusée, la
route `/la-barre/` authentifie la session et relit l’affectation de l’opérateur, mais ne
transmettait ni cookie ni identité, et `contexte.json` ne nommait pas la personne connectée.
Enfin la base s’écrit d’un bloc (`PUT depots/<fichier>.json`) : La Barre reçoit un fichier,
pas un geste qu’elle pourrait attribuer.

## Voies examinées

- Donner une identité à `servir.mjs` (cookie, jeton partagé avec La Fusée) : un second
  système de session et un secret de plus à distribuer, alors que La Fusée authentifie déjà
  chaque requête. Écarté.
- Transmettre l’identité à La Barre par un en-tête et la laisser écrire l’acteur : La Barre
  ferait confiance à un en-tête que quiconque joint son port peut poser. Écarté.
- Découper la base en gestes typés (une route par décision) : refonte de l’écriture de La
  Barre, hors de ce lot. Écarté.
- **Retenu** : la route de La Fusée, qui seule connaît la session, relit la version courante
  et atteste les entrées nouvelles avant de transmettre l’écriture. La Barre reste sans
  identité et sans secret.

## Décision

**Capacité.** `contexte.json` déclare `actorAttestation: "SESSION_V1"` et
`actor: { id, name }` : identifiant stable de l’utilisateur et nom relu en base, jamais
l’e-mail. La capacité n’est déclarée que si la clé de signature de l’installation est
configurée (`AUTH_SECRET`, sinon `NEXTAUTH_SECRET`, comme `publication-access`).

**Écriture.** Sur `PUT` (ou `POST`) `depots/<fichier>.json`, après la garde existante
(session, affectation relue, rôle ADMIN ou OPERATOR, origine exacte), la route lit le corps
borné à 24 Mio (le plafond de La Barre), relit la version courante chez La Barre, puis :

1. applique la même précondition que La Barre contre cette version (`If-Match`,
   `If-None-Match: *`, `X-Base`) et répond comme elle (428, 409 `REVISION_DEPASSEE` avec
   l’ETag courant), après avoir reconnu un renvoi identique (réponse perdue) ;
2. tamponne les entrées nouvelles de trois registres : `decisions`, `journal` et
   `campagnes[].bilanVersions`. L’identité d’une entrée est son contenu sans `attestation`
   (JSON canonique RFC 8785, `domain/canonical-json`) ; une entrée nouvelle reçoit
   `attestation: { par: "la-fusee", userId, nom, at, empreinte, sceau }` où `empreinte` est le
   SHA-256 de l’entrée sans attestation et `sceau` un HMAC-SHA256 de l’instance, de
   l’identité, de la date et de l’empreinte, sous un domaine de sceau dédié ;
3. rétablit une attestation enregistrée que l’envoi omet ;
4. refuse en 422 typé, sans rien écrire : une attestation présentée qui n’est pas celle
   enregistrée pour ce contenu (`ATTESTATION_NOT_RECOGNIZED`), une entrée attestée disparue ou
   modifiée (`ATTESTATION_REMOVED`), une entrée qui n’est pas un objet
   (`ATTESTATION_ENTRY_INVALID`). Seules les lignes de journal sans marque peuvent disparaître,
   par la troncature que La Barre pratique elle-même (elle garde au moins 1 500 lignes) ;
5. transmet la base attestée avec `If-Match` sur la version relue : une écriture concurrente
   entre la lecture et l’écriture est refusée par La Barre elle-même ;
6. ajoute au reçu de La Barre la liste des attestations posées ou rétablies, par chemin.

Les entrées déjà présentes sans attestation (avant ce lot, ou écrites hors de La Fusée)
restent déclarées et ne sont jamais attestées après coup. La lecture de la base reste une
transmission inchangée. Aucune autre écriture (images, partage) ne change.

**Côté La Barre.** Quand la capacité est déclarée, la personne connectée est imposée comme
acteur : sélecteur verrouillé, postes de l’installation sans casquette prêtée, mention
« authentifié par La Fusée ». Le reçu de La Fusée pose les attestations dans la base envoyée
et l’état courant ; le rapprochement tient une attestation reçue pour la même entrée. Le
journal, le recueil des arbitrages et les versions de bilan affichent l’identité attestée ou
« déclaré sur ce poste ». Sans La Fusée, comportement antérieur, mention « déclaré sur ce
poste ».

**Bilan (amende ADR0244).** Une version de bilan reçoit l’attestation à l’enregistrement qui
l’introduit. Son empreinte exclut désormais `attestation` comme `empreinte` ; les versions
déjà reçues, sans attestation, gardent leur empreinte et restent reçues. À la réception, une
attestation présente doit avoir la forme stricte et un sceau valide pour cette installation
et ce contenu, dans la route (`locateBarreCampaignReview`) et dans le handler de l’Intent
`INGEST_BARRE_CAMPAIGN_REVIEW` ; sinon `REVIEW_ATTESTATION_INVALID` (422), sans effet. Le reçu
`_barreReview` conserve la version avec son attestation, en plus de la personne qui transmet.

## Conséquences

- Aucun modèle, migration, Intent, service ou routeur ajouté ; aucun appel de modèle. Un
  module de domaine (`domain/barre-actor-attestation.ts`) et un module de service
  (`brand-node/barre-attestation.ts`) ; contrat de `contexte.json` étendu
  (`actorAttestation`, `actor`) ; contrat du bilan étendu sans retrait.
- L’attestation n’a de valeur que si le port de La Barre n’est joint que par La Fusée :
  `servir.mjs` accepte toute écriture qui l’atteint et ne vérifie aucun sceau. La Fusée
  vérifie le sceau à la réception d’un bilan ; La Barre affiche ce qui est enregistré.
- Le sceau dépend de la clé de session : sa rotation rend les attestations antérieures
  invérifiables, et leur réception est alors refusée, jamais acceptée par défaut.
- Ordre de livraison : La Barre d’abord, ou les deux ensemble. Une La Barre antérieure devant
  une La Fusée qui atteste ignore les attestations du reçu ; son rapprochement demanderait un
  choix manuel sur le journal à chaque écriture concurrente.
- Un geste sans acteur authentifié n’est pas refusé : sans La Fusée, La Barre garde ses
  gestes déclarés. Les autres objets de la base (projets, livrables, réglages) restent écrits
  d’un bloc sans attestation, et la personne connectée n’est reliée à aucune personne de la
  base La Barre (pas de casquettes).

Tests anti-dérive : `tests/unit/portfolio/barre-attestation.test.ts` (capacité, tamponnage,
rétablissement, refus, troncature, précondition, réponse perdue, création, gardes, lecture
inchangée, sceau), `tests/unit/portfolio/barre-review.test.ts` (version attestée),
`tests/unit/portfolio/barre-access.test.ts` (précondition relue),
`tests/integration/barre-campaign-review.postgres.test.ts` (réception attestée et refus),
jeu commun `tests/fixtures/la-barre/bilan-campagne-atteste-v1.json` identique à celui de
La Barre.
