# ADR-0115 — Connecteurs d'ingestion de performance média (acteur Média)

**Status** : Accepted
**Date** : 2026-06-28
**Phase** : 24 — câblage du cycle de vie (acteur Média, P2)
**Depends on** : ADR-0107 (MediaPlan/PCA), ADR-0021 (Credentials Vault), ADR-0077 (ConnectorResult P22-1)
**Enforced by** : `tests/unit/services/media-perf-normalize.test.ts`

## Contexte

L'ingestion de performance réelle (Meta/Google/TikTok/POS) vers
`CampaignAmplification`/AARRR était manuelle/`_mocked`. Il manquait le **pipeline
de normalisation** déterministe et le **gating credential** propre (le pipeline
doit exister même sans SDK câblé — sans jamais inventer de chiffres).

## Décision

- **Normalisation pure** (`media-perf/normalize.ts`) : `normalizePerfPayload`
  mappe un payload perf brut → forme `CampaignAmplification`, avec CPA/ROAS
  dérivés déterministes (réutilise `media-metrics`). Opérande absent → métrique
  `null`, jamais fabriquée. `platformToConnectorType` mappe plateforme → type de
  connecteur du Vault.
- **Chemin MANUEL** (`ingestManualPerformance`) : persiste des chiffres RÉELS
  fournis par l'opérateur (POS, export plateforme), normalisés, upsert sur
  (campaign, platform). Zéro mock, zéro LLM. Intent gouverné
  `LEGACY_MEDIA_PERF_INGEST_MANUAL`.
- **Chemin LIVE** (`ingestLivePerformance`) : credential-gated via le Credentials
  Vault → `ConnectorResult` HONNÊTE. Sans clé → `DEFERRED_AWAITING_CREDENTIALS` ;
  avec clé mais SDK provider non câblé → `DEGRADED` (jamais de données mockées).
- Router `mediaPlan` étendu : `perfLiveStatus` (query), `ingestManualPerf` (gouverné).

## Conséquences

- Le pipeline perf→CampaignAmplification existe et persiste du RÉEL (chemin
  manuel) ; le live est gated proprement, sans fausse donnée.
- Le câblage des SDK providers (Meta/Google/TikTok/POS) reste à faire par PR
  dédiée — le contrat (`ConnectorResult`, normalizer) est posé.
- Cap APOGEE 7/7 préservé — sous-domaine Anubis/Thot, aucun nouveau Neter.
