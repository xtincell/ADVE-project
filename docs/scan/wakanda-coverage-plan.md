# Wakanda — plan de couverture « LA TOTALE »

> Audit 2026-06-23. Wakanda n'est **pas** un seed bénin : c'est le snapshot d'un
> **marché entier, vivant et complet**, censé montrer à quoi ressemble La Fusée
> **en pleine fonction**. Objectif : le seed exerce **100 % des fonctions, sans
> exception** — de l'intake à la facture prestataire, en passant par le suivi
> des superfans et l'actualité qui alimente Jehuty. C'est un seed à **compléter
> et planifier sérieusement** ; d'où le **bot** qui scanne partout avant
> d'irriguer les voies.

## Le bot — `scripts/seed-wakanda/coverage-scan.ts`

```bash
npm run wakanda:scan          # charge .env.local → DATABASE_URL
```

- Énumère **tous** les modèles Prisma (parse de `prisma/schema.prisma`, sans client).
- Avec une base joignable : compte `isDummy=true` par modèle → couverture chiffrée + modèles vides.
- Vérifie chaque **flux critique** (≥1 modèle irrigué) — sinon la voie n'est pas alimentée.
- Écrit `scripts/seed-wakanda/coverage-report.json` (gitignoré, regénéré).

Vocation : devenir un **garde CI** (« le seed irrigue ≥ N modèles + tous les flux critiques »).

## État (2026-06-24 — 7 batches « LA TOTALE » shippés)

| Dimension | Valeur |
|---|---|
| Modèles Prisma (schéma) | **181** (le header du seed « 111/116 » est **périmé**) |
| Modèles irrigués | ~150 estimés post-batches · **à confirmer** via `npm run wakanda:scan` sur la base Wakanda |
| Flux critiques (présence schéma) | **11 / 11** ✅ (scanner `coverage-report.json`) |
| Comptage chiffré réel | à établir via `npm run wakanda:scan` sur la base Wakanda |

> **2026-06-24 — les 7 batches sont écrits, câblés (Phase 4 de `index.ts`),
> purgeables (`purge.ts`) et gardés en CI** (`tests/unit/governance/wakanda-seed-coverage.test.ts`,
> statique — assert que chaque modèle de flux critique est semé + chaque batch
> câblé). Validation runtime finale = `npm run wakanda:seed` sur la base Wakanda
> (le repo ne peut pas générer le client Prisma hors-ligne — politique réseau).

Le seed actuel (`01`–`28`) couvre solidement : 6 marques + ADVE/Pillars + scores,
campagnes (L1), missions/talent, financier de base (invoices, escrow, CRM),
communauté/superfans (sans série temporelle), intelligence/frameworks,
contenu/presse/social, infrastructure (messages, notifs, audit). **BLISS** =
marque-héros 200/200 ICONE.

## Voies non irriguées (gaps par sous-système)

| # | Flux critique | État | Modèles manquants (clés) |
|---|---|---|---|
| 1 | intake → ADVE → Oracle → paywall | ❌ | `QuickIntake`, `IntakePayment`, `Subscription`, `Account`, `Session` |
| 2 | factures prestataires / action-costing (Thot, ADR-0087/0093) | ❌ | `ActionCostTemplate`, `ActionCostComponent`, `ActionCostEstimate`, `ProviderCostRate`, `ZoneIndex`, `EconomicNeighborMap`, `BrandAction` |
| 3 | suivi superfans dans le temps + calibration | 🟡 60 % | `FollowerSnapshot` (série temporelle), `TarsisCaptureSession`, snapshot calibration (`IntentEmission.payload`) |
| 4 | Jehuty feed (signaux + actualité externe) | 🟡 40 % | `NewsletterCampaign`, sources externes (RSS/Google News — _mocked_) |
| 5 | Argos dossiers de référence (ADR-0100) | ❌ | `CampaignReferenceDossier` |
| 6 | billing MCP (ADR-0092) | ❌ | `McpUsageStatement`, `McpApiCall`, `McpToolInvocation`, `McpServerConfig`, `McpApiKey`, `McpRegistry` |
| 7 | comms / broadcast (Anubis, ADR-0020/0021) | ❌ | `CommsPlan`, `BroadcastJob`, `ExternalConnector`, `EmailTemplate`, `SmsTemplate` |
| 8 | brand-tree hiérarchique (ADR-0059) | ❌ | `BrandNode`, `BrandContextNode`, `OperatorAction` |
| 9 | deliverables campagne 6D (ADR-0050/0059) | ❌ | `CampaignDeliverable`, `CampaignChangeRequest` |
| 10 | Oracle 35 sections (Phase 21) | ❌ | `OracleSection`, `OracleSnapshot` |
| 11 | candidatures missions / Guilde (ADR-0098) | ❌ | `MissionApplication` |
| 12 | Morning Brief Batch (Phase 18) | ❌ | `MorningBriefBatch`, `BriefIngestionDraft` |
| 13 | marché étendu (Seshat) | 🟡 30 % | `MarketBenchmark`, `MarketCostSnapshot` (ADR-0099), `MarketContextNode`, `MarketDocument` |

