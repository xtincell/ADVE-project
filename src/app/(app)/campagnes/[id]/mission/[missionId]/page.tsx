import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { GateForm } from "@/components/campaigns/gate-form";
import { DATE_FORMAT, MissionStatusBadge } from "@/components/campaigns/status";
import {
  MISSION_STATUS_LABELS,
  MISSION_STATUSES,
  type MissionStatus,
} from "@/domain/campaign";
import { getMissionDetail } from "@/server/campaigns";
import { requireSessionAndBrand } from "../../../session-brand";
import { AssignMissionForm } from "./assign-form";
import { deliverMissionAction, validateMissionAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mission" };

type PageProps = { params: Promise<{ id: string; missionId: string }> };

/**
 * Détail d'une mission : chaîne de provenance (campagne → action → brief),
 * timeline du circuit OPEN → ASSIGNED → DELIVERED → VALIDATED, et la gate de
 * l'étape courante (assigner / marquer livrée / valider la livraison).
 */
export default async function MissionDetailPage({ params }: PageProps) {
  const { id, missionId } = await params;
  const { brand } = await requireSessionAndBrand(`/campagnes/${id}/mission/${missionId}`);
  if (!brand) notFound();

  const mission = await getMissionDetail(brand.id, missionId);
  if (!mission || mission.brief.action.campaignId !== id) notFound();

  const campaign = mission.brief.action.campaign;
  const status = mission.status as MissionStatus;
  const reachedIndex = MISSION_STATUSES.indexOf(status);
  const stepDates: Record<MissionStatus, Date | null> = {
    OPEN: mission.createdAt,
    ASSIGNED: mission.assignedAt,
    DELIVERED: mission.deliveredAt,
    VALIDATED: mission.validatedAt,
  };

  return (
    <div className="space-y-8">
      <Link
        href={`/campagnes/${campaign.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-sand hover:text-bone"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {campaign.name}
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="eyebrow text-coral">Mission</p>
          <MissionStatusBadge status={status} />
        </div>
        <h1 className="font-display text-3xl font-semibold">{mission.title}</h1>
        <p className="font-mono text-[11px] text-smoke-2">
          brief «{" "}
          <Link
            href={`/campagnes/${campaign.id}/brief/${mission.briefId}`}
            className="underline hover:text-sand"
          >
            {mission.brief.title}
          </Link>{" "}
          » · action « {mission.brief.action.name} » · marché {campaign.country.name}
        </p>
        {mission.assignee ? (
          <p className="text-sm text-sand">
            Assignée à <span className="font-semibold text-sand-2">{mission.assignee}</span>
          </p>
        ) : null}
      </header>

      {/* ── Timeline du circuit ──────────────────────────────────────── */}
      <section
        className="rounded-lg border border-line bg-ink-2 p-6"
        aria-label="Circuit de la mission"
      >
        <h2 className="font-display text-lg font-semibold text-bone">Circuit</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-4">
          {MISSION_STATUSES.map((step, index) => {
            const reached = index <= reachedIndex;
            const date = stepDates[step];
            return (
              <li
                key={step}
                className={cn(
                  "rounded-md border p-4",
                  reached ? "border-coral/40 bg-coral/8" : "border-line-soft bg-ink-3/40",
                )}
              >
                <p
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider",
                    reached ? "text-coral" : "text-smoke-2",
                  )}
                >
                  {reached ? <Check className="size-3.5" aria-hidden /> : null}
                  {MISSION_STATUS_LABELS[step]}
                </p>
                <p className="mt-1.5 font-mono text-[11px] text-smoke-2">
                  {reached && date ? DATE_FORMAT.format(date) : "—"}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── Gate de l'étape courante ─────────────────────────────────── */}
      <section
        className="rounded-lg border border-line bg-ink-2 p-6"
        aria-label="Prochaine étape"
      >
        {status === "OPEN" ? (
          <AssignMissionForm missionId={mission.id} campaignId={campaign.id} />
        ) : null}
        {status === "ASSIGNED" ? (
          <>
            <h2 className="font-display text-lg font-semibold text-bone">Livraison</h2>
            <p className="mt-1 text-sm text-sand">
              Quand {mission.assignee ?? "le talent"} a livré le matériel attendu, marquez la
              mission livrée — l&apos;opérateur validera ensuite la livraison.
            </p>
            <GateForm
              action={deliverMissionAction}
              hidden={{ missionId: mission.id, campaignId: campaign.id }}
              label="Marquer livrée"
              pendingLabel="Enregistrement…"
              variant="primary"
              size="md"
              className="mt-4"
            />
          </>
        ) : null}
        {status === "DELIVERED" ? (
          <>
            <h2 className="font-display text-lg font-semibold text-bone">
              Valider la livraison
            </h2>
            <p className="mt-1 text-sm text-sand">
              Dernière gate du circuit : la validation acte que le livrable est conforme au
              brief. (Le paiement mobile money du talent arrive avec la guilde, WP-011.)
            </p>
            <GateForm
              action={validateMissionAction}
              hidden={{ missionId: mission.id, campaignId: campaign.id }}
              label="Valider la livraison"
              pendingLabel="Validation…"
              variant="primary"
              size="md"
              className="mt-4"
            />
          </>
        ) : null}
        {status === "VALIDATED" ? (
          <p className="flex items-center gap-2 text-sm text-sand">
            <Check className="size-4 text-gold" aria-hidden />
            Mission validée le{" "}
            {mission.validatedAt ? DATE_FORMAT.format(mission.validatedAt) : "—"} — circuit
            terminé.
          </p>
        ) : null}
      </section>
    </div>
  );
}
