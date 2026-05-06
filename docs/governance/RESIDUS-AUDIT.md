# RESIDUS-AUDIT — patterns de dette technique scannés

Auto-généré par `scripts/audit-residus.ts`. Régénérer après cleanup pour suivre la baisse.

## Synthèse

| Sévérité | Count |
|---|---|
| high | 0 |
| medium | 60 |
| low | 373 |
| **Total** | **433** |

## Par pattern

### `console-log-prod` — 190 occurrences

> console.* en prod — préférer error-vault.capture pour logs structurés.

<details><summary>Voir les 190 sites</summary>

| File | Line |
|---|---|
| `src/app/(cockpit)/cockpit/brand/deliverables/[key]/page.tsx` | 78 |
| `src/app/(console)/console/artemis/tools/page.tsx` | 594 |
| `src/app/(console)/console/artemis/tools/page.tsx` | 598 |
| `src/app/(intake)/intake/[token]/result/page.tsx` | 413 |
| `src/app/api/cron/sentinels/route.ts` | 139 |
| `src/app/api/export/[strategyId]/route.ts` | 44 |
| `src/app/api/integrations/oauth/[provider]/callback/route.ts` | 70 |
| `src/app/api/mcp/advertis-inbound/route.ts` | 73 |
| `src/app/api/mcp/artemis/route.ts` | 24 |
| `src/app/api/mcp/creative/route.ts` | 24 |
| `src/app/api/mcp/guild/route.ts` | 43 |
| `src/app/api/mcp/intelligence/route.ts` | 24 |
| `src/app/api/mcp/operations/route.ts` | 24 |
| `src/app/api/mcp/ptah/route.ts` | 36 |
| `src/app/api/mcp/pulse/route.ts` | 24 |
| `src/app/api/mcp/route.ts` | 47 |
| `src/app/api/mcp/seshat/route.ts` | 43 |
| `src/app/api/payment/webhook/paypal/route.ts` | 44 |
| `src/app/api/payment/webhook/paypal/route.ts` | 125 |
| `src/app/api/payment/webhook/stripe/route.ts` | 122 |
| `src/app/api/payment/webhook/stripe/route.ts` | 194 |
| `src/app/api/webhooks/mobile-money/route.ts` | 93 |
| `src/app/api/webhooks/mobile-money/route.ts` | 100 |
| `src/app/api/webhooks/mobile-money/route.ts` | 203 |
| `src/app/api/webhooks/social/route.ts` | 185 |
| `src/app/api/webhooks/social/route.ts` | 195 |
| `src/app/error.tsx` | 14 |
| `src/components/cockpit/pillar-page.tsx` | 237 |
| `src/components/primitives/icon.tsx` | 24 |
| `src/components/shared/notification-toast.tsx` | 173 |
| `src/lib/types/advertis-vector.ts` | 152 |
| `src/server/governance/bootstrap.ts` | 24 |
| `src/server/governance/bootstrap.ts` | 27 |
| `src/server/governance/bootstrap.ts` | 92 |
| `src/server/governance/event-bus.ts` | 57 |
| `src/server/services/advertis-scorer/index.ts` | 111 |
| `src/server/services/advertis-scorer/quality-modulator.ts` | 78 |
| `src/server/services/approval-workflow/index.ts` | 167 |
| `src/server/services/approval-workflow/index.ts` | 216 |
| `src/server/services/artemis/commandant.ts` | 384 |
| `src/server/services/artemis/i-action-extractor.ts` | 244 |
| `src/server/services/artemis/index.ts` | 346 |
| `src/server/services/artemis/tools/engine.ts` | 154 |
| `src/server/services/artemis/tools/engine.ts` | 171 |
| `src/server/services/artemis/tools/engine.ts` | 451 |
| `src/server/services/artemis/tools/execution-journal.ts` | 136 |
| `src/server/services/artemis/tools/execution-journal.ts` | 139 |
| `src/server/services/artemis/tools/execution-journal.ts` | 142 |
| `src/server/services/artemis/tools/execution-journal.ts` | 145 |
| `src/server/services/artemis/tools/execution-journal.ts` | 148 |
| _… et 140 autres_ | |

</details>

### `as-never-cast` — 183 occurrences

> Type bypass `as never` — review pour confirmer l'intent.

<details><summary>Voir les 183 sites</summary>

| File | Line |
|---|---|
| `src/app/(cockpit)/cockpit/operate/briefs/page.tsx` | 520 |
| `src/app/(console)/console/artemis/campaigns/page.tsx` | 71 |
| `src/app/(console)/console/artemis/campaigns/page.tsx` | 274 |
| `src/app/(console)/console/artemis/skill-tree/page.tsx` | 314 |
| `src/app/(console)/console/governance/error-vault/page.tsx` | 104 |
| `src/app/(console)/console/strategy-operations/brief-ingest/page.tsx` | 167 |
| `src/app/api/cron/founder-digest/route.ts` | 73 |
| `src/app/api/cron/sentinels/route.ts` | 133 |
| `src/app/api/cron/sentinels/route.ts` | 136 |
| `src/app/api/nsp/route.ts` | 70 |
| `src/components/neteru/ptah-asset-library.tsx` | 34 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 67 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 68 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 69 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 70 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 71 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 72 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 74 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 75 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 76 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 78 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 79 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 80 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 81 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 82 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 84 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 85 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 86 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 88 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 89 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 90 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 91 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 93 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 95 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 96 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 97 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 98 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 99 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 100 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 101 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 102 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 103 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 104 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 105 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 106 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 107 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 108 |
| `src/components/strategy-presentation/presentation-layout.tsx` | 245 |
| `src/server/governance/governed-procedure.ts` | 486 |
| `src/server/governance/governed-procedure.ts` | 507 |
| _… et 133 autres_ | |

