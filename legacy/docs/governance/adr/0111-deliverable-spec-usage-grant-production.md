# ADR-0111 — `DeliverableSpec` matrix + `UsageGrant` (acteur Production)

**Status** : Accepted
**Date** : 2026-06-28
**Phase** : 24 — câblage du cycle de vie (acteur Production / freelance / agence)
**Depends on** : ADR-0099 (reference-data datée), ADR-0023/0085 (staleAt pattern), ADR-0093 (coûts atomisés)
**Enforced by** : `tests/unit/services/production-specs.test.ts`

## Contexte

L'analyse multi-acteurs (ligne **Production**) a relevé deux trous P1 : (①) un
`CampaignExecution` ne se **fan-out** pas en livrables techniques (TV 16:9, Meta
9:16, OOH 4x3m…) — la matrice de specs canal/ratio/résolution/codec/loudness
n'existait pas, et risquait de finir en code dur ; (②) aucun **droit d'usage**
talent×livrable (médias/territoire/durée/buyout/exclusivité) ni gate d'expiration.

## Décision

- **`ChannelSpecReference`** : catalogue canaux × specs seedé
  (`seed-channel-specs.ts`, 11 specs : TV/CTV/Meta/TikTok/YouTube/OOH/DOOH/Print/
  Radio) — **lignes mutables**, jamais des constantes en code.
- **`DeliverableSpec`** : fan-out d'une exécution en N specs dérivées d'une ligne
  du catalogue (relation `CampaignExecution.deliverableSpecs`). Clé catalogue
  introuvable → ignorée (rapport `skipped`), jamais de spec inventée.
- **`UsageGrant`** (talent × livrable) : `{ media[], territory, termStart,
  termMonths, buyoutFee, exclusivity, expiresAt }`. `expiresAt` = termStart +
  termMonths (calculé à la création).
- **Gate d'expiration déterministe** (`production/specs.ts`, PUR) : `isDiffusionAllowed`
  / `isUsageGrantActive` — un livrable est diffusable ssi un droit est ACTIVE et
  non expiré à `asOf` (injecté, jamais d'horloge cachée). Isomorphe à `staleAt`.
- **Intents gouvernés** `LEGACY_DELIVERABLE_FANOUT` / `LEGACY_USAGE_GRANT_CREATE`
  + SLOs. Router `production` : `channelSpecs`, `deliverables`, `diffusionStatus`,
  `fanOut`, `createUsageGrant` (tenant-scopés par la campagne).

## Conséquences

- Une exécution produit une matrice de livrables techniques reproductible, et la
  diffusion est bloquée déterministiquement quand les droits expirent.
- Specs et contraintes ajustables sans toucher au code (données de référence).
- Cap APOGEE 7/7 préservé — sous-domaine Ptah/Imhotep, aucun nouveau Neter.