## Plan de complétion (batches) — ✅ shippé 2026-06-24

Chaque batch = un fichier seed ajouté à l'orchestrateur (Phase 4 de `index.ts`),
purgeable, scanné. LLM-indépendant (100 % déterministe).

1. ✅ **Intake → paywall → ADVE** — `03-intake-paywall.ts` : `QuickIntake` (prospects frais), `IntakePayment`, `Subscription`, `Account`/`Session`. Débloque le funnel bout-en-bout + `checkPaidTier` (1 sub `active` par marque payante).
2. ✅ **Costing / factures prestataires** — `24b-financial-costing.ts` : mini-catalogue `ActionCostTemplate` WK (actionKeys `WK_*`, sans collision avec le catalogue global `seed-action-costs.ts`) + composants atomiques, `ZoneIndex` (zone WK), `ProviderCostRate` (talents), `ActionCostEstimate` (snapshots déterministes), `BrandAction`.
3. ✅ **Suivi superfans** — `25b-superfan-tracking.ts` : `FollowerSnapshot` (6 semaines × plateformes, courbes déterministes), `TarsisCaptureSession`, snapshots de calibration (`IntentEmission` kind `RUN_ATTRIBUTION_CALIBRATION`).
4. ✅ **Oracle 35 sections** — `19-oracle-sections.ts` : `OracleSection` (6 marques × 35, états COMPLETE/PENDING/STALE/FAILED), `OracleSnapshot`.
5. ✅ **Brand-tree + deliverables + morning brief** — `18-brand-tree.ts` + `24c-campaign-deliverables.ts` : `BrandNode` (arbre BLISS CORPORATE→SKU + standalones) / `BrandContextNode`, `CampaignDeliverable` (6D, ciblant les SKU), `OperatorAction`, `MorningBriefBatch`/`IngestedSource`/`BriefIngestionDraft`, `CampaignChangeRequest`.
6. ✅ **Comms + MCP + Argos** — `26b-comms-broadcast.ts` + `29-mcp-config.ts` + `30-argos-dossiers.ts` : `CommsPlan`/`BroadcastJob`/`EmailTemplate`/`SmsTemplate`, `ExternalConnector` (mock honnête, `config._mocked` + jobs `DEFERRED`), suite MCP billing (`McpApiKey`/`McpApiCall`/`McpUsageStatement`/`McpServerConfig`/`McpRegistry`/`McpToolInvocation`), `CampaignReferenceDossier`.
7. ✅ **Bouclage + garde CI** — `31-missions-applications.ts` (`MissionApplication`) + `32-market-extended.ts` (`MarketBenchmark`/`MarketCostSnapshot`/`MarketDocument`/`MarketContextNode`/`NewsletterCampaign`) + garde CI **statique** `tests/unit/governance/wakanda-seed-coverage.test.ts` (parse les `CRITICAL_FLOWS` du scanner → assert chaque modèle semé + chaque batch câblé + purgé ; sans DB).

## Ressources credential/contrat-gated → `_mocked`

À seeder en **mock honnête**, jamais en faux live :

- **Tarsis** (SDK/contrat vendor) → `ExternalConnector` `DEFERRED_AWAITING_CREDENTIALS` + payloads `_mocked: true`.
- **Ad networks** (Meta/Google/TikTok), **email** (Mailgun), **SMS** (Twilio) → connecteurs deferred.
- **Mobile money** (Wave/MTN/Orange) → cycles + payouts mockés (codes marchands réels requis pour le live).
- **Higgsfield MCP** → invocations mockées via le LLM Gateway.
- **Embeddings OpenAI** → fallback Ollama / no-op (`OPENAI_API_KEY` optionnel).
- **Stripe** → clés en env vars uniquement (jamais en base, ADR-0075).

## Prochaine étape opérateur

Les 7 batches sont shippés. Pour valider sur la base Wakanda :

```bash
npm run db:seed:wakanda     # applique les 7 batches (idempotent, upsert wk-*)
npm run wakanda:scan        # chiffre la couverture réelle (isDummy/count + flux)
```

Le scan post-seed doit montrer les **11 flux critiques ✅** + un compte de modèles
irrigués nettement supérieur à la baseline. Les sous-systèmes credential-gated
(ad-networks, email/SMS, Tarsis, MCP externes) restent en **mock honnête**
(`config._mocked`, jobs `DEFERRED`, `safetyVerdict QUARANTINE`) — le live exige
les clés réelles via le Credentials Vault (ADR-0021). Purge : `npm run db:purge:wakanda`.