</details>

### `json-parse-no-try` — 43 occurrences

> JSON.parse sans try/catch — risque crash sur input malformé.

<details><summary>Voir les 43 sites</summary>

| File | Line |
|---|---|
| `src/app/(console)/console/strategy-operations/brief-ingest/page.tsx` | 193 |
| `src/app/api/payment/webhook/paypal/route.ts` | 58 |
| `src/app/api/payment/webhook/stripe/route.ts` | 114 |
| `src/app/api/payment/webhook/stripe/route.ts` | 118 |
| `src/app/api/payment/webhook/stripe/route.ts` | 182 |
| `src/app/api/payment/webhook/stripe/route.ts` | 190 |
| `src/components/navigation/command-palette.tsx` | 67 |
| `src/components/navigation/sidebar.tsx` | 24 |
| `src/server/mcp/creative/index.ts` | 122 |
| `src/server/services/artemis/index.ts` | 158 |
| `src/server/services/artemis/tools/engine.ts` | 214 |
| `src/server/services/asset-tagger/index.ts` | 229 |
| `src/server/services/boot-sequence/index.ts` | 92 |
| `src/server/services/campaign-manager/index.ts` | 34 |
| `src/server/services/ingestion-pipeline/ai-filler.ts` | 174 |
| `src/server/services/ingestion-pipeline/ai-filler.ts` | 257 |
| `src/server/services/ingestion-pipeline/ai-filler.ts` | 327 |
| `src/server/services/ingestion-pipeline/ai-filler.ts` | 437 |
| `src/server/services/matching-engine/index.ts` | 438 |
| `src/server/services/mestor/hyperviseur.ts` | 577 |
| `src/server/services/mestor/hyperviseur.ts` | 619 |
| `src/server/services/mestor/hyperviseur.ts` | 651 |
| `src/server/services/mestor/hyperviseur.ts` | 669 |
| `src/server/services/mestor/insights.ts` | 265 |
| `src/server/services/oauth-integrations/index.ts` | 140 |
| `src/server/services/qc-router/automated-qc.ts` | 195 |
| `src/server/services/quick-intake/infer-needs-human-fields.ts` | 420 |
| `src/server/services/quick-intake/question-bank.ts` | 350 |
| `src/server/services/seshat/external-feeds/index.ts` | 136 |
| `src/server/services/seshat/market-study-ingestion/persister.ts` | 48 |
| `src/server/services/seshat/market-study-ingestion/persister.ts` | 76 |
| `src/server/services/seshat/market-study-ingestion/persister.ts` | 99 |
| `src/server/services/seshat/market-study-ingestion/persister.ts` | 116 |
| `src/server/services/seshat/market-study-ingestion/persister.ts` | 133 |
| `src/server/services/seshat/tarsis/index.ts` | 234 |
| `src/server/services/seshat/tarsis/index.ts` | 272 |
| `src/server/services/seshat/tarsis/index.ts` | 273 |
| `src/server/services/seshat/tarsis/signal-collector.ts` | 117 |
| `src/server/services/seshat/tarsis/weak-signal-analyzer.ts` | 199 |
| `src/server/services/seshat/tarsis/weak-signal-analyzer.ts` | 245 |
| `src/server/trpc/routers/monetization.ts` | 169 |
| `src/server/trpc/routers/monetization.ts` | 170 |
| `src/server/trpc/routers/quick-intake.ts` | 80 |

</details>

### `writePillar-bare` — 17 occurrences

> writePillar bare — cache reconciliation manquante. Préférer writePillarAndScore (cf. RESIDUAL-DEBT v6.1.18).

<details><summary>Voir les 17 sites</summary>

| File | Line |
|---|---|
| `src/server/services/artemis/tools/engine.ts` | 440 |
| `src/server/services/implementation-generator/index.ts` | 172 |
| `src/server/services/ingestion-pipeline/ai-filler.ts` | 362 |
| `src/server/services/ingestion-pipeline/index.ts` | 285 |
| `src/server/services/mestor/hyperviseur.ts` | 586 |
| `src/server/services/notoria/lifecycle.ts` | 126 |
| `src/server/services/notoria/lifecycle.ts` | 208 |
| `src/server/services/seshat/tarsis/index.ts` | 254 |
| `src/server/services/strategy-presentation/enrich-oracle.ts` | 212 |
| `src/server/services/strategy-presentation/enrich-oracle.ts` | 1276 |
| `src/server/services/strategy-presentation/enrich-oracle.ts` | 1561 |
| `src/server/trpc/routers/pillar.ts` | 261 |
| `src/server/trpc/routers/pillar.ts` | 285 |
| `src/server/trpc/routers/pillar.ts` | 308 |
| `src/server/trpc/routers/pillar.ts` | 331 |
| `src/server/trpc/routers/pillar.ts` | 362 |
| `src/server/trpc/routers/pillar.ts` | 516 |

</details>

---

**Total findings** : 433
**Patterns scannés** : 5
