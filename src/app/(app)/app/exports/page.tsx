import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FolderOutput, Printer, TriangleAlert } from "lucide-react";
import { readSession } from "@/lib/session";
import { getBrandDeliverables, getBrandForSession } from "@/server/brand";
import { DELIVERABLE_KINDS, ORACLE_KIND, oracleIsStale } from "@/server/deliverables";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Exports" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Libellés FR des statuts persistés (enum DeliverableStatus). */
const STATUS_UI: Record<string, { label: string; variant: "coral" | "gold" | "neutral" | "outline" | "inverse" }> = {
  DRAFT: { label: "Brouillon", variant: "inverse" },
  GENERATING: { label: "En cours", variant: "inverse" },
  READY: { label: "Prêt", variant: "gold" },
  STALE: { label: "En retard", variant: "coral" },
  ARCHIVED: { label: "Archivé", variant: "outline" },
};

/** Libellé d'un kind depuis le registre en code — la valeur brute sinon. */
function kindLabel(kind: string): string {
  return kind in DELIVERABLE_KINDS
    ? DELIVERABLE_KINDS[kind as keyof typeof DELIVERABLE_KINDS].label
    : kind;
}

/**
 * Exports — port de `legacy/(cockpit)/cockpit/brand/deliverables` sur les
 * données v7 : hub des livrables réellement composés (table Deliverable),
 * avec consultation, version imprimable et fraîcheur calculée à la lecture.
 * La composition, elle, reste une action explicite (/app/oracle).
 */
export default async function ExportsPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app/exports");

  const brand = await getBrandForSession(session);
  if (!brand) {
    return (
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="eyebrow text-coral">Livrables</p>
          <h1 className="font-display text-3xl font-semibold">Exports</h1>
        </header>
        <EmptyState
          icon={<FolderOutput />}
          title="Aucune marque dans cet espace"
          description="Les livrables se composent depuis les piliers d'une marque — commencez par le diagnostic gratuit."
        >
          <Link href="/intake" className={buttonVariants({ variant: "primary", size: "md" })}>
            Commencer le diagnostic
          </Link>
        </EmptyState>
      </div>
    );
  }

  const deliverables = await getBrandDeliverables(brand.id);
  const kindCount = Object.keys(DELIVERABLE_KINDS).length;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="eyebrow text-coral">Livrables</p>
        <h1 className="font-display text-3xl font-semibold">Exports — {brand.name}</h1>
        <p className="max-w-2xl text-sm text-sand">
          Tout ce qui a été composé depuis vos piliers, prêt à consulter ou imprimer. Un
          livrable n&apos;est jamais généré en silence : chaque composition est une action
          explicite, auditée.
        </p>
      </header>

      {/* ── Livrables composés ─────────────────────────────────────────── */}
      <section className="space-y-4" aria-label="Livrables composés">
        {deliverables.length === 0 ? (
          <EmptyState
            icon={<FolderOutput />}
            title="Aucun livrable composé"
            description="L'Oracle — le document stratégique de votre marque — se compose de manière déterministe depuis vos piliers, sur action explicite."
          >
            <Link
              href="/app/oracle"
              className={buttonVariants({ variant: "primary", size: "md" })}
            >
              Composer l&apos;Oracle
            </Link>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-bento">
            {deliverables.map((deliverable) => {
              const status = STATUS_UI[deliverable.status] ?? {
                label: deliverable.status,
                variant: "neutral" as const,
              };
              const isOracle = deliverable.kind === ORACLE_KIND;
              const liveStale = isOracle
                ? oracleIsStale(deliverable.composedAt, brand.pillars)
                : false;

              return (
                <article
                  key={deliverable.id}
                  className="rounded-lg border border-line bg-ink-2 p-5"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="coral">{kindLabel(deliverable.kind)}</Badge>
                    <h2 className="font-display text-lg font-semibold text-bone">
                      {deliverable.title}
                    </h2>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {liveStale && deliverable.status !== "STALE" ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-xs bg-warning/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-warning"
                        title="Des piliers ont été modifiés après la dernière composition"
                      >
                        <TriangleAlert className="size-3.5" aria-hidden />
                        En retard sur les piliers
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-sand">
                    {deliverable.composedAt
                      ? `Composé le ${DATE_FORMAT.format(deliverable.composedAt)}`
                      : `Créé le ${DATE_FORMAT.format(deliverable.createdAt)} — jamais composé`}
                  </p>
                  {isOracle ? (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Link
                        href="/app/oracle"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Consulter
                        <ArrowRight aria-hidden />
                      </Link>
                      <Link
                        href="/app/oracle/print"
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        <Printer aria-hidden />
                        Version imprimable
                      </Link>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Registre des kinds (en code — jamais de kind fantôme) ──────── */}
      <section className="space-y-3" aria-label="Types de livrables disponibles">
        <div>
          <h2 className="font-display text-xl font-semibold">Types de livrables</h2>
          <p className="text-sm text-sand">
            {kindCount} type{kindCount > 1 ? "s" : ""} au registre v7 — le catalogue
            s&apos;étend avec les prochains work packages, jamais en silence.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-bento sm:grid-cols-2">
          {Object.entries(DELIVERABLE_KINDS).map(([kind, def]) => (
            <li
              key={kind}
              className="rounded-lg border border-dashed border-line bg-ink-0/70 p-4"
            >
              <p className="font-display text-base font-semibold text-bone">{def.label}</p>
              <p className="mt-1 text-sm text-smoke-2">{def.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
