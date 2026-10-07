# ADR-0202 — Une reprise garde sa tâche et son reçu

- **Status**: Accepted
- **Date**: 2026-10-07
- **Phase**: 18 — réception Shinkiro, parcours manuel
- **Depends on**: ADR-0059, ADR-0060, ADR-0201
- **Supersedes**: aucune

## Contexte

Campaign, CampaignDeliverable et CampaignChangeRequest portent déjà le cycle de
reprise. Le compteur par livrable utilisait pourtant le code de campagne : deux
tâches pouvaient produire le même ticket global. Le code de tâche prévu au
schéma n'était pas généré à la création. Une lecture cherchait MissionDeliverable
et le détail envoyait une marque fictive `audit:…`. Plusieurs écritures contrôlaient
le pivot déclaré sans le comparer à la campagne réellement modifiée. Résoudre,
puis escalader, pouvait rouvrir un reçu ; un retry créait une nouvelle demande.

Audit CODE-MAP, schéma, handlers Mestor, routers et deux composants existants :
extension du workflow de Guidance/Mestor, sans nouveau service, table, Intent,
agent ou outil de génération. La reprise nourrit la production et conserve ses
décisions ; elle ne valide ni le brief, ni le livrable, ni un résultat ADVE.

## Décision

1. Les services comparent la marque et l'opérateur déclarés à ceux de la vraie
   campagne, après l'autorisation gouvernée du router. Les handlers Mestor
   réutilisent ces mêmes services. Les listes opérateur refusent un autre périmètre.
   Cette garde de cohérence n'est pas une authentification indépendante.
2. Numéroter la tâche à partir du code existant de sa campagne, sous verrou
   PostgreSQL ; conserver les trous. Sans code de campagne, laisser taskCode nul.
   Les reprises utilisent taskCode, sinon l'identifiant complet du livrable.
   Leur numéro suit le plus grand suffixe RNN enregistré, sous verrou de tâche.
   Une identité partagée ou un historique mal formé demande qualification ;
   aucun renommage, réécriture ou backfill automatique.
3. Le formulaire fournit un UUID de demande, conservé lors d'un retry du même
   contenu et persisté dans CampaignChangeRequest.id, déjà existant. Verrou de
   commande puis de tâche : les retries concurrents retrouvent le même reçu,
   y compris depuis un nouveau processus. Un UUID réutilisé pour un autre contenu
   ou livrable reçoit CONFLICT. Sans UUID, deux appels restent deux demandes :
   aucune déduplication aveugle de besoins textuellement identiques.
4. Verrouiller le ticket avant modification, résolution ou arbitrage. RESOLVED
   et REJECTED restent terminaux. La même résolution rejouée rend le même reçu ;
   une autre résolution reçoit CONFLICT. Les notes sont obligatoires. Un brief
   lié appartient à la même campagne ; un responsable appartient à l'opérateur.
   Un arbitrage répété ne duplique pas sa note et n'envoie aucun message externe.
5. Le détail transmet la vraie marque et distingue chargement, absence et erreur.
   Formulaire et dialogues existants affichent les refus, conservent le besoin
   et empêchent les doubles soumissions en cours. Aucun zéro n'est fabriqué
   après un échec de liste ; aucun prompt navigateur ni délai estimé.
6. Retirer un statut manuel de tâche réutilise computeRAG sous verrou. Aucun
   calcul automatique de campagne n'étant présent, sa remise automatique est
   refusée explicitement sans modifier le statut, plutôt que forcée au vert.

## Conséquences et réception

- Les anciens tickets, codes nuls et versions restent intacts. La reprise d'une
  création dont les champs ont ensuite changé reçoit CONFLICT : relire le reçu.
- Les préconditions de versions pour les éditions non terminales, le raccord
  BrandAsset/délégation inter-opérateurs et le transfert concurrent d'une campagne
  restent à recevoir ; cette garde ne vaut pas isolation exhaustive du SI.
- Reproductions rouges : collisions, concurrence, faux pivot, autres entreprises,
  terminal réouvert, rendu d'erreurs et faux vert. PostgreSQL dédié : commandes
  gouvernées réelles et nouveau processus, sans provider ni données client.
  Le rendu statique des pages reste distinct des appels HTTP authentifiés et
  de la réception native, suivis dans RESIDUAL-DEBT.
- Résolution de ticket n'est pas livraison : le cycle production, validation,
  diffusion et mesure de Noël reste ouvert au chantier C6.

## Extension — actions transverses et arrivée du brief (2026-10-07)

OperatorAction appartient à une équipe, sans Strategy obligatoire au schéma.
Le contexte de marque reste facultatif sur la voie tRPC ; le spine existant
reçoit l’absence de marque, avec l’équipe réelle dans la commande. Un contexte
fourni doit exister dans cette équipe. Les Intents d’agents gardent leur contexte
actuel ; aucun privilège ni écrivain nouveau. Le router vérifie le rattachement
réel du compte, les services communs vérifient celui des ressources. Cette
cohérence de handler ne remplace pas l’autorisation de l’émetteur Mestor.

Campagne, tâches et responsable sont vérifiés dans la transaction. Sans campagne
liée, une action transverse peut concerner plusieurs campagnes de son équipe.
Avec campagne liée, toutes ses tâches doivent en relever. Modifier un seul lien
réévalue aussi les liens conservés. Les actions existantes incohérentes ne sont
pas réparées automatiquement ; leur suppression autorisée reste possible.
L’action est verrouillée avant édition/basculement/suppression et un même état
FAIT rejoué ne change pas doneAt. Les transferts concurrents des ressources liées,
versions d’édition et identités de création après interruption restent ouverts.

Le registre campaign.list existant est filtré par équipe avec refus des demandes
étrangères. Le tableau et le formulaire le consomment : une campagne sans tâche
reste visible dès réception ; l’absence de tâche ne produit aucun état vert.
Le domaine des actions est conservé, sans nouvelle couche de suivi.
