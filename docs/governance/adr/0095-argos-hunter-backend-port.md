# ADR-0095 — Argos by LaFusée : port backend Hunter sous gouvernance

- **Statut** : Accepted
- **Date** : 2026-06-14
- **Gouverneur** : SESHAT (Argos = sous-domaine ; Hunter = sub-agent, **PAS un Neter**)
- **Cap APOGEE** : 7/7 préservé
- **Parent** : ADR-0083 (placement Argos/Hunter au sein de Seshat)

## Contexte

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
