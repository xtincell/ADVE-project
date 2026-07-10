# ADR-0121 — Enrichissement public du pilier E à l'intake (Brave + Apify + Google News RSS)

- **Statut** : Accepted
- **Date** : 2026-07-10
- **Décideurs** : Alexandre (opérateur) + NEFER
- **Étend** : Vague 10 (`web-footprint.ts`, kind `COLLECT_WEB_FOOTPRINT`), ADR-0108 (Seshat = point d'accès internet unique), ADR-0075 (secrets système en env), ADR-0060 (manual-first parity), ADR-0046 (no-magic-fallback)

## Contexte

L'intake est le produit n°1 de La Fusée (funnel `/landingintake` → `/intake` → paywall → PDF payant). Le mandat opérateur : **l'intake doit réussir « par tous les moyens » (légaux) à collecter les données publiques du client pour combler le pilier E (Engagement) du rapport**. Les clients paient pour ce rapport — l'opérateur est prêt à payer une solution légale.

État avant cet ADR : le collecteur déterministe Vague 10 (`quick-intake/web-footprint.ts`) alimentait E (`touchpoints` + `webPresence`) mais **seulement si le founder déclarait** `websiteUrl`/`socialLinksRaw`, avec de simples *hints* de followers (OG description, peu fiables sur IG/TikTok) et sans presse. Si rien n'était déclaré, E restait vide. Le connecteur Apify (`anubis/social-audit.ts`) existait mais n'était pas branché sur l'intake (keyed operatorId/vault — l'intake est public, pré-opérateur). `braveWebSearch` dormait en `DEFERRED_NO_KEY`.

## Décision

### Stack de collecte (100 % légale — données publiques uniquement)

| Source | Rôle | Coût | Env |
|---|---|---|---|
| Footprint site déclaré (existant) | OG/meta, liens sociaux, articles | 0 | — |
| **Brave Search API** | Découverte des profils sociaux par nom de marque + pays quand rien n'est déclaré/trouvé | free tier ~2 000 req/mois | `BRAVE_API_KEY` |
| **Apify** (actors publics) | Compteurs followers RÉELS de profils publics (IG par défaut ; TikTok/FB opt-in) | ~0,001–0,01 $/profil, 5 $/mois gratuit | `APIFY_TOKEN` (+ `APIFY_IG/TIKTOK/FB_ACTOR_ID`) |
| **Google News RSS** | Mentions presse de la marque | 0 | — |

### Architecture

