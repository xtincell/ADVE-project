import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, GitBranch } from "lucide-react";
import { readSession } from "@/lib/session";
import { getBrandForSession, getPillarRevisions, jsonRecord } from "@/server/brand";
import { isAdve, PILLARS, type PillarKey } from "@/domain/pillars";
import { PILLAR_FIELDS, PILLAR_LABELS } from "@/domain/pillar-fields";
import { scorePillarContent } from "@/domain/scoring";
import { renderValue } from "@/domain/oracle";
import { Badge } from "@/components/ui/badge";
import { CertaintyBadge } from "@/components/pillars/certainty-badge";
import { fieldStatus } from "@/components/pillars/certainty";
import { FieldEditor } from "@/components/pillars/field-editor";
import { fieldValueToText } from "@/components/pillars/field-text";
import {
  formatFieldChange,
  lastFieldChange,
  type RevisionSnapshot,
} from "@/components/pillars/field-history";
import { ScoreBar } from "@/components/pillars/score-bar";
import { amendFieldAction } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ key: string }> };

function resolvePillarKey(raw: string): PillarKey | null {
  const upper = raw.toUpperCase();
  return (PILLARS as readonly string[]).includes(upper) ? (upper as PillarKey) : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { key: raw } = await params;
  const key = resolvePillarKey(raw);
  return { title: key ? `Pilier ${key} — ${PILLAR_LABELS[key]}` : "Pilier" };
}

/**
 * Éditeur de pilier : chaque champ de la bible (`PILLAR_FIELDS`) avec sa
 * valeur, son badge de certitude et son édition inline (ADVE uniquement).
 * Les piliers RTIS sont en lecture seule — dérivés, jamais édités à la main.
 */
export default async function PillarPage({ params }: PageProps) {
  const { key: raw } = await params;
  const key = resolvePillarKey(raw);
  if (!key) notFound();

  const session = await readSession();
  if (!session) redirect(`/connexion?next=/app/pilier/${raw}`);

  const brand = await getBrandForSession(session);
  if (!brand) redirect("/app");

  const pillarRow = brand.pillars.find((p) => p.key === key) ?? null;
  const content = jsonRecord(pillarRow?.content);
  const certainty = jsonRecord(pillarRow?.certainty);
  const fields = PILLAR_FIELDS[key];
  const pillarScore = scorePillarContent(content, fields);
  const adve = isAdve(key);

  const revisions: RevisionSnapshot[] = pillarRow
    ? (await getPillarRevisions(pillarRow.id)).map((rev) => ({
        version: rev.version,
        reason: rev.reason,
        createdAt: rev.createdAt,
        content: rev.content,
      }))
    : [];

  const derivationNote = typeof content["note"] === "string" ? (content["note"] as string) : null;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-sand transition-colors hover:text-bone"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Ma marque
        </Link>
      </div>

      <header className="space-y-4">
        <div className="space-y-2">
          <p className="eyebrow text-coral">Pilier {key}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold">{PILLAR_LABELS[key]}</h1>
            {adve ? (
              <Badge variant="coral">Socle</Badge>
            ) : (
              <Badge variant="inverse">Dérivé</Badge>
            )}
          </div>
        </div>
        <div className="max-w-xl space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-sand">
              {pillarScore.filled.length}/{fields.length} champs remplis
            </span>
            <span className="font-mono text-lg font-bold text-bone">
              {pillarScore.score}
              <span className="text-xs font-medium text-smoke-2"> /100</span>
            </span>
          </div>
          <ScoreBar
            value={pillarScore.score}
            max={100}
            size="sm"
            label={`Score du pilier ${PILLAR_LABELS[key]}`}
          />
        </div>
      </header>

      {!adve ? (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-gold/40 bg-gold/8 p-4">
          <GitBranch className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-bone">
              Pilier dérivé du socle — lecture seule.
            </p>
            <p className="text-sand">
              Ce contenu est calculé depuis vos piliers A·D·V·E. Pour le faire évoluer,
              modifiez le socle puis relancez « Dériver RTIS depuis le socle » depuis{" "}
              <Link href="/app" className="underline underline-offset-2 hover:text-bone">
                Ma marque
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}

      {derivationNote && !adve ? (
        <p className="text-sm italic text-smoke-2">Note de dérivation : {derivationNote}</p>
      ) : null}

      <section className="space-y-4" aria-label={`Champs du pilier ${PILLAR_LABELS[key]}`}>
        {fields.map((field) => {
          const value = content[field.id];
          const status = fieldStatus(content, certainty, field.id);
          const change = lastFieldChange(revisions, field.id);
          if (adve) {
            return (
              <FieldEditor
                key={field.id}
                action={amendFieldAction}
                pillarKey={key}
                fieldId={field.id}
                label={field.label}
                description={field.description}
                needsHuman={field.needsHuman}
                kind={field.type}
                defaultText={fieldValueToText(field, value)}
                currentDisplay={renderValue(value, 600)}
                status={status}
                historyLine={change ? formatFieldChange(change) : null}
              />
            );
          }
          // RTIS : même carte, sans édition.
          const rendered = renderValue(value, 600);
          return (
            <div key={field.id} className="rounded-lg border border-line bg-ink-2 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-base font-semibold text-bone">{field.label}</h3>
                <CertaintyBadge status={status} />
              </div>
              <p className="mt-1 text-sm text-smoke-2">{field.description}</p>
              <div className="mt-4">
                {rendered ? (
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-sand-2">
                    {rendered}
                  </p>
                ) : (
                  <p className="text-sm italic text-smoke-2">
                    Non dérivable depuis le socle actuel — donnée terrain requise.
                  </p>
                )}
              </div>
              {change ? (
                <p className="mt-3 border-t border-line-soft pt-2 font-mono text-[11px] text-smoke-2">
                  {formatFieldChange(change)}
                </p>
              ) : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}
