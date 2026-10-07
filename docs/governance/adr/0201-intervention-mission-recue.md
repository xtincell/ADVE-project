# ADR-0201 — Une demande reçue prépare une seule mission

- **Status**: Accepted
- **Date**: 2026-10-07
- **Phase**: 18 — réception Shinkiro, parcours manuel
- **Depends on**: ADR-0124, ADR-0131, ADR-0166, ADR-0199
- **Supersedes**: aucune

## Contexte

Le router intervention et les deux pages existantes consomment des Signal de type
INTERVENTION_REQUEST. Le serveur écrit PENDING/CONVERTED/DISMISSED ; le cockpit
attend d'autres états, assimile conversion et résolution et invente un délai selon
l'urgence. Son affectation à des équipes littérales n'est jamais enregistrée.
Une conversion crée la Mission avant une écriture indépendante du Signal : deux
conversions peuvent créer deux missions et un rejet écraser une conversion.
Les commandes ne portent pas strategyId, donc le firewall collaborateur n'examine
pas leur marque, malgré la garde de lecture signal→marque.

Audit CODE-MAP, schéma, services, routers et pages : Signal, Mission, Driver,
intervention et les pages requests/interventions/missions existent → extension.
Le schéma contient aussi InterventionRequest (OPEN/assignee/resolvedAt), sans
consommateur identifié dans src ; il n'est ni adopté comme second écrivain ni
supprimé. La lecture production du 7 octobre retrouve uniquement la ligne
wk-intervention-01, identifiée dans seed-wakanda/28-infrastructure.ts, déjà
COMPLETED. Les commentaires du schéma parlent aussi d'intervention interne :
cette différence de rôle et la filiation restent à qualifier dans C1/C3 ;
une ressemblance de nom ne suffit pas à fusionner les historiques.

## Décision

1. Sous-système Propulsion, tutelle Artemis. Garder les trois Intents gouvernés
   existants et leur spine ; conversion et rejet exigent un opérateur, la marque
   et la version réellement lue. La marque portée par la commande doit correspondre
   au Signal ; accès et firewall précèdent les écritures. La liste projette le droit
   d'examen sans exposer de commande inaccessible au dirigeant/collaborateur.
2. Conversion et rejet n'acceptent qu'une véritable demande PENDING. Les anciennes
   variantes de casse sont lisibles ; état absent, inconnu ou historique ne devient
   jamais une demande à convertir. Titre, description et motif vides sont refusés.
3. Créer la Mission DRAFT et son reçu CONVERTED dans une seule transaction. Une
   comparaison atomique id/marque/type/updatedAt choisit un seul gagnant ; le perdant
   reçoit CONFLICT et toute mission de sa transaction est annulée. Consommer une
   version strictement supérieure même dans la même milliseconde. Même discipline
   pour le rejet, sans pouvoir écraser une conversion.
4. Conserver le besoin exact, la marque et le vecteur existant dans la Mission ;
   conserver les données de demande et ajouter missionId/date/auteur à son reçu.
   Un Driver fourni doit être actif, non supprimé et de la même marque. Aucun
   responsable, délai, budget, livraison, validation client ou pilier n'est inventé.
5. Une projection de domaine unique lit les états du Signal ; operate-config porte
   leurs libellés. Les deux portails lisent le même reçu et la Mission actuelle via
   mission.get. CONVERTED signifie « Mission préparée », jamais « Résolue ».
   Le lien ouvre la mission exacte et sa marque, y compris hors de la liste paginée.
   Les erreurs de lecture restent visibles avec reprise, sans fabriquer un vide.
6. Retirer l'affectation non persistée, les SLA arbitraires, la moyenne de résolution
   estimée et le faux workflow. Garder historique, urgence, type, répartition et
   détail. Une demande manuelle demeure indépendante de toute génération ou agent.

Il s'agit de primitives de persistance gouvernées, sans orchestration nouvelle,
donc aucun Glory tool, service, Intent, table, agent ou Neter supplémentaire.
Les piliers de la stratégie ne sont pas amendés ; aucune consommation LLM.

## Conséquences

- Les clients des commandes doivent transmettre strategyId et expectedUpdatedAt ;
  aucun appel de conversion/rejet n'était présent dans src avant ce raccord UX.
- Un conflit exige une nouvelle lecture et une nouvelle décision, pas un retry
  aveugle. Aucune réconciliation automatique des anciens doublons.
- La Mission reste le lieu de production, d'affectation et de livraison ; aucun
  second suivi de résolution n'est ajouté aux demandes.
- Tests : dix échecs reproduits sur l'ancien router ; projection de données
  mal formées, concurrence réelle PostgreSQL, conflit/rejet, autres types/canaux,
  frontière opérateur et firewall collaborateur, rollback du reçu indisponible.
- Les tests du router ne valent pas réception d'écran. Appels HTTP authentifiés,
  build, stress, image et réception native sont des preuves distinctes ; leurs
  limites restent au registre jusqu'à réception.
