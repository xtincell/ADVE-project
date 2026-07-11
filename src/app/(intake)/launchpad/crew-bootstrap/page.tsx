/**
 * /launchpad/crew-bootstrap — Phase 18 (ADR-0059) crew Imhotep bootstrap.
 *
 * Stub J10 — pré-remplit l'UI avec l'équipe créa Matanga confirmée par
 * l'opérateur (Alex DA lead + Papin graphiste + William graphiste) et
 * propose le matching vers TalentProfile existants. La création de Users
 * + TalentProfile complets passe par l'auth flow standard ; ce wizard
 * documente l'intention et fournit les liens directs.
 *
 * Manual-first parity (ADR-0060) garantie : aucune création automatique
 * sans User préalable créé via auth flow.
 */

"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Users, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";

const MATANGA_CREW = [
  { displayName: "Alex Djengue", role: "DA_LEAD", description: "Direction Artistique lead, founder Matanga + La Fusée." },
  { displayName: "Papin", role: "GRAPHIC", description: "Graphiste senior. Production visuels OOH/POSM/Digital." },
  { displayName: "William", role: "GRAPHIC", description: "Graphiste. Production visuels OOH/POSM/Digital." },
] as const;

export default function CrewBootstrapPage() {
  const { data: operator } = trpc.operator.getOwn.useQuery();

  if (!operator) return <div className="p-6 text-sm text-foreground-secondary">Loading…</div>;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Users className="h-6 w-6" /> Crew Bootstrap — {operator.name}
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Pré-import de l'équipe créa Matanga confirmée 2026-05-06.
          La création de chaque membre nécessite un User existant (créé via auth flow). Ce wizard
          documente l'intention et fournit les liens directs.
        </p>
      </header>

      <section className="rounded border border-zinc-700">
        <header className="border-b border-zinc-700 px-4 py-2">
          <h2 className="font-medium">Équipe créa cible (3 membres)</h2>
        </header>
        <ul className="divide-y divide-zinc-800">
          {MATANGA_CREW.map((member) => (
            <li key={member.displayName} className="flex items-start justify-between gap-4 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{member.displayName}</span>
                  <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-2xs uppercase tracking-wide text-blue-300">
                    {member.role}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground-secondary">{member.description}</p>
              </div>
              <Link
                href={`/console/imhotep`}
                className="inline-flex items-center gap-1 rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
              >
                Équipe & talents <ExternalLink className="h-3 w-3" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-amber-400" />
          <div className="flex-1 text-sm">
            <h3 className="font-medium">Pré-requis création membre</h3>
            <p className="mt-1 text-foreground-secondary">
              Chaque membre crew nécessite un <code>User</code> Prisma préalable (relation 1:1 via <code>TalentProfile.userId</code>).
              Onboarding standard :
            </p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-foreground-secondary">
              <li>Le membre crée son compte via <code>/auth/signin</code> (email magic link standard).</li>
              <li>L'opérateur lui attribue un <code>TalentProfile</code> + <code>Membership</code> avec role/tier.</li>
              <li>Le membre devient assignable à un <code>CampaignDeliverable.delegatedToOperatorId</code> (cas sous-trait) ou à un <code>CampaignTeamMember</code> direct.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="rounded border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
          <div className="flex-1 text-sm">
            <h3 className="font-medium">Phase 18-A0 J10 — actions disponibles</h3>
            <p className="mt-1 text-foreground-secondary">
              Pour le moment, les 3 membres existent en intent (cette page) mais l'instanciation
              requiert l'auth flow. Les <code>CampaignTeamMember</code> existants peuvent être
              taggés <code>delegatedToOperatorId = ANOTHER_OPERATOR</code> pour les cas sous-trait
              (ex: agence Ghana sur adaptations Peak Gabon / Belle Hollandaise Mali).
            </p>
            <div className="mt-2 flex gap-2">
              <Link href="/console/imhotep" className="rounded bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/30">
                Console équipe →
              </Link>
              <Link href="/cockpit/portfolio" className="rounded bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/30">
                Portfolio Brand Tree →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
