import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookMarked, ExternalLink, Quote } from "lucide-react";
import { readSession } from "@/lib/session";
import { getBrandForSession, jsonRecord } from "@/server/brand";
import { listActiveAssets } from "@/server/vault";
import {
  composeGuidelines,
  type FieldCertainty,
  type GuidelinesSectionMeta,
  type LinkItem,
  type VaultAssetKind,
} from "@/domain/guidelines";
import { PILLAR_LABELS } from "@/domain/pillar-fields";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CertaintyBadge } from "@/components/pillars/certainty-badge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Charte de marque" };

/**
 * Charte de marque (guidelines) — port de `legacy/(cockpit)/cockpit/brand/
 * guidelines` (guidelines-renderer) recentré doctrine v7 : le document se
 * DÉRIVE à la lecture, 100 % déterministe (`domain/guidelines`), depuis deux
 * sources réelles et deux seulement — le pilier E (Engagement : expression,
 * ton, expérience) pour l'identité verbale, le coffre /app/vault pour
 * l'identité visuelle et les usages. Rien n'est stocké, rien n'est inventé :
 * chaque section cite sa source ou déclare son manque.
 */

const GAP_CTA: Record<string, { href: string; label: string }> = {
  verbale: { href: "/app/pilier/e", label: "Compléter le pilier E" },
  visuelle: { href: "/app/vault", label: "Ouvrir le coffre" },
  usages: { href: "/app/vault", label: "Déclarer les usages" },
};

function SectionHeader({ meta }: { meta: GuidelinesSectionMeta }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-semibold">{meta.title}</h2>
        <Badge variant={meta.status === "ok" ? "gold" : "outline"}>
          {meta.status === "ok" ? "Composée" : "Manquante"}
        </Badge>
      </div>
      {meta.source !== null ? (
        <p className="flex items-start gap-2 text-xs text-smoke-2">
          <Quote aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>Source : {meta.source}.</span>
        </p>
      ) : null}
    </div>
  );
}

