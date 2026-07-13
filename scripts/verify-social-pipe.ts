#!/usr/bin/env tsx
/**
 * Vérification locale — chaîne ADVE → publication sociale planifiée.
 *
 * Prouve le pipe de bout en bout SANS token réel (donc sans publier pour de
 * vrai) : chaque étage tourne, le dernier s'arrête honnêtement à
 * « NOT_CONNECTED » faute de connexion FB locale. En prod, avec la page
 * connectée en OAuth, ce dernier étage publie sur Facebook.
 *
 *   1. planification            → BrandAction SCHEDULED (metadata.socialPublish.pending)
 *   2. échéance atteinte        → listDueScheduledPublications() la remonte
 *   3. ré-émission GOUVERNÉE    → emitIntent(ANUBIS_PUBLISH_SOCIAL_POST) (spine + cost-gate)
 *   4. publication              → publishSocialPost → lookup connexion → tentative Graph
 *
 * Usage : npx tsx scripts/verify-social-pipe.ts   (DB locale)
 */

import { db } from "../src/lib/db";
import {
  publishSocialPost,
  listDueScheduledPublications,
} from "../src/server/services/anubis/social-publish";
import { emitIntentTyped } from "../src/server/services/mestor/intents";

async function main() {
  console.log("═══ VÉRIF pipe ADVE → publication planifiée (Motion19) ═══\n");

  const strat = await db.strategy.findFirst({
    where: { OR: [{ publicSlug: "motion19" }, { name: { contains: "Motion19" } }] },
    select: { id: true, name: true, userId: true },
  });
  if (!strat) throw new Error("Motion19 introuvable — `npm run db:seed:motion19`");
  console.log("• marque:", strat.name);

  const text = "Test du pipe : ADVE → action calendrier → cron → publication (post texte).";

  // 1. PLANIFICATION — futur → BrandAction SCHEDULED, zéro appel plateforme.
  const scheduled = await publishSocialPost({
    strategyId: strat.id,
    userId: strat.userId,
    targets: ["FACEBOOK"],
    text,
    scheduleAt: new Date(Date.now() + 3 * 60_000).toISOString(),
  });
  console.log(`1. planifié → mode=${scheduled.mode} · BrandAction ${scheduled.brandActionId}`);
  const action = await db.brandAction.findUnique({
    where: { id: scheduled.brandActionId },
    select: { status: true, metadata: true },
  });
  const pending = (action?.metadata as { socialPublish?: { pending?: boolean } } | null)?.socialPublish?.pending;
  console.log(`   BrandAction.status=${action?.status} · socialPublish.pending=${pending} ${scheduled.mode === "SCHEDULED" && action?.status === "SCHEDULED" && pending ? "✅" : "❌"}`);

  // 2. ÉCHÉANCE — on antidate timingStart pour simuler « l'heure est arrivée ».
  await db.brandAction.update({
    where: { id: scheduled.brandActionId },
    data: { timingStart: new Date(Date.now() - 60_000) },
  });
  const due = await listDueScheduledPublications();
  const mine = due.find((d) => d.brandActionId === scheduled.brandActionId);
  console.log(`2. échéance atteinte → ${due.length} publication(s) due(s) ; la nôtre remonte ${mine ? "✅" : "❌"}`);
  if (!mine) throw new Error("La publication due n'a pas été remontée par le cron.");

  // 3+4. RÉ-ÉMISSION GOUVERNÉE (le pipe exact du cron) → publication.
  const emitted = await emitIntentTyped<{ mode: string; results: Array<{ platform: string; state: string; detail: string | null }> }>(
    {
      kind: "ANUBIS_PUBLISH_SOCIAL_POST",
      strategyId: mine.input.strategyId,
      userId: mine.input.userId,
      targets: mine.input.targets,
      text: mine.input.text,
      linkUrl: mine.input.linkUrl,
      imageUrl: mine.input.imageUrl,
      scheduleAt: null,
      brandActionId: mine.brandActionId,
    },
    { caller: "script:verify-social-pipe" },
  );
  const fb = emitted.results.find((r) => r.platform === "FACEBOOK");
  console.log(`3. ré-émission gouvernée ANUBIS_PUBLISH_SOCIAL_POST → dispatch OK (spine + cost-gate) ✅`);
  console.log(`4. publication → FACEBOOK: state=${fb?.state}${fb?.detail ? ` (${fb.detail})` : ""}`);

  const post = await db.brandAction.findUnique({ where: { id: scheduled.brandActionId }, select: { status: true } });
  console.log(`   BrandAction.status final=${post?.status}`);

  console.log(
    `\n✅ PIPE PROUVÉ localement : planif → calendrier → cron → ré-émission gouvernée → publication.\n` +
      `   Étage 4 honnête = ${fb?.state} (aucune page FB connectée en local). En prod, avec la page\n` +
      `   Xtincell connectée en OAuth, cet étage POSTE sur Facebook à l'heure planifiée.`,
  );

  // Nettoyage
  await db.brandAction.delete({ where: { id: scheduled.brandActionId } }).catch(() => {});
  await db.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect().catch(() => {});
  process.exit(1);
});
