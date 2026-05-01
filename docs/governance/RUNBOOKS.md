# Disaster Recovery Runbooks

One-page-per-incident runbooks. The on-call engineer reads top-down, follows
the checklist, and updates the post-incident section when the incident is
closed.

---

## R1 — DB corrupted

**Symptoms**: Prisma `findFirst` returns inconsistent rows; users report
"Strategy not found" for valid IDs; `IntentEmission` count goes backwards.

1. Mark the system in maintenance mode (`MAINTENANCE_MODE=true` env var).
2. Snapshot the current DB state (PITR `WAL` if Postgres). Tag the snapshot
   `corruption-<utc-iso>`.
3. Identify scope by querying `IntentEmission` for the latest known-good
   `selfHash` against the hash-chain — see R3 for the verification command.
4. Restore from the most recent verified backup (PITR up to the point
   *before* the chain breaks).
5. Re-run any failed intents from `IntentQueue` (status=PENDING after the
   restore point).
6. Lift maintenance mode.
7. **Post-incident**: write a 1-page incident report under
   `docs/incidents/<utc-date>-db-corrupted.md`.

---

## R2 — LLM provider down (Anthropic / OpenAI / Ollama)

**Symptoms**: `intent.failed` events spiking with `provider error`; SLO
breach on `cost p95` (because retries inflate cost).

1. Toggle `LLM_GATEWAY_FORCE_PROVIDER=ollama` to fall back to local models
   for low-quality-tier intents only (B/C). High-tier S/A intents are
   queued until the upstream is back.
2. Open `IntentQueue` view, ensure waiting intents are not retrying on the
   broken provider.
3. Notify the operator via email (`intake@upgraders.io`) of expected
   delay.
4. Watch the `governance-drift` issue — if open, link this incident to it.
5. **Post-incident**: tighten `circuit-breaker.openMs` for the provider in
   `llm-gateway/circuit-breaker.ts`.

---

## R3 — Hash-chain broken on `IntentEmission`

**Symptoms**: governance-drift cron opened an issue with title
"Governance drift — weekly audit" and `selfHash mismatch` in the body.

1. Stop new writes (`MAINTENANCE_MODE=true`).
2. Run:

   ```sql
   SELECT id, "intentKind", "strategyId", "prevHash", "selfHash"
   FROM "IntentEmission"
   ORDER BY "emittedAt" ASC;
   ```

3. Use `src/server/governance/hash-chain.ts → verifyChain()` from a tsx
   REPL to find the breaking row.
4. Investigate manual edits — query the audit log of the DB user; run
   `pg_audit` if enabled.
5. If a single break is detected, append a `CORRECT_INTENT` row referencing
   the broken parent — never mutate the original row. Re-seed `prevHash`
   from the correction onward.
6. **Post-incident**: ensure DB user no longer has UPDATE on `IntentEmission`
   (Phase 8 ratchets this to read-only at the role level).

---

## R4 — Queue overflow (`IntentQueue` > 10k pending)

**Symptoms**: Console dashboard shows the queue depth exceeding 10k; SLOs
breached on `LIFT_INTAKE_TO_STRATEGY`, `ENRICH_ORACLE`.

1. Inspect kind distribution:

   ```sql
   SELECT "kind", COUNT(*) FROM "IntentQueue" WHERE status='PENDING' GROUP BY "kind";
   ```

2. Identify the dominant kind. Examine its handler logs — are intents
   genuinely succeeding or silently failing?
3. If silent failure: pause the cron worker (`CRON_PAUSED=true`) and
   investigate. Do not "drain" the queue blindly.
4. If genuine load: temporarily increase concurrency in
   `process-scheduler/index.ts` — but only by 25% steps, watching the SLO
   dashboard.
5. **Post-incident**: revisit `qualityTier` for that kind. If consistently
   B/C-tier work is queueing, downgrade the model in the routing matrix.

---

## R5 — Secret leaked (env, OAuth token, etc.)

**Symptoms**: GitHub secret-scan, Slack notification, or external report.

