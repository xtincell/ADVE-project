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

## État (scan 2026-06-23, mode inventaire — sans DB)

| Dimension | Valeur |
|---|---|
| Modèles Prisma (schéma) | **181** (le header du seed « 111/116 » est **périmé**) |
| Modèles irrigués | ~109 estimés par l'audit · **à confirmer** via `npm run wakanda:scan` sur la base Wakanda |
| Flux critiques exercés | **8 / 15** (~53 %) |

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

## Plan de complétion (batches)

Chaque batch = un fichier seed ajouté à l'orchestrateur, testé, scanné. LLM-indépendant autant que possible.

1. **Intake → paywall → ADVE** — `03-intake-paywall.ts` : `QuickIntake`, `IntakePayment`, `Subscription`, `Account`/`Session`. Débloque le funnel bout-en-bout + `checkPaidTier`.
2. **Costing / factures prestataires** — `24b-financial-costing.ts` : archétypes `ActionCostTemplate` + composants atomiques, `ZoneIndex` (zones africaines), `ProviderCostRate`, `ActionCostEstimate`, `BrandAction`.
3. **Suivi superfans** — `25b-superfan-tracking.ts` : `FollowerSnapshot` (4 semaines × plateformes, courbes réalistes), `TarsisCaptureSession`, snapshot de calibration.
4. **Oracle 35 sections** — `19-oracle-sections.ts` : `OracleSection` (6 marques × 35, états COMPLETE/STALE), `OracleSnapshot`.
5. **Brand-tree + deliverables + morning brief** — `18-brand-tree.ts` + `24c-campaign-deliverables.ts` : `BrandNode`/`BrandContextNode` (hiérarchies SKU), `CampaignDeliverable` (6D), `OperatorAction`, `MorningBriefBatch`/`BriefIngestionDraft`, `CampaignChangeRequest`.
6. **Comms + MCP + Argos + vault** — `26b-comms-broadcast.ts` + `29-mcp-config.ts` + `30-argos-dossiers.ts` : `CommsPlan`/`BroadcastJob`/templates, `ExternalConnector` (`DEFERRED_AWAITING_CREDENTIALS`), suite MCP billing, `CampaignReferenceDossier`.
7. **Bouclage + garde CI** — combler le reste, étendre le scanner en test d'intégration (`tests/integration/seed-coverage.spec.ts`) : modèles critiques ≥1 ligne, chaque marque = Strategy + 8 Pillars + ≥1 Campaign.

## Ressources credential/contrat-gated → `_mocked`

À seeder en **mock honnête**, jamais en faux live :

- **Tarsis** (SDK/contrat vendor) → `ExternalConnector` `DEFERRED_AWAITING_CREDENTIALS` + payloads `_mocked: true`.
- **Ad networks** (Meta/Google/TikTok), **email** (Mailgun), **SMS** (Twilio) → connecteurs deferred.
- **Mobile money** (Wave/MTN/Orange) → cycles + payouts mockés (codes marchands réels requis pour le live).
- **Higgsfield MCP** → invocations mockées via le LLM Gateway.
- **Embeddings OpenAI** → fallback Ollama / no-op (`OPENAI_API_KEY` optionnel).
- **Stripe** → clés en env vars uniquement (jamais en base, ADR-0075).

## Prochaine décision opérateur

Prioriser l'ordre des batches (défaut : 1→7 ci-dessus) et confirmer le périmètre
« LA TOTALE » avant d'écrire les seeds. Les batches 2, 5, 6 touchent des
sous-systèmes credential-gated → seedés `_mocked`. Lancer `npm run wakanda:scan`
sur la base Wakanda donnera les chiffres de couverture réels (baseline).
