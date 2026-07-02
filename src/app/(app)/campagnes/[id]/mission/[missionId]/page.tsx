import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, MessageCircle, Users } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/ui/badge";
import { GateForm } from "@/components/campaigns/gate-form";
import { DATE_FORMAT, MissionStatusBadge } from "@/components/campaigns/status";
import {
  ApplicationStatusBadge,
  AvailabilityBadge,
  formatDailyRate,
} from "@/components/guild/status";
import {
  MISSION_STATUS_LABELS,
  MISSION_STATUSES,
  type MissionStatus,
} from "@/domain/campaign";
import { getMissionDetail } from "@/server/campaigns";
import { listMissionApplications } from "@/server/guild";
import { requireSessionAndBrand } from "../../../session-brand";
import { AssignMissionForm } from "./assign-form";
import {
  acceptApplicationAction,
  declineApplicationAction,
  deliverMissionAction,
  shortlistApplicationAction,
  toggleGuildAction,
  validateMissionAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mission" };

type PageProps = { params: Promise<{ id: string; missionId: string }> };

/**
 * Détail d'une mission : chaîne de provenance (campagne → action → brief),
 * timeline du circuit OPEN → ASSIGNED → DELIVERED → VALIDATED, la Guilde
 * (publier sur le mur, candidatures, accepter = assigner — WP-011) et la
 * gate de l'étape courante (assigner / marquer livrée / valider).
 */
export default async function MissionDetailPage({ params }: PageProps) {
  const { id, missionId } = await params;
  const { brand } = await requireSessionAndBrand(`/campagnes/${id}/mission/${missionId}`);
  if (!brand) notFound();

  const mission = await getMissionDetail(brand.id, missionId);
  if (!mission || mission.brief.action.campaignId !== id) notFound();

  const applications = await listMissionApplications(brand.id, mission.id);
  const acceptedApplication = applications.find((a) => a.status === "ACCEPTED");

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

      {/* ── La Guilde : publication sur le mur + candidatures (WP-011) ── */}
      {status === "OPEN" || applications.length > 0 ? (
        <section
          className="rounded-lg border border-line bg-ink-2 p-6"
          aria-label="La Guilde"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-bone [&_svg]:size-4.5 [&_svg]:text-smoke-2">
              <Users aria-hidden />
              La Guilde
            </h2>
            {mission.openToGuild && status === "OPEN" ? (
              <Badge variant="gold">Sur le mur</Badge>
            ) : null}
            {applications.length > 0 ? (
              <span className="text-sm text-smoke-2">
                {applications.length} candidature{applications.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          {status === "OPEN" ? (
            mission.openToGuild ? (
              <>
                <p className="mt-1 text-sm text-sand">
                  Cette mission est publiée sur le mur des missions : les talents de la
                  Guilde voient son titre, son type d&apos;action et son marché — jamais votre
                  marque ni la campagne — et candidatent avec un pitch.
                </p>
                <GateForm
                  action={toggleGuildAction}
                  hidden={{ missionId: mission.id, campaignId: campaign.id, open: "false" }}
                  label="Retirer du mur"
                  pendingLabel="Retrait…"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  hint="Retirer la mission du mur n'efface pas les candidatures déjà reçues."
                />
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-sand">
                  Publiez cette mission sur le mur de la Guilde pour recevoir des
                  candidatures de talents. Seuls le titre, le type d&apos;action et le marché
                  sont montrés — jamais votre marque ni la campagne.
                </p>
                <GateForm
                  action={toggleGuildAction}
                  hidden={{ missionId: mission.id, campaignId: campaign.id, open: "true" }}
                  label="Publier sur le mur de la Guilde"
                  pendingLabel="Publication…"
                  variant="primary"
                  size="sm"
                  className="mt-3"
                />
              </>
            )
          ) : null}

          {acceptedApplication?.talent.whatsapp ? (
            <p className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-gold/30 bg-gold/8 px-4 py-3 text-sm text-sand">
              <MessageCircle className="size-4 text-gold" aria-hidden />
              Mise en relation : contactez {acceptedApplication.talent.name} sur{" "}
              <a
                href={`https://wa.me/${acceptedApplication.talent.whatsapp.replace(/^\+/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-bone underline hover:text-gold"
              >
                WhatsApp ({acceptedApplication.talent.whatsapp})
              </a>
            </p>
          ) : null}

          {applications.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {applications.map((application) => {
                const decidable =
                  status === "OPEN" &&
                  (application.status === "APPLIED" || application.status === "SHORTLISTED");
                return (
                  <li
                    key={application.id}
                    className="rounded-md border border-line-soft bg-ink-3/40 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-display text-base font-semibold text-bone">
                        {application.talent.name}
                      </span>
                      <AvailabilityBadge availability={application.talent.availability} />
                      <span className="ml-auto">
                        <ApplicationStatusBadge status={application.status} />
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-sand">
                      {application.talent.headline} — {application.talent.city} (
                      {application.talent.countryCode})
                      {application.talent.dailyRate !== null
                        ? ` · ${formatDailyRate(application.talent.dailyRate, application.talent.currency)} (indicatif)`
                        : ""}
                    </p>
                    {application.talent.skills.length > 0 ? (
                      <p className="mt-2 flex flex-wrap gap-1.5">
                        {application.talent.skills.map((skill) => (
                          <Badge key={skill} variant="inverse">
                            {skill}
                          </Badge>
                        ))}
                      </p>
                    ) : null}
                    <blockquote className="mt-3 border-l-2 border-coral/40 pl-3 text-sm leading-relaxed text-sand">
                      {application.pitch}
                    </blockquote>
                    <p className="mt-2 font-mono text-[11px] text-smoke-2">
                      candidature du {DATE_FORMAT.format(application.createdAt)}
                      {application.decidedAt
                        ? ` · décidée le ${DATE_FORMAT.format(application.decidedAt)}`
                        : ""}
                      {application.talent.portfolioUrl ? (
                        <>
                          {" · "}
                          <a
                            href={application.talent.portfolioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 underline hover:text-sand"
                          >
                            portfolio
                            <ExternalLink className="size-3" aria-hidden />
                          </a>
                        </>
                      ) : null}
                    </p>
                    {decidable ? (
                      <div className="mt-3 flex flex-wrap items-start gap-2.5">
                        <GateForm
                          action={acceptApplicationAction}
                          hidden={{
                            missionId: mission.id,
                            campaignId: campaign.id,
                            applicationId: application.id,
                          }}
                          label="Accepter — assigner la mission"
                          pendingLabel="Acceptation…"
                          variant="primary"
                          size="sm"
                        />
                        {application.status === "APPLIED" ? (
                          <GateForm
                            action={shortlistApplicationAction}
                            hidden={{
                              missionId: mission.id,
                              campaignId: campaign.id,
                              applicationId: application.id,
                            }}
                            label="Shortlister"
                            pendingLabel="Shortlist…"
                            variant="outline"
                            size="sm"
                          />
                        ) : null}
                        <GateForm
                          action={declineApplicationAction}
                          hidden={{
                            missionId: mission.id,
                            campaignId: campaign.id,
                            applicationId: application.id,
                          }}
                          label="Décliner"
                          pendingLabel="Refus…"
                          variant="ghost"
                          size="sm"
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : status === "OPEN" && mission.openToGuild ? (
            <p className="mt-4 text-sm text-smoke-2">
              Aucune candidature pour l&apos;instant — la mission est visible des talents de la
              Guilde. Accepter une candidature assignera la mission à son talent.
            </p>
          ) : null}
        </section>
      ) : null}

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