function SectionGap({ meta }: { meta: GuidelinesSectionMeta }) {
  const cta = GAP_CTA[meta.id];
  return (
    <EmptyState title="Section non composable" description={meta.gap ?? ""} className="py-10">
      {cta ? (
        <Link href={cta.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {cta.label}
          <ArrowRight aria-hidden />
        </Link>
      ) : null}
    </EmptyState>
  );
}

function certaintyStatus(certainty: FieldCertainty): "declared" | "inferred" | "filled" {
  if (certainty === "DECLARED") return "declared";
  if (certainty === "INFERRED") return "inferred";
  return "filled";
}

function LinkList({ items, kindLabel }: { items: LinkItem[]; kindLabel: string }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={`${kindLabel}-${i}`}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line px-3 py-2"
        >
          <span className="text-sm font-semibold text-bone">{item.name}</span>
          {item.url !== null ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-coral underline-offset-4 hover:underline"
            >
              <ExternalLink aria-hidden className="size-3" />
              lien
            </a>
          ) : (
            <span className="text-xs text-smoke-2">sans lien</span>
          )}
          {item.note !== null ? <span className="text-xs text-sand">{item.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

const USAGE_KIND_LABELS: Record<VaultAssetKind, string> = {
  LOGO: "Logo",
  COULEUR: "Couleur",
  TYPO: "Typographie",
  DOCUMENT: "Document",
  IMAGE: "Image",
};

export default async function GuidelinesPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app/guidelines");

  const brand = await getBrandForSession(session);
  if (!brand) {
    return (
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="eyebrow text-coral">Livrables</p>
          <h1 className="font-display text-3xl font-semibold">Charte de marque</h1>
        </header>
        <EmptyState
          icon={<BookMarked />}
          title="Aucune marque dans cet espace"
          description="La charte se dérive des piliers et du coffre d'une marque — commencez par le diagnostic gratuit."
        >
          <Link href="/intake" className={buttonVariants({ variant: "primary", size: "md" })}>
            Commencer le diagnostic
          </Link>
        </EmptyState>
      </div>
    );
  }

  const pillarE = brand.pillars.find((pillar) => pillar.key === "E") ?? null;
  const assets = await listActiveAssets(brand.id);
  const doc = composeGuidelines({
    brandName: brand.name,
    pillarE:
      pillarE !== null
        ? { content: jsonRecord(pillarE.content), certainty: jsonRecord(pillarE.certainty) }
        : null,
    assets: assets.map((asset) => ({
      kind: asset.kind as VaultAssetKind,
      name: asset.name,
      value: asset.value,
      fileRef: asset.fileRef,
    })),
  });

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="eyebrow text-coral">Livrables</p>
        <h1 className="font-display text-3xl font-semibold">Charte de marque — {brand.name}</h1>
        <p className="max-w-2xl text-sm text-sand">
          Dérivée en direct, jamais stockée : identité verbale depuis le pilier E ({PILLAR_LABELS.E}),
          identité visuelle et usages depuis le{" "}
          <Link href="/app/vault" className="text-coral underline-offset-4 hover:underline">
            coffre de marque
          </Link>
          . Composition déterministe — mêmes données, même charte. Chaque section cite sa source
          ou déclare ce qui manque.
        </p>
        <Badge variant={doc.completeness.ok === doc.completeness.total ? "gold" : "inverse"}>
          {doc.completeness.ok}/{doc.completeness.total} sections composées
        </Badge>
      </header>

      {/* ── 1. Identité verbale (pilier E réel) ─────────────────────────── */}
      <section className="space-y-4" aria-label="Identité verbale">
        <SectionHeader meta={doc.verbal.section} />
        {doc.verbal.section.status === "manquant" ? (
          <SectionGap meta={doc.verbal.section} />
        ) : (
          <div className="grid grid-cols-1 gap-bento sm:grid-cols-2">
            {doc.verbal.items.map((item) => (
              <article key={item.fieldId} className="rounded-lg border border-line bg-ink-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-bone">{item.label}</h3>
                  <CertaintyBadge status={certaintyStatus(item.certainty)} />
                </div>
                {item.lines.length === 1 ? (
                  <p className="mt-2 text-sm leading-relaxed text-sand">{item.lines[0]}</p>
                ) : (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-sand">
                    {item.lines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── 2. Identité visuelle (coffre réel) ──────────────────────────── */}
      <section className="space-y-5" aria-label="Identité visuelle">
        <SectionHeader meta={doc.visual.section} />
        {doc.visual.section.status === "manquant" ? (
          <SectionGap meta={doc.visual.section} />
        ) : (
          <div className="space-y-6">
            {doc.visual.colors.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-smoke-2">
                  Palette ({doc.visual.colors.length})
                </h3>
                <div className="grid grid-cols-2 gap-bento sm:grid-cols-3 lg:grid-cols-4">
                  {doc.visual.colors.map((color, i) => (
                    <div key={i} className="rounded-lg border border-line bg-ink-2 p-3">
                      {color.hex !== null ? (
                        <div
                          className="h-16 w-full rounded-md border border-line"
                          style={{ backgroundColor: color.hex }}
                          role="img"
                          aria-label={`Pastille ${color.name} ${color.hex}`}
                        />
                      ) : (
                        <div className="flex h-16 w-full items-center justify-center rounded-md border border-dashed border-line text-xs text-smoke-2">
                          hex illisible
                        </div>
                      )}
                      <p className="mt-2 text-sm font-semibold text-bone">{color.name}</p>
                      <p className="font-mono text-xs text-sand">{color.hex ?? "—"}</p>
                      {color.role !== null ? (
                        <p className="mt-1 text-xs text-smoke-2">{color.role}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {doc.visual.typos.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-smoke-2">
                  Typographies ({doc.visual.typos.length})
                </h3>
                <div className="grid grid-cols-1 gap-bento sm:grid-cols-2">
                  {doc.visual.typos.map((typo, i) => (
                    <div key={i} className="rounded-lg border border-line bg-ink-2 p-4">
                      <p className="font-display text-lg font-semibold text-bone">{typo.name}</p>
                      <p className="mt-1 text-sm text-sand">
                        {typo.usage ?? "Usage non déclaré."}
                      </p>
                      {typo.url !== null ? (
                        <a
                          href={typo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-coral underline-offset-4 hover:underline"
                        >
                          <ExternalLink aria-hidden className="size-3" />
                          fonte
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {doc.visual.logos.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-smoke-2">
                  Logos ({doc.visual.logos.length})
                </h3>
                <LinkList items={doc.visual.logos} kindLabel="logo" />
              </div>
            ) : null}

            {doc.visual.documents.length > 0 || doc.visual.images.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-smoke-2">
                  Références du coffre ({doc.visual.documents.length + doc.visual.images.length})
                </h3>
                {doc.visual.documents.length > 0 ? (
                  <LinkList items={doc.visual.documents} kindLabel="document" />
                ) : null}
                {doc.visual.images.length > 0 ? (
                  <LinkList items={doc.visual.images} kindLabel="image" />
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* ── 3. Usages (rôles & usages déclarés sur les assets) ──────────── */}
      <section className="space-y-4" aria-label="Usages">
        <SectionHeader meta={doc.usages.section} />
        {doc.usages.section.status === "manquant" ? (
          <SectionGap meta={doc.usages.section} />
        ) : (
          <ul className="space-y-2">
            {doc.usages.rules.map((rule, i) => (
              <li
                key={i}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-line bg-ink-2 px-4 py-3"
              >
                <Badge variant="inverse">{USAGE_KIND_LABELS[rule.kind]}</Badge>
                <span className="text-sm leading-relaxed text-sand">{rule.text}</span>
                <span className="text-xs text-smoke-2">— déclaré sur « {rule.sourceName} »</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-line pt-4 text-xs text-smoke-2">
        Charte composée à la lecture depuis vos données réelles (pilier E + coffre) — modifier la
        source met la charte à jour immédiatement, sans re-génération.
      </footer>
    </div>
  );
}