- **Orchestrateur** : `src/server/services/quick-intake/public-enrichment.ts` — `enrichPublicFootprint()`. Chaque étage time-boxé (budget global 20 s), best-effort, jamais de throw, zéro LLM. Les primitives réseau restent chez leurs propriétaires doctrinaux : Brave via `seshat/web-search` (ADR-0108), followers via `anubis/social-audit`, presse via `seshat/external-feeds` (`brandPressFeedFor`).
- **Garde anti-faux-positif déterministe** : un hit Brave / un item presse n'est retenu que si son titre/description mentionne le nom de marque (normalisation casse/diacritiques). Pas de LLM, pas de fabrication.
- **Tokens système** (ADR-0075) : `resolveApifyCredentials(operatorId|null)` — vault opérateur prioritaire quand contexte, fallback env `APIFY_TOKEN`. L'intake public passe par l'env. Nouvelle façade `fetchPublicFollowers(strategyId, handles)` multi-plateforme (table `APIFY_ACTORS`, plateforme sans actor/env = SKIP, pas de dépense forcée). Snapshots persistés dans `FollowerSnapshot` (source `APIFY`) avec le vrai `strategyId` (la Strategy est créée par `complete()` avant les écritures pilier).
- **Chemin intake (auto)** : sous-étage de `complete()` (entrée d'ingestion A1) — pas de nouveau dispatch. Appel **inconditionnel** (dégrade seul), résultat persisté dans `QuickIntake.webFootprint` (shape `EnrichedFootprint`, superset rétro-compatible de `WebFootprint`).
- **Écriture pilier E** : via `writePillarAndScore` (chokepoint C5), merge pur `mergeEnrichedFootprintIntoPillarE` : compteurs réels écrasent les hints dans `webPresence.socials[]`, `webPresence.press`, `primaryChannel` inféré UNIQUEMENT depuis la plus grande audience RÉELLE et seulement si absent. `options.fieldProvenance` : `webPresence`/`touchpoints` = SOURCE, `primaryChannel` = INFERRED. Pas de KPI de remplissage (min 6 Zod — ADR-0046).
- **Re-run opérateur** (parité manual-first ADR-0060) : nouveau kind **`ENRICH_E_FROM_PUBLIC_FOOTPRINT`** (governor SESHAT, handler quick-intake), procédure `social.rescanPublicFootprint` (`governedProcedure`), service `rerunPublicEnrichmentForStrategy()` — écrit E via gateway `SET_FIELDS` author `EXTERNAL_SAAS` + provenance SOURCE/INFERRED. Le provenance-guard (HUMAN > SOURCE > INFERRED) interdit d'écraser un champ founder : **l'ADVE reste founder-owned** (doctrine STOP-à-Jehuty respectée — la donnée observée se pose en SOURCE/INFERRED, l'opérateur arbitre les CHALLENGE).
- **Activation** : le chemin nominal `activateBrand` promeut la temp Strategy (E enrichi survit) ; le chemin de récupération (temp purgée) réinjecte `webFootprint` dans le re-seed de E.
- **Surface rapport** : bloc « Empreinte web publique » du result page (rendu aussi dans le PDF payant) affiche `X abonnés` (réel) prioritaire sur `~X abonnés` (hint) + sous-bloc « Mentions presse ». Rien trouvé → bloc masqué (état honnête).

### Matrice de dégradation

| Condition | Comportement |
|---|---|
| Pas de `BRAVE_API_KEY` | découverte skippée (`DEFERRED_NO_KEY`), footprint déclaré seul |
| Pas d'`APIFY_TOKEN` | étage followers `DEFERRED`, hints OG conservés |
| Timeout étage | race par étage + budget global 20 s, partiel persisté |
| Apify 401/429/5xx | `DEGRADED` (AUTH_REVOKED/RATE_LIMITED/VENDOR_OUTAGE) → hints conservés, erreur loggée |
| Rien trouvé | bloc masqué, jamais de fabrication |
| Échec total enrichissement | `complete()` continue — l'intake n'échoue JAMAIS à cause de l'empreinte |

## Alternatives rejetées

- **APIs officielles Meta Graph seules** : exige un OAuth client pendant l'intake public — friction incompatible funnel. Conservées en option opérateur (`fetchOfficialApiFollowers`, inchangé).
- **SerpAPI** : 25 $/mois minimum pour l'équivalent du free tier Brave — écarté.
- **Recherche LLM / connaissance modèle** : fabrication possible, non traçable — interdit sur le circuit de la donnée (registre des trous : jamais combler un trou en inventant).
- **Credentials Vault only** : l'intake est pré-opérateur ; forcer un vault aurait laissé le funnel public sans enrichissement (ADR-0075 tranche : secrets système = env).

## Conséquences

- Cap APOGEE 7/7 préservé (Brave/Apify = connectors, pas de Neter).
- 0 migration Prisma (shapes JSON additifs ; `FollowerSnapshot.source` accepte "APIFY" — colonne String existante).
- Env à poser sur Coolify (powerupgraders.com) : `BRAVE_API_KEY` + `APIFY_TOKEN` (cf. `docs/deploy/ENV-VARS.md`). Sans elles le funnel reste fonctionnel en mode dégradé honnête.
- `COLLECT_WEB_FOOTPRINT` (registry-only, jamais dispatché) reste au catalogue, description annotée vers ce kind.
