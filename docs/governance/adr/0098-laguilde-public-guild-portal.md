# ADR-0098 — La Guilde : portail public du marketplace crew

> **Renumérotation 2026-06-15** — créé `ADR-0093` sur la branche `galileo`, renommé `ADR-0098` lors de la consolidation `galileo` ↔ `focused-hypatia` (collision avec `ADR-0093` arrivé en premier le 2026-06-13, convention first-come-keep ; cf. test `adr-uniqueness`).

- **Statut** : Accepted
- **Date** : 2026-06-14
- **Gouverneur** : IMHOTEP (Crew Programs, Ground #6)
- **Couche OS** : Apps + Funnel (surface publique) au-dessus de Services (Imhotep) et Substrats (Prisma)
- **Cap APOGEE** : 7/7 préservé (aucun nouveau Neter — La Guilde est la face publique d'Imhotep)

## Contexte

Demande opérateur : un **portail public** `/LaGuilde` (chemin relatif, domaine dédié
ultérieur) exposant trois usages d'un marketplace bilatéral à la Malt :

1. **Le mur des missions** disponibles, accessible sans compte.
2. **Le dépôt de mission** par les marques.
3. **L'inscription** des freelances / agences de prod pour candidater.

Audit anti-doublon (interdit NEFER n°1) : la base « mission » **existe déjà** et est
riche — `Mission`, `MissionDeliverable`, `MissionApplication` (Vague 7), `TalentProfile`,
`GuildOrganization`, `GuildTier`, `Commission`, `Membership`, routers `mission` /
`mission-applications` / `guilde` / `guild-org` / `commission`, service Imhotep, Intent
kinds `APPLY_TO_MISSION` / `DECIDE_MISSION_APPLICATION`. On **étend**, on ne double pas.

Deux invariants bloquaient un accès public direct :

- **`Mission.strategyId` est NON-NULLABLE** : une marque non-cliente n'a pas de `Strategy`,
  donc ne peut pas « poster dans le vide ».
- **Aucune procédure publique** n'exposait les missions (privées à une `Strategy`), et
  aucun concept de « mission publiée sur un mur ».
- **Gap onboarding** : aucune voie de création explicite du `TalentProfile` (jusqu'ici
  auto/seed).

## Décision

Surface publique `/LaGuilde` réutilisant le socle existant. Deux décisions structurantes
tranchées avec l'opérateur :

### D1 — Dépôt marque : « Shell Strategy auto » (vs entité requête dédiée)

Une marque connectée dépose une mission. Le handler crée (ou retrouve) un `Client` + une
`Strategy` **shell minimale** sous l'opérateur racine **UPgraders** (`slug="upgraders"`),
puis crée une **vraie `Mission`**. Avantages : zéro nouvelle entité mission-like (respecte
l'anti-doublon), pipeline complet réutilisé (templates, QC, commission, candidatures),
invariant `strategyId` préservé. La mission part **en attente de modération**
(`guildPublished=false`, `guildSubmittedAt` set).

### D2 — Mur sous validation opérateur (vs publication auto)

Dépôt → file de modération → un opérateur **publie** (`guildPublished=true` +
`guildPublishedAt`) ou **rejette** (`status="CANCELLED"` + motif tracé dans
`briefData.moderationNote`). Contrôle qualité + cohérence gouvernance (modèle Malt).

### Schéma — champs additifs non destructifs sur `Mission`

`guildPublished Boolean @default(false)`, `guildSubmittedAt`, `guildPublishedAt`,
`publicSlug @unique`, `postedByUserId`, et trois colonnes indexées de filtrage
(`sector`, `location`, `category`). Le **brief complet** reste dans `Mission.briefData`,
typé par `src/lib/types/guild-mission-brief.ts` (Zod) — `_kind: "GUILD_MISSION_BRIEF"`,
objectif, contexte, cible, livrables[], canaux[], compétences[], critères QC[], références[],
contraintes, contact (jamais exposé). Indexes : `(guildPublished, status)`, `category`,
`sector`. Migration `20260614000000_laguilde_public_guild_portal` (backfill-safe).

### Gouvernance — 4 nouveaux Intent kinds (gouverneur IMHOTEP)

- `GUILD_POST_MISSION` — dépôt marque (Shell Strategy auto).
- `GUILD_PUBLISH_MISSION` — décision opérateur PUBLISH/REJECT (guard rôle ADMIN/OPERATOR).
- `GUILD_REGISTER_TALENT` — inscription freelance → `TalentProfile` + rôle CREATOR.
- `GUILD_REGISTER_ORGANIZATION` — inscription agence → `GuildOrganization` + `TalentProfile`
  owner + rôle AGENCY.

Les **candidatures réutilisent `APPLY_TO_MISSION`** (déjà gouverné). `governedProcedure`
a pour base `protectedProcedure` (tout utilisateur connecté, pas d'`operatorId` requis) —
c'est pourquoi marques et freelances peuvent piloter ces mutations gouvernées.

### Surfaces

- Routes publiques `(public)/LaGuilde` : `/` (mur), `/m/[slug]` (détail + candidature),
  `/publier` (dépôt marque, auth requise), `/rejoindre` (inscription). Hors matcher
  `proxy.ts` → publiques par défaut. Le mur est lisible sans compte ; **candidater et
  déposer requièrent un compte** (`/rejoindre` ou `/register`).
- Router tRPC `laGuilde` : `listOpenMissions` / `getMissionBySlug` / `stats` (publics),
  `postMission` / `myPostedMissions` / `myGuildProfile` / `registerTalent` /
  `registerOrganization` (auth), `listPendingModeration` / `publishMission` (opérateur).
- Console : `/console/arene/missions-guilde` (file de modération).

### Projection publique — anti-fuite

`toPublicGuildMission()` n'expose **jamais** `contactName` / `contactEmail` /
`postedByUserId` / `strategyId` / `tenantId`. La mise en relation passe toujours par la
plateforme (candidature gouvernée), jamais en direct. Test bloquant.

## Conséquences

- **Positives** : marketplace public bout-en-bout sans nouveau Neter ni entité doublon ;
  invariant `strategyId` intact ; brief complet typé ; onboarding talent enfin canonique.
- **Négatives** : des `Strategy` shell sont créées pour les marques qui ne convertissent
  pas (acceptable — nettoyables via `OPERATOR_ARCHIVE_STRATEGY`). Le changement de rôle
  (USER → CREATOR/AGENCY) n'est effectif qu'au prochain login (JWT) — USER pouvant déjà
  candidater, aucun blocage.
- **Casing route** : le segment `/LaGuilde` honore l'URL demandée (casse exacte, sensible).

## Fondamentaux base de données (réponse à la demande opérateur)

Conformité à la doctrine de modélisation marketplace (Malt-like) :

- **Tables au sein d'une base centrale** (Postgres unique), pas de bases multiples.
- **Entités séparées** : `User` (rôles), `TalentProfile`/`GuildOrganization` (offre),
  `Client`/`Strategy` (demande), `Mission`/`MissionDeliverable` (opérations),
  `MissionApplication` (candidatures), `Commission`/`Invoice`/`Contract` (transactions).
- **Clés étrangères & cardinalité** : `Mission.strategyId` (N:1 Strategy), unicité
  `MissionApplication(missionId, applicantId)`, `publicSlug @unique`.
- **Indexation** des colonnes de recherche du mur (`category`, `sector`,
  `(guildPublished, status)`).
- **Normalisation pragmatique** : les compétences restent en `Json` (cohérent avec
  l'existant `TalentProfile.skills`) ; une taxonomie `Skill` normalisée + table de
  jointure reste un chantier ultérieur possible si la recherche par compétence le justifie.
- **Sécurité** : mots de passe `bcrypt` (existant), secrets paiement en env vars
  (ADR-0075), projection publique sans données de contact.

## Addendum 2026-06-14 — Assist LLM optionnel de pré-remplissage

Pour les dirigeants pressés, un helper LLM **optionnel** pré-remplit le formulaire de
dépôt depuis une description libre. Intent `GUILD_DRAFT_MISSION_FROM_TEXT` (gouverneur
IMHOTEP, SLO coût 0.05$) → `executeStructuredLLMCall` (ADR-0067) avec
`guildMissionDraftSchema` (tous champs **optionnels**, validation tolérante).
**Ne persiste rien** : renvoie un brouillon que le dirigeant **corrige avant** de
soumettre via le chemin déterministe `GUILD_POST_MISSION` (strictement inchangé).

**Manual-first parity (ADR-0060)** : c'est la **seule entrée LLM** du portail ; le
formulaire reste pleinement opérant sans IA (test bloquant `guildMissionDraftSchema`
sparse-OK + `postGuildMissionInputSchema` toujours strict). Si le Gateway est
indisponible (pas de clé / circuit ouvert), l'appel échoue proprement et la saisie
manuelle prend le relais (message UI explicite). Le périmètre LLM de l'OS reste donc
cantonné à Notoria/Oracle/outils + cet assist ponctuel — la mécanique cœur de la
Guilde (mur / dépôt / inscription / candidature / modération) demeure **100 %
déterministe**.

## Suites possibles (non bloquantes)

- Taxonomie `Skill` normalisée + recherche full-text/Elasticsearch sur le mur.
- Notifications Anubis à la marque quand une candidature arrive / à la publication.
- Domaine dédié + sitemap public des missions.