1. Rotate the leaked secret immediately at the upstream provider.
2. Update Vercel / production env. Trigger a redeploy.
3. If the secret was a user OAuth token: revoke at the provider AND mark
   the matching `IntegrationConnection` row inactive.
4. Audit the previous 7 days of access via the provider's audit log.
5. **Post-incident**: if leakage was via `git`, run BFG to scrub history;
   force-push only with full team awareness; rotate again as defense in
   depth.

---

## R-CREW — Imhotep matching drift (audit-crew-fit weekly)

**Trigger** : `audit-crew-fit-weekly` cron (sunday 03:00) signale ≥ 1 creator avec failRate ≥ 35% sur ≥ 4 missions / 90 jours, OU exit 1 en mode `--strict`.

1. Ouvrir le rapport — `npx tsx scripts/audit-crew-fit.ts` (sortie console : top 10 creators par failRate + warnings).
2. Pour chaque creator flaggé :
   - Vérifier `Mission.status` — éliminer les FAILED bloqués pour cause externe (Thot veto, brand cancellation, force majeure).
   - Inspecter `TalentReview` — y a-t-il un schéma de feedback récurrent ?
   - Inspecter `driverSpecialties.devotionFootprint` — secteur incompatible avec missions assignées ?
3. Décision (cocher dans `docs/incidents/<utc-date>-crew-drift.md`) :
   - **Recalibrage Imhotep** : cron `IMHOTEP_RECOMMEND_TRAINING` automatique sur les talentProfileIds flaggés.
   - **Pause matching** : flag `TalentProfile.tier=APPRENTI` (rétrogradation) via `IMHOTEP_EVALUATE_TIER` mode promote=false.
   - **Conversation 1:1** : assignée à `userOkoye` (brand manager) via `ANUBIS_DISPATCH_MESSAGE` channel=IN_APP.
4. Lancer `npx tsx scripts/register-imhotep-anubis-cron.ts` si le cron a été désactivé.
5. **Post-incident** : noter dans `docs/incidents/`.

---

## R-ANUBIS — Anubis conversion drift (audit-anubis-conversion weekly)

**Trigger** : `audit-anubis-conversion-weekly` cron (monday 04:00) signale ≥ 1 campaignAmplification avec `costPerSuperfan` ≥ 2× benchmark sectoriel / 30 jours, OU exit 1 en mode `--strict`.

1. Ouvrir le rapport — `npx tsx scripts/audit-anubis-conversion.ts`.
2. Pour chaque campagne flaggée :
   - Vérifier `metrics.audienceTargeting` — pays trop large, age trop générique, intérêts trop nombreux ?
   - Vérifier `metrics.creativeAssetVersionId` — l'asset performe-t-il sur d'autres campagnes ?
   - Vérifier `metrics.manipulationMode` — aligné avec `Strategy.manipulationMix` ?
3. Décision :
   - **PAUSE** : `db.campaignAmplification.update({where: {id}, data: {status: "PAUSED"}})` puis pause-call provider via Anubis (à câbler en Phase 8.2).
   - **Recalibrer audience** : ré-émettre `ANUBIS_LAUNCH_AD_CAMPAIGN` avec `audienceTargeting` plus restrictif.
   - **Switch creative** : repromote un autre `AssetVersion` via `PROMOTE_BRAND_ASSET_TO_ACTIVE` puis re-launch.
4. Si > 3 campagnes drift dans la semaine → revue stratégique avec Thot (cap budget).
5. **Post-incident** : noter dans `docs/incidents/`.

---

## R6 — Annual restore drill

Once per calendar year, the on-call team performs a full restore from
PITR backup into a staging Postgres. Verifies:

1. Schema migrations apply cleanly to the restored DB.
2. `IntentEmission` hash-chain verifies on the restored DB (uses
   `verifyChain()`).
3. Sample 10 strategies — Oracle still renders end-to-end.

Result is recorded in `docs/incidents/restore-drill-<year>.md`.
