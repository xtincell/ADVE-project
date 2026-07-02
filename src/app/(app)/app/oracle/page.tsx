import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Printer, ScrollText, TriangleAlert } from "lucide-react";
import { readSession } from "@/lib/session";
import { getBrandForSession } from "@/server/brand";
import {
  getLatestDeliverable,
  oracleIsStale,
  ORACLE_KIND,
  parseOracleDocument,
} from "@/server/deliverables";
import { getOracleSection, type OracleSection } from "@/domain/oracle";
import { PILLAR_LABELS } from "@/domain/pillar-fields";
import type { PillarKey } from "@/domain/pillars";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionForm } from "@/components/pillars/action-form";
import { MarkdownView } from "@/components/pillars/markdown-view";
import { composeOracleAction } from "./actions";
import { ShareOracleButton } from "./share-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Oracle" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Piliers à compléter pour débloquer une section insuffisante — croisement
 * des sources manquantes persistées avec les champs REQUIS du registre
 * (`ORACLE_SECTIONS`). Aucune invention : uniquement ce que la section déclare.
 */
function pillarsToComplete(section: OracleSection): PillarKey[] {
  const def = getOracleSection(section.id);
  if (!def) return [];
  const missing = new Set(section.missing);
  const keys: PillarKey[] = [];
  for (const src of def.sources) {
    if (src.required && missing.has(`${src.pillar}.${src.field}`) && !keys.includes(src.pillar)) {
      keys.push(src.pillar);
    }
  }
  return keys;
}

export default async function OraclePage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app/oracle");

  const brand = await getBrandForSession(session);
  if (!brand) redirect("/app");

  const deliverable = await getLatestDeliverable(brand.id, ORACLE_KIND);
  const doc = deliverable ? parseOracleDocument(deliverable.content) : null;

  // ── Jamais composé (ou contenu illisible) : proposer la composition ──
  if (!deliverable || !doc) {
    return (
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="eyebrow text-coral">Livrable</p>
          <h1 className="font-display text-3xl font-semibold">Oracle</h1>
        </header>
        <EmptyState
          icon={<ScrollText />}
          title="L'Oracle n'est pas encore composé"
          description="Le document stratégique de votre marque se compose de manière déterministe depuis vos piliers — les sections dont les données manquent le diront honnêtement, rien ne sera inventé."
        >
          <ActionForm
            action={composeOracleAction}
            label="Composer l'Oracle"
            pendingLabel="Composition…"
          />
        </EmptyState>
      </div>
    );
  }

  const stale = oracleIsStale(deliverable.composedAt, brand.pillars);
  const insufficient = doc.sections.filter((s) => s.status === "insuffisant");

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="eyebrow text-coral">Livrable</p>
            <h1 className="font-display text-3xl font-semibold">Oracle — {doc.brand.name}</h1>
            <p className="text-sm text-sand">
              Score {doc.score.total}/{doc.score.max} · Palier {doc.score.levelLabel} ·{" "}
              {doc.sections.length} sections
              {insufficient.length > 0
                ? ` (${insufficient.length} insuffisante${insufficient.length > 1 ? "s" : ""})`
                : ""}
              {deliverable.composedAt
                ? ` · composé le ${DATE_FORMAT.format(deliverable.composedAt)}`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/app/oracle/print"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Printer aria-hidden />
              Version imprimable
            </Link>
            <ShareOracleButton />
            <ActionForm
              action={composeOracleAction}
              label="Recomposer l'Oracle"
              pendingLabel="Composition…"
              size="sm"
            />
          </div>
        </div>

        {stale ? (
          <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold text-bone">
                Document en retard sur vos piliers (STALE).
              </p>
              <p className="text-sand">
                Des piliers ont été modifiés après la dernière composition — recomposez
                l&apos;Oracle pour qu&apos;il reflète l&apos;état réel de la marque.
              </p>
            </div>
          </div>
        ) : null}
      </header>

      {/* ── Sommaire ─────────────────────────────────────────────────── */}
      <nav
        className="rounded-lg border border-line bg-ink-2 p-5"
        aria-label="Sommaire de l'Oracle"
      >
        <h2 className="eyebrow mb-3 text-sand">Sommaire</h2>
        <ol className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
          {doc.sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#section-${section.id}`}
                className="group flex items-baseline gap-2 py-0.5 text-sm text-sand transition-colors hover:text-bone"
              >
                <span className="font-mono text-xs text-smoke-2">{section.number}</span>
                <span className="underline-offset-2 group-hover:underline">{section.titre}</span>
                {section.status === "insuffisant" ? (
                  <span
                    className="ml-auto size-1.5 shrink-0 self-center rounded-full bg-warning"
                    title="Section insuffisante — données manquantes"
                  />
                ) : null}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── Sections ─────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {doc.sections.map((section) => {
          if (section.status === "insuffisant") {
            const pillars = pillarsToComplete(section);
            return (
              <section
                key={section.id}
                id={`section-${section.id}`}
                className="scroll-mt-6 rounded-lg border border-warning/40 bg-warning/8 p-6"
              >
                <MarkdownView markdown={section.markdown} tone="dark" />
                {pillars.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-warning/20 pt-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-warning">
                      À compléter
                    </span>
                    {pillars.map((key) => (
                      <Link
                        key={key}
                        href={`/app/pilier/${key.toLowerCase()}`}
                        className="text-sm text-sand underline underline-offset-2 transition-colors hover:text-bone"
                      >
                        Pilier {PILLAR_LABELS[key]} →
                      </Link>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          }
          return (
            <section
              key={section.id}
              id={`section-${section.id}`}
              className="scroll-mt-6 rounded-lg border border-line bg-ink-2 p-6"
            >
              <MarkdownView markdown={section.markdown} tone="dark" />
              {section.sources.length > 0 ? (
                <p className="mt-4 border-t border-line-soft pt-3 font-mono text-[11px] text-smoke-2">
                  Sources : {section.sources.join(" · ")}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
