import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { GateForm } from "@/components/campaigns/gate-form";
import {
  BriefStatusBadge,
  DATE_FORMAT,
  MissionStatusBadge,
} from "@/components/campaigns/status";
import { BRIEF_FIELDS, canValidateBrief } from "@/domain/campaign";
import { briefContentRecord, getBriefDetail } from "@/server/campaigns";
import { requireSessionAndBrand } from "../../../session-brand";
import { validateBriefAction } from "./actions";
import { BriefEditor } from "./brief-editor";
import { SplitMissionsForm } from "./split-missions-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Brief" };

type PageProps = { params: Promise<{ id: string; briefId: string }> };

/**
 * Brief de production : contenu structuré éditable en brouillon, gate de
 * validation explicite (objectif + livrable requis), puis éclatement en
 * missions — le contenu validé est figé (ADR-0120 : les missions naissent
 * d'une direction validée).
 */
export default async function BriefDetailPage({ params }: PageProps) {
  const { id, briefId } = await params;
  const { brand } = await requireSessionAndBrand(`/campagnes/${id}/brief/${briefId}`);
  if (!brand) notFound();

  const brief = await getBriefDetail(brand.id, briefId);
  if (!brief || brief.action.campaignId !== id) notFound();

  const campaign = brief.action.campaign;
  const content = briefContentRecord(brief.content);
  const validateGate = canValidateBrief(brief.status, content);
  const fieldValue = (fieldId: string): string => {
    const value = content[fieldId];
    return typeof value === "string" ? value : "";
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
          <p className="eyebrow text-coral">Brief de production</p>
          <BriefStatusBadge status={brief.status} />
        </div>
        <h1 className="font-display text-3xl font-semibold">{brief.title}</h1>
        <p className="font-mono text-[11px] text-smoke-2">
          action «{" "}
          <Link
            href={`/campagnes/${campaign.id}/action/${brief.actionId}`}
            className="underline hover:text-sand"
          >
            {brief.action.name}
          </Link>{" "}
          » · v{brief.version} · créé le {DATE_FORMAT.format(brief.createdAt)}
          {brief.validatedAt ? ` · validé le ${DATE_FORMAT.format(brief.validatedAt)}` : ""}
        </p>
      </header>

      {brief.status === "DRAFT" ? (
        <>
          {/* ── Édition (brouillon) ──────────────────────────────────── */}
          <section className="rounded-lg border border-line bg-ink-2 p-6" aria-label="Contenu du brief">
            <h2 className="font-display text-lg font-semibold text-bone">Contenu structuré</h2>
            <p className="mt-1 text-sm text-sand">
              Pré-rempli depuis le cadre déclaré de la campagne — complétez puis validez. Un
              brouillon se sauvegarde incomplet ; il ne se valide pas incomplet.
            </p>
            <div className="mt-5">
              <BriefEditor
                briefId={brief.id}
                campaignId={campaign.id}
                fields={BRIEF_FIELDS.map((field) => ({
                  id: field.id,
                  label: field.label,
                  required: field.required,
                  hint: field.hint,
                  value: fieldValue(field.id),
                }))}
              />
            </div>
          </section>

          {/* ── Gate : valider ───────────────────────────────────────── */}
          <section className="rounded-lg border border-line bg-ink-2 p-6" aria-label="Gate de validation">
            <h2 className="font-display text-lg font-semibold text-bone">Valider le brief</h2>
            <p className="mt-1 text-sm text-sand">
              La validation fige le contenu et ouvre l&apos;éclatement en missions.
            </p>
            <GateForm
              action={validateBriefAction}
              hidden={{ briefId: brief.id, campaignId: campaign.id }}
              label="Valider le brief"
              pendingLabel="Validation…"
              variant="primary"
              size="md"
              disabled={!validateGate.ok}
              hint={validateGate.ok ? undefined : validateGate.reason}
              className="mt-4"
            />
          </section>
        </>
      ) : (
        <>
          {/* ── Lecture (validé, figé) ───────────────────────────────── */}
          <section className="rounded-lg border border-line bg-ink-2 p-6" aria-label="Contenu du brief">
            <h2 className="font-display text-lg font-semibold text-bone">Contenu validé</h2>
            <dl className="mt-4 space-y-4">
              {BRIEF_FIELDS.map((field) => {
                const value = fieldValue(field.id);
                return (
                  <div key={field.id} className="border-t border-line-soft pt-3 first:border-t-0 first:pt-0">
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-smoke-2">
                      {field.label}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-sand-2">
                      {value || <span className="italic text-smoke-2">—</span>}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>

          {/* ── Missions du brief ────────────────────────────────────── */}
          <section className="space-y-4" aria-label="Missions">
            <h2 className="font-display text-xl font-semibold">Missions</h2>
            {brief.missions.length === 0 ? (
              <EmptyState
                icon={<ClipboardList />}
                title="Aucune mission"
                description="Éclatez ce brief validé en missions — chacune suivra le circuit ouverte → assignée → livrée → validée."
              />
            ) : (
              <div className="space-y-2.5">
                {brief.missions.map((mission) => (
                  <Link
                    key={mission.id}
                    href={`/campagnes/${campaign.id}/mission/${mission.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-ink-2 px-5 py-4 transition-colors hover:border-coral/50"
                  >
                    <span className="min-w-0 truncate font-display text-base font-semibold text-bone">
                      {mission.title}
                    </span>
                    <span className="flex items-center gap-3">
                      {mission.assignee ? (
                        <span className="text-sm text-sand">{mission.assignee}</span>
                      ) : null}
                      <MissionStatusBadge status={mission.status} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <div className="rounded-lg border border-line bg-ink-2 p-6">
              <SplitMissionsForm briefId={brief.id} campaignId={campaign.id} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
