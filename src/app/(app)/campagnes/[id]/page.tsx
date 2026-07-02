import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { GateForm } from "@/components/campaigns/gate-form";
import {
  ActionStatusBadge,
  CampaignStatusBadge,
  DATE_FORMAT,
  formatAmount,
  ToEstimateBadge,
} from "@/components/campaigns/status";
import { canBriefAction, canLaunchCampaign } from "@/domain/campaign";
import {
  ACTION_KIND_KEYS,
  ACTION_KIND_LABELS,
  actionKindSchema,
  costSummary,
  getCampaignDetail,
} from "@/server/campaigns";
import { requireSessionAndBrand } from "../session-brand";
import { AddActionForm } from "./add-action-form";
import { archiveCampaignAction, launchCampaignAction, transformActionAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campagne" };

type PageProps = { params: Promise<{ id: string }> };

/** Libellé de type d'action tolérant aux données legacy/inconnues. */
function kindLabel(kind: string): string {
  const parsed = actionKindSchema.safeParse(kind);
  return parsed.success ? ACTION_KIND_LABELS[parsed.data] : kind;
}

/**
 * Détail d'une campagne : le cadre (objectif, marché), les gates (lancer la
 * production, archiver) et les actions de production — chacune chiffrée
 * depuis le référentiel marché ou honnêtement « à estimer ».
 */
export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { brand } = await requireSessionAndBrand(`/campagnes/${id}`);
  if (!brand) notFound();

  const campaign = await getCampaignDetail(brand.id, id);
  if (!campaign) notFound();

  const activeActions = campaign.actions.filter((a) => a.status !== "CANCELLED");
  const briefs = campaign.actions.flatMap((a) => a.briefs);
  const missions = briefs.flatMap((b) => b.missions);
  const costs = costSummary(campaign.actions);
  const launchGate = canLaunchCampaign(campaign.status, activeActions.length);

  const stats = [
    { label: "Actions", value: String(activeActions.length) },
    {
      label: "Briefs",
      value: `${briefs.length}`,
      sub: briefs.length
        ? `dont ${briefs.filter((b) => b.status === "VALIDATED").length} validé(s)`
        : null,
    },
    {
      label: "Missions",
      value: `${missions.length}`,
      sub: missions.length
        ? `dont ${missions.filter((m) => m.status === "VALIDATED").length} validée(s)`
        : null,
    },
    {
      label: "Budget estimé",
      value: costs.total > 0 ? formatAmount(costs.total, costs.currency) : "—",
      sub: costs.unestimated > 0 ? `${costs.unestimated} action(s) à estimer` : null,
    },
  ];

  return (
    <div className="space-y-8">
      <Link
        href="/campagnes"
        className="inline-flex items-center gap-1.5 text-sm text-sand hover:text-bone"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Campagnes
      </Link>

      {/* ── Le cadre ─────────────────────────────────────────────────── */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="eyebrow text-coral">Campagne</p>
          <CampaignStatusBadge status={campaign.status} />
        </div>
        <h1 className="font-display text-3xl font-semibold">{campaign.name}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-sand">{campaign.objective}</p>
        <p className="font-mono text-[11px] text-smoke-2">
          marché {campaign.country.name} ({campaign.countryCode}) · créée le{" "}
          {DATE_FORMAT.format(campaign.createdAt)}
          {campaign.launchedAt
            ? ` · production lancée le ${DATE_FORMAT.format(campaign.launchedAt)}`
            : ""}
        </p>
        <div className="flex flex-wrap items-start gap-3 pt-1">
          {campaign.status === "DRAFT" ? (
            <GateForm
              action={launchCampaignAction}
              hidden={{ campaignId: campaign.id }}
              label="Lancer la production"
              pendingLabel="Lancement…"
              variant="primary"
              size="md"
              disabled={!launchGate.ok}
              hint={launchGate.ok ? "Gate : les briefs de production s'ouvrent après le lancement." : launchGate.reason}
            />
          ) : null}
          {campaign.status !== "ARCHIVED" ? (
            <GateForm
              action={archiveCampaignAction}
              hidden={{ campaignId: campaign.id }}
              label="Archiver"
              pendingLabel="Archivage…"
              variant="ghost"
              size="md"
              className="text-sand"
            />
          ) : null}
        </div>
      </header>

      {/* ── Pipeline en chiffres (bento) ─────────────────────────────── */}
      <section aria-label="Pipeline" className="grid gap-bento sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-line bg-ink-2 p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-smoke-2">
              {stat.label}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-bone">{stat.value}</p>
            {stat.sub ? <p className="mt-0.5 text-xs text-sand">{stat.sub}</p> : null}
          </div>
        ))}
      </section>

      {/* ── Ajouter une action ───────────────────────────────────────── */}
      <AddActionForm
        campaignId={campaign.id}
        marketName={campaign.country.name}
        kinds={ACTION_KIND_KEYS.map((key) => ({ key, label: ACTION_KIND_LABELS[key] }))}
        disabled={campaign.status === "ARCHIVED"}
        disabledHint="Campagne archivée — elle n'accepte plus de nouvelles actions."
      />

      {/* ── Actions de production ────────────────────────────────────── */}
      <section className="space-y-4" aria-label="Actions de production">
        <h2 className="font-display text-xl font-semibold">Actions de production</h2>
        {campaign.actions.length === 0 ? (
          <EmptyState
            icon={<ListChecks />}
            title="Aucune action"
            description="Ajoutez les actions de production de cette campagne — chaque action sera chiffrée depuis le référentiel marché, puis transformée en brief une fois la production lancée."
          />
        ) : (
          <div className="space-y-3">
            {campaign.actions.map((action) => {
              const gate = canBriefAction(campaign.status, action.status);
              return (
                <div
                  key={action.id}
                  className="rounded-lg border border-line bg-ink-2 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                          href={`/campagnes/${campaign.id}/action/${action.id}`}
                          className="font-display text-base font-semibold text-bone hover:text-coral"
                        >
                          {action.name}
                        </Link>
                        <ActionStatusBadge status={action.status} />
                      </div>
                      <p className="mt-1 text-xs text-smoke-2">{kindLabel(action.kind)}</p>
                    </div>
                    <div className="text-right">
                      {action.estimatedCost !== null ? (
                        <p className="font-mono text-sm text-sand-2">
                          ≈ {formatAmount(action.estimatedCost, action.costCurrency)}
                        </p>
                      ) : (
                        <ToEstimateBadge />
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">
                    {action.status === "PLANNED" ? (
                      <GateForm
                        action={transformActionAction}
                        hidden={{ actionId: action.id, campaignId: campaign.id }}
                        label="Transformer en brief"
                        pendingLabel="Création du brief…"
                        variant="outline"
                        disabled={!gate.ok}
                        hint={gate.ok ? undefined : gate.reason}
                        className="text-sand"
                      />
                    ) : null}
                    {action.briefs.map((brief) => (
                      <Link
                        key={brief.id}
                        href={`/campagnes/${campaign.id}/brief/${brief.id}`}
                        className="text-sm text-coral hover:underline"
                      >
                        {brief.title}
                        {brief.missions.length > 0
                          ? ` · ${brief.missions.length} mission(s)`
                          : ""}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
