/**
 * Next.js instrumentation hook — exécuté UNE fois par process serveur au boot
 * (dev, `next start`, standalone, pm2). C'est LE point d'entrée qui manquait :
 * `bootstrapGovernance()` était déclaré « imported once in init.ts » mais
 * n'était importé nulle part → les observateurs Seshat (observeIntent), Thot
 * (recordCost), Tarsis (ingestSignal) et la synchro de phase D-6 étaient
 * INERTES en production (vague C, bug critique de l'audit).
 *
 * Garde NEXT_RUNTIME : le hook est aussi évalué côté edge — les imports
 * Node (Prisma, dns, timers) n'y ont pas leur place.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { bootstrapGovernance } = await import("@/server/governance/bootstrap");
  bootstrapGovernance();

  const { startOpsDaemon } = await import("@/lib/ops-daemon");
  startOpsDaemon();
}
