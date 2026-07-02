import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, ClipboardList, HandCoins, Megaphone, Send, Smartphone } from "lucide-react";
import { readSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DATE_FORMAT } from "@/components/campaigns/status";
import { ApplicationStatusBadge, AvailabilityBadge, formatDailyRate } from "@/components/guild/status";
import { formatMoney, formatRate, PayoutStatusBadge } from "@/components/payouts/status";
import { MISSION_STATUS_LABELS } from "@/domain/campaign";
import { VISIBILITY_LABELS } from "@/domain/guild";
import {
  getTalentProfile,
  listMyApplications,
  listMyAppliedMissionIds,
  listWallMissions,
} from "@/server/guild";
import { listMarkets } from "@/server/campaigns";
import { listMyPayouts } from "@/server/payouts";
import { ApplyToMissionForm } from "./apply-form";
import { TalentProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Studio créateur" };

/**
 * Studio créateur (/studio) — la Guilde RÉELLE (WP-011, essence d'ADR-0098
 * legacy) : le talent tient son profil (compétences, pays du référentiel,
 * tarif indicatif, portfolio), lit le mur des missions ouvertes à la Guilde
 * (cross-workspace, projeté SANS donnée de marque) et candidate d'un pitch.
 * La marque décide depuis son cockpit ; l'acceptation assigne la mission et
 * ouvre la mise en relation WhatsApp. Zéro donnée inventée : mur vide =
 * EmptyState, profil absent = onboarding.
 *
 * Garde : route hors matcher middleware — session vérifiée ici.
 */

/** La méthode, en clair — le circuit réel d'une mission de la Guilde. */
const HOW_IT_WORKS = [
  {
    icon: Megaphone,
    title: "Les marques publient des missions",
    description:
      "Chaque mission naît d'une campagne réelle d'une marque propulsée par La Fusée : un brief validé, éclaté en missions, publiées sur le mur par l'opérateur.",
  },
  {
    icon: Send,
    title: "Vous candidatez",
    description:
      "Le mur est ici, dans le Studio : choisissez les missions qui correspondent à votre pratique et déposez votre pitch. Une candidature par mission, lue avec votre profil.",
  },
  {
    icon: Smartphone,
    title: "Acceptation, production, mobile money",
    description:
      "La marque accepte une candidature : la mission vous est assignée et la mise en relation passe par WhatsApp. Livraison validée par l'opérateur, règlement en FCFA (Wave, Orange Money, MTN MoMo, Moov).",
  },
] as const;

export default async function StudioPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/studio");

  const [profile, countries, wall, appliedIds] = await Promise.all([
    getTalentProfile(session.userId),
    listMarkets(),
    listWallMissions(),
    listMyAppliedMissionIds(session.userId),
  ]);
  const [myApplications, myPayouts] = profile
    ? await Promise.all([listMyApplications(session.userId), listMyPayouts(session.userId)])
    : [[], []];

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="eyebrow text-coral">Studio créateur</p>
        <h1 className="font-display text-3xl font-semibold">La Guilde des créateurs</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-sand">
          La Guilde réunit les talents qui exécutent les missions des marques propulsées par
          La Fusée — designers, photographes, vidéastes, plumes, community managers. Des
          briefs cadrés, des marques qui savent où elles vont, un paiement mobile money sans
          friction.
        </p>
      </header>

      {/* ── Profil talent : onboarding ou édition (données réelles du compte) ── */}
      <section className="space-y-4" aria-label="Votre profil talent">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-semibold">Votre profil talent</h2>
          {profile ? (
            <span className="flex items-center gap-2">
              <AvailabilityBadge availability={profile.availability} />
              <Badge variant={profile.visibility === "VISIBLE" ? "inverse" : "outline"}>
                {VISIBILITY_LABELS[profile.visibility]}
              </Badge>
            </span>
          ) : null}
        </div>
        {profile ? (
          <p className="text-sm text-sand">
            <span className="font-semibold text-sand-2">{profile.headline}</span> —{" "}
            {profile.city}, {profile.country.name}
            {profile.dailyRate !== null
              ? ` · ${formatDailyRate(profile.dailyRate, profile.country.currency)}`
              : ""}{" "}
            · mis à jour le {DATE_FORMAT.format(profile.updatedAt)}. C&apos;est ce profil que la
            marque lit avec chacune de vos candidatures.
          </p>
        ) : (
          <p className="max-w-2xl text-sm text-sand">
            Aucun profil pour l&apos;instant. Créez-le pour candidater aux missions : c&apos;est
            lui que la marque lit avec votre pitch — accroche, compétences, ville et pays,
            tarif indicatif, portfolio.
          </p>
        )}
        <TalentProfileForm
          profile={
            profile
              ? {
                  headline: profile.headline,
                  skills: profile.skills,
                  city: profile.city,
                  countryCode: profile.countryCode,
                  whatsapp: profile.whatsapp,
                  portfolioUrl: profile.portfolioUrl,
                  dailyRate: profile.dailyRate,
                  availability: profile.availability,
                  visibility: profile.visibility,
                }
              : null
          }
          countries={countries.map((c) => ({ code: c.code, name: c.name, currency: c.currency }))}
        />
      </section>

      {/* ── Le mur des missions (cross-workspace, sans donnée de marque) ── */}
      <section className="space-y-4" aria-label="Le mur des missions">
        <div>
          <h2 className="font-display text-xl font-semibold">
            Le mur des missions
            {wall.length > 0 ? (
              <span className="ml-2 text-sm font-normal text-smoke-2">({wall.length})</span>
            ) : null}
          </h2>
          <p className="text-sm text-sand">
            Les missions ouvertes à la Guilde par les marques. Le nom de la marque et sa
            campagne restent confidentiels jusqu&apos;à la mise en relation.
          </p>
        </div>
        {wall.length === 0 ? (
          <EmptyState
            icon={<Megaphone />}
            title="Aucune mission ouverte en ce moment"
            description="Les marques publient leurs missions ici quand leurs briefs sont validés. Rien d'inventé, rien de décoratif : le mur affiche uniquement des missions réelles. Complétez votre profil pour être prêt."
          />
        ) : (
          <ul className="space-y-2.5">
            {wall.map((mission) => {
              const applied = appliedIds.has(mission.id);
              return (
                <li key={mission.id} className="rounded-lg border border-line bg-ink-2 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-display text-base font-semibold text-bone">
                        {mission.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-smoke-2">
                        {mission.kindLabel} · marché {mission.market} · publiée le{" "}
                        {DATE_FORMAT.format(mission.createdAt)}
                      </span>
                    </span>
                    {applied ? (
                      <Badge variant="gold">
                        <CheckCircle2 aria-hidden />
                        Candidature envoyée
                      </Badge>
                    ) : null}
                  </div>
                  {applied ? null : profile ? (
                    <ApplyToMissionForm missionId={mission.id} />
                  ) : (
                    <p className="mt-3 text-xs text-smoke-2">
                      Créez votre profil talent ci-dessus pour candidater à cette mission.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Mes candidatures (réelles — rien avant la première) ─────────── */}
      {profile ? (
        <section className="space-y-4" aria-label="Mes candidatures">
          <h2 className="font-display text-xl font-semibold">
            Mes candidatures
            {myApplications.length > 0 ? (
              <span className="ml-2 text-sm font-normal text-smoke-2">
                ({myApplications.length})
              </span>
            ) : null}
          </h2>
          {myApplications.length === 0 ? (
            <EmptyState
              icon={<ClipboardList />}
              title="Aucune candidature envoyée"
              description="Vos candidatures et leurs décisions (envoyée, shortlistée, acceptée, déclinée) s'afficheront ici, avec l'étape de production des missions gagnées."
            />
          ) : (
            <ul className="space-y-2.5">
              {myApplications.map((application) => (
                <li
                  key={application.id}
                  className="rounded-lg border border-line bg-ink-2 px-5 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-display text-base font-semibold text-bone">
                        {application.mission.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-smoke-2">
                        {application.mission.kindLabel} · marché {application.mission.market} ·
                        envoyée le {DATE_FORMAT.format(application.createdAt)}
                        {application.decidedAt
                          ? ` · décidée le ${DATE_FORMAT.format(application.decidedAt)}`
                          : ""}
                      </span>
                    </span>
                    <ApplicationStatusBadge status={application.status} />
                  </div>
                  {application.status === "ACCEPTED" ? (
                    <p className="mt-2 text-sm text-sand">
                      Mission {MISSION_STATUS_LABELS[application.mission.status].toLowerCase()} —
                      la marque vous contacte via le WhatsApp de votre profil pour cadrer la
                      production.
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* ── Mes gains (WP-024 — ordres réels, rien avant la première mission validée) ── */}
      {profile ? (
        <section className="space-y-4" aria-label="Mes gains">
          <div>
            <h2 className="font-display text-xl font-semibold">
              Mes gains
              {myPayouts.length > 0 ? (
                <span className="ml-2 text-sm font-normal text-smoke-2">({myPayouts.length})</span>
              ) : null}
            </h2>
            <p className="text-sm text-sand">
              À chaque mission validée par la marque, votre gain est calculé (brut, commission
              Guilde déduite, net) et entre dans la file de paiement. Règlement manuel en mobile
              money par l&apos;opérateur — sous 72&nbsp;h ouvrées après validation.
            </p>
          </div>
          {myPayouts.length === 0 ? (
            <EmptyState
              icon={<HandCoins />}
              title="Aucun gain pour l'instant"
              description="Vos gains apparaissent ici dès qu'une marque valide une mission que vous avez gagnée via la Guilde : brut, commission, net à recevoir, puis la référence mobile money une fois payé. Rien d'inventé — uniquement des missions réellement validées."
            />
          ) : (
            <ul className="space-y-2.5">
              {myPayouts.map((payout) => (
                <li key={payout.id} className="rounded-lg border border-line bg-ink-2 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-display text-base font-semibold text-bone">
                        {payout.missionTitle}
                      </span>
                      <span className="mt-0.5 block text-xs text-smoke-2">
                        validée le {DATE_FORMAT.format(payout.createdAt)}
                        {payout.paidAt
                          ? ` · payée le ${DATE_FORMAT.format(payout.paidAt)}${payout.reference ? ` — réf. ${payout.reference}` : ""}`
                          : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-display text-base font-semibold text-bone">
                        {formatMoney(payout.amountNet, payout.currency)}
                      </span>
                      <PayoutStatusBadge status={payout.status} />
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-smoke-2">
                    brut {formatMoney(payout.amountGross, payout.currency)} · commission Guilde{" "}
                    {formatRate(payout.commissionRate)} ={" "}
                    {formatMoney(payout.commissionAmount, payout.currency)} · net{" "}
                    {formatMoney(payout.amountNet, payout.currency)}
                    {payout.status === "PENDING" || payout.status === "APPROVED"
                      ? " · paiement manuel sous 72 h ouvrées"
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* ── Comment ça marche (la méthode, pas des chiffres) ────────────── */}
      <section className="space-y-4" aria-label="Comment ça marche">
        <div>
          <h2 className="font-display text-xl font-semibold">Comment ça marche</h2>
          <p className="text-sm text-sand">Le circuit d&apos;une mission, de la marque au créateur.</p>
        </div>
        <div className="grid gap-bento sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, index) => (
            <div key={step.title} className="rounded-lg border border-line bg-ink-2 p-6">
              <p className="font-mono text-xs font-bold text-coral">
                {String(index + 1).padStart(2, "0")}
              </p>
              <div className="mt-3 flex items-center gap-2 text-bone [&_svg]:size-4.5 [&_svg]:text-smoke-2">
                <step.icon aria-hidden />
                <h3 className="font-display text-base font-semibold">{step.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-sand">{step.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
