import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LinkIcon, ScrollText } from "lucide-react";
import { resolveSharedOracle } from "@/server/share";
import { MarkdownView } from "@/components/pillars/markdown-view";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * /partage/oracle/[token] — l'Oracle en LECTURE PUBLIQUE (port de legacy
 * //shared/strategy/[token], recâblé sur le Deliverable v7). Le token est un
 * JWT signé 30 j (src/server/share.ts) : aucune session, aucune table.
 * Lien mort (expiré, falsifié, livrable disparu) → page morte propre.
 * noindex : un document de marque partagé n'a rien à faire dans un index.
 */
export const dynamic = "force-dynamic";

/** Une résolution par requête, partagée entre generateMetadata et la page. */
const getSharedOracle = cache(resolveSharedOracle);

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const shared = await getSharedOracle(token);
  if (!shared) {
    return { title: "Lien de partage expiré", robots: { index: false } };
  }
  return {
    title: `Oracle — ${shared.brandName}`,
    description: `Document stratégique de ${shared.brandName}, composé avec La Fusée (UPgraders) et partagé en lecture seule.`,
    robots: { index: false }, // document privé partagé par lien — hors index
  };
}

export default async function PartageOraclePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shared = await getSharedOracle(token);

  // ── Lien mort : page morte propre, honnête sur les causes ────────────
  if (!shared) {
    return (
      <div className="bg-bone">
        <div className="mx-auto max-w-2xl px-gutter py-20 sm:py-28">
          <EmptyState
            tone="light"
            icon={<LinkIcon />}
            title="Ce lien de partage n'est plus valide"
            description="Les liens de partage de l'Oracle sont valables 30 jours après leur génération. Celui-ci a expiré, a été altéré, ou son document n'existe plus — demandez à la marque de générer un nouveau lien depuis son espace."
          >
            <Link href="/lafusee" className={buttonVariants({ size: "md" })}>
              Découvrir La Fusée <ArrowRight aria-hidden="true" />
            </Link>
          </EmptyState>
        </div>
      </div>
    );
  }

  const { document, brandName, composedAt } = shared;
  const insufficient = document.sections.filter((s) => s.status === "insuffisant").length;

  return (
    <div className="bg-bone">
      {/* ── Bandeau de partage — qui partage, avec quoi ─────────────────── */}
      <div className="border-b border-line bg-ink text-bone">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-3 px-gutter py-3">
          <p className="text-sm text-sand">
            <ScrollText className="mr-1.5 inline size-4 align-[-2px] text-coral" aria-hidden />
            Oracle partagé par <span className="font-semibold text-bone">{brandName}</span>
            <span className="text-smoke-2"> · lecture seule</span>
          </p>
          <p className="text-sm text-sand">
            généré avec{" "}
            <Link href="/lafusee" className="font-semibold text-bone underline-offset-2 hover:text-coral hover:underline">
              La Fusée
            </Link>{" "}
            <span className="text-smoke-2">· by UPgraders</span>
          </p>
        </div>
      </div>

      {/* ── Le document — même registre que la version imprimable ───────── */}
      <div className="mx-auto max-w-3xl px-gutter py-10 sm:py-14">
        <article className="rounded-lg bg-white p-8 text-ink shadow-card sm:p-10">
          <div className="border-b-2 border-coral pb-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="eyebrow text-coral">
                La Fusée<span className="text-ink"> · by UPgraders</span>
              </p>
              <p className="font-mono text-xs text-smoke">
                {composedAt ? DATE_FORMAT.format(composedAt) : ""}
              </p>
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
              Oracle — {document.brand.name}
            </h1>
            <p className="mt-2 text-sm text-smoke">
              Document stratégique · {document.sections.length} sections
              {document.brand.sector ? ` · ${document.brand.sector}` : ""}
            </p>
            <p className="mt-3 text-sm font-semibold text-graphite">
              Score structurel {document.score.total}/{document.score.max} · Palier{" "}
              {document.score.levelLabel}
              {insufficient > 0
                ? ` · ${insufficient} section${insufficient > 1 ? "s" : ""} en attente de données`
                : ""}
            </p>
          </div>

          {document.sections.map((section) => (
            <section
              key={section.id}
              className="border-b border-ink/10 py-6 last:border-b-0"
            >
              {section.status === "insuffisant" ? (
                <div className="rounded-md border border-warning/50 bg-warning/10 p-4">
                  <MarkdownView markdown={section.markdown} tone="light" />
                </div>
              ) : (
                <MarkdownView markdown={section.markdown} tone="light" />
              )}
              {section.sources.length > 0 ? (
                <p className="mt-3 font-mono text-[10px] text-smoke-2">
                  Sources : {section.sources.join(" · ")}
                </p>
              ) : null}
            </section>
          ))}

          <footer className="pt-6 text-center text-xs text-smoke">
            Composé de manière déterministe depuis les piliers déclarés de la marque — les
            sections marquées « données insuffisantes » attendent des données réelles, jamais
            des inventions. Partagé en lecture seule ; lien valable 30 jours.
          </footer>
        </article>

        {/* ── CTA — même moteur, votre marque ───────────────────────────── */}
        <div className="mt-10 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Votre marque mérite le même document.
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-graphite">
            L&apos;Oracle se compose depuis les piliers ADVE de votre marque — commencez par le
            diagnostic gratuit de 15 minutes.
          </p>
          <div className="mt-5">
            <Link href="/intake" className={buttonVariants({ size: "md" })}>
              Mesurer ma marque gratuitement <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
