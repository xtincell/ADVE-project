# ADR-0206 — Amendement lié aux sources et à son auteur réel

- **Status** : Accepted
- **Date** : 2026-10-08
- **Phase** : réception Shinkiro C2/C3/C5
- **Depends on** : ADR-0023, ADR-0198, ADR-0205
- **Supersedes** : aucune doctrine métier

## Contexte et audit anti-doublon

Les reçus source et leur contrôle transactionnel existent dans source-usage et
Pillar Gateway. Notoria les utilise ; OPERATOR_AMEND_PILLAR ne les transmet pas.
Le MCP omet aussi expectedVersion, et sa lecture getPillarContent ne la rend pas.
Recommendation marque HUMAN/reviewedBy/reviewedAt même lorsque viaAgent écrit
MESTOR. Un refus du garde restaure la valeur mais crée encore une version et
un accusé APPLIED. Les cinq défauts sont reproduits sur PostgreSQL isolé.

Guidance/Mestor gouverne l’amendement. On étend les contrats et le writer
existants, sans nouveau modèle/service/router/page/Intent/Neter. Aucune production
d’actif ni génération : primitive de persistance, aucun Glory tool additionnel.

## Décision

- Factoriser le schéma du reçu dans source-certainty Layer 0 ; garder le hash
  canonique et le contrôle des droits/verrous d’ADR-0198, sans second mécanisme.
- Transmettre les reçus par les entrées existantes tRPC et MCP. Un amendement
  documentaire exige la version effectivement lue, rendue par getPillarContent.
  Le handler refuse un reçu mal formé et le writer contrôle sources et version
  dans la même transaction que contenu/archives/provenance/sources du pilier.
- Conserver les reçus et citations dans Recommendation pour l’invalidation.
  Ne pas inventer un groundingScore ou groundedSourceIds : citer n’est pas mesurer
  un recouvrement documentaire. Ne pas transformer SOURCE en OFFICIAL/HUMAN.
- Journaliser l’agent MESTOR sans faux reviewedBy/reviewedAt. Une décision humaine
  explicite garde OPERATOR/HUMAN et sa revue. Aucune cascade ADVE autonome créée.
- L’amendement agent exige un arbitrage de provenance réussi : DENY ou CHALLENGE
  échoue avant version et rattachement source ; la recommandation est REJECTED.
  Une erreur du garde est bloquante sur cette voie. La politique des autres
  écrivains reste distincte et inchangée.

## Réception et limites

Tests réels sur PostgreSQL isolé : source courante, corrigée, révoquée, reçu
mal formé, version absente/obsolète, valeur humaine protégée et décision humaine
explicite. Les cinq contre-exemples initiaux sont rouges sur 418. Aucun provider
ni donnée métier de production n’est sollicité pour ces contrats.

Le build final est exercé par le transport MCP réel : tools/list, lecture de
currentVersion, amendement source courante, refus de source corrigée puis de
version obsolète. Cinq réponses HTTP 200 relues (104/30/342/59/33 ms), une archive
et versions 1→2→2, MESTOR/INFERRED sans revue humaine ni grounding fabriqué ; zéro
appel IA. Fixture éphémère nettoyée. Clé BRAND locale à serveur wildcard ; le
refus 401 d’une clé limitée à un serveur sur le transport agrégé est conservé
et planifié dans RESIDUAL-DEBT, sans desserrer l’authentification.

129 tests PostgreSQL, 1 604 de gouvernance et 38 contrats ciblés verts ; types,
linters et cycles reçus. Le harnais de stress global potentiellement facturable
reste non reçu, dette explicite §Harnais de stress global. Le runtime exact et
le corpus réel sont des reçus séparés. Le corpus
SPAWT n’est pas reçu par ces tests : les documents et versions devront être
relus, les propositions soumises dans le circuit gouverné, puis leur propagation
reçue nativement. Le site live et son quiz ne prouvent pas une offre mobile
payante publiée. Les sept chantiers Shinkiro restent ouverts.
