# ADR-0100 — Argos by LaFusée : port backend Hunter sous gouvernance

> **Renumérotation 2026-06-15** — créé `ADR-0095` sur la branche `galileo`, renommé `ADR-0100` lors de la consolidation `galileo` ↔ `focused-hypatia` (collision avec `ADR-0095` arrivé en premier le 2026-06-13, convention first-come-keep ; cf. test `adr-uniqueness`).

- **Statut** : Accepted
- **Date** : 2026-06-14
- **Gouverneur** : SESHAT (Argos = sous-domaine ; Hunter = sub-agent, **PAS un Neter**)
- **Cap APOGEE** : 7/7 préservé
- **Parent** : ADR-0083 (placement Argos/Hunter au sein de Seshat)

## Amendement 2026-09-14 — la prémisse était fausse

> **La décision de cette ADR reste valable ; sa prémisse est corrigée.**

Le contexte ci-dessous affirme « 0 % de backend ». C'était inexact au moment où il a
été écrit. `Argos-studio` existait depuis le 15 mai 2026 avec 184 fichiers : une API
v1 complète — `agencies`, `awards`, `brands`, `assets`, `markets`, `references`,
`sectors`, `years`, `ingest/dossier` — un `schema.prisma` à neuf entités, une
migration `20260512171730_init`, un seed, et une bibliothèque qualifiée réelle.

```bash
gh api 'repos/xtincell/Argos-studio/commits?until=2026-06-14T23:59:59Z&per_page=1'
```

Un backend a donc été reconstruit à un mois d'écart d'un backend existant, parce que
rien ne disait que l'autre existait.

**Ce que cette ADR a construit reste juste et nécessaire** : le verdict de sûreté
déterministe, les intents et leurs SLO, le passage obligé par le LLM Gateway, la
parité manual-first. `Argos-studio` n'a rien de tout cela. **Les trois interdits
vendor ci-dessous restent en vigueur, inchangés.**

Ce qui change est l'articulation, arbitrée par
[`SHK-0002`](https://github.com/xtincell/shinkiro/blob/main/docs/adr/SHK-0002-argos-unifie-et-autonome.md) :
`Argos-studio` devient canonique pour la **bibliothèque**, et ce service-ci devient un
**client gouverné** — il conserve sa porte de sûreté et projette sur
`POST /api/v1/ingest/dossier`, idempotent sur le slug, lorsque le verdict est `PASS`.
`CampaignReferenceDossier` devient le journal de gouvernance, non le fonds documentaire.

Le dispositif qui rend cette erreur non reproductible est décrit dans
[`shinkiro/docs/DERIVE.md`](https://github.com/xtincell/shinkiro/blob/main/docs/DERIVE.md).

---

## Contexte

> ⚠️ *Le constat qui suit est celui du 14 juin 2026. Voir l'amendement ci-dessus :
> la prémisse « 0 % de backend » est fausse.*

Audit (2026-06-14) : Argos n'était **pas déployable** — 0 % de backend, seul existait
le code vendored gelé `docs/external-design/argos-hunter-v1/` (UI de référence) sous
3 interdits. Décision opérateur explicite : **déployer Argos** (les interdits sont des
règles de portage, pas un veto).

## Décision

Port **A0 sous gouvernance**, réimplémenté à neuf dans `src/` (le vendor reste gelé) :

- **Modèle** `CampaignReferenceDossier` (ref UID hiérarchique unique, brand/campaign,
  sector/market, `dna` Json, `editorial`, `sources`, `safetyVerdict`, `published`,
  `origin` HUNTER|MANUAL). Migration `20260614110000_argos_reference_dossier`.
- **Service** `seshat/argos/` : `uid` (pur), `safety` (verdict **déterministe** PASS/
  QUARANTINE/REJECT), `schemas` (Zod), `index` (persist + Hunter + manual + reads +
  projection publique). **Auto-publish ⇔ PASS**.
- **Hunter (LLM)** : `harvestReference` via `executeStructuredLLMCall` (LLM Gateway,
  ADR-0067) — **jamais d'appel Anthropic direct**.
- **Manual-first (ADR-0060)** : `createReferenceDossierManual` (zéro LLM) — un opérateur
  saisit le DNA à la main. Intent pair `OPERATOR_CREATE_REFERENCE_DOSSIER`.
- **Intents** `SESHAT_HARVEST_REFERENCE` + `OPERATOR_CREATE_REFERENCE_DOSSIER` (gouverneur
  SESHAT) + SLOs. Router `argos` (hunt/createManual gouvernés, list/getById/setVerdict
  opérateur, **listPublic/getPublicByRef publics** — PASS + publié uniquement).
- **Surfaces** : app publique in-app `/argos` (mur) + `/argos/[ref]` (détail) ; console
  `/console/seshat/argos` (récolte + manuel + revue verdict) ; lien footer marketing
  basculé de « (bientôt) » → `/argos`.

## Les 3 interdits vendor — respectés

1. **Aucun import** depuis/vers `docs/external-design/argos-hunter-v1/` — code neuf.
2. **Pas d'exécution du vendor** — réimplémentation sous LLM Gateway + Prisma + Intent.
3. **Vendor non modifié** — `docs/external-design/` intact.

## Portée & suites

- Déploiement **in-app** (route `/argos`) — pas de monorepo `apps/argos/`. Le split
  Turborepo + domaine `argos.lafusee.com` reste une **optimisation ultérieure non
  bloquante** (la redirection domaine pourra pointer `/argos`).
- A1 (bridge `queryReferences` → Artemis DNA) et A4 (newsletter) : suites possibles.
- Hunter mono-appel structuré (dossier complet) ; le découpage 4-phases peut être
  réintroduit plus tard sans changer le modèle.

Cap APOGEE 7/7 préservé (Hunter = sub-agent). Aucun nouveau Neter.
