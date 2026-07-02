import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { GateForm } from "@/components/campaigns/gate-form";
import {
  ActionStatusBadge,
  BriefStatusBadge,
  DATE_FORMAT,
  formatAmount,
  MissionStatusBadge,
  ToEstimateBadge,
} from "@/components/campaigns/status";
import { canBriefAction } from "@/domain/campaign";
import { ACTION_KIND_LABELS, actionKindSchema, getActionDetail } from "@/server/campaigns";
import { requireSessionAndBrand } from "../../../session-brand";
import { transformActionAction } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Action" };

type PageProps = { params: Promise<{ id: string; actionId: string }> };

/**
 * Détail d'une action (frame de production) : coût estimé AVEC sa
 * traçabilité (lignes du référentiel consommées), gate « transformer en
 * brief », briefs existants et leurs missions.
 */
export default async function ActionDetailPage({ params }: PageProps) {
  const { id, actionId } = await params;
  const { brand } = await requireSessionAndBrand(`/campagnes/${id}/action/${actionId}`);
  if (!brand) notFound();

  const action = await getActionDetail(brand.id, actionId);
  if (!action || action.campaignId !== id) notFound();

  const campaign = action.campaign;
  const parsedKind = actionKindSchema.safeParse(action.kind);
  const kindLabel = parsedKind.success ? ACTION_KIND_LABELS[parsedKind.data] : action.kind;
  const gate = canBriefAction(campaign.status, action.status);

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
          <p className="eyebrow text-coral">Action de production</p>
          <ActionStatusBadge status={action.status} />
        </div>
        <h1 className="font-display text-3xl font-semibold">{action.name}</h1>
        <p className="text-sm text-sand">{kindLabel}</p>
        <p className="font-mono text-[11px] text-smoke-2">
          campagne « {campaign.name} » · marché {campaign.country.name} · ajoutée le{" "}
          {DATE_FORMAT.format(action.createdAt)}
        </p>
      </header>

      {/* ── Coût estimé + traçabilité ────────────────────────────────── */}
      <section
        className="rounded-lg border border-line bg-ink-2 p-6"
        aria-label="Coût estimé"
      >
        <h2 className="font-display text-lg font-semibold text-bone">Coût estimé</h2>
        {action.estimatedCost !== null ? (
          <>
            <p className="mt-2 font-display text-3xl font-semibold text-bone">
              ≈ {formatAmount(action.estimatedCost, action.costCurrency)}
            </p>
            <p className="mt-1 text-xs text-sand">
              Estimation indicative HT (hors marge et taxes) — résolue à la création de
              l&apos;action.
            </p>
            {action.costSource ? (
              <p className="mt-3 border-t border-line-soft pt-3 font-mono text-[11px] leading-relaxed text-smoke-2">
                source : {action.costSource}
              </p>
            ) : null}
          </>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ToEstimateBadge />
            <p className="text-sm text-sand">
              Aucune ligne du référentiel marché ne couvre cette action — le coût est à estimer
              par l&apos;opérateur, il ne sera jamais inventé.
            </p>
          </div>
        )}
      </section>

      {/* ── Gate : transformer en brief ──────────────────────────────── */}
      {action.status === "PLANNED" ? (
        <section className="rounded-lg border border-line bg-ink-2 p-6" aria-label="Gate brief">
          <h2 className="font-display text-lg font-semibold text-bone">Brief de production</h2>
          <p className="mt-1 text-sm text-sand">
            La gate suivante du pipeline : transformer ce frame en brief structuré (pré-rempli
            depuis le cadre déclaré de la campagne), à compléter puis valider avant l&apos;éclatement
            en missions.
          </p>
          <GateForm
            action={transformActionAction}
            hidden={{ actionId: action.id, campaignId: campaign.id }}
            label="Transformer en brief"
            pendingLabel="Création du brief…"
            variant="primary"
            size="md"
            disabled={!gate.ok}
            hint={gate.ok ? undefined : gate.reason}
            className="mt-4"
          />
        </section>
      ) : null}

      {/* ── Briefs de l'action ───────────────────────────────────────── */}
      <section className="space-y-4" aria-label="Briefs">
        <h2 className="font-display text-xl font-semibold">Briefs</h2>
        {action.briefs.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="Aucun brief"
            description="Le brief de production naît de la gate « Transformer en brief » — une fois la production de la campagne lancée."
          />
        ) : (
          <div className="space-y-3">
            {action.briefs.map((brief) => (
              <div key={brief.id} className="rounded-lg border border-line bg-ink-2 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={`/campagnes/${campaign.id}/brief/${brief.id}`}
                    className="font-display text-base font-semibold text-bone hover:text-coral"
                  >
                    {brief.title}
                  </Link>
                  <BriefStatusBadge status={brief.status} />
                </div>
                {brief.missions.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 border-t border-line-soft pt-3">
                    {brief.missions.map((mission) => (
                      <li key={mission.id} className="flex items-center gap-2.5 text-sm">
                        <Link
                          href={`/campagnes/${campaign.id}/mission/${mission.id}`}
                          className="text-sand hover:text-bone"
                        >
                          {mission.title}
                        </Link>
                        <MissionStatusBadge status={mission.status} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-smoke-2">
                    Aucune mission — validez le brief puis éclatez-le en missions.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
